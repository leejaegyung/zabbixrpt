<script setup>
// Zabbix API 토큰 발급 안내 모달.
import { useUiStore } from '../../stores/ui.js'
import Icon from './Icon.vue'

const ui = useUiStore()

const steps = [
  '<b class="font-semibold">Users → API tokens</b> 메뉴로 이동',
  '<b class="font-semibold">Create API token</b> 클릭',
  '이름·만료일을 지정하고 대상 사용자 선택',
  '생성된 <b class="font-semibold">Auth token</b> 문자열을 복사',
  '좌측 <b class="font-semibold">API Token</b> 입력칸에 붙여넣기',
]
</script>

<template>
  <div v-if="ui.isTokenHelpOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    @click="ui.isTokenHelpOpen = false">
    <div class="bg-elevated border border-hairline-strong rounded-none p-6 w-[460px] max-w-full" @click.stop>
      <div class="flex justify-between items-center mb-5 border-b border-hairline pb-4">
        <p class="eyebrow flex items-center"><Icon name="HelpCircle" class="w-3.5 h-3.5 mr-2 text-rosso" /> API Token Guide</p>
        <button @click="ui.isTokenHelpOpen = false" class="btn-ghost w-7 h-7"><Icon name="X" class="w-4 h-4" /></button>
      </div>
      <div class="text-sm text-body space-y-4">
        <p>Zabbix 프론트엔드에 관리자로 로그인한 뒤 아래 순서로 토큰을 발급하세요.</p>
        <ol class="space-y-2.5">
          <li v-for="(step, i) in steps" :key="i" class="flex gap-3">
            <span class="text-rosso font-bold tabular-nums shrink-0">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="text-ink" v-html="step"></span>
          </li>
        </ol>
        <div class="bg-canvas border-l-2 border-l-rosso p-3 text-xs text-body">
          Zabbix 7.0 이상은 Bearer 토큰 방식을 사용합니다. 토큰은 서버 프록시로만 전달되며 브라우저에 평문 저장되지 않습니다.
        </div>
      </div>
      <div class="mt-6 pt-4 border-t border-hairline">
        <button @click="ui.isTokenHelpOpen = false" class="btn-rosso w-full">확인</button>
      </div>
    </div>
  </div>
</template>
