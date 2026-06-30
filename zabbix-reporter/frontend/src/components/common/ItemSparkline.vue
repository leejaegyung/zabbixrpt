<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  light: {
    type: Boolean,
    default: false,
  },
})

const width = 600
const height = 150
const padX = 18
const padY = 18

const samples = computed(() => {
  const history = Array.isArray(props.item.history) ? props.item.history : []

  return history
    .map((point) => ({
      clock: Number(point.clock),
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.clock) && Number.isFinite(point.value))
    .sort((a, b) => a.clock - b.clock)
})

const hasData = computed(() => samples.value.length > 1)

const domain = computed(() => {
  const values = samples.value.map((point) => point.value)
  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    min -= 1
    max += 1
  }

  return { min, max }
})

const points = computed(() => {
  if (!hasData.value) return ''

  const firstClock = samples.value[0].clock
  const lastClock = samples.value[samples.value.length - 1].clock
  const span = Math.max(lastClock - firstClock, 1)
  const valueSpan = Math.max(domain.value.max - domain.value.min, 1)

  return samples.value
    .map((point) => {
      const x = padX + ((point.clock - firstClock) / span) * (width - padX * 2)
      const y = height - padY - ((point.value - domain.value.min) / valueSpan) * (height - padY * 2)

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const areaPoints = computed(() => {
  if (!points.value) return ''

  return `${padX},${height - padY} ${points.value} ${width - padX},${height - padY}`
})

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 1000000) return value.toExponential(2)
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1)

  return value.toFixed(2)
}
</script>

<template>
  <div class="w-full h-full relative">
    <svg v-if="hasData" viewBox="0 0 600 150" preserveAspectRatio="none" class="w-full h-full">
      <defs>
        <linearGradient :id="`spark-${item.itemid}`" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#ef3328" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#ef3328" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <line v-for="y in [30, 60, 90, 120]" :key="y" x1="18" x2="582" :y1="y" :y2="y"
        :stroke="light ? '#e5e7eb' : '#2c2c2c'" stroke-width="1" />
      <polygon :points="areaPoints" :fill="`url(#spark-${item.itemid})`" />
      <polyline :points="points" fill="none" stroke="#ef3328" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <text x="22" y="20" :fill="light ? '#6b7280' : '#8b8b8b'" font-size="10" font-weight="700">
        max {{ formatNumber(domain.max) }}
      </text>
      <text x="22" y="142" :fill="light ? '#6b7280' : '#8b8b8b'" font-size="10" font-weight="700">
        min {{ formatNumber(domain.min) }}
      </text>
    </svg>

    <div v-else class="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs"
      :class="light ? 'text-gray-500' : 'text-muted'">
      <span class="font-semibold mb-1 uppercase tracking-cta">No history data</span>
      <span>history.get result is empty</span>
    </div>
  </div>
</template>
