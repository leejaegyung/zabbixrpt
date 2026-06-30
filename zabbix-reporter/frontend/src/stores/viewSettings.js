import { defineStore } from 'pinia'

// 화면/PDF 표시 설정 + 필터 + 페이지 상태.
export const useViewSettingsStore = defineStore('viewSettings', {
  state: () => ({
    // 섹션 표출
    showSectionAnalysis: true,
    showSectionHosts: true,
    showSectionProblems: true,
    showSectionItems: true,
    includeAnalysisInPdf: true,

    // 7대 분석 개별 토글
    showAnalysisUptime: true,
    showAnalysisOffenders: true,
    showAnalysisStorage: true,
    showAnalysisCpu: true,
    showAnalysisMemory: true,
    showAnalysisSpikes: true,
    showAnalysisNetwork: true,

    // 필터
    hostStatusFilter: 'ALL',
    hostGroupFilter: 'ALL',
    itemHostFilter: 'ALL',
    problemSeverityFilters: ['ALL'],
    problemHostFilter: 'ALL',
    problemGroupFilter: 'ALL',

    // 페이지
    hostPage: 1,
    problemPage: 1,
    itemPage: 1,

    // 섹션 접힘 상태 (접었다 펴기)
    collapsed: { analysis: false, hosts: false, problems: false, items: false },
  }),
  getters: {
    anyAnalysisVisible: (s) =>
      s.showAnalysisUptime || s.showAnalysisOffenders || s.showAnalysisStorage ||
      s.showAnalysisCpu || s.showAnalysisMemory || s.showAnalysisSpikes || s.showAnalysisNetwork,
  },
  actions: {
    toggleCollapse(key) {
      this.collapsed[key] = !this.collapsed[key]
    },
    toggleProblemSeverity(val) {
      if (val === 'ALL') {
        this.problemSeverityFilters = ['ALL']
        return
      }
      let next = this.problemSeverityFilters.filter((v) => v !== 'ALL')
      if (next.includes(val)) next = next.filter((v) => v !== val)
      else next = [...next, val]
      this.problemSeverityFilters = next.length === 0 ? ['ALL'] : next
    },
  },
})
