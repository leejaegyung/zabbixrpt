<script setup>
// 통합 설정 드로어 (우측 슬라이드): 표시 / 보고서 / 프로필 / 개발·테스트.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { useViewSettingsStore } from '../stores/viewSettings.js'
import { useAdvancedStore } from '../stores/advanced.js'
import { useDataStore } from '../stores/data.js'
import { exportProfile, importProfile } from '../composables/useProfile.js'
import Icon from './common/Icon.vue'

const ui = useUiStore()
const view = useViewSettingsStore()
const adv = useAdvancedStore()
const data = useDataStore()

const fileInputRef = ref(null)
const logoInputRef = ref(null)

const analysisItems = [
  { id: 'uptime', label: '인프라 가동률 (SLA)', key: 'showAnalysisUptime' },
  { id: 'offenders', label: '요주의 서버 (알람 최다)', key: 'showAnalysisOffenders' },
  { id: 'storage', label: '스토리지 포화 임박 예측', key: 'showAnalysisStorage' },
  { id: 'cpu', label: 'CPU 점유율 Top 5', key: 'showAnalysisCpu' },
  { id: 'memory', label: '메모리 점유율 Top 5', key: 'showAnalysisMemory' },
  { id: 'spikes', label: '사용량 급증 호스트 감지', key: 'showAnalysisSpikes' },
  { id: 'network', label: '네트워크 트래픽 점유율', key: 'showAnalysisNetwork' },
]
const sections = [
  { key: 'showSectionHosts', label: '호스트 상태' },
  { key: 'showSectionProblems', label: '최근 문제(알람)' },
  { key: 'showSectionItems', label: '관제 아이템 및 트렌드' },
]

const close = () => (ui.isSettingsOpen = false)

const onImport = (e) => {
  const file = e.target.files[0]
  if (file) importProfile(file)
  e.target.value = ''
}
const onLogoUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => (adv.draftCustomLogo = evt.target.result)
  reader.readAsDataURL(file)
  e.target.value = ''
}
const saveReport = () => {
  adv.save()
  ui.showAlert('고급 설정 저장', '보고서 설정이 적용되었습니다.', 'info')
}
const loadMock = () => {
  data.loadMockData('dashboard')
  close()
}

const onKey = (e) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const cb = 'w-4 h-4 rounded-none bg-elevated-2 border-hairline-strong text-rosso focus:ring-rosso cursor-pointer'
</script>

