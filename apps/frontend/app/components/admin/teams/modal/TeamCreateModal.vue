<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'create', name: string): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const name = ref('')

const handleCreate = () => {
  if (name.value.trim()) {
    emit('create', name.value.trim())
    name.value = ''
  }
}
</script>

<template>
  <u-modal v-model:open="isOpen" title="Create Team">
    <template #body>
      <div class="p-4">
        <u-form-field label="Team Name" required>
          <u-input v-model="name" placeholder="e.g. Frontend Team" class="w-full" autofocus @keyup.enter="handleCreate" />
        </u-form-field>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
        <u-button label="Create" color="neutral" :loading="loading" :disabled="!name.trim()" @click="handleCreate" />
      </div>
    </template>
  </u-modal>
</template>
