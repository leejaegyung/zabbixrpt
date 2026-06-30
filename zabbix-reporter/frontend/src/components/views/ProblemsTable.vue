<script setup>
import { computed, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useViewSettingsStore } from '../../stores/viewSettings.js'
import { getItemId, getSeverityColor, getSeverityText, severityOptions } from '../../composables/useFormat.js'
import Icon from '../common/Icon.vue'
import Pagination from '../common/Pagination.vue'

const PER_PAGE = 10
const data = useDataStore()
const view = useViewSettingsStore()

const baseArr = computed(() => (data.dataType === 'dashboard' || data.dataType === 'problems' ? data.problemsData : []))
const uniqueHosts = computed(() => Array.from(new Set(baseArr.value.map((i) => i.hosts?.[0]?.name || 'Unknown Host'))).sort())
const uniqueGroups = computed(() => {
  const s = new Set()
  baseArr.value.forEach((i) => i.groups?.forEach((g) => s.add(g.name)))
  return Array.from(s).sort()
})
const filteredArr = computed(() =>
  baseArr.value.filter((item) => {
    const sevMatch = view.problemSeverityFilters.includes('ALL') || view.problemSeverityFilters.includes(String(item.severity))
    const hostMatch = view.problemHostFilter === 'ALL' || (item.hosts?.[0]?.name || 'Unknown Host') === view.problemHostFilter
    const groupMatch = view.problemGroupFilter === 'ALL' || (item.groups && item.groups.some((g) => g.name === view.problemGroupFilter))
    return sevMatch && hostMatch && groupMatch
  }),
)
const paginatedArr = computed(() => filteredArr.value.slice((view.problemPage - 1) * PER_PAGE, view.problemPage * PER_PAGE))
const allChecked = computed(() => filteredArr.value.length > 0 && filteredArr.value.every((i) => data.selectedIds.includes(getItemId(i))))

watch(() => [data.problemsData, view.problemSeverityFilters, view.problemHostFilter, view.problemGroupFilter], () => (view.problemPage = 1))

const fmtDate = (clock) => new Date(parseInt(clock) * 1000).toLocaleDateString('ko-KR')
const fmtTime = (clock) => new Date(parseInt(clock) * 1000).toLocaleTimeString('ko-KR')
</script>

<template>
  <div v-if="baseArr.length > 0" class="mb-6 bg-elevated border border-hairline rounded-none overflow-hidden flex flex-col">
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-4 border-b border-hairline shrink-0">
      <button @click="view.toggleCollapse('problems')" class="flex items-center group" :title="view.collapsed.problems ? '펼치기' : '접기'">
        <Icon name="ChevronDown" class="w-5 h-5 mr-2 text-muted transition-transform group-hover:text-ink" :class="{ '-rotate-90': view.collapsed.problems }" />
        <Icon name="AlertCircle" class="w-4 h-4 mr-2.5 text-rosso" />
        <span class="text-[13px] font-semibold text-ink uppercase tracking-nav">Problems</span>
      </button>
      <div class="flex gap-2 flex-wrap">
        <select v-model="view.problemGroupFilter" class="text-[12px] text-body bg-elevated-2 border border-hairline rounded-none px-2.5 py-1.5 outline-none cursor-pointer hover:border-hairline-strong focus:border-rosso transition-colors max-w-[160px]">
          <option value="ALL">그룹: 전체</option>
          <option v-for="g in uniqueGroups" :key="g" :value="g">{{ g }}</option>
        </select>
        <select v-model="view.problemHostFilter" class="text-[12px] text-body bg-elevated-2 border border-hairline rounded-none px-2.5 py-1.5 outline-none cursor-pointer hover:border-hairline-strong focus:border-rosso transition-colors max-w-[160px]">
          <option value="ALL">호스트: 전체</option>
          <option v-for="h in uniqueHosts" :key="h" :value="h">{{ h }}</option>
        </select>
      </div>
    </div>

    <div v-show="!view.collapsed.problems" class="flex flex-col md:flex-row">
      <div class="w-full md:w-40 shrink-0 flex flex-col gap-1.5 bg-elevated-2 border-r border-hairline p-4">
        <span class="eyebrow mb-2 pb-2 border-b border-hairline">Severity</span>
        <button @click="view.toggleProblemSeverity('ALL')"
          class="text-left text-[12px] px-3 py-2 rounded-none border transition-all uppercase tracking-cta font-semibold"
          :class="view.problemSeverityFilters.includes('ALL') ? 'bg-ink text-canvas border-ink' : 'bg-transparent text-body border-hairline hover:border-hairline-strong hover:text-ink'">All</button>
        <button v-for="opt in severityOptions" :key="opt.value" @click="view.toggleProblemSeverity(String(opt.value))"
          class="text-left text-[12px] px-3 py-2 rounded-none border transition-all font-semibold"
          :class="view.problemSeverityFilters.includes(String(opt.value)) ? opt.colorClass + ' font-bold' : 'bg-transparent text-body border-hairline hover:border-hairline-strong hover:text-ink'">{{ opt.label }}</button>
      </div>

      <div class="flex-1 flex flex-col min-w-0">
        <div v-if="filteredArr.length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-elevated-2 border-b border-hairline">
                <th class="py-3 px-4 w-12 text-center"><input type="checkbox" :checked="allChecked" @change="data.toggleAll(filteredArr)" class="w-4 h-4 rounded-none bg-elevated border-hairline-strong text-rosso cursor-pointer" /></th>
                <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft w-44">Time</th>
                <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft w-32">Host</th>
                <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft w-24">Severity</th>
                <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft">Problem</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              <tr v-for="item in paginatedArr" :key="getItemId(item)"
                class="hover:bg-elevated-2 transition-colors" :class="{ 'opacity-40': !data.selectedIds.includes(getItemId(item)) }">
                <td class="py-3 px-4 text-center"><input type="checkbox" :checked="data.selectedIds.includes(getItemId(item))" @change="data.toggleSelection(getItemId(item))" class="w-4 h-4 cursor-pointer rounded-none bg-elevated-2 border-hairline-strong text-rosso" /></td>
                <td class="py-3 px-4 text-sm text-body leading-tight tabular-nums">{{ fmtDate(item.clock) }}<br /><span class="text-xs text-muted">{{ fmtTime(item.clock) }}</span></td>
                <td class="py-3 px-4 text-sm text-body font-medium">{{ item.hosts?.[0]?.name || 'N/A' }}</td>
                <td class="py-3 px-4 text-sm"><span class="pill" :class="getSeverityColor(item.severity)">{{ getSeverityText(item.severity) }}</span></td>
                <td class="py-3 px-4 text-sm font-medium text-ink break-words" :title="item.name">{{ item.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-8 text-center text-muted flex-1 flex items-center justify-center text-sm">조건에 맞는 알람 데이터가 없습니다.</div>
        <Pagination v-if="filteredArr.length > 0" :page="view.problemPage" :total="filteredArr.length" :per-page="PER_PAGE" @update:page="view.problemPage = $event" />
      </div>
    </div>
  </div>
</template>
