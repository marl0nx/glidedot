<script setup lang="ts">
import { computed } from 'vue'
import type { TranslationLabel } from '~/types'

const props = defineProps<{
  modelValue: boolean
  selectedCount: number
  commonLabels: TranslationLabel[]
  availableLabels: TranslationLabel[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'add-label', label: TranslationLabel): void
  (e: 'remove-label', labelId: number): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    title="Edit Labels"
    :description="`Editing labels for ${selectedCount} selected keys.`"
  >
    <template #body>
      <div class="p-4 space-y-4">
        <div>
          <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Common Labels</p>
          <div class="flex flex-wrap gap-2">
            <template v-if="commonLabels.length > 0">
              <u-badge
                v-for="label in commonLabels"
                :key="label.id"
                variant="subtle"
                color="neutral"
                size="lg"
                :style="{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}20` }"
              >
                {{ label.name }}
                <u-icon
                  name="i-lucide-x"
                  class="ml-1.5 w-3.5 h-3.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  @click="emit('remove-label', label.id)"
                />
              </u-badge>
            </template>
            <p v-else class="text-sm text-neutral-500 italic">No labels shared by all selected keys.</p>
          </div>
        </div>

        <u-separator/>

        <div>
          <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Available Labels</p>
          <div class="flex flex-wrap gap-2">
            <u-badge
              v-for="label in availableLabels"
              :key="label.id"
              variant="subtle"
              color="neutral"
              size="lg"
              class="group cursor-pointer hover:ring-1 hover:ring-neutral-700 transition-all"
              :style="{ backgroundColor: `${label.color}10`, color: label.color, borderColor: `${label.color}20` }"
              @click="emit('add-label', label)"
            >
              {{ label.name }}
              <u-icon
                name="i-lucide-plus"
                class="ml-1.5 w-3.5 h-3.5 opacity-50 group-hover:opacity-100"
              />
            </u-badge>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <u-button color="neutral" variant="ghost" label="Close" @click="() => { isOpen = false }"/>
    </template>
  </u-modal>
</template>
