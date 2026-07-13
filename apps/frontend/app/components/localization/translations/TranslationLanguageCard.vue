<script setup lang="ts">
import type { Language } from "~/types";
import { useTranslation } from '~/composables/localization/useTranslation'

const props = defineProps<{
  lang: Language,
  isRef: boolean,
}>()

const progress = defineModel<{
  count: number
  liveCount?: number
  pendingCount?: number
  total: number
  percentage: number
}>('progress', { required: true })

const emit = defineEmits<{
  (e: 'editList', lang: Language): void
}>()

const { openTranslationMode } = useTranslation()
</script>

<template>
  <div class="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl relative overflow-hidden hover:border-neutral-700 hover:-translate-y-1 transition-all duration-300 group">
    <!-- Header -->
    <div class="flex flex-row p-4 space-x-4 items-center z-10 relative">
      <!-- Flag -->
      <div class="flex flex-col justify-center items-center bg-neutral-800/50 rounded-full w-14 h-14 shrink-0 shadow-inner border border-neutral-700/50">
        <span class="text-3xl leading-none">{{ lang.flag }}</span>
      </div>

      <!-- Language Name+Code -->
      <div class="flex flex-col flex-grow min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="font-bold text-lg text-white truncate">{{ lang.name }}</h2>
          <u-badge v-if="props.isRef" variant="subtle" color="primary" size="xs" class="uppercase tracking-wider">Ref</u-badge>
        </div>
        <p class="text-xs text-neutral-400 font-mono">{{ lang.code }}</p>
      </div>
      
      <!-- Circular Progress -->
      <div class="relative w-12 h-12 shrink-0 flex items-center justify-center">
        <svg class="w-12 h-12 transform -rotate-90 absolute inset-0">
          <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="3" fill="transparent" class="text-neutral-800" />
          <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="3" fill="transparent" stroke-linecap="round"
                  :stroke-dasharray="125.6" 
                  :stroke-dashoffset="125.6 * (1 - progress.percentage / 100)" 
                  class="transition-all duration-1000 ease-out"
                  :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'text-success-500' : 'text-primary-500'" />
        </svg>
        <span class="text-[10px] font-bold" :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'text-success-500' : 'text-primary-500'">{{ progress.percentage }}%</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-3 gap-px bg-neutral-800 border-y border-neutral-800">
      <div class="flex flex-col items-center justify-center p-3 bg-neutral-900">
        <span class="text-lg font-bold" :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'text-success-400' : 'text-neutral-200'">{{ progress.liveCount || 0 }}</span>
        <span class="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Live</span>
      </div>
      <div class="flex flex-col items-center justify-center p-3 bg-neutral-900 relative overflow-hidden">
        <div v-if="(progress.pendingCount || 0) > 0" class="absolute inset-0 bg-warning-500/5" />
        <span class="text-lg font-bold" :class="(progress.pendingCount || 0) > 0 ? 'text-warning-400' : 'text-neutral-600'">{{ progress.pendingCount || 0 }}</span>
        <span class="text-[10px] uppercase tracking-wider font-semibold" :class="(progress.pendingCount || 0) > 0 ? 'text-warning-500/70' : 'text-neutral-500'">Pending</span>
      </div>
      <div class="flex flex-col items-center justify-center p-3 bg-neutral-900">
        <span class="text-lg font-bold text-neutral-400">{{ progress.total - progress.count }}</span>
        <span class="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Missing</span>
      </div>
    </div>

    <!-- Buttons -->
    <div class="flex flex-row p-2 gap-2 bg-neutral-900/50">
      <u-button
          variant="soft"
          color="neutral"
          size="sm"
          icon="i-lucide-square-pen"
          class="flex-1 justify-center hover:bg-neutral-800"
          @click="emit('editList', lang)"
      >
        Edit
      </u-button>
      <u-button
          color="neutral"
          size="sm"
          icon="i-lucide-play"
          :disabled="progress.percentage === 100 || progress.total === 0"
          class="flex-1 justify-center"
          :class="(progress.percentage === 100 && progress.total > 0) ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''"
          @click="openTranslationMode(lang)"
      >
        Continue
      </u-button>
    </div>
  </div>
</template>