import { defineStore } from 'pinia'

// 보고서 고급 설정: 로고/워터마크/그래프 크기. draft → 저장 시 반영(기존 동작).
// 비민감 설정이므로 localStorage 영속.
export const useAdvancedStore = defineStore('advanced', {
  state: () => ({
    customLogo: localStorage.getItem('zabbixCustomLogo') || '',
    watermarkText: localStorage.getItem('zabbixWatermark') || '',
    graphSize: localStorage.getItem('zabbixGraphSize') || 'medium',

    draftCustomLogo: localStorage.getItem('zabbixCustomLogo') || '',
    draftWatermarkText: localStorage.getItem('zabbixWatermark') || '',
    draftGraphSize: localStorage.getItem('zabbixGraphSize') || 'medium',
  }),
  getters: {
    // 그래프 크기별 그리드 페이지당 개수
    itemsPerPageGrid: (s) => (s.graphSize === 'small' ? 8 : s.graphSize === 'large' ? 3 : 6),
  },
  actions: {
    save() {
      this.customLogo = this.draftCustomLogo
      this.watermarkText = this.draftWatermarkText
      this.graphSize = this.draftGraphSize
      localStorage.setItem('zabbixCustomLogo', this.customLogo)
      localStorage.setItem('zabbixWatermark', this.watermarkText)
      localStorage.setItem('zabbixGraphSize', this.graphSize)
    },
    // 프로필 불러오기 등 외부에서 직접 반영할 때
    apply({ customLogo, watermarkText, graphSize }) {
      if (customLogo !== undefined) {
        this.customLogo = customLogo
        this.draftCustomLogo = customLogo
      }
      if (watermarkText !== undefined) {
        this.watermarkText = watermarkText
        this.draftWatermarkText = watermarkText
      }
      if (graphSize) {
        this.graphSize = graphSize
        this.draftGraphSize = graphSize
      }
      localStorage.setItem('zabbixCustomLogo', this.customLogo)
      localStorage.setItem('zabbixWatermark', this.watermarkText)
      localStorage.setItem('zabbixGraphSize', this.graphSize)
    },
  },
})
