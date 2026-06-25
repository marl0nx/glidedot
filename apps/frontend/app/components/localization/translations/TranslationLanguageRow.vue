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
  <div class="flex flex-row items-center p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all duration-300 gap-4 group">
    <!-- Flag & Name -->
    <div class="flex items-center gap-3 w-48 shrink-0">
      <div class="flex items-center justify-center w-10 h-10 bg-neutral-800/50 rounded-full border border-neutral-700/50 shadow-inner">
        <span class="text-2xl leading-none">{{ lang.flag }}</span>
      </div>
      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-sm text-white truncate">{{ lang.name }}</span>
          <u-badge v-if="props.isRef" variant="subtle" color="primary" size="xs" class="text-[9px] px-1 py-0 leading-tight">REF</u-badge>
        </div>
        <span class="text-[10px] text-neutral-400 font-mono">{{ lang.code }}</span>
      </div>
    </div>

    <!-- Progress Bar (Center) -->
    <div class="flex-1 flex items-center gap-3 hidden sm:flex">
      <span class="text-xs font-medium w-9 text-right" :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'text-success-500' : 'text-neutral-300'">{{ progress.percentage }}%</span>
      <div class="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex shadow-inner">
        <div 
          class="h-full transition-all duration-300" 
          :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'bg-success-500' : 'bg-primary-500'"
          :style="{ width: `${((progress.liveCount || 0) / (progress.total || 1)) * 100}%` }"/>
        <div class="bg-warning-500 h-full transition-all duration-300 relative" 
             :style="{ width: `${((progress.pendingCount || 0) / (progress.total || 1)) * 100}%` }">
          <div class="absolute inset-0 bg-black/10" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px);"/>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="hidden lg:flex items-center gap-6 w-48 shrink-0 justify-end text-xs">
      <div class="flex flex-col items-end">
        <span class="font-medium" :class="progress.percentage === 100 && (progress.pendingCount || 0) === 0 ? 'text-success-400' : 'text-neutral-200'">{{ progress.liveCount || 0 }}</span>
        <span class="text-[9px] text-neutral-500 uppercase tracking-wider">Live</span>
      </div>
      <div class="flex flex-col items-end">
        <span class="font-medium" :class="(progress.pendingCount || 0) > 0 ? 'text-warning-400' : 'text-neutral-600'">{{ progress.pendingCount || 0 }}</span>
        <span class="text-[9px] text-neutral-500 uppercase tracking-wider">Pending</span>
      </div>
      <div class="flex flex-col items-end">
        <span class="font-medium text-neutral-400">{{ progress.total - progress.count }}</span>
        <span class="text-[9px] text-neutral-500 uppercase tracking-wider">Missing</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
      <u-button
          variant="soft"
          color="neutral"
          size="sm"
          icon="i-lucide-square-pen"
          class="opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          @click="emit('editList', lang)"
      />
      <u-button
          color="neutral"
          size="sm"
          icon="i-lucide-play"
          :disabled="progress.percentage === 100 || progress.total === 0"
          @click="openTranslationMode(lang)"
      >
        Translate
      </u-button>
    </div>
  </div>
</template>
