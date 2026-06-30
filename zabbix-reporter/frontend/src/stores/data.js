import { defineStore } from 'pinia'
import { callZabbixApi, ZabbixApiError } from '../api/zabbix.js'
import { getItemId } from '../composables/useFormat.js'
import { useConnectionStore } from './connection.js'
import { useViewSettingsStore } from './viewSettings.js'
import { useUiStore } from './ui.js'
import { buildMockHosts, buildMockProblems, buildMockItems } from '../data/mockData.js'

// 정규화된 에러 코드 → 한국어 알림 (기존 callZabbixApi 분기 유지)
const alertForError = (ui, err) => {
  switch (err.code) {
    case 'NETWORK_OR_CORS_ERROR':
      ui.showAlert('통신 실패 (CORS 차단)', '서버 주소(http://...)로 접속했는지, URL 끝에 /api_jsonrpc.php 가 있는지 확인해주세요.', 'alert')
      break
    case 'HTTP_404':
      ui.showAlert('서버 연결 실패', 'HTTP 404\nZabbix API URL 또는 토큰을 확인해주세요.', 'alert')
      break
    case 'HTTP_401':
      ui.showAlert('서버 연결 실패', '접근이 거부되었습니다 (401/403).', 'alert')
      break
    case 'AUTH_EXPIRED':
    case 'NO_TOKEN':
      ui.showAlert('API 토큰 만료', 'API 토큰 유효기간이 지났거나 잘못되었습니다.\n새로운 토큰을 기입해주세요.', 'alert')
      break
    case 'NOT_JSON':
      ui.showAlert('응답 오류', 'Zabbix 응답을 해석할 수 없습니다.', 'alert')
      break
    default:
      ui.showAlert('API 호출 오류', err.message || '요청 실패', 'alert')
  }
}

