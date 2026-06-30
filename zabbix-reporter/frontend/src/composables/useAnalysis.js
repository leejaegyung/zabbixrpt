// 인프라 7대 스마트 분석 — 기존 zabbix.html에서 1:1 이전.
// 계산식·정렬·임계값을 원본 그대로 유지(동등성 핵심).
import { getItemId, getAverageValue, getHostStatusInfo } from './useFormat.js'

/** 스토리지 80% 도달 예측 (선형 회귀) */
export const calculateStoragePrediction = (history) => {
  if (!history || history.length < 5) return { status: 'insufficient' }

  const data = [...history].sort((a, b) => parseInt(a.clock) - parseInt(b.clock))
  const n = data.length
  const startX = parseInt(data[0].clock)

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  data.forEach((p) => {
    const x = parseInt(p.clock) - startX
    const y = parseFloat(p.value)
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
  })

  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return { status: 'stable', current: parseFloat(data[n - 1].value) }

  const m = (n * sumXY - sumX * sumY) / denominator
  const b = (sumY - m * sumX) / n

  const currentVal = parseFloat(data[n - 1].value)
  if (currentVal >= 80) return { status: 'critical', current: currentVal, daysLeft: 0, growthPerDay: m * 86400 }
  if (m <= 0) return { status: 'stable', current: currentVal, growthPerDay: m * 86400 }

  const targetX = (80 - b) / m
  const targetClock = startX + targetX
  const now = Math.floor(Date.now() / 1000)

  const secondsLeft = targetClock - now
  if (secondsLeft < 0) return { status: 'critical', current: currentVal, daysLeft: 0, growthPerDay: m * 86400 }

  const daysLeft = secondsLeft / 86400
  if (daysLeft > 365) return { status: 'stable', current: currentVal, growthPerDay: m * 86400 }

  return { status: 'warning', current: currentVal, daysLeft: Math.round(daysLeft), growthPerDay: m * 86400 }
}

/**
 * 선택된 데이터로 인프라 7대 분석 결과를 계산.
 * @param {{hostsData: array, problemsData: array, itemsData: array, selectedIds: array}} state
 */
export const computeAnalysis = ({ hostsData = [], problemsData = [], itemsData = [], selectedIds = [] }) => {
  const unselectedHostNames =
    hostsData.length > 0 ? hostsData.filter((h) => !selectedIds.includes(getItemId(h))).map((h) => h.name) : []

  const activeItems = itemsData.filter((item) => {
    const hostName = item.hosts?.[0]?.name
    return selectedIds.includes(getItemId(item)) && !unselectedHostNames.includes(hostName)
  })

  const activeProblems = problemsData.filter((item) => {
    const hostName = item.hosts?.[0]?.name
    return selectedIds.includes(getItemId(item)) && !unselectedHostNames.includes(hostName)
  })

  const activeHosts = hostsData.filter((item) => selectedIds.includes(getItemId(item)))

  // CPU/메모리 호스트별 최댓값 집계
  const hostsMap = new Map()
  activeItems.forEach((item) => {
    const hostName = item.hosts?.[0]?.name || 'Unknown Host'
    if (!hostsMap.has(hostName)) hostsMap.set(hostName, { hostName, cpuItem: null, memItem: null, cpuVal: 0, memVal: 0 })
    const isCpu = item.name.toLowerCase().match(/cpu.*(utilization|usage)|processor load/i) && item.units === '%'
    const isMem = item.name.toLowerCase().match(/memory.*(utilization|usage)|ram.*usage/i) && item.units === '%'
    if (isCpu) {
      const val = getAverageValue(item)
      if (val >= hostsMap.get(hostName).cpuVal) {
        hostsMap.get(hostName).cpuItem = item
        hostsMap.get(hostName).cpuVal = val
      }
    } else if (isMem) {
      const val = getAverageValue(item)
      if (val >= hostsMap.get(hostName).memVal) {
        hostsMap.get(hostName).memItem = item
        hostsMap.get(hostName).memVal = val
      }
    }
  })

  // 4·5. CPU/메모리 Top 5
  const combinedTopItems = Array.from(hostsMap.values())
    .filter((h) => h.cpuItem || h.memItem)
    .sort((a, b) => (b.cpuVal !== a.cpuVal ? b.cpuVal - a.cpuVal : b.memVal - a.memVal))
    .slice(0, 5)

  // 3. 스토리지 포화 임박 예측
  const storageForecast = activeItems
    .filter(
      (i) =>
        i.name.toLowerCase().match(/(space|vfs|disk).*(utilization|pused)/i) ||
        (i.units === '%' && i.name.toLowerCase().includes('space')),
    )
    .map((item) => ({ ...item, prediction: calculateStoragePrediction(item.history) }))
    .filter((item) => item.prediction.status !== 'insufficient')
    .sort((a, b) => {
      if (a.prediction.status === 'critical' && b.prediction.status !== 'critical') return -1
      if (b.prediction.status === 'critical' && a.prediction.status !== 'critical') return 1
      if (a.prediction.status === 'warning' && b.prediction.status === 'warning')
        return a.prediction.daysLeft - b.prediction.daysLeft
      return parseFloat(b.lastvalue) - parseFloat(a.lastvalue)
    })
    .slice(0, 5)

  // 6. 사용량 급증(Spike) 감지 — %는 10%p↑, 그 외는 30%↑
  const spikes = activeItems
    .map((item) => {
      if (!item.history || item.history.length < 2) return null
      const isPercent = item.units === '%'
      const hist = [...item.history].sort((a, b) => parseInt(a.clock) - parseInt(b.clock))
      const first = parseFloat(hist[0].value)
      const last = parseFloat(hist[hist.length - 1].value)
      if (isNaN(first) || isNaN(last)) return null

      const delta = last - first
      if (delta <= 0) return null

      let deltaPercent = 0
      if (isPercent) {
        deltaPercent = delta
        if (deltaPercent < 10) return null
      } else {
        if (first <= 1) return null
        deltaPercent = (delta / first) * 100
        if (deltaPercent < 30) return null
      }

      return { ...item, deltaPercent, lastVal: last, firstVal: first, isPercent }
    })
    .filter(Boolean)
    .sort((a, b) => b.deltaPercent - a.deltaPercent)
    .slice(0, 5)

  // 7. 네트워크 트래픽 Top 5 — 1Kbps 초과만
  const networkTop = activeItems
    .filter((i) => i.units.toLowerCase().includes('bps') || i.name.toLowerCase().match(/traffic|net\.if|인바운드|아웃바운드/i))
    .map((i) => ({ ...i, avgValue: getAverageValue(i) }))
    .filter((i) => i.avgValue > 1000)
    .sort((a, b) => b.avgValue - a.avgValue)
    .slice(0, 5)

  // 2. 요주의 서버 (알람 최다)
  const problemCount = {}
  activeProblems.forEach((p) => {
    const hName = p.hosts?.[0]?.name || 'Unknown Host'
    problemCount[hName] = (problemCount[hName] || 0) + 1
  })
  const topOffenders = Object.entries(problemCount)
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 1. 가동률 (SLA)
  const totalHostsCount = activeHosts.length
  const errorHosts = activeHosts.filter((h) => getHostStatusInfo(h) === 'ERROR')
  const errorCount = errorHosts.length
  const sla = totalHostsCount > 0 ? (((totalHostsCount - errorCount) / totalHostsCount) * 100).toFixed(1) : 100

  return {
    combinedTopItems,
    storageForecast,
    spikes,
    networkTop,
    topOffenders,
    uptime: { total: totalHostsCount, errorCount, errorHosts, sla },
  }
}
