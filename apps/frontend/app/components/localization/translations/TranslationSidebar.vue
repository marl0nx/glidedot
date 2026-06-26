<script setup lang="ts">
import type { TranslationKeyScopeNode } from '~/types'

const props = defineProps<{
  visibleScopes: TranslationKeyScopeNode[]
}>()

const selectedScope = defineModel<string | null>('selectedScope', { default: null })
</script>

<template>
  <div class="w-72 flex-shrink-0 flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl relative overflow-hidden h-fit">
    <div class="p-4 border-b border-neutral-800 bg-neutral-900/50">
      <div class="flex items-center justify-between z-10 relative">
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <u-icon name="i-lucide-folder-tree" class="w-4 h-4 text-primary-500" />
          Namespaces
        </h2>
        <u-badge variant="subtle" color="neutral" size="sm" class="font-mono text-[10px]">{{ visibleScopes.length }}</u-badge>
      </div>
    </div>

    <div class="flex flex-col space-y-0.5 max-h-[600px] overflow-y-auto p-2 z-10 relative custom-scrollbar">
      <!-- "All Keys" Option -->
      <u-button
          :variant="selectedScope === null ? 'soft' : 'ghost'"
          :color="selectedScope === null ? 'primary' : 'neutral'"
          size="sm"
          class="w-full justify-start gap-2 px-3 py-2 transition-all"
          :class="selectedScope === null ? 'font-semibold' : 'text-neutral-400 hover:text-white'"
          @click="selectedScope = null"
      >
        <u-icon
            name="i-lucide-globe"
            class="w-4 h-4 shrink-0"
            :class="selectedScope === null ? 'text-primary-500' : 'text-neutral-500'"
        />
        All Translations
      </u-button>

      <div class="py-2 px-3">
        <div class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Browse</div>
      </div>

      <!-- Scope List -->
      <u-button
          v-for="node in props.visibleScopes"
          :key="node.id"
          :variant="selectedScope === node.id ? 'soft' : 'ghost'"
          :color="selectedScope === node.id ? 'primary' : 'neutral'"
          size="sm"
          class="w-full justify-start gap-2 px-2.5 py-1.5 text-left transition-all"
          :class="selectedScope === node.id ? 'font-semibold' : 'text-neutral-400 hover:text-white'"
          :style="{ paddingLeft: `calc(${node.level * 0.75}rem + 12px)` }"
          @click="selectedScope = node.id"
      >
        <u-icon
            :name="node.hasChildren ? 'i-lucide-folder' : 'i-lucide-hash'"
            class="w-4 h-4 shrink-0"
            :class="selectedScope === node.id ? 'text-primary-500' : 'text-neutral-500'"
        />

        <span class="truncate flex-1 text-sm">
          {{ node.name }}
        </span>

        <u-badge 
          v-if="node.keyCount > 0" 
          variant="subtle" 
          size="xs" 
          :color="selectedScope === node.id ? 'primary' : 'neutral'" 
          class="ml-auto shrink-0 font-mono text-[9px] px-1 py-0"
        >
          {{ node.keyCount }}
        </u-badge>
      </u-button>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #3f3f46;
  border-radius: 20px;
}
</style>
