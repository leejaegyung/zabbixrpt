import { defineStore } from 'pinia'
import { getLocalMonthAgoStartString, getLocalTodayEndString } from '../composables/useFormat.js'

// Zabbix API URL·토큰은 서버(.env: ZABBIX_API_URL / ZABBIX_API_TOKEN)에서만 관리한다.
// 프론트는 조회 기간만 보관하고, 프록시가 서버 설정 값을 쓰도록 요청에 자격정보를 싣지 않는다.
export const useConnectionStore = defineStore('connection', {
  state: () => ({
    startDate: getLocalMonthAgoStartString(),
    endDate: getLocalTodayEndString(),
  }),
  getters: {
    timeFrom: (s) => (s.startDate ? Math.floor(new Date(s.startDate).getTime() / 1000) : undefined),
    timeTill: (s) => (s.endDate ? Math.floor(new Date(s.endDate).getTime() / 1000) : undefined),
  },
})
