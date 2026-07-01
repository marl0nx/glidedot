<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Language {
  id: number
  code: string
  name: string
  flag: string
  isRef?: boolean
}

const props = defineProps<{
  modelValue: boolean
  language: Language | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: { id: number, code: string, name: string, flag: string, isRef: boolean }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const editName = ref("")
const editCode = ref("")
const editFlag = ref("")
const isReference = ref(false)

watch(() => props.language, (lang) => {
  if (lang) {
    editName.value = lang.name
    editCode.value = lang.code
    editFlag.value = lang.flag
    isReference.value = !!lang.isRef
  }
}, { immediate: true })

const handleSave = () => {
  if (props.language && editName.value.trim() && editCode.value.trim()) {
    emit('save', {
      id: props.language.id,
      code: editCode.value.trim().toLowerCase(),
      name: editName.value.trim(),
      flag: editFlag.value.trim(),
      isRef: isReference.value
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

        <div class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Set as Reference Language</span>
            <span class="text-xs text-neutral-400">
              Use this language as the source of truth for translations.
            </span>
          </div>
          <u-switch v-model="isReference" :disabled="language?.isRef" />
        </div>
      </div>
    </template>

    <template #footer>
      <u-button color="neutral" variant="ghost" label="Close" @click="isOpen = false"/>
      <u-button label="Save Changes" color="neutral" :disabled="!editName.trim() || !editCode.trim()"
                @click="handleSave"/>
    </template>
  </u-modal>
</template>
