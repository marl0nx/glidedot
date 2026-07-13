<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  username?: string
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
  <u-modal v-model:open="isOpen" title="Reset API Key">
    <template #body>
      <p class="p-4 text-sm text-neutral-400">
        Are you sure you want to reset the API Key for <strong class="text-neutral-200">{{ username }}</strong>? This action will immediately invalidate all existing integrations using their current key and cannot be undone.
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
        <u-button label="Reset API Key" color="error" @click="emit('confirm')" />
      </div>
    </template>
  </u-modal>
</template>
