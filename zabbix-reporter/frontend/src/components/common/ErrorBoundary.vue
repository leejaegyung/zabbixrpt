<script setup>
// 렌더 오류로 앱 전체가 죽는 것을 막는 에러 바운더리 (기존 8.0 ErrorBoundary 대응).
import { ref, onErrorCaptured } from 'vue'
import Icon from './Icon.vue'

const hasError = ref(false)
const errorInfo = ref(null)

onErrorCaptured((err) => {
  hasError.value = true
  errorInfo.value = err
  return false // 상위로 전파 차단
})
</script>

<template>
  <div v-if="hasError" class="min-h-screen bg-canvas flex items-center justify-center p-6">
    <div class="bg-elevated border border-hairline-strong p-8 rounded-none max-w-lg w-full text-center">
      <Icon name="AlertCircle" class="w-14 h-14 text-rosso mx-auto mb-5" />
      <p class="eyebrow mb-2">Render Error</p>
      <h2 class="display-title text-2xl mb-3">화면 렌더링 중 오류 발생</h2>
      <p class="text-body mb-6 text-sm">
        Zabbix에서 가져온 일부 데이터(빈 이름, 누락된 단위 등)가 예상치 못한 형태여서 화면을 그릴 수 없습니다.
      </p>
      <div class="bg-canvas border border-hairline text-rosso p-4 text-xs text-left overflow-auto max-h-32 mb-6">
        {{ errorInfo?.toString() }}
      </div>
      <button @click="() => window.location.reload()" class="btn-rosso w-full">페이지 새로고침</button>
    </div>
  </div>
  <slot v-else />
</template>
