<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'create', payload: { name: string, color: string }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const newLabelName = ref("")
const newLabelColor = ref("#3b82f6")

const handleCreate = () => {
  if (newLabelName.value.trim()) {
    emit('create', { name: newLabelName.value.trim(), color: newLabelColor.value })
    newLabelName.value = ""
    newLabelColor.value = "#3b82f6"
  }
}
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    title="Add New Label"
    description="Create a new label for organizing translation keys."
  >
    <template #body>
      <div class="p-4 space-y-4">
        <u-form-field label="Label Name">
          <u-input
            v-model="newLabelName"
            placeholder="e.g., Frontend"
            autofocus
            class="w-full"
            @keyup.enter="handleCreate"
          />
        </u-form-field>
        <u-form-field label="Label Color">
          <div class="flex items-center gap-2">
            <u-popover>
              <u-button 
                color="neutral" 
                variant="outline" 
                class="w-8 h-8 p-0 flex items-center justify-center overflow-hidden"
              >
                <div class="w-full h-full" :style="{ backgroundColor: newLabelColor }"/>
              </u-button>
              
              <template #content>
                <div class="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl">
                  <u-color-picker v-model="newLabelColor" />
                </div>
              </template>
            </u-popover>
            <u-input v-model="newLabelColor" class="flex-1" placeholder="#000000" />
          </div>
        </u-form-field>
      </div>
    </template>

    <template #footer>
      <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }"/>
      <u-button label="Add Label" color="neutral" :disabled="!newLabelName.trim()" @click="handleCreate"/>
    </template>
  </u-modal>
</template>
