import { defineStore } from 'pinia'

// 디자인 모드(다크/화이트) 전환. 비민감 설정이므로 localStorage 영속.
// 실제 팔레트 스왑은 <html>.theme-light 클래스 + style.css 의 CSS 변수로 처리.
const STORAGE_KEY = 'zabbixTheme'

function applyToDom(theme) {
  document.documentElement.classList.toggle('theme-light', theme === 'light')
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 저장값이 없으면 기본은 다크(기존 디자인).
    theme: localStorage.getItem(STORAGE_KEY) || 'dark',
  }),
  getters: {
    isLight: (s) => s.theme === 'light',
  },
  actions: {
    // 앱 부팅 시 저장된 테마를 DOM 에 반영.
    init() {
      applyToDom(this.theme)
    },
    setTheme(theme) {
      this.theme = theme === 'light' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, this.theme)
      applyToDom(this.theme)
    },
    toggle() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light')
    },
  },
})
