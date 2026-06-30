<script setup>
import { computed } from 'vue'
import { useConnectionStore } from '../../stores/connection.js'
import { useDataStore } from '../../stores/data.js'
import { useUiStore } from '../../stores/ui.js'
import { getLocalTodayStartString } from '../../composables/useFormat.js'
import Icon from '../common/Icon.vue'

const conn = useConnectionStore()
const data = useDataStore()
const ui = useUiStore()

// date/time 분리 입력 ↔ datetime-local 문자열 동기화
const startDay = computed({
  get: () => conn.startDate.split('T')[0],
  set: (v) => (conn.startDate = `${v}T${conn.startDate.split('T')[1] || '00:00'}`),
})
const startTime = computed({
  get: () => conn.startDate.split('T')[1] || '00:00',
  set: (v) => (conn.startDate = `${conn.startDate.split('T')[0] || getLocalTodayStartString().split('T')[0]}T${v}`),
})
const endDay = computed({
  get: () => conn.endDate.split('T')[0],
  set: (v) => (conn.endDate = `${v}T${conn.endDate.split('T')[1] || '23:59'}`),
})
const endTime = computed({
  get: () => conn.endDate.split('T')[1] || '23:59',
  set: (v) => (conn.endDate = `${conn.endDate.split('T')[0] || getLocalTodayStartString().split('T')[0]}T${v}`),
})

const showPicker = (e) => { try { e.target.showPicker() } catch (_) { /* noop */ } }
const inputCls = 'field cursor-pointer'
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-5">
      <p class="eyebrow flex items-center"><Icon name="Settings" class="w-3.5 h-3.5 mr-2 text-rosso" /> Connection</p>
      <button @click="ui.isTokenHelpOpen = true" title="Zabbix API 토큰 발급 안내" class="btn-ghost w-7 h-7">
        <Icon name="HelpCircle" class="w-4 h-4" />
      </button>
    </div>

    <div class="space-y-5">
      <div>
        <label class="eyebrow block mb-2">Zabbix API URL</label>
        <input type="text" :value="conn.url" @input="conn.setUrl($event.target.value)" class="field" />
      </div>
      <div>
        <label class="eyebrow block mb-2">API Token</label>
        <input type="password" :value="conn.token" @input="conn.setToken($event.target.value)"
          placeholder="Zabbix 7.0+ Bearer token" class="field" />
      </div>

      <!-- 기간 설정 -->
      <div class="pt-4 border-t border-hairline">
        <label class="eyebrow flex items-center mb-3"><Icon name="Calendar" class="w-3.5 h-3.5 mr-2 text-muted-soft" /> Time Range</label>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="text-[11px] uppercase tracking-cta font-semibold text-body flex items-center">
              <span class="w-1.5 h-1.5 bg-rosso mr-2"></span>From
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <input type="date" v-model="startDay" @focus="showPicker" @click="showPicker" :class="inputCls" />
              <input type="time" v-model="startTime" @focus="showPicker" @click="showPicker" :class="inputCls" />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="text-[11px] uppercase tracking-cta font-semibold text-body flex items-center">
              <span class="w-1.5 h-1.5 bg-muted-soft mr-2"></span>To
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <input type="date" v-model="endDay" @focus="showPicker" @click="showPicker" :class="inputCls" />
              <input type="time" v-model="endTime" @focus="showPicker" @click="showPicker" :class="inputCls" />
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4 flex flex-col gap-2 border-t border-hairline">
        <button @click="data.fetchAllDashboard()" class="btn-rosso w-full">
          <Icon name="LayoutDashboard" class="w-4 h-4" /><span>전체 갱신</span>
        </button>
        <div class="grid grid-cols-3 gap-2">
          <button @click="data.fetchHosts()" title="호스트" class="btn-ghost py-2.5"><Icon name="Server" class="w-4 h-4" /></button>
          <button @click="data.fetchProblems()" title="문제" class="btn-ghost py-2.5"><Icon name="AlertCircle" class="w-4 h-4" /></button>
          <button @click="data.fetchItems()" title="아이템" class="btn-ghost py-2.5"><Icon name="Activity" class="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
