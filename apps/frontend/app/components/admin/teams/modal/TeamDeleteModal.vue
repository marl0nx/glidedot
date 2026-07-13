<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  teamName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <u-modal v-model:open="isOpen" title="Delete Team">
    <template #body>
      <p class="p-4 text-sm text-neutral-400">
        Are you sure you want to delete the team <strong class="text-neutral-200">{{ teamName }}</strong>? This action cannot be undone.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
        <u-button label="Delete Team" color="error" @click="emit('confirm')" />
      </div>
    </template>
  </u-modal>
</template>
