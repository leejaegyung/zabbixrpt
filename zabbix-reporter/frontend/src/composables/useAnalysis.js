// 인프라 7대 스마트 분석 — 기존 zabbix.html에서 1:1 이전.
// 계산식·정렬·임계값을 원본 그대로 유지(동등성 핵심).
import { getItemId, getAverageValue, getHostStatusInfo } from './useFormat.js'

/** 스토리지 80% 도달 예측 (선형 회귀) */
export const calculateStoragePrediction = (history) => {
  if (!history || history.length < 5) return { status: 'insufficient' }

  // 비수치·빈 값(Zabbix가 종종 빈 문자열 반환)을 먼저 제거 — 하나라도 섞이면 회귀 합계가 NaN으로 오염됨.
  const data = history
    .filter((p) => !isNaN(parseFloat(p.value)) && !isNaN(parseInt(p.clock)))
    .sort((a, b) => parseInt(a.clock) - parseInt(b.clock))
  const n = data.length
  if (n < 5) return { status: 'insufficient' }
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

  const currentVal = parseFloat(data[n - 1].value)
  const growthPerDay = m * 86400

  if (currentVal >= 80) return { status: 'critical', current: currentVal, daysLeft: 0, growthPerDay }
  if (m <= 0) return { status: 'stable', current: currentVal, growthPerDay }

  // 실측 현재값을 기준점으로 회귀 기울기를 외삽 — current·daysLeft·growthPerDay를 서로 정합.
  // (회귀 절편 b로 외삽하면 마지막 점이 추세선을 벗어날 때 current와 daysLeft가 어긋남)
  const daysLeft = (80 - currentVal) / growthPerDay
  if (daysLeft > 365) return { status: 'stable', current: currentVal, growthPerDay }

  return { status: 'warning', current: currentVal, daysLeft: Math.round(daysLeft), growthPerDay }
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
      // 예측이 80(%) 임계값과 비교하므로 반드시 백분율 단위여야 함(바이트 단위 오탐 방지).
      (i) =>
        i.units === '%' &&
        (i.name.toLowerCase().match(/(space|vfs|disk).*(utilization|pused)/i) ||
          i.name.toLowerCase().includes('space')),
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
      const values = hist.map((h) => parseFloat(h.value)).filter((v) => !isNaN(v))
      if (isNaN(first) || values.length === 0) return null

      // 구간 내 최댓값(peak) 기준 — 치솟았다 내려온 스파이크도 감지(끝값만 보면 놓침).
      const peak = Math.max(...values)
      const delta = peak - first
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

      return { ...item, deltaPercent, lastVal: peak, firstVal: first, isPercent }
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
