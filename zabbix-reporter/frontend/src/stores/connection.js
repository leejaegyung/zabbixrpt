import { defineStore } from 'pinia'
import { getLocalTodayStartString, getLocalTodayEndString } from '../composables/useFormat.js'

// 접속 정보: URL은 localStorage 영속, 토큰은 보안상 비영속(메모리 + 세션).
// 토큰은 프록시로만 전달되고 클라이언트에 평문 저장하지 않는다.
export const useConnectionStore = defineStore('connection', {
  state: () => ({
    url: localStorage.getItem('zabbixApiUrl') || 'api_jsonrpc.php',
    token: sessionStorage.getItem('zabbixApiToken') || '',
    startDate: getLocalTodayStartString(),
    endDate: getLocalTodayEndString(),
  }),
  getters: {
    // api 래퍼에 넘길 접속 설정
    conn: (s) => ({ url: s.url, token: s.token }),
    timeFrom: (s) => (s.startDate ? Math.floor(new Date(s.startDate).getTime() / 1000) : undefined),
    timeTill: (s) => (s.endDate ? Math.floor(new Date(s.endDate).getTime() / 1000) : undefined),
  },
  actions: {
    setUrl(v) {
      this.url = v
      localStorage.setItem('zabbixApiUrl', v)
    },
    setToken(v) {
      this.token = v
      // 세션 한정 보관(탭 종료 시 소멸). localStorage 평문 저장 안 함.
      sessionStorage.setItem('zabbixApiToken', v)
    },
  },
})
