import { describe, it, expect } from 'vitest'
import {
  getItemId,
  getAverageValue,
  formatItemValue,
  getSeverityText,
  getSeverityColor,
  getHostStatusInfo,
} from '../src/composables/useFormat.js'

describe('getItemId', () => {
  it('호스트/이벤트/아이템 ID 우선순위', () => {
    expect(getItemId({ hostid: 'h1' })).toBe('h1')
    expect(getItemId({ eventid: 'e1' })).toBe('e1')
    expect(getItemId({ itemid: 'i1' })).toBe('i1')
  })
})

describe('getAverageValue', () => {
  it('히스토리 평균을 계산', () => {
    expect(getAverageValue({ history: [{ value: '10' }, { value: '20' }, { value: '30' }] })).toBe(20)
  })
  it('히스토리 없으면 lastvalue 사용', () => {
    expect(getAverageValue({ lastvalue: '42' })).toBe(42)
    expect(getAverageValue({})).toBe(0)
  })
})

describe('formatItemValue', () => {
  it('바이트(B) 단위 변환', () => {
    expect(formatItemValue({ lastvalue: String(2 * 1073741824), units: 'B' })).toBe('2.00 GB')
    expect(formatItemValue({ lastvalue: String(5 * 1048576), units: 'B' })).toBe('5.00 MB')
    expect(formatItemValue({ lastvalue: '500', units: 'B' })).toBe('500 B')
  })
  it('대역폭(bps) 단위 변환', () => {
    expect(formatItemValue({ lastvalue: String(2e9), units: 'bps' })).toBe('2.00 Gbps')
    expect(formatItemValue({ lastvalue: String(3e6), units: 'bps' })).toBe('3.00 Mbps')
    expect(formatItemValue({ lastvalue: String(4e3), units: 'bps' })).toBe('4.00 Kbps')
    expect(formatItemValue({ lastvalue: '500', units: 'bps' })).toBe('500.00 bps')
  })
  it('퍼센트/기타 단위', () => {
    expect(formatItemValue({ lastvalue: '85.456', units: '%' })).toBe('85.46 %')
    expect(formatItemValue({ lastvalue: '12.3', units: '' })).toBe('12.30')
  })
  it('숫자가 아니면 원본 + 단위', () => {
    expect(formatItemValue({ lastvalue: 'N/A', units: 'X' })).toBe('N/A X')
  })
})

describe('getSeverityText / Color', () => {
  it('심각도 라벨', () => {
    expect(getSeverityText('0')).toBe('미분류')
    expect(getSeverityText('5')).toBe('심각')
  })
  it('심각도 색상 (문자열 키 매칭)', () => {
    expect(getSeverityColor('5')).toBe('bg-red-600 text-white')
    expect(getSeverityColor('99')).toBe('bg-gray-100 text-gray-800')
  })
})

describe('getHostStatusInfo', () => {
  it('비활성(status=1)', () => {
    expect(getHostStatusInfo({ status: '1' })).toBe('DISABLED')
  })
  it('인터페이스 오류(available=2) → ERROR', () => {
    expect(getHostStatusInfo({ status: '0', interfaces: [{ available: '2' }] })).toBe('ERROR')
  })
  it('인터페이스 정상(available=1) → NORMAL', () => {
    expect(getHostStatusInfo({ status: '0', interfaces: [{ available: '1' }] })).toBe('NORMAL')
  })
  it('인터페이스 없으면 host.available로 판별', () => {
    expect(getHostStatusInfo({ status: '0', available: '2' })).toBe('ERROR')
    expect(getHostStatusInfo({ status: '0', available: '1' })).toBe('NORMAL')
    expect(getHostStatusInfo({ status: '0' })).toBe('UNKNOWN')
  })
})
