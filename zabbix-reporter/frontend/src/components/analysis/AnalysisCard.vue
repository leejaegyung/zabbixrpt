<script setup>
defineProps({
  title: { type: String, required: true },
  centerContent: { type: Boolean, default: false },
  colSpan: { type: Number, default: 1 },
  pdf: { type: Boolean, default: false }, // PDF=라이트 카드, 웹=다크 카드
})
</script>

<template>
  <div class="p-6 flex flex-col h-full"
    :class="[
      colSpan === 3 ? 'col-span-3' : '',
      pdf ? 'min-h-[300px] bg-white border border-gray-200 rounded-2xl shadow-sm' : 'min-h-[360px] bg-elevated border border-hairline rounded-none',
    ]">
    <div class="flex items-center mb-5 pb-4 border-b shrink-0" :class="pdf ? 'border-gray-100' : 'border-hairline'">
      <div class="flex items-center justify-center w-8 h-8 mr-3 shrink-0 p-1.5" :class="pdf ? 'bg-gray-50 rounded-lg' : 'bg-elevated-2'">
        <slot name="icon" />
      </div>
      <h4 :class="pdf ? 'text-gray-800 text-base font-bold' : 'text-[13px] font-semibold text-ink uppercase tracking-nav'">{{ title }}</h4>
    </div>
    <div class="flex-grow flex flex-col" :class="centerContent ? 'justify-center' : 'justify-start'">
      <slot />
    </div>
  </div>
</template>
