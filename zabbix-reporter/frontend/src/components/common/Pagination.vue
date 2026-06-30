<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  perPage: { type: Number, required: true },
})
const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.ceil(props.total / props.perPage))
const prev = () => emit('update:page', Math.max(1, props.page - 1))
const next = () => emit('update:page', Math.min(totalPages.value, props.page + 1))
</script>

<template>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 p-4 bg-elevated border-t border-hairline">
    <button @click="prev" :disabled="page === 1"
      class="px-4 py-1.5 text-[11px] uppercase tracking-cta font-semibold text-body bg-elevated-2 border border-hairline rounded-none hover:text-ink hover:border-hairline-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
    <span class="px-3 text-xs text-body tabular-nums">{{ page }} <span class="text-muted">/ {{ totalPages }}</span></span>
    <button @click="next" :disabled="page === totalPages"
      class="px-4 py-1.5 text-[11px] uppercase tracking-cta font-semibold text-body bg-elevated-2 border border-hairline rounded-none hover:text-ink hover:border-hairline-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
  </div>
</template>
