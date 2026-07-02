<script setup>
// 커스텀 alert / confirm 모달 (기존 showAlert/showConfirm 대응).
import { useUiStore } from '../../stores/ui.js'
import Icon from './Icon.vue'

const ui = useUiStore()

const confirm = () => {
  const cb = ui.modalConfig.onConfirm
  ui.closeModal()
  if (cb) cb()
}
</script>

<template>
  <div v-if="ui.modalConfig.isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    @click="ui.closeModal()">
    <div class="bg-elevated border border-hairline-strong rounded-none w-[420px] max-w-full" @click.stop>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex items-center justify-center w-9 h-9 shrink-0" :class="ui.modalConfig.type === 'info' ? 'bg-elevated-2' : 'bg-rosso/15'">
            <Icon :name="ui.modalConfig.type === 'info' ? 'Info' : 'AlertCircle'" class="w-5 h-5" :class="ui.modalConfig.type === 'info' ? 'text-body' : 'text-rosso'" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="display-title text-lg mb-1.5">{{ ui.modalConfig.title }}</h3>
            <p class="text-sm text-body whitespace-pre-line leading-relaxed">{{ ui.modalConfig.message }}</p>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 bg-canvas border-t border-hairline flex justify-end gap-2">
        <button v-if="ui.modalConfig.type === 'confirm'" @click="ui.closeModal()" class="btn-outline px-5 py-2.5">취소</button>
        <button @click="confirm" class="px-5 py-2.5 rounded-none text-[13px] font-bold uppercase tracking-cta text-ink transition-colors"
          :class="ui.modalConfig.type === 'confirm' ? 'bg-rosso hover:bg-rosso-active' : 'bg-ink !text-canvas hover:bg-ink/90'">확인</button>
      </div>
    </div>
  </div>
</template>
