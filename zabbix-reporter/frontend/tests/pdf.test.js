// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ReportPreview from '../src/components/pdf/ReportPreview.vue'
import { useDataStore } from '../src/stores/data.js'
import { useAdvancedStore } from '../src/stores/advanced.js'
import { buildMockHosts, buildMockProblems, buildMockItems } from '../src/data/mockData.js'
import { getItemId } from '../src/composables/useFormat.js'

// mock 데이터 규모: 호스트 16, 문제 15, 아이템 13
const seed = (data, { hosts = true, problems = true, items = true } = {}) => {
  const h = hosts ? buildMockHosts() : []
  const p = problems ? buildMockProblems() : []
  const i = items ? buildMockItems() : []
  data.hostsData = h
  data.problemsData = p
  data.itemsData = i
  data.selectedIds = [...h, ...p, ...i].map(getItemId)
}

describe('ReportPreview — PDF 페이지 분할', () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('대시보드 medium: 분석1 + 호스트1 + 문제1 + 아이템3 = 6 페이지', async () => {
    const wrapper = mount(ReportPreview, { global: { plugins: [pinia] } })
    const data = useDataStore()
    seed(data)
    await nextTick()
    // 호스트16/16=1, 문제15/16=1, 아이템 medium 6/page → ceil(13/6)=3, 분석 1
    expect(wrapper.findAll('.pdf-page')).toHaveLength(6)
  })

  it('graphSize large면 아이템 페이지 증가 (3/page → 5페이지)', async () => {
    const wrapper = mount(ReportPreview, { global: { plugins: [pinia] } })
    const data = useDataStore()
    const adv = useAdvancedStore()
    adv.graphSize = 'large'
    seed(data)
    await nextTick()
    // 아이템 ceil(13/3)=5 → 1+1+1+5 = 8
    expect(wrapper.findAll('.pdf-page')).toHaveLength(8)
  })

  it('선택된 항목만 페이지에 포함', async () => {
    const wrapper = mount(ReportPreview, { global: { plugins: [pinia] } })
    const data = useDataStore()
    const hosts = buildMockHosts()
    data.hostsData = hosts
    data.dataType = 'hosts'
    data.selectedIds = [getItemId(hosts[0])] // 1개만 선택
    await nextTick()
    // 분석 페이지(1) + 호스트 1페이지(선택 1건) = 2, 문제/아이템 없음
    const pages = wrapper.findAll('.pdf-page')
    expect(pages.length).toBe(2)
    expect(wrapper.text()).toContain(hosts[0].name)
    expect(wrapper.text()).not.toContain(hosts[1].name)
  })

  it('분석 토글 OFF면 분석 페이지 제외', async () => {
    const wrapper = mount(ReportPreview, { global: { plugins: [pinia] } })
    const data = useDataStore()
    const { useViewSettingsStore } = await import('../src/stores/viewSettings.js')
    const view = useViewSettingsStore()
    view.includeAnalysisInPdf = false
    data.hostsData = buildMockHosts()
    data.dataType = 'hosts'
    data.selectedIds = data.hostsData.map(getItemId)
    await nextTick()
    // 분석 제외, 호스트 1페이지
    expect(wrapper.findAll('.pdf-page')).toHaveLength(1)
  })
})
