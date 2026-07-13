<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  selectedCount: number
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
  <u-modal
    v-model:open="isOpen"
    title="Delete Labels"
    :description="`Are you sure you want to delete ${selectedCount} selected label(s)? This action cannot be undone.`"
  >
    <template #footer>
      <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }"/>
      <u-button label="Delete" color="error" @click="emit('confirm')"/>
    </template>
  </u-modal>
</template>
