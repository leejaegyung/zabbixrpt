// 클라이언트 PDF 생성 — html2canvas + jsPDF (기존 exportPDF/executeExport 1:1 이전).
// 라이브러리는 번들 동봉(동적 import로 코드 분할). 폐쇄망에서도 외부 네트워크 불필요.
import { nextTick } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { useDataStore } from '../stores/data.js'

export function usePdfExport() {
  const ui = useUiStore()
  const data = useDataStore()

  async function exportPdf() {
    const total = data.currentTotalData
    if (total.length === 0) {
      ui.showAlert('추출 오류', '추출할 데이터가 없습니다.', 'alert')
      return
    }
    if (data.selectedIds.length === 0) {
      ui.showAlert('추출 오류', '추출할 항목을 하나 이상 선택해주세요.', 'alert')
      return
    }

    if (data.selectedIds.length > 150) {
      ui.showConfirm(
        '대량 데이터 추출 경고',
        '선택된 항목이 매우 많습니다. 브라우저 메모리가 초과될 수 있습니다.\n그래도 진행하시겠습니까?',
        () => run(),
      )
    } else {
      run()
    }
  }

  async function run() {
    try {
      data.loading = true
      data.error = ''
      ui.isExporting = true
      window.scrollTo(0, 0)

      // 오프스크린 ReportPreview 렌더 + 폰트/그래프 이미지 로드 대기
      await nextTick()
      // 웹폰트(Inter)가 로드되기 전에 캡처하면 대체 폰트로 그려져 아이콘·글자 정렬이 어긋남
      if (document.fonts?.ready) {
        try { await document.fonts.ready } catch { /* 폰트 API 미지원 무시 */ }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const pages = document.querySelectorAll('.pdf-page')
      if (!pages || pages.length === 0) throw new Error('렌더링된 페이지를 찾을 수 없습니다.')

      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const PAGE_W_MM = 210
      const PAGE_H_MM = 297

      let firstPage = true
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2, // 텍스트·아이콘 선명도 향상
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollY: 0,
          windowWidth: 1000,
        })

        // 캡처된 내용 높이가 A4 한 장을 넘으면 여러 장으로 분할(내용 잘림 방지).
        const pxPerMm = canvas.width / PAGE_W_MM
        const sliceHpx = Math.floor(PAGE_H_MM * pxPerMm)
        let offset = 0
        while (offset < canvas.height - 2) {
          const curHpx = Math.min(sliceHpx, canvas.height - offset)
          const slice = document.createElement('canvas')
          slice.width = canvas.width
          slice.height = curHpx
          const ctx = slice.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, slice.width, slice.height)
          ctx.drawImage(canvas, 0, offset, canvas.width, curHpx, 0, 0, canvas.width, curHpx)

          const imgData = slice.toDataURL('image/jpeg', 0.95)
          if (!firstPage) pdf.addPage()
          firstPage = false
          pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, curHpx / pxPerMm)
          offset += curHpx
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      pdf.save(`Zabbix_Report_${data.dataType}_${dateStr}.pdf`)
    } catch (err) {
      ui.showAlert('PDF 생성 오류', `상세 원인: ${err.message || err}`, 'alert')
    } finally {
      ui.isExporting = false
      data.loading = false
    }
  }

  return { exportPdf }
}
