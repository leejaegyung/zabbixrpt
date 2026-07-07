import { describe, it, expect } from 'vitest'
import { calculateStoragePrediction, computeAnalysis } from '../src/composables/useAnalysis.js'

const DAY = 86400
const now = Math.floor(Date.now() / 1000)

/** count개 일간 히스토리 생성 (base에서 step만큼 상승) */
const history = (base, step, count = 6) =>
  Array.from({ length: count }, (_, i) => ({ clock: now - (count - 1 - i) * DAY, value: base + i * step }))

describe('calculateStoragePrediction', () => {
  it('데이터 5개 미만이면 insufficient', () => {
    expect(calculateStoragePrediction(history(50, 1, 4)).status).toBe('insufficient')
  })
  it('현재값 80 이상이면 critical', () => {
    expect(calculateStoragePrediction(history(80, 1).map((p) => ({ ...p, value: 85 }))).status).toBe('critical')
  })
  it('상승 추세면 warning + daysLeft 숫자', () => {
    const pred = calculateStoragePrediction(history(70, 1.8)) // 70→79 상승, 80 임박
    expect(pred.status).toBe('warning')
    expect(typeof pred.daysLeft).toBe('number')
  })
  it('하락/평탄하면 stable', () => {
    expect(calculateStoragePrediction(history(60, -2)).status).toBe('stable')
    expect(calculateStoragePrediction(history(60, 0)).status).toBe('stable')
  })
  it('빈 값(비수치)이 섞여도 오염되지 않음', () => {
    const h = history(60, 2) // 60..70
    h[2].value = '' // Zabbix가 종종 반환하는 빈 값
    const pred = calculateStoragePrediction(h)
    expect(pred.daysLeft).not.toBeNull()
    expect(Number.isFinite(pred.growthPerDay)).toBe(true)
    // 유효점이 5개 미만이면 insufficient
    h[3].value = ''
    expect(calculateStoragePrediction(h).status).toBe('insufficient')
  })
  it('current·daysLeft·growthPerDay가 서로 정합', () => {
    // 60→70(하루 2%↑), 현재 70 → (80-70)/2 = 5일
    const pred = calculateStoragePrediction(history(60, 2))
    expect(pred.current).toBe(70)
    expect(pred.growthPerDay).toBeCloseTo(2, 6)
    expect(pred.daysLeft).toBe(5)
  })
})

describe('computeAnalysis', () => {
  const mk = (over) => ({ hostsData: [], problemsData: [], itemsData: [], selectedIds: [], ...over })

  it('SLA: 오류 호스트 비율 반영', () => {
    const hostsData = [
      { hostid: '1', name: 'A', status: '0', interfaces: [{ available: '1' }] },
      { hostid: '2', name: 'B', status: '0', interfaces: [{ available: '2' }] }, // ERROR
    ]
    const { uptime } = computeAnalysis(mk({ hostsData, selectedIds: ['1', '2'] }))
    expect(uptime.total).toBe(2)
    expect(uptime.errorCount).toBe(1)
    expect(uptime.sla).toBe('50.0')
  })

  it('요주의 서버: 호스트별 알람 수 집계·정렬', () => {
    const problemsData = [
      { eventid: 'e1', hosts: [{ name: 'A' }] },
      { eventid: 'e2', hosts: [{ name: 'A' }] },
      { eventid: 'e3', hosts: [{ name: 'B' }] },
    ]
    const { topOffenders } = computeAnalysis(mk({ problemsData, selectedIds: ['e1', 'e2', 'e3'] }))
    expect(topOffenders[0]).toEqual({ host: 'A', count: 2 })
    expect(topOffenders[1]).toEqual({ host: 'B', count: 1 })
  })

  it('CPU Top: 평균 점유율 집계', () => {
    const itemsData = [
      { itemid: 'i1', name: 'CPU utilization', units: '%', hosts: [{ name: 'A' }], history: [{ value: '80' }, { value: '90' }] },
    ]
    const { combinedTopItems } = computeAnalysis(mk({ itemsData, selectedIds: ['i1'] }))
    expect(combinedTopItems[0].cpuVal).toBe(85)
  })

  it('급증 감지: %는 10%p 미만이면 제외', () => {
    const small = [{ itemid: 'i1', name: 'mem', units: '%', hosts: [{ name: 'A' }], history: [{ clock: now - DAY, value: '50' }, { clock: now, value: '55' }] }]
    const big = [{ itemid: 'i2', name: 'mem', units: '%', hosts: [{ name: 'A' }], history: [{ clock: now - DAY, value: '50' }, { clock: now, value: '70' }] }]
    expect(computeAnalysis(mk({ itemsData: small, selectedIds: ['i1'] })).spikes).toHaveLength(0)
    expect(computeAnalysis(mk({ itemsData: big, selectedIds: ['i2'] })).spikes).toHaveLength(1)
  })

  it('급증 감지: 치솟았다 내려온 peak도 감지', () => {
    // 50 → 75 → 52: 끝값(52)만 보면 놓치지만 peak(75)로 감지
    const itemsData = [{ itemid: 'i1', name: 'mem', units: '%', hosts: [{ name: 'A' }], history: [
      { clock: now - 2 * DAY, value: '50' }, { clock: now - DAY, value: '75' }, { clock: now, value: '52' }] }]
    const { spikes } = computeAnalysis(mk({ itemsData, selectedIds: ['i1'] }))
    expect(spikes).toHaveLength(1)
    expect(spikes[0].deltaPercent).toBeCloseTo(25, 6)
    expect(spikes[0].lastVal).toBe(75)
  })

  it('스토리지 예측: 백분율(%) 단위가 아니면 제외', () => {
    const h = Array.from({ length: 6 }, (_, i) => ({ clock: now - (5 - i) * DAY, value: String(60 + i * 2) }))
    const itemsData = [
      { itemid: 's1', name: 'Free disk space', units: 'B', hosts: [{ name: 'A' }], history: h }, // 바이트 → 제외
      { itemid: 's2', name: 'Disk space utilization', units: '%', hosts: [{ name: 'B' }], history: h }, // % → 포함
    ]
    const { storageForecast } = computeAnalysis(mk({ itemsData, selectedIds: ['s1', 's2'] }))
    expect(storageForecast).toHaveLength(1)
    expect(storageForecast[0].units).toBe('%')
  })

  it('네트워크 Top: 1Kbps 이하 노드 제외', () => {
    const itemsData = [
      { itemid: 'i1', name: 'traffic', units: 'bps', hosts: [{ name: 'A' }], history: [{ value: '500' }] }, // 제외
      { itemid: 'i2', name: 'traffic', units: 'bps', hosts: [{ name: 'B' }], history: [{ value: '50000' }] },
    ]
    const { networkTop } = computeAnalysis(mk({ itemsData, selectedIds: ['i1', 'i2'] }))
    expect(networkTop).toHaveLength(1)
    expect(networkTop[0].hosts[0].name).toBe('B')
  })

  it('선택 해제된 호스트의 아이템은 분석에서 제외', () => {
    const hostsData = [{ hostid: 'h1', name: 'A', status: '0', interfaces: [{ available: '1' }] }]
    const itemsData = [{ itemid: 'i1', name: 'CPU utilization', units: '%', hosts: [{ name: 'A' }], history: [{ value: '90' }] }]
    // 호스트 A(h1)를 선택하지 않음 → A의 아이템 제외
    const { combinedTopItems } = computeAnalysis(mk({ hostsData, itemsData, selectedIds: ['i1'] }))
    expect(combinedTopItems).toHaveLength(0)
  })
})
