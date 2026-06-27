<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Language {
  id: number
  code: string
  name: string
  flag: string
}

const props = defineProps<{
  modelValue: boolean
  language: Language | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: { id: number, code: string, name: string, flag: string }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const editName = ref("")
const editCode = ref("")
const editFlag = ref("")

watch(() => props.language, (lang) => {
  if (lang) {
    editName.value = lang.name
    editCode.value = lang.code
    editFlag.value = lang.flag
  }
}, { immediate: true })

const handleSave = () => {
  if (props.language && editName.value.trim() && editCode.value.trim()) {
    emit('save', {
      id: props.language.id,
      code: editCode.value.trim().toLowerCase(),
      name: editName.value.trim(),
      flag: editFlag.value.trim()
    })
    isOpen.value = false
  }
}
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    title="Edit Language"
    description="Update the details for this language."
  >
    <template #body>
      <div class="p-4 space-y-4">
        <u-form-field label="Language Name">
          <u-input
              v-model="editName"
              placeholder="e.g., Japanese"
              autofocus
              class="w-full"
          />
        </u-form-field>
        <div class="grid grid-cols-2 gap-4">
          <u-form-field label="Language Code">
            <u-input
                v-model="editCode"
                placeholder="e.g., ja"
                class="w-full"
            />
          </u-form-field>
          <u-form-field label="Flag (Emoji)">
            <u-input
                v-model="editFlag"
                placeholder="e.g., 🇯🇵"
                class="w-full"
                @keyup.enter="handleSave"
            />
          </u-form-field>
        </div>
      </div>
    </template>

    <template #footer>
      <u-button color="neutral" variant="ghost" label="Cancel" @click="isOpen = false"/>
      <u-button label="Save Changes" color="neutral" :disabled="!editName.trim() || !editCode.trim()"
                @click="handleSave"/>
    </template>
  </u-modal>
</template>
