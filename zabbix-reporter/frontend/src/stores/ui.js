import { defineStore } from 'pinia'

// 모달(alert/confirm) + 전역 UI 플래그.
export const useUiStore = defineStore('ui', {
  state: () => ({
    modalConfig: { isOpen: false, type: 'alert', title: '', message: '', onConfirm: null },
    isTokenHelpOpen: false,
    isSettingsOpen: false,
    isExporting: false,
  }),
  actions: {
    showAlert(title, message, type = 'alert') {
      this.modalConfig = { isOpen: true, type, title, message, onConfirm: null }
    },
    showConfirm(title, message, onConfirm) {
      this.modalConfig = { isOpen: true, type: 'confirm', title, message, onConfirm }
    },
    closeModal() {
      this.modalConfig = { ...this.modalConfig, isOpen: false }
    },
  },
})
