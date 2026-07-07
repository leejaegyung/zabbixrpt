<script setup>
import { computed, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useViewSettingsStore } from '../../stores/viewSettings.js'
import { computeAnalysis } from '../../composables/useAnalysis.js'
import { formatItemValue } from '../../composables/useFormat.js'
import Icon from '../common/Icon.vue'
import AnalysisCard from './AnalysisCard.vue'

const props = defineProps({
  pdf: { type: Boolean, default: false }, // PDF 페이지용 레이아웃(3열, 웹 헤더 제거)
})

const data = useDataStore()
const view = useViewSettingsStore()

const a = computed(() =>
  computeAnalysis({
    hostsData: data.hostsData,
    problemsData: data.problemsData,
    itemsData: data.itemsData,
    selectedIds: data.selectedIds,
  }),
)
const netValue = (item) => formatItemValue({ ...item, lastvalue: item.avgValue })

// 선택된 항목이 없으면 분석 결과가 비어(오해 소지) → 웹 화면에서 자동으로 접고, 다시 선택되면 펼침.
const hasSelection = computed(() => data.selectedIds.length > 0)
if (!props.pdf) {
  watch(hasSelection, (has) => { view.collapsed.analysis = !has })
}

// 테마 토큰: PDF(흰 종이)는 라이트, 웹은 다크. 동일 마크업으로 양쪽 지원.
const c = computed(() =>
  props.pdf
    ? { heading: 'text-gray-800', strong: 'text-gray-700', sub: 'text-gray-500', faint: 'text-gray-400', cell: 'bg-gray-50 border border-gray-100', track: 'bg-gray-100', divider: 'border-gray-50' }
    : { heading: 'text-ink', strong: 'text-body', sub: 'text-muted-soft', faint: 'text-muted', cell: 'bg-elevated-2 border border-hairline', track: 'bg-elevated-2', divider: 'border-hairline' },
)
</script>

