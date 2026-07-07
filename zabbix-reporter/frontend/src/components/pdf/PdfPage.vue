<script setup>
// A4 비율 PDF 페이지 (1000 x 1414px). html2canvas 캡처 대상(.pdf-page).
import { useAdvancedStore } from '../../stores/advanced.js'
import Icon from '../common/Icon.vue'

defineProps({
  title: { type: String, default: '' }, // 섹션 제목 (해당 섹션 첫 페이지에만)
  showHeader: { type: Boolean, default: false },
  cover: { type: Boolean, default: false }, // 표지: 섹션 헤더 없이 내용 세로 중앙 정렬
})
const adv = useAdvancedStore()
</script>

<template>
  <div class="pdf-page bg-gray-50 w-[1000px] min-h-[1414px] p-12 relative flex flex-col"
    :class="cover ? 'justify-center' : 'justify-start'">
    <!-- 워터마크 -->
    <div v-if="adv.watermarkText" class="absolute top-1/2 left-1/2 pointer-events-none z-0 opacity-10"
      style="transform: translate(-50%, -50%) rotate(-45deg)">
      <span class="text-[9rem] font-black text-gray-500 whitespace-nowrap">{{ adv.watermarkText }}</span>
    </div>

    <!-- 섹션 헤더 (표지에는 표시하지 않음) -->
    <div v-if="showHeader && !cover" class="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8 relative z-10">
      <h3 class="text-3xl font-bold text-gray-900 flex items-center">
        <slot name="icon" /> {{ title }}
      </h3>
      <img v-if="adv.customLogo" :src="adv.customLogo" class="h-10 w-auto object-contain" />
      <div v-else class="flex items-center text-gray-400 font-bold text-sm">
        <Icon name="Database" class="w-6 h-6 mr-2 text-blue-600" /> Zabbix Report
      </div>
    </div>

    <div class="relative z-10 flex flex-col" :class="cover ? 'justify-center' : 'flex-grow'">
      <slot />
    </div>
  </div>
</template>
