<script setup>
import { computed, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useViewSettingsStore } from '../../stores/viewSettings.js'
import { useAdvancedStore } from '../../stores/advanced.js'
import { useConnectionStore } from '../../stores/connection.js'
import { getItemId, formatItemValue } from '../../composables/useFormat.js'
import Icon from '../common/Icon.vue'
import Pagination from '../common/Pagination.vue'

const data = useDataStore()
const view = useViewSettingsStore()
const adv = useAdvancedStore()
const conn = useConnectionStore()

const baseArr = computed(() => (data.dataType === 'dashboard' || data.dataType === 'items' ? data.itemsData : []))
const uniqueHosts = computed(() => {
  const s = new Set()
  data.hostsData.forEach((h) => s.add(h.name))
  baseArr.value.forEach((i) => s.add(i.hosts?.[0]?.name || 'Unknown Host'))
  return Array.from(s).sort()
})
const filteredArr = computed(() =>
  baseArr.value.filter((item) => view.itemHostFilter === 'ALL' || (item.hosts?.[0]?.name || 'Unknown Host') === view.itemHostFilter),
)
const perPage = computed(() => adv.itemsPerPageGrid)
const paginatedArr = computed(() => filteredArr.value.slice((view.itemPage - 1) * perPage.value, view.itemPage * perPage.value))
const allChecked = computed(() => filteredArr.value.length > 0 && filteredArr.value.every((i) => data.selectedIds.includes(getItemId(i))))

const gridColsClass = computed(() => (adv.graphSize === 'small' ? 'md:grid-cols-3' : adv.graphSize === 'large' ? 'md:grid-cols-1' : 'md:grid-cols-2'))
const cardHeightClass = computed(() => (adv.graphSize === 'small' ? 'h-[280px]' : adv.graphSize === 'large' ? 'h-[460px]' : 'h-[360px]'))

watch(() => [data.itemsData, view.itemHostFilter, adv.graphSize], () => (view.itemPage = 1))

const baseUrl = computed(() => conn.url.replace(/api_jsonrpc\.php.*$/i, ''))
const fmtGraph = (dt) => (dt ? dt.replace('T', ' ') + ':00' : '')
const graphUrl = (item) => {
  if (item.isMock) return `https://placehold.co/600x150/f9fafb/3b82f6?text=Zabbix+Graph+(${encodeURIComponent(item.name)})`
  let u = `${baseUrl.value}chart.php?itemids[0]=${item.itemid}&type=0&width=600&height=150`
  const { startDate, endDate } = conn
  if (startDate && endDate) u += `&from=${fmtGraph(startDate)}&to=${fmtGraph(endDate)}`
  else if (startDate) u += `&from=${fmtGraph(startDate)}&to=now`
  else if (endDate) u += `&from=now-24h&to=${fmtGraph(endDate)}`
  else u += `&from=now-24h&to=now`
  return u
}
const onImgError = (e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }
const lastClock = (item) => new Date(parseInt(item.lastclock) * 1000).toLocaleString('ko-KR')
</script>

<template>
  <div v-if="baseArr.length > 0" class="mb-6 bg-elevated border border-hairline rounded-none overflow-hidden">
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-4 border-b border-hairline">
      <button @click="view.toggleCollapse('items')" class="flex items-center group" :title="view.collapsed.items ? '펼치기' : '접기'">
        <Icon name="ChevronDown" class="w-5 h-5 mr-2 text-muted transition-transform group-hover:text-ink" :class="{ '-rotate-90': view.collapsed.items }" />
        <Icon name="Activity" class="w-4 h-4 mr-2.5 text-sig-success" />
        <span class="text-[13px] font-semibold text-ink uppercase tracking-nav">Items &amp; Trends</span>
      </button>
      <div class="flex items-center gap-2 flex-wrap">
        <label v-if="filteredArr.length > 0" class="flex items-center gap-2 cursor-pointer text-[11px] uppercase tracking-cta font-semibold text-body hover:text-ink bg-elevated-2 border border-hairline px-2.5 py-1.5 transition">
          <input type="checkbox" :checked="allChecked" @change="data.toggleAll(filteredArr)" class="w-4 h-4 rounded-none bg-elevated border-hairline-strong text-rosso cursor-pointer" />
          <span>Select page</span>
        </label>
        <select v-model="view.itemHostFilter" class="text-[12px] text-body bg-elevated-2 border border-hairline rounded-none px-2.5 py-1.5 outline-none cursor-pointer hover:border-hairline-strong focus:border-rosso transition-colors max-w-[200px]">
          <option value="ALL">호스트: 전체</option>
          <option v-for="host in uniqueHosts" :key="host" :value="host">{{ host }}</option>
        </select>
      </div>
    </div>

    <div v-show="!view.collapsed.items">
    <div v-if="filteredArr.length > 0" class="p-5 bg-canvas">
      <div class="grid grid-cols-1 gap-5" :class="gridColsClass">
        <div v-for="item in paginatedArr" :key="item.itemid"
          class="relative bg-elevated border border-hairline rounded-none p-5 flex flex-col break-inside-avoid transition-colors"
          :class="[cardHeightClass, data.selectedIds.includes(getItemId(item)) ? 'border-l-2 border-l-rosso hover:border-hairline-strong' : 'opacity-40']">
          <div class="flex justify-between items-start mb-4 gap-4">
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-[10px] font-semibold text-muted-soft uppercase tracking-cta break-words mb-1">{{ item.hosts?.[0]?.name || 'Unknown Host' }}</p>
              <h3 class="text-lg font-medium text-ink leading-snug break-words" :title="item.name">{{ item.name }}</h3>
            </div>
            <div class="text-right shrink-0 min-w-max flex flex-col items-end gap-2">
              <div class="flex items-center justify-center cursor-pointer w-7 h-7 bg-elevated-2 border border-hairline-strong hover:border-rosso transition-colors" @click="data.toggleSelection(getItemId(item))">
                <input type="checkbox" :checked="data.selectedIds.includes(getItemId(item))" readonly class="w-4 h-4 cursor-pointer rounded-none bg-transparent border-0 text-rosso pointer-events-none" />
              </div>
              <p class="stat-number text-2xl text-ink whitespace-nowrap break-keep">{{ formatItemValue(item) }}</p>
            </div>
          </div>
          <div class="flex-grow w-full bg-canvas border border-hairline overflow-hidden relative flex justify-center items-center">
            <img :src="graphUrl(item)" class="w-full h-full object-contain" @error="onImgError" />
            <div class="hidden flex-col items-center justify-center p-4 text-center text-xs text-muted"><span class="font-semibold mb-1 uppercase tracking-cta">Graph unavailable</span><span>자빅스 로그인/CORS 확인</span></div>
          </div>
          <p class="text-[10px] text-muted mt-3 text-right uppercase tracking-cta">{{ lastClock(item) }}</p>
        </div>
      </div>
    </div>
    <div v-else class="p-8 text-center text-muted bg-elevated-2 border-t border-hairline text-sm">조건에 맞는 아이템 데이터가 없습니다.</div>
    <Pagination v-if="filteredArr.length > 0" :page="view.itemPage" :total="filteredArr.length" :per-page="perPage" @update:page="view.itemPage = $event" />
    </div>
  </div>
</template>
