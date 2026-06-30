<script setup>
// PDF 캡처용 오프스크린 DOM. .pdf-page 단위로 html2canvas가 캡처한다.
import { computed } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useViewSettingsStore } from '../../stores/viewSettings.js'
import { useAdvancedStore } from '../../stores/advanced.js'
import { useConnectionStore } from '../../stores/connection.js'
import { getItemId, getHostStatusInfo, getSeverityColor, getSeverityText, formatItemValue } from '../../composables/useFormat.js'
import PdfPage from './PdfPage.vue'
import AnalysisSection from '../analysis/AnalysisSection.vue'
import Icon from '../common/Icon.vue'

const HOSTS_PER_PAGE = 16
const PROBLEMS_PER_PAGE = 16

const data = useDataStore()
const view = useViewSettingsStore()
const adv = useAdvancedStore()
const conn = useConnectionStore()

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
const isSel = (item) => data.selectedIds.includes(getItemId(item))

const showHosts = computed(() => ['dashboard', 'hosts'].includes(data.dataType))
const showProblems = computed(() => ['dashboard', 'problems'].includes(data.dataType))
const showItems = computed(() => ['dashboard', 'items'].includes(data.dataType))

const selHosts = computed(() => data.hostsData.filter(isSel))
const selProblems = computed(() => data.problemsData.filter(isSel))
const selItems = computed(() => data.itemsData.filter(isSel))

const hostPages = computed(() => chunk(selHosts.value, HOSTS_PER_PAGE))
const problemPages = computed(() => chunk(selProblems.value, PROBLEMS_PER_PAGE))
const itemPages = computed(() => chunk(selItems.value, adv.itemsPerPageGrid))

const showAnalysisPage = computed(() => view.showSectionAnalysis && view.includeAnalysisInPdf && view.anyAnalysisVisible)

const displayIp = (item) =>
  (item.interfaces?.find((inf) => String(inf.available) === '2') ||
    item.interfaces?.find((inf) => String(inf.available) === '1') ||
    item.interfaces?.[0])?.ip || 'N/A'
const fmtDateTime = (clock) => new Date(parseInt(clock) * 1000).toLocaleString('ko-KR')

const itemGridCols = computed(() => (adv.graphSize === 'small' ? 'grid-cols-3' : adv.graphSize === 'large' ? 'grid-cols-1' : 'grid-cols-2'))

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
</script>

<template>
  <!-- 화면 밖에 배치(레이아웃은 유지)되어 html2canvas가 캡처 가능 -->
  <div style="position: fixed; left: -100000px; top: 0; width: 1000px;">
    <!-- 1. 분석 페이지 -->
    <PdfPage v-if="showAnalysisPage" title="인프라 7대 스마트 분석" :show-header="true">
      <template #icon><Icon name="Sparkles" class="w-8 h-8 mr-3 text-indigo-600" /></template>
      <AnalysisSection pdf />
    </PdfPage>

    <!-- 2. 호스트 페이지 -->
    <PdfPage v-for="(page, pi) in (showHosts ? hostPages : [])" :key="'h' + pi"
      :title="pi === 0 ? '호스트 상태' : ''" :show-header="pi === 0">
      <template #icon><Icon name="Server" class="w-8 h-8 mr-3 text-blue-600" /></template>
      <table class="w-full text-left border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-100 border-b border-gray-300">
            <th class="py-3 px-4 font-semibold text-sm text-gray-700">호스트명</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700">시스템명</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700">IP 주소</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700 text-center">상태</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in page" :key="getItemId(item)">
            <td class="py-3 px-4 text-sm font-medium">{{ item.name }}</td>
            <td class="py-3 px-4 text-sm text-gray-500">{{ item.host }}</td>
            <td class="py-3 px-4 text-sm text-gray-600">{{ displayIp(item) }}</td>
            <td class="py-3 px-4 text-sm text-center">
              <span v-if="getHostStatusInfo(item) === 'DISABLED'" class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">비활성</span>
              <span v-else-if="getHostStatusInfo(item) === 'NORMAL'" class="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">ZBX 정상</span>
              <span v-else-if="getHostStatusInfo(item) === 'ERROR'" class="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">ZBX 오류</span>
              <span v-else class="px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">상태 대기</span>
            </td>
          </tr>
        </tbody>
      </table>
    </PdfPage>

    <!-- 3. 문제(알람) 페이지 -->
    <PdfPage v-for="(page, pi) in (showProblems ? problemPages : [])" :key="'p' + pi"
      :title="pi === 0 ? '최근 문제(알람)' : ''" :show-header="pi === 0">
      <template #icon><Icon name="AlertCircle" class="w-8 h-8 mr-3 text-red-500" /></template>
      <table class="w-full text-left border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-100 border-b border-gray-300">
            <th class="py-3 px-4 font-semibold text-sm text-gray-700 w-48">발생 시간</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700 w-40">호스트</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700 w-24">심각도</th>
            <th class="py-3 px-4 font-semibold text-sm text-gray-700">문제 내용</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in page" :key="getItemId(item)">
            <td class="py-3 px-4 text-sm text-gray-600">{{ fmtDateTime(item.clock) }}</td>
            <td class="py-3 px-4 text-sm text-gray-700 font-medium">{{ item.hosts?.[0]?.name || 'N/A' }}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2.5 py-1 rounded-md text-xs font-bold" :class="getSeverityColor(item.severity)">{{ getSeverityText(item.severity) }}</span></td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">{{ item.name }}</td>
          </tr>
        </tbody>
      </table>
    </PdfPage>

    <!-- 4. 아이템 페이지 -->
    <PdfPage v-for="(page, pi) in (showItems ? itemPages : [])" :key="'i' + pi"
      :title="pi === 0 ? '관제 아이템 및 트렌드' : ''" :show-header="pi === 0">
      <template #icon><Icon name="Activity" class="w-8 h-8 mr-3 text-green-600" /></template>
      <div class="grid gap-6" :class="itemGridCols">
        <div v-for="item in page" :key="item.itemid" class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
          <div class="flex justify-between items-start mb-3 gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider break-words">{{ item.hosts?.[0]?.name || 'Unknown Host' }}</p>
              <h3 class="text-lg font-bold text-gray-900 break-words" :title="item.name">{{ item.name }}</h3>
            </div>
            <p class="text-xl font-black text-blue-600 whitespace-nowrap shrink-0">{{ formatItemValue(item) }}</p>
          </div>
          <div class="flex-grow w-full bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex justify-center items-center min-h-[120px]">
            <img :src="graphUrl(item)" class="w-full h-full object-contain" />
          </div>
          <p class="text-[10px] text-gray-400 mt-2 text-right">마지막 수집: {{ fmtDateTime(item.lastclock) }}</p>
        </div>
      </div>
    </PdfPage>
  </div>
</template>