export const useDataStore = defineStore('data', {
  state: () => ({
    hostsData: [],
    problemsData: [],
    itemsData: [],
    dataType: 'dashboard',
    selectedIds: [],
    loading: false,
    error: '',
  }),
  getters: {
    // 현재 dataType + 섹션 표시 설정에 따른 표시 대상 데이터
    currentTotalData() {
      const view = useViewSettingsStore()
      let data = []
      if (this.dataType === 'dashboard') {
        if (view.showSectionHosts) data = [...data, ...this.hostsData]
        if (view.showSectionProblems) data = [...data, ...this.problemsData]
        if (view.showSectionItems) data = [...data, ...this.itemsData]
      } else {
        if (this.dataType === 'hosts' && view.showSectionHosts) data = this.hostsData
        if (this.dataType === 'problems' && view.showSectionProblems) data = this.problemsData
        if (this.dataType === 'items' && view.showSectionItems) data = this.itemsData
      }
      return data
    },
  },
  actions: {
    // 프록시 경유 호출 + 에러 정규화 알림
    async call(method, params) {
      const conn = useConnectionStore().conn
      const ui = useUiStore()
      try {
        return await callZabbixApi(method, params, conn)
      } catch (err) {
        if (err instanceof ZabbixApiError) alertForError(ui, err)
        throw err
      }
    },

    requireConn() {
      const conn = useConnectionStore()
      if (!conn.url || !conn.token) {
        useUiStore().showAlert('입력 확인', 'Zabbix API URL과 Token을 모두 입력해주세요.', 'info')
        return false
      }
      return true
    },

    async mapTriggerGroups(problemsArray) {
      if (!problemsArray || problemsArray.length === 0) return problemsArray
      const triggerIds = problemsArray.filter((p) => String(p.source) === '0' && String(p.object) === '0').map((p) => p.objectid)
      if (triggerIds.length === 0) return problemsArray

      const triggersRes = await this.call('trigger.get', { triggerids: triggerIds, selectHosts: ['hostid', 'name'] })
      const hostIds = [...new Set(triggersRes.flatMap((t) => t.hosts.map((h) => h.hostid)))]
      const hostGroupMap = {}

      if (hostIds.length > 0) {
        const hRes = await this.call('host.get', { hostids: hostIds, selectHostGroups: ['name'] })
        hRes.forEach((h) => { hostGroupMap[h.hostid] = h.hostgroups || [] })
      }

      const triggerMap = {}
      triggersRes.forEach((t) => { triggerMap[t.triggerid] = t.hosts })

      return problemsArray.map((p) => {
        const mHosts = triggerMap[p.objectid] || []
        const mGroups = []
        mHosts.forEach((h) => { (hostGroupMap[h.hostid] || []).forEach((g) => mGroups.push(g)) })
        return { ...p, hosts: mHosts, groups: mGroups }
      })
    },

    async fetchItemsWithHistory(timeFrom, timeTill) {
      const items = await this.call('item.get', {
        output: ['itemid', 'name', 'lastvalue', 'units', 'lastclock', 'value_type'],
        selectHosts: ['name', 'host'],
        monitored: true,
        search: { value_type: ['0', '3'] },
        limit: 300,
      })
      if (!items || items.length === 0) return []

      const historyParams = { output: 'extend', sortfield: 'clock', sortorder: 'ASC', limit: 1000 }
      historyParams.time_from = timeFrom ?? Math.floor(Date.now() / 1000) - 86400 * 7
      if (timeTill) historyParams.time_till = timeTill

      const floatItemIds = items.filter((i) => i.value_type === '0').map((i) => i.itemid)
      const uintItemIds = items.filter((i) => i.value_type === '3').map((i) => i.itemid)

      let historyData = []
      if (floatItemIds.length > 0) historyData = historyData.concat(await this.call('history.get', { ...historyParams, history: 0, itemids: floatItemIds }))
      if (uintItemIds.length > 0) historyData = historyData.concat(await this.call('history.get', { ...historyParams, history: 3, itemids: uintItemIds }))

      return items.map((item) => ({ ...item, history: historyData.filter((h) => h.itemid === item.itemid) }))
    },

    async fetchAllDashboard() {
      if (!this.requireConn()) return
      const conn = useConnectionStore()
      this.loading = true; this.error = ''; this.dataType = 'dashboard'
      const { startDate, endDate, timeFrom, timeTill } = conn
      try {
        const hostsPromise = this.call('host.get', { output: ['hostid', 'host', 'name', 'status', 'available', 'description'], selectInterfaces: ['interfaceid', 'ip', 'type', 'available', 'error'], selectHostGroups: ['groupid', 'name'] })
        const problemsPromise = this.call('problem.get', { output: 'extend', sortfield: ['eventid'], sortorder: 'DESC', limit: 100, recent: (!startDate && !endDate) ? true : undefined, time_from: timeFrom, time_till: timeTill })
        const itemsPromise = this.fetchItemsWithHistory(timeFrom, timeTill)

        let [hostsRes, problemsRes, itemsRes] = await Promise.all([hostsPromise, problemsPromise, itemsPromise])
        problemsRes = await this.mapTriggerGroups(problemsRes)

        this.hostsData = hostsRes; this.problemsData = problemsRes; this.itemsData = itemsRes
        this.selectedIds = [...hostsRes, ...problemsRes, ...itemsRes].map(getItemId)
      } catch (e) {
        this.error = '대시보드 로딩 실패'
      } finally {
        this.loading = false
      }
    },

    async fetchHosts() {
      if (!this.requireConn()) return
      this.loading = true; this.error = ''; this.dataType = 'hosts'
      try {
        const res = await this.call('host.get', { output: ['hostid', 'host', 'name', 'status', 'available', 'description'], selectInterfaces: ['interfaceid', 'ip', 'type', 'available', 'error'], selectHostGroups: ['groupid', 'name'] })
        this.hostsData = res; this.selectedIds = res.map(getItemId)
      } catch (e) { /* alert는 call에서 처리 */ } finally { this.loading = false }
    },

    async fetchProblems() {
      if (!this.requireConn()) return
      const conn = useConnectionStore()
      this.loading = true; this.error = ''; this.dataType = 'problems'
      const { startDate, endDate, timeFrom, timeTill } = conn
      try {
        let res = await this.call('problem.get', { output: 'extend', sortfield: ['eventid'], sortorder: 'DESC', limit: 150, time_from: timeFrom, time_till: timeTill, recent: (!startDate && !endDate) ? true : undefined })
        res = await this.mapTriggerGroups(res)
        this.problemsData = res; this.selectedIds = res.map(getItemId)
      } catch (e) { } finally { this.loading = false }
    },

    async fetchItems() {
      if (!this.requireConn()) return
      const conn = useConnectionStore()
      this.loading = true; this.error = ''; this.dataType = 'items'
      try {
        const items = await this.fetchItemsWithHistory(conn.timeFrom, conn.timeTill)
        this.itemsData = items; this.selectedIds = items.map(getItemId)
      } catch (e) { } finally { this.loading = false }
    },

    loadMockData(type) {
      this.loading = true; this.error = ''; this.dataType = type
      setTimeout(() => {
        const mockHosts = buildMockHosts()
        const mockProblems = buildMockProblems()
        const mockItems = buildMockItems()
        if (type === 'dashboard') {
          this.hostsData = mockHosts; this.problemsData = mockProblems; this.itemsData = mockItems
          this.selectedIds = [...mockHosts, ...mockProblems, ...mockItems].map(getItemId)
        } else if (type === 'hosts') {
          this.hostsData = mockHosts; this.selectedIds = mockHosts.map(getItemId)
        } else if (type === 'problems') {
          this.problemsData = mockProblems; this.selectedIds = mockProblems.map(getItemId)
        } else if (type === 'items') {
          this.itemsData = mockItems; this.selectedIds = mockItems.map(getItemId)
        }
        this.loading = false
      }, 500)
    },

    // --- 선택 관리 ---
    toggleSelection(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((i) => i !== id)
        : [...this.selectedIds, id]
    },
    toggleAll(arrToToggle) {
      if (!arrToToggle || arrToToggle.length === 0) return
      const ids = arrToToggle.map(getItemId)
      const allSelected = ids.every((id) => this.selectedIds.includes(id))
      if (allSelected) this.selectedIds = this.selectedIds.filter((id) => !ids.includes(id))
      else this.selectedIds = Array.from(new Set([...this.selectedIds, ...ids]))
    },
    toggleAllGlobal() {
      this.toggleAll(this.currentTotalData)
    },
  },
})
