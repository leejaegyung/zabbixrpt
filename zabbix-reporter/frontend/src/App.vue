<script setup>
import { computed } from 'vue'
import { useDataStore } from './stores/data.js'
import { useViewSettingsStore } from './stores/viewSettings.js'
import { useAdvancedStore } from './stores/advanced.js'
import { useUiStore } from './stores/ui.js'
import { useThemeStore } from './stores/theme.js'
import { getItemId } from './composables/useFormat.js'
import { usePdfExport } from './composables/usePdfExport.js'

import Icon from './components/common/Icon.vue'
import ErrorBoundary from './components/common/ErrorBoundary.vue'
import AppModal from './components/common/AppModal.vue'
import TokenHelpModal from './components/common/TokenHelpModal.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import ApiSettingsPanel from './components/panels/ApiSettingsPanel.vue'
import AnalysisSection from './components/analysis/AnalysisSection.vue'
import HostsTable from './components/views/HostsTable.vue'
import ProblemsTable from './components/views/ProblemsTable.vue'
import ItemsGrid from './components/views/ItemsGrid.vue'
import ReportPreview from './components/pdf/ReportPreview.vue'

const data = useDataStore()
const view = useViewSettingsStore()
const adv = useAdvancedStore()
const ui = useUiStore()
const theme = useThemeStore()
theme.init()
const { exportPdf } = usePdfExport()

const total = computed(() => data.currentTotalData)
const allSelected = computed(() => total.value.length > 0 && total.value.every((i) => data.selectedIds.includes(getItemId(i))))
const selectedCount = computed(() => data.selectedIds.length)
const hasAnyData = computed(() => data.hostsData.length || data.problemsData.length || data.itemsData.length)
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen relative bg-canvas">
      <SettingsDrawer />
      <AppModal />
      <TokenHelpModal />

      <!-- PDF 캡처용 오프스크린 DOM -->
      <ReportPreview />

      <!-- 내보내기 진행 오버레이 -->
      <div v-if="ui.isExporting" class="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-canvas/95 backdrop-blur-sm">
        <Icon name="Loader2" class="w-10 h-10 text-rosso mb-5" />
        <p class="eyebrow mb-2">Rendering Report</p>
        <p class="display-title text-xl mb-1">PDF 보고서를 생성하는 중입니다</p>
        <p class="text-sm text-muted">선택한 항목을 A4 페이지로 변환하고 있습니다.</p>
      </div>

      <div :class="ui.isExporting ? 'hidden' : 'block'">
        <!-- 시네마틱 헤더 밴드 (full-bleed, 하단 헤어라인) -->
        <header class="border-b border-hairline">
          <div class="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-4">
              <div class="flex items-center justify-center w-12 h-12 bg-rosso shrink-0 overflow-hidden">
                <img v-if="adv.customLogo" :src="adv.customLogo" class="w-full h-full object-contain" />
                <Icon v-else name="Database" class="w-7 h-7 text-white" />
              </div>
              <div>
                <p class="eyebrow mb-1.5">Infrastructure Telemetry</p>
                <h1 class="display-title text-3xl sm:text-4xl">Zabbix Report Exporter</h1>
              </div>
            </div>
            <!-- 1차 CTA + 유틸리티 아이콘 + 보조 안내 -->
            <div class="flex flex-col items-stretch lg:items-end gap-2 w-full lg:w-auto">
              <div class="flex items-center gap-4 sm:gap-5 w-full lg:w-auto">
                <!-- 1차 CTA -->
                <button @click="exportPdf" :disabled="total.length === 0 || data.loading" class="group cta-pdf flex-1 lg:flex-none">
                  <span class="cta-pdf-icon">
                    <Icon :name="data.loading ? 'Loader2' : 'Download'" class="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                  </span>
                  <span class="cta-pdf-label">PDF 보고서 생성</span>
                </button>

                <!-- 세로 구분선 (1차 액션 ↔ 유틸리티) -->
                <div class="w-px h-9 bg-hairline shrink-0"></div>

                <!-- 유틸리티 아이콘 세그먼트 (샤프, 공유 헤어라인 · 채움 없음) -->
                <div class="flex items-center border border-hairline divide-x divide-hairline shrink-0">
                  <button
                    @click="theme.toggle()"
                    :title="theme.isLight ? '다크 모드로 전환' : '화이트 모드로 전환'"
                    :aria-label="theme.isLight ? '다크 모드로 전환' : '화이트 모드로 전환'"
                    class="icon-seg"
                  >
                    <Icon :name="theme.isLight ? 'Moon' : 'Sun'" class="w-[18px] h-[18px]" />
                  </button>
                  <button @click="ui.isSettingsOpen = true" title="설정" aria-label="설정" class="icon-seg">
                    <Icon name="Settings" class="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>

              <span class="flex items-center gap-1.5 justify-center lg:justify-end text-[11px] text-muted lg:max-w-[280px] leading-snug">
                <Icon name="Info" class="w-3 h-3 shrink-0 text-muted-soft" />
                <span>자빅스 원본 그래프 표시를 위해 브라우저 로그인 세션이 필요할 수 있습니다.</span>
              </span>
            </div>
          </div>
        </header>

        <!-- 본문 -->
        <div class="max-w-[1280px] mx-auto px-4 sm:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- 좌측 조회 콘솔 (연결 + 기간 + 조회) -->
            <div class="lg:col-span-1">
              <ApiSettingsPanel />
            </div>

            <!-- 우측 미리보기 -->
            <div class="lg:col-span-3">
              <div class="card p-4 sm:p-7 min-h-[600px]">
                <div class="border-b border-hairline pb-5 mb-6">
                  <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
                    <div>
                      <p class="eyebrow mb-2">Data Preview</p>
                      <h2 class="display-title text-2xl">미리보기 / 추출 대상 선택</h2>
                    </div>
                    <div class="flex items-end gap-5 shrink-0">
                      <label v-if="total.length > 0" class="flex items-center gap-2 cursor-pointer text-[11px] uppercase tracking-cta font-semibold text-body hover:text-ink transition">
                        <input type="checkbox" :checked="allSelected" @change="data.toggleAllGlobal()" class="w-4 h-4 rounded-none bg-elevated-2 border-hairline-strong text-rosso focus:ring-rosso cursor-pointer" />
                        <span>전체 선택</span>
                      </label>
                      <div class="text-right">
                        <p class="eyebrow mb-1.5">Selected / Total</p>
                        <p class="stat-number text-4xl text-rosso">{{ selectedCount }}<span class="text-xl text-muted font-medium"> / {{ total.length }}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <template v-if="total.length > 0">
                  <AnalysisSection v-if="view.showSectionAnalysis" />
                  <HostsTable v-if="view.showSectionHosts" />
                  <ProblemsTable v-if="view.showSectionProblems" />
                  <ItemsGrid v-if="view.showSectionItems" />
                </template>
                <div v-else class="flex flex-col items-center justify-center h-72 text-muted">
                  <Icon name="LayoutDashboard" class="w-10 h-10 mb-4 text-hairline-strong" />
                  <p class="eyebrow mb-1">No Data</p>
                  <p class="text-sm">{{ hasAnyData ? '활성화된 항목이 없습니다. 화면 표시 설정을 확인하세요.' : '조회된 데이터가 없습니다.' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ErrorBoundary>
</template>