<template>
  <Transition name="drawer">
    <div v-if="ui.isSettingsOpen" class="fixed inset-0 z-[80] flex justify-end">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close"></div>

      <aside class="drawer-panel relative h-full w-[440px] max-w-full bg-elevated border-l border-hairline-strong flex flex-col">
        <!-- 헤더 -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-hairline shrink-0">
          <p class="eyebrow flex items-center"><Icon name="Settings" class="w-3.5 h-3.5 mr-2 text-rosso" /> Settings</p>
          <button @click="close" class="btn-ghost w-8 h-8"><Icon name="X" class="w-4 h-4" /></button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <!-- 1. 표시 -->
          <section>
            <p class="eyebrow mb-4">Display</p>
            <label class="flex items-center gap-3 cursor-pointer hover:bg-elevated-2 p-2.5 -mx-2.5 transition-colors">
              <input type="checkbox" v-model="view.showSectionAnalysis" :class="cb" />
              <span class="text-sm text-ink font-semibold select-none">스마트 인프라 분석</span>
            </label>
            <div v-if="view.showSectionAnalysis" class="ml-7 space-y-2.5 mt-2 mb-3 border-l border-hairline-strong pl-4 py-1">
              <label v-for="item in analysisItems" :key="item.id" class="flex items-center gap-2.5 cursor-pointer text-body hover:text-ink transition-colors">
                <input type="checkbox" v-model="view[item.key]" :class="cb" />
                <span class="text-xs font-medium select-none">{{ item.label }}</span>
              </label>
            </div>
            <label v-for="s in sections" :key="s.key" class="flex items-center gap-3 cursor-pointer hover:bg-elevated-2 p-2.5 -mx-2.5 transition-colors">
              <input type="checkbox" v-model="view[s.key]" :class="cb" />
              <span class="text-sm text-ink select-none">{{ s.label }}</span>
            </label>
          </section>

          <!-- 2. 보고서 -->
          <section class="pt-7 border-t border-hairline">
            <p class="eyebrow mb-4">Report</p>
            <div class="space-y-5">
              <div>
                <label class="eyebrow block mb-2">보고서 제목 (표지)</label>
                <input type="text" v-model="adv.draftReportTitle" placeholder="예: Zabbix 인프라 점검 리포트" class="field" />
              </div>
              <div>
                <label class="eyebrow block mb-2">회사명 (표지)</label>
                <input type="text" v-model="adv.draftCompanyName" placeholder="예: OO 주식회사" class="field" />
              </div>
              <div>
                <label class="eyebrow block mb-2">Custom Logo</label>
                <div class="flex gap-2 items-center">
                  <button @click="logoInputRef.click()" class="btn-ghost flex-1 py-2.5 text-[12px] gap-1.5 font-semibold">
                    <Icon name="Image" class="w-3.5 h-3.5" /> 로고 이미지 선택
                  </button>
                  <button v-if="adv.draftCustomLogo" @click="adv.draftCustomLogo = ''"
                    class="px-3 py-2.5 rounded-none text-[11px] font-bold uppercase tracking-cta text-rosso border border-hairline-strong hover:border-rosso transition-colors">Clear</button>
                  <input type="file" accept="image/*" class="hidden-input" ref="logoInputRef" @change="onLogoUpload" />
                </div>
                <img v-if="adv.draftCustomLogo" :src="adv.draftCustomLogo" class="mt-3 h-10 w-auto object-contain bg-elevated-2 border border-hairline p-1" />
              </div>
              <div>
                <label class="eyebrow block mb-2">Watermark</label>
                <input type="text" v-model="adv.draftWatermarkText" placeholder="예: CONFIDENTIAL" class="field" />
              </div>
              <div>
                <label class="eyebrow block mb-2">Graph Size</label>
                <select v-model="adv.draftGraphSize" class="field cursor-pointer">
                  <option value="small">작게 (1페이지 8개)</option>
                  <option value="medium">보통 (1페이지 6개)</option>
                  <option value="large">크게 (1페이지 3개)</option>
                </select>
              </div>
              <button @click="saveReport" class="btn-rosso w-full">
                <Icon name="Settings" class="w-4 h-4" /><span>저장 및 적용</span>
              </button>
            </div>
          </section>

          <!-- 3. 프로필 -->
          <section class="pt-7 border-t border-hairline">
            <p class="eyebrow mb-4">Profile</p>
            <div class="grid grid-cols-2 gap-2">
              <button @click="exportProfile()" class="btn-ghost py-2.5 text-[11px] uppercase tracking-cta font-bold gap-1.5">
                <Icon name="Download" class="w-3.5 h-3.5" /> Export
              </button>
              <button @click="fileInputRef.click()" class="btn-ghost py-2.5 text-[11px] uppercase tracking-cta font-bold gap-1.5">
                <Icon name="Upload" class="w-3.5 h-3.5" /> Import
              </button>
              <input type="file" accept=".json" class="hidden-input" ref="fileInputRef" @change="onImport" />
            </div>
            <p class="text-[11px] text-muted mt-3 leading-snug">표시·보고서 설정을 JSON으로 내보내거나 복원합니다. (토큰 제외)</p>
          </section>

          <!-- 4. 개발·테스트 -->
          <section class="pt-7 border-t border-hairline">
            <p class="eyebrow flex items-center mb-4"><Icon name="Info" class="w-3.5 h-3.5 mr-2 text-rosso" /> Sandbox</p>
            <p class="text-sm text-body mb-4">실서버 연결 없이 가상 데이터로 화면을 미리 봅니다.</p>
            <button @click="loadMock" class="btn-outline w-full">가상 대시보드 로드</button>
          </section>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.25s ease;
}
.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>
