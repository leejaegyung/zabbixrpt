// @vitest-environment happy-dom
// 요주의 서버 카드: 알림 개수 클릭 시 해당 호스트의 알림 목록이 펼쳐지는지 검증.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AnalysisSection from '../src/components/analysis/AnalysisSection.vue'
import { useDataStore } from '../src/stores/data.js'
import { buildMockProblems } from '../src/data/mockData.js'
import { getItemId } from '../src/composables/useFormat.js'

describe('요주의 서버 — 알림 개수 클릭 상세', () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('개수 버튼 클릭 시 해당 호스트의 알림명이 표기된다', async () => {
    const wrapper = mount(AnalysisSection, { global: { plugins: [pinia] } })
    const data = useDataStore()
    const problems = buildMockProblems()
    data.problemsData = problems
    data.selectedIds = problems.map(getItemId)
    await nextTick()

    // 접힌 초기 상태 — 알림명 미표기
    expect(wrapper.text()).not.toContain('Disk space is critically low')

    // 개수 버튼(숫자로 시작)만 추림 → 첫 번째 = 'Web Server 01'(알림 2건)
    const countButtons = wrapper.findAll('button').filter((b) => /^\d/.test(b.text().trim()))
    expect(countButtons.length).toBeGreaterThan(0)
    await countButtons[0].trigger('click')

    // 펼쳐지면 Web Server 01의 두 알림명이 나타남
    expect(wrapper.text()).toContain('High CPU utilization (over 90% for 5m)')
    expect(wrapper.text()).toContain('Disk space is critically low')

    // 다시 클릭하면 접힘
    await countButtons[0].trigger('click')
    expect(wrapper.text()).not.toContain('Disk space is critically low')
  })
})
