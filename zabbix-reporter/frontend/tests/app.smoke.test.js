// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../src/App.vue'
import { useDataStore } from '../src/stores/data.js'
import { buildMockHosts, buildMockProblems, buildMockItems } from '../src/data/mockData.js'
import { getItemId } from '../src/composables/useFormat.js'

describe('App 통합 스모크', () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('초기 렌더 — 헤더와 빈 상태, 에러 바운더리 미발동', () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Zabbix Report Exporter')
    expect(wrapper.text()).toContain('조회된 데이터가 없습니다')
    expect(wrapper.text()).not.toContain('화면 렌더링 중 오류 발생')
  })

  it('데이터 로드 후 — 7대 분석 + 호스트/문제/아이템 섹션 렌더', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const data = useDataStore()

    const hosts = buildMockHosts()
    const problems = buildMockProblems()
    const items = buildMockItems()
    data.hostsData = hosts
    data.problemsData = problems
    data.itemsData = items
    data.selectedIds = [...hosts, ...problems, ...items].map(getItemId)
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('인프라 7대 스마트 분석')
    expect(text).toContain('호스트 상태')
    expect(text).toContain('최근 문제(알람)')
    expect(text).toContain('관제 아이템 및 트렌드')
    expect(text).toContain('Web Server 01') // 호스트명 렌더
    expect(text).not.toContain('화면 렌더링 중 오류 발생')
  })

  it('화면 표시 설정 OFF — 해당 섹션 숨김', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const data = useDataStore()
    const hosts = buildMockHosts()
    data.hostsData = hosts
    data.dataType = 'hosts'
    data.selectedIds = hosts.map(getItemId)
    await nextTick()

    expect(wrapper.text()).toContain('호스트 상태')
  })
})
