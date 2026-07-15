import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import App from './App.vue'
import './style.css'
import { ellipsisTooltip } from './directives/ellipsisTooltip.js'

createApp(App).use(createPinia()).directive('ellipsis-tooltip', ellipsisTooltip).mount('#app')
