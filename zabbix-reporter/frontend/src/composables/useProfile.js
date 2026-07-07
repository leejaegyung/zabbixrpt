// 설정 프로필 JSON 내보내기/불러오기 — 기존 handleExport/ImportProfile 대응.
// 보안 정책: 토큰은 프로필에 포함하지 않는다(평문 유출 방지).
import { useConnectionStore } from '../stores/connection.js'
import { useViewSettingsStore } from '../stores/viewSettings.js'
import { useAdvancedStore } from '../stores/advanced.js'
import { useUiStore } from '../stores/ui.js'

const VIEW_KEYS = [
  'showSectionAnalysis', 'showAnalysisUptime', 'showAnalysisOffenders', 'showAnalysisStorage',
  'showAnalysisCpu', 'showAnalysisMemory', 'showAnalysisSpikes', 'showAnalysisNetwork',
  'showSectionHosts', 'showSectionProblems', 'showSectionItems',
]

export function exportProfile() {
  const conn = useConnectionStore()
  const view = useViewSettingsStore()
  const adv = useAdvancedStore()
  const ui = useUiStore()

  const profile = {
    url: conn.url,
    startDate: conn.startDate,
    endDate: conn.endDate,
    customLogo: adv.customLogo,
    watermarkText: adv.watermarkText,
    graphSize: adv.graphSize,
    reportTitle: adv.reportTitle,
    companyName: adv.companyName,
  }
  VIEW_KEYS.forEach((k) => (profile[k] = view[k]))

  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'zabbix_report_profile.json'
  link.click()
  ui.showAlert('프로필 저장', '설정 파일(JSON) 다운로드가 완료되었습니다.', 'info')
}

export function importProfile(file) {
  const conn = useConnectionStore()
  const view = useViewSettingsStore()
  const adv = useAdvancedStore()
  const ui = useUiStore()

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const p = JSON.parse(evt.target.result)
      if (p.url) conn.setUrl(p.url)
      if (p.startDate !== undefined) conn.startDate = p.startDate
      if (p.endDate !== undefined) conn.endDate = p.endDate
      VIEW_KEYS.forEach((k) => { if (p[k] !== undefined) view[k] = p[k] })
      adv.apply({ customLogo: p.customLogo, watermarkText: p.watermarkText, graphSize: p.graphSize, reportTitle: p.reportTitle, companyName: p.companyName })
      ui.showAlert('프로필 불러오기', '설정이 성공적으로 적용되었습니다.', 'info')
    } catch (e) {
      ui.showAlert('프로필 오류', '잘못된 형식의 JSON 파일입니다.', 'alert')
    }
  }
  reader.readAsText(file)
}