<template>
  <div v-if="view.anyAnalysisVisible" :class="pdf ? '' : 'mb-10'">
    <div v-if="!pdf" class="card flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-4 shrink-0" :class="view.collapsed.analysis ? '' : 'border-b-rosso'">
      <button @click="view.toggleCollapse('analysis')" class="flex items-center group" :title="view.collapsed.analysis ? '펼치기' : '접기'">
        <Icon name="ChevronDown" class="w-5 h-5 mr-2 text-muted transition-transform group-hover:text-ink" :class="{ '-rotate-90': view.collapsed.analysis }" />
        <Icon name="Sparkles" class="w-4 h-4 mr-2.5 text-rosso" />
        <span class="text-[13px] font-semibold text-ink uppercase tracking-nav">Smart Analysis</span>
        <span v-if="hasSelection" class="text-[11px] ml-3 text-muted uppercase tracking-cta">7 Signals</span>
        <span v-else class="text-[11px] ml-3 text-muted uppercase tracking-cta">선택 없음</span>
      </button>
      <label class="flex items-center gap-2 cursor-pointer text-[11px] uppercase tracking-cta font-semibold text-body hover:text-ink transition">
        <input type="checkbox" v-model="view.includeAnalysisInPdf" class="w-4 h-4 rounded-none bg-elevated-2 border-hairline-strong text-rosso focus:ring-rosso cursor-pointer" />
        <span>Include in PDF</span>
      </label>
    </div>

    <div v-show="pdf || !view.collapsed.analysis" class="grid relative z-10 content-start"
      :class="pdf ? 'grid-cols-3 gap-6' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 bg-canvas p-4 border-x border-b border-hairline ' + (!view.includeAnalysisInPdf ? 'opacity-40 pointer-events-none' : '')">

      <!-- 1. SLA -->
      <AnalysisCard v-if="view.showAnalysisUptime" :pdf="pdf" title="인프라 가동률 (SLA)" :center-content="true">
        <template #icon><Icon name="ShieldCheck" class="w-5 h-5 text-sig-success" /></template>
        <div class="text-center mb-4">
          <div class="stat-number text-7xl mb-3" :class="parseFloat(a.uptime.sla) < 99 ? 'text-rosso' : c.heading">{{ a.uptime.sla }}<span class="text-2xl text-muted font-medium">%</span></div>
          <p class="text-[11px] uppercase tracking-cta" :class="c.sub">{{ a.uptime.total - a.uptime.errorCount }} / {{ a.uptime.total }} Hosts Operational</p>
        </div>
        <div v-if="a.uptime.errorCount > 0" class="mt-2 p-3 text-xs" :class="pdf ? 'bg-red-50 text-red-700' : 'bg-rosso/10 text-rosso border border-rosso/30'">
          <span class="font-bold flex items-center mb-1 uppercase tracking-cta text-[10px]"><Icon name="AlertCircle" class="w-3 h-3 mr-1.5" /> Down</span>
          <ul class="space-y-0.5">
            <li v-for="(h, i) in a.uptime.errorHosts.slice(0, 3)" :key="i" class="truncate">— {{ h.name }}</li>
            <li v-if="a.uptime.errorHosts.length > 3">+ {{ a.uptime.errorHosts.length - 3 }} more</li>
          </ul>
        </div>
      </AnalysisCard>

      <!-- 2. 요주의 서버 -->
      <AnalysisCard v-if="view.showAnalysisOffenders" :pdf="pdf" title="요주의 서버 (알람 최다)">
        <template #icon><Icon name="AlertCircle" class="w-5 h-5 text-rosso" /></template>
        <div v-if="a.topOffenders.length > 0" class="flex flex-col gap-2.5">
          <div v-for="(o, idx) in a.topOffenders" :key="idx" class="flex justify-between items-center p-2.5" :class="c.cell">
            <span class="font-semibold text-sm truncate pr-2" :class="c.strong" :title="o.host"><span class="text-muted tabular-nums mr-1.5">{{ String(idx + 1).padStart(2, '0') }}</span>{{ o.host }}</span>
            <span class="text-rosso font-bold text-sm tabular-nums shrink-0">{{ o.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">조회된 문제(알람)가 없습니다.</p>
      </AnalysisCard>

      <!-- 3. 스토리지 -->
      <AnalysisCard v-if="view.showAnalysisStorage" :pdf="pdf" title="스토리지 포화 임박 예측">
        <template #icon><Icon name="HardDrive" class="w-5 h-5 text-sig-warning" /></template>
        <div v-if="a.storageForecast.length > 0" class="flex flex-col gap-2.5">
          <div v-for="(item, idx) in a.storageForecast" :key="idx" class="p-2.5" :class="c.cell">
            <div class="flex justify-between items-center mb-1.5 gap-2">
              <span class="text-xs font-semibold truncate" :class="c.strong" :title="item.hosts?.[0]?.name">{{ item.hosts?.[0]?.name }}</span>
              <span v-if="item.prediction.status === 'critical'" class="report-badge inline-flex items-center justify-center h-[22px] leading-none text-[10px] px-2 font-bold uppercase tracking-cta bg-rosso text-ink shrink-0">Critical</span>
              <span v-else-if="item.prediction.status === 'warning'" class="report-badge inline-flex items-center justify-center h-[22px] leading-none text-[10px] px-2 font-bold uppercase tracking-cta shrink-0" :class="pdf ? 'bg-orange-100 text-orange-700' : 'text-sig-warning border border-sig-warning/40'">D-{{ item.prediction.daysLeft }}</span>
              <span v-else class="report-badge inline-flex items-center justify-center h-[22px] leading-none text-[10px] px-2 font-bold uppercase tracking-cta shrink-0" :class="pdf ? 'bg-green-50 text-green-700' : 'text-sig-success border border-sig-success/40'">Stable</span>
            </div>
            <div class="flex justify-between items-end gap-2">
              <span class="text-[10px] truncate flex-1" :class="c.sub" :title="item.name">{{ item.name }}</span>
              <span class="text-sm font-bold tabular-nums shrink-0" :class="c.heading">{{ item.prediction.current.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">예측 가능한 데이터가 부족합니다.</p>
      </AnalysisCard>

      <!-- 4. CPU -->
      <AnalysisCard v-if="view.showAnalysisCpu" :pdf="pdf" title="CPU 평균 점유율 Top 5">
        <template #icon><Icon name="Cpu" class="w-5 h-5 text-sig-info" /></template>
        <div v-if="a.combinedTopItems.some((d) => d.cpuItem)" class="flex flex-col gap-3.5 mt-1">
          <div v-for="(d, idx) in a.combinedTopItems" :key="idx">
            <div class="flex justify-between text-xs mb-1.5 gap-2">
              <span class="font-medium truncate" :class="c.strong" :title="d.hostName">{{ d.hostName }}</span>
              <span class="font-bold tabular-nums shrink-0" :class="!d.cpuItem ? c.faint : d.cpuVal > 80 ? 'text-rosso' : c.heading">{{ d.cpuItem ? `${d.cpuVal.toFixed(1)}%` : 'N/A' }}</span>
            </div>
            <div class="h-1 w-full overflow-hidden" :class="c.track">
              <div class="h-full" :class="!d.cpuItem ? 'bg-transparent' : d.cpuVal > 80 ? 'bg-rosso' : 'bg-sig-info'" :style="{ width: `${Math.min(100, d.cpuVal)}%` }"></div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">CPU 데이터가 없습니다.</p>
      </AnalysisCard>

      <!-- 5. 메모리 -->
      <AnalysisCard v-if="view.showAnalysisMemory" :pdf="pdf" title="메모리 평균 점유율 Top 5">
        <template #icon><Icon name="Database" class="w-5 h-5 text-sig-info" /></template>
        <div v-if="a.combinedTopItems.some((d) => d.memItem)" class="flex flex-col gap-3.5 mt-1">
          <div v-for="(d, idx) in a.combinedTopItems" :key="idx">
            <div class="flex justify-between text-xs mb-1.5 gap-2">
              <span class="font-medium truncate" :class="c.strong" :title="d.hostName">{{ d.hostName }}</span>
              <span class="font-bold tabular-nums shrink-0" :class="!d.memItem ? c.faint : d.memVal > 80 ? 'text-rosso' : c.heading">{{ d.memItem ? `${d.memVal.toFixed(1)}%` : 'N/A' }}</span>
            </div>
            <div class="h-1 w-full overflow-hidden" :class="c.track">
              <div class="h-full" :class="!d.memItem ? 'bg-transparent' : d.memVal > 80 ? 'bg-rosso' : 'bg-sig-info'" :style="{ width: `${Math.min(100, d.memVal)}%` }"></div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">메모리 데이터가 없습니다.</p>
      </AnalysisCard>

      <!-- 6. 급증 -->
      <AnalysisCard v-if="view.showAnalysisSpikes" :pdf="pdf" title="유의미한 사용량 급증 감지">
        <template #icon><Icon name="TrendingUp" class="w-5 h-5 text-rosso" /></template>
        <p class="text-[10px] mb-3 pb-2 border-b uppercase tracking-cta" :class="[c.faint, c.divider]">Distinct upward trend</p>
        <div v-if="a.spikes.length > 0" class="flex flex-col gap-2.5">
          <div v-for="(item, idx) in a.spikes" :key="idx" class="flex flex-col p-2.5" :class="c.cell">
            <div class="flex justify-between items-center mb-1 gap-2">
              <span class="font-semibold text-xs truncate" :class="c.strong" :title="item.hosts?.[0]?.name">{{ item.hosts?.[0]?.name }}</span>
              <span class="text-rosso font-bold text-[11px] tabular-nums shrink-0">+{{ item.deltaPercent.toFixed(1) }}{{ item.isPercent ? '%p' : '%' }}</span>
            </div>
            <div class="text-[10px] flex justify-between items-end gap-2" :class="c.sub">
              <span class="truncate flex-1" :title="item.name">{{ item.name }}</span>
              <span class="shrink-0 tabular-nums">{{ item.firstVal.toFixed(1) }} → <strong class="text-rosso">{{ item.lastVal.toFixed(1) }}</strong></span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">급증 이상 징후가 없습니다.<br /><span class="text-xs">(안정적 상태)</span></p>
      </AnalysisCard>

      <!-- 7. 네트워크 -->
      <AnalysisCard v-if="view.showAnalysisNetwork" :pdf="pdf" title="네트워크 트래픽 점유율 Top 5" :col-span="pdf ? 3 : 1">
        <template #icon><Icon name="Globe" class="w-5 h-5 text-sig-info" /></template>
        <p class="text-[10px] mb-3 pb-2 border-b uppercase tracking-cta" :class="[c.faint, c.divider]">Highest average bandwidth</p>
        <div v-if="a.networkTop.length > 0" class="grid gap-2.5 mt-1" :class="pdf ? 'grid-cols-3' : 'grid-cols-1'">
          <div v-for="(item, idx) in a.networkTop" :key="idx" class="flex justify-between items-center p-3.5 gap-2" :class="c.cell">
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-sm truncate mb-0.5" :class="c.strong" :title="item.hosts?.[0]?.name">{{ item.hosts?.[0]?.name }}</div>
              <div class="text-xs truncate" :class="c.sub" :title="item.name">{{ item.name }}</div>
            </div>
            <div class="text-base font-bold tabular-nums text-sig-info ml-3 shrink-0">{{ netValue(item) }}</div>
          </div>
        </div>
        <p v-else class="text-sm text-center py-4" :class="c.faint">유의미한 대역폭(1Kbps 초과) 노드가 없습니다.</p>
      </AnalysisCard>

    </div>
  </div>
</template>
