import { defineStore } from 'pinia'
import { getLocalTodayStartString, getLocalTodayEndString } from '../composables/useFormat.js'

const savedToken = localStorage.getItem('zabbixApiToken') || sessionStorage.getItem('zabbixApiToken') || ''
if (savedToken) localStorage.setItem('zabbixApiToken', savedToken)

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    url: localStorage.getItem('zabbixApiUrl') || '',
    token: savedToken,
    startDate: getLocalTodayStartString(),
    endDate: getLocalTodayEndString(),
  }),
  getters: {
    conn: (s) => ({ url: s.url.trim(), token: s.token.trim() }),
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
      localStorage.setItem('zabbixApiToken', v)
    },
  },
})
