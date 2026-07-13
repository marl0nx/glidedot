<script setup lang="ts">
import type { KeyVariable } from '~/types'
import type { EditableSegment } from './editableSegment'

const props = defineProps<{
  segment: EditableSegment
  isFirst: boolean
  isLast: boolean
  variables: KeyVariable[]
  segmentTypes: { label: string, value: string }[]
  casingOptions: { label: string, value: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:segment', segment: EditableSegment): void
  (e: 'remove' | 'move-up' | 'move-down'): void
}>()

const patch = (changes: Partial<EditableSegment>) => {
  emit('update:segment', { ...props.segment, ...changes })
}

const formatOptions = (opts?: string[]) => {
  if (!opts) return ''
  return opts.join(', ')
}

const updateOptions = (val: string) => {
  patch({ options: val.split(',').map(s => s.trim()).filter(Boolean) })
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg items-start">
    <div class="flex flex-col gap-1 w-full md:w-1/4">
      <span class="text-xs text-neutral-400">Type</span>
      <u-select
        :model-value="segment.type"
        :items="segmentTypes"
        @update:model-value="(val) => patch({ type: val as EditableSegment['type'] })"
      />
    </div>

    <div class="flex flex-col gap-1 w-full md:w-1/4">
      <span class="text-xs text-neutral-400">Name / Label</span>
      <u-input
        :model-value="segment.type === 'shared-enum' ? (variables.find(v => v.id === segment.variableId)?.name || 'Select Variable...') : segment.name"
        placeholder="Segment Name"
        :disabled="segment.type === 'shared-enum'"
        @update:model-value="(val) => patch({ name: val as string })"
      />
    </div>

    <div class="flex flex-col gap-1 w-full md:w-1/3">
      <template v-if="segment.type === 'enum'">
        <span class="text-xs text-neutral-400">Allowed Values (comma separated)</span>
        <u-input :model-value="formatOptions(segment.options)" placeholder="button, label, title" @update:model-value="(val) => updateOptions(val as string)" />
      </template>
      <template v-else-if="segment.type === 'shared-enum'">
        <span class="text-xs text-neutral-400">Select Global Variable</span>
        <u-select
          :model-value="segment.variableId"
          :items="variables.map(v => ({ label: v.name, value: v.id }))"
          placeholder="Choose variable..."
          @update:model-value="(val) => patch({ variableId: val as number })"
        />
      </template>
      <template v-else-if="segment.type === 'constant'">
        <span class="text-xs text-neutral-400">Constant Value</span>
        <u-input :model-value="segment.constantValue" placeholder="app" @update:model-value="(val) => patch({ constantValue: val as string })" />
      </template>
      <template v-else-if="segment.type === 'free-text'">
        <span class="text-xs text-neutral-400">Casing Rule</span>
        <u-select :model-value="segment.casing" :items="casingOptions" placeholder="No Rule" @update:model-value="(val) => patch({ casing: val as string })" />
      </template>
    </div>

    <div class="flex flex-col items-center gap-1 w-20 pt-6">
      <u-checkbox :model-value="segment.isOptional" label="Optional" @update:model-value="(val) => patch({ isOptional: val as boolean })" />
    </div>

    <div class="flex items-center gap-1 pt-6 ml-auto">
      <u-button icon="i-lucide-arrow-up" color="neutral" variant="ghost" size="xs" :disabled="isFirst" @click="emit('move-up')" />
      <u-button icon="i-lucide-arrow-down" color="neutral" variant="ghost" size="xs" :disabled="isLast" @click="emit('move-down')" />
      <u-button icon="i-lucide-x" color="error" variant="ghost" size="xs" @click="emit('remove')" />
    </div>
  </div>
</template>
