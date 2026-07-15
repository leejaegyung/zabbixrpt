// 포맷·헬퍼 순수 함수 — 기존 zabbix.html에서 1:1 이전.
// 동작 동등성이 핵심이므로 계산식/분기를 원본 그대로 유지한다.

/** 항목 고유 ID (호스트/이벤트/아이템 공용).
 *  hostid·eventid·itemid는 Zabbix에서 타입별로 독립 시퀀스라 숫자가 겹칠 수 있어,
 *  타입 접두사를 붙여 전역 유일성을 보장한다(선택/전체선택 충돌 방지). */
export const getItemId = (item) => {
  if (item.hostid) return `h-${item.hostid}`
  if (item.eventid) return `e-${item.eventid}`
  return `i-${item.itemid}`
}

/** 수집된 히스토리의 평균값. 없으면 lastvalue. */
export const getAverageValue = (item) => {
  if (item.history && item.history.length > 0) {
    const sum = item.history.reduce((acc, curr) => acc + parseFloat(curr.value), 0)
    return sum / item.history.length
  }
  return parseFloat(item.lastvalue) || 0
}

/** 단위(B/bps/%)에 따른 사람친화 포맷 */
export const formatItemValue = (item) => {
  let formattedValue = item.lastvalue
  const units = item.units ? item.units.toLowerCase() : ''
  const val = parseFloat(item.lastvalue)
  if (isNaN(val)) return formattedValue + (item.units ? ` ${item.units}` : '')

  if (units === 'b') {
    if (val > 1073741824) formattedValue = (val / 1073741824).toFixed(2) + ' GB'
    else if (val > 1048576) formattedValue = (val / 1048576).toFixed(2) + ' MB'
    else formattedValue = val + ' B'
  } else if (units === 'bps') {
    if (val > 1000000000) formattedValue = (val / 1000000000).toFixed(2) + ' Gbps'
    else if (val > 1000000) formattedValue = (val / 1000000).toFixed(2) + ' Mbps'
    else if (val > 1000) formattedValue = (val / 1000).toFixed(2) + ' Kbps'
    else formattedValue = val.toFixed(2) + ' bps'
  } else {
    formattedValue = val.toFixed(2)
    if (item.units) formattedValue += ` ${item.units}`
  }
  return formattedValue
}

/** 심각도 → Tailwind 색상 클래스 */
export const getSeverityColor = (severity) => {
  const colors = {
    0: 'bg-gray-100 text-gray-800',
    1: 'bg-blue-100 text-blue-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-orange-100 text-orange-800',
    4: 'bg-red-100 text-red-800',
    5: 'bg-red-600 text-white',
  }
  return colors[severity] || colors[0]
}

/** 심각도 → 한국어 라벨 */
export const getSeverityText = (severity) =>
  ['미분류', '정보', '경고', '평균', '높음', '심각'][parseInt(severity) || 0]

/** 심각도 필터 옵션 (라벨 + 색상 클래스) */
export const severityOptions = [
  { value: 0, label: '미분류', colorClass: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 1, label: '정보', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 2, label: '경고', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 3, label: '평균', colorClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 4, label: '높음', colorClass: 'bg-red-100 text-red-800 border-red-200' },
  { value: 5, label: '심각', colorClass: 'bg-red-600 text-white border-red-700' },
]

/** 호스트 인터페이스/상태로 가용성 판별 */
export const getHostStatusInfo = (item) => {
  if (String(item.status) === '1') return 'DISABLED'
  if (item.interfaces && item.interfaces.length > 0) {
    if (item.interfaces.find((inf) => String(inf.available) === '2')) return 'ERROR'
    if (item.interfaces.find((inf) => String(inf.available) === '1')) return 'NORMAL'
  }
  if (String(item.available) === '2') return 'ERROR'
  if (String(item.available) === '1') return 'NORMAL'
  return 'UNKNOWN'
}

/** 오늘 00:00 (로컬, datetime-local 형식) */
export const getLocalTodayStartString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00`
}

/** 오늘 23:59 (로컬, datetime-local 형식) */
export const getLocalTodayEndString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T23:59`
}

/** 한 달 전 00:00 (로컬, datetime-local 형식) */
export const getLocalMonthAgoStartString = () => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00`
}
