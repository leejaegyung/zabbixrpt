<script setup>
import { computed, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useViewSettingsStore } from '../../stores/viewSettings.js'
import { getItemId, getHostStatusInfo } from '../../composables/useFormat.js'
import Icon from '../common/Icon.vue'
import Pagination from '../common/Pagination.vue'

const PER_PAGE = 10
const data = useDataStore()
const view = useViewSettingsStore()

const baseArr = computed(() => (data.dataType === 'dashboard' || data.dataType === 'hosts' ? data.hostsData : []))
const uniqueHostGroups = computed(() =>
  Array.from(new Set(data.hostsData.flatMap((h) => h.hostgroups?.map((g) => g.name) || []))).sort(),
)
const filteredArr = computed(() =>
  baseArr.value.filter((item) => {
    const statusMatch = view.hostStatusFilter === 'ALL' || getHostStatusInfo(item) === view.hostStatusFilter
    const groupMatch = view.hostGroupFilter === 'ALL' || (item.hostgroups && item.hostgroups.some((g) => g.name === view.hostGroupFilter))
    return statusMatch && groupMatch
  }),
)
const paginatedArr = computed(() => filteredArr.value.slice((view.hostPage - 1) * PER_PAGE, view.hostPage * PER_PAGE))
const allChecked = computed(() => filteredArr.value.length > 0 && filteredArr.value.every((i) => data.selectedIds.includes(getItemId(i))))

watch(() => [data.hostsData, view.hostStatusFilter, view.hostGroupFilter], () => (view.hostPage = 1))

const displayIp = (item) =>
  (item.interfaces?.find((inf) => String(inf.available) === '2') ||
    item.interfaces?.find((inf) => String(inf.available) === '1') ||
    item.interfaces?.[0])?.ip || 'N/A'
const errText = (item) => item.interfaces?.find((inf) => String(inf.available) === '2')?.error || '연결 오류'
</script>

<template>
  <div v-if="baseArr.length > 0" class="mb-6 bg-elevated border border-hairline rounded-none overflow-hidden flex flex-col">
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-4 border-b border-hairline shrink-0">
      <button @click="view.toggleCollapse('hosts')" class="flex items-center group" :title="view.collapsed.hosts ? '펼치기' : '접기'">
        <Icon name="ChevronDown" class="w-5 h-5 mr-2 text-muted transition-transform group-hover:text-ink" :class="{ '-rotate-90': view.collapsed.hosts }" />
        <Icon name="Server" class="w-4 h-4 mr-2.5 text-sig-info" />
        <span class="text-[13px] font-semibold text-ink uppercase tracking-nav">Hosts</span>
      </button>
      <div class="flex gap-2 flex-wrap">
        <select v-model="view.hostGroupFilter" class="text-[12px] text-body bg-elevated-2 border border-hairline rounded-none px-2.5 py-1.5 outline-none cursor-pointer hover:border-hairline-strong focus:border-rosso transition-colors max-w-[200px]">
          <option value="ALL">그룹: 전체</option>
          <option v-for="group in uniqueHostGroups" :key="group" :value="group">{{ group }}</option>
        </select>
        <select v-model="view.hostStatusFilter" class="text-[12px] text-body bg-elevated-2 border border-hairline rounded-none px-2.5 py-1.5 outline-none cursor-pointer hover:border-hairline-strong focus:border-rosso transition-colors">
          <option value="ALL">상태: 전체</option>
          <option value="NORMAL">ONLINE</option>
          <option value="ERROR">ERROR</option>
          <option value="UNKNOWN">PENDING</option>
          <option value="DISABLED">DISABLED</option>
        </select>
      </div>
    </div>

    <div v-show="!view.collapsed.hosts">
    <div v-if="filteredArr.length > 0" class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-elevated-2 border-b border-hairline">
            <th class="py-3 px-4 w-12 text-center"><input type="checkbox" :checked="allChecked" @change="data.toggleAll(filteredArr)" class="w-4 h-4 rounded-none bg-elevated border-hairline-strong text-rosso cursor-pointer" /></th>
            <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft">Host</th>
            <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft">System</th>
            <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft">IP</th>
            <th class="py-3 px-4 text-[11px] uppercase tracking-cta font-semibold text-muted-soft text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr v-for="item in paginatedArr" :key="getItemId(item)"
            class="hover:bg-elevated-2 transition-colors" :class="{ 'opacity-40': !data.selectedIds.includes(getItemId(item)) }">
            <td class="py-3 px-4 text-center"><input type="checkbox" :checked="data.selectedIds.includes(getItemId(item))" @change="data.toggleSelection(getItemId(item))" class="w-4 h-4 cursor-pointer rounded-none bg-elevated-2 border-hairline-strong text-rosso" /></td>
            <td class="py-3 px-4 text-sm font-medium text-ink">{{ item.name }}</td>
            <td class="py-3 px-4 text-sm text-muted">{{ item.host }}</td>
            <td class="py-3 px-4 text-sm text-body tabular-nums">{{ displayIp(item) }}</td>
            <td class="py-3 px-4 text-sm text-center">
              <span v-if="getHostStatusInfo(item) === 'DISABLED'" class="pill bg-elevated-2 text-muted">Disabled</span>
              <span v-else-if="getHostStatusInfo(item) === 'NORMAL'" class="pill bg-sig-success/10 text-sig-success">Online</span>
              <span v-else-if="getHostStatusInfo(item) === 'ERROR'" :title="errText(item)" class="pill bg-rosso/15 text-rosso">Error</span>
              <span v-else class="pill bg-elevated-2 text-muted-soft">Pending</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="p-8 text-center text-muted bg-elevated-2 border-t border-hairline text-sm">조건에 맞는 호스트 데이터가 없습니다.</div>
    <Pagination v-if="filteredArr.length > 0" :page="view.hostPage" :total="filteredArr.length" :per-page="PER_PAGE" @update:page="view.hostPage = $event" />
    </div>
  </div>
</template>
