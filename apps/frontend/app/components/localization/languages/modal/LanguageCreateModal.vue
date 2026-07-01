<script setup lang="ts">
import { ref, computed } from 'vue'

interface Language {
  id: number
  code: string
  name: string
  flag: string
}

const props = defineProps<{
  modelValue: boolean
  existingLanguages: Language[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'create', payload: { code: string, name: string, flag: string }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const newName = ref("")
const newCode = ref("")
const newFlag = ref("")

const suggestedLanguages = [
  { name: 'English', code: 'en_US', flag: '🇺🇸' },
  { name: 'English (UK)', code: 'en_GB', flag: '🇬🇧' },
  { name: 'German', code: 'de_DE', flag: '🇩🇪' },
  { name: 'Spanish', code: 'es_ES', flag: '🇪🇸' },
  { name: 'French', code: 'fr_FR', flag: '🇫🇷' },
  { name: 'Italian', code: 'it_IT', flag: '🇮🇹' },
  { name: 'Russian', code: 'ru_RU', flag: '🇷🇺' },
  { name: 'Ukrainian', code: 'uk_UA', flag: '🇺🇦' },
  { name: 'Danish', code: 'da_DK', flag: '🇩🇰' },
  { name: 'Polish', code: 'pl_PL', flag: '🇵🇱' },
  { name: 'Dutch', code: 'nl_NL', flag: '🇳🇱' },
  { name: 'Portuguese', code: 'pt_PT', flag: '🇵🇹' },
  { name: 'Chinese', code: 'zh_CN', flag: '🇨🇳' },
  { name: 'Japanese', code: 'ja_JP', flag: '🇯🇵' },
  { name: 'Korean', code: 'ko_KR', flag: '🇰🇷' },
  { name: 'Turkish', code: 'tr_TR', flag: '🇹🇷' },
  { name: 'Arabic', code: 'ar_SA', flag: '🇸🇦' },
  { name: 'Hindi', code: 'hi_IN', flag: '🇮🇳' },
  { name: 'Swedish', code: 'sv_SE', flag: '🇸🇪' },
  { name: 'Norwegian', code: 'no_NO', flag: '🇳🇴' },
  { name: 'Finnish', code: 'fi_FI', flag: '🇫🇮' }
]

const filteredSuggestions = computed(() => {
  return suggestedLanguages.filter(lang => 
    !props.existingLanguages.some(existingLang => existingLang.code.toLowerCase() === lang.code.toLowerCase())
  )
})

const selectSuggestion = (lang: {name: string, code: string, flag: string}) => {
  newName.value = lang.name
  newCode.value = lang.code
  newFlag.value = lang.flag
}

const handleCreate = () => {
  if (newName.value.trim() && newCode.value.trim()) {
    emit('create', {
      code: newCode.value.trim().toLowerCase(),
      name: newName.value.trim(),
      flag: newFlag.value.trim()
    })
    newName.value = ""
    newCode.value = ""
    newFlag.value = ""
  }
}
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    title="Add New Language"
    description="Add a new language to translate your project into."
  >
    <template #body>
      <div class="p-4 space-y-6">
        
        <!-- Suggestions Section -->
        <div v-if="filteredSuggestions.length > 0">
          <p class="text-sm font-medium mb-3 text-neutral-400">Suggested Languages</p>
          <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 pb-2">
            <u-badge 
              v-for="lang in filteredSuggestions" 
              :key="lang.code" 
              color="neutral" 
              variant="subtle" 
              class="cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              @click="selectSuggestion(lang)"
            >
              <span class="mr-1">{{ lang.flag }}</span> {{ lang.name }}
            </u-badge>
          </div>
        </div>
        
        <u-separator v-if="filteredSuggestions.length > 0" />

        <div class="space-y-4">
          <u-form-field label="Language Name">
            <u-input
                v-model="newName"
                placeholder="e.g., Japanese"
                autofocus
                class="w-full"
            />
          </u-form-field>
          <div class="grid grid-cols-2 gap-4">
            <u-form-field label="Language Code">
              <u-input
                  v-model="newCode"
                  placeholder="e.g., ja"
                  class="w-full"
              />
            </u-form-field>
            <u-form-field label="Flag (Emoji)">
              <u-input
                  v-model="newFlag"
                  placeholder="e.g., 🇯🇵"
                  class="w-full"
                  @keyup.enter="handleCreate"
              />
            </u-form-field>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <u-button color="neutral" variant="ghost" label="Cancel" @click="isOpen = false"/>
      <u-button label="Add Language" color="neutral" :disabled="!newName.trim() || !newCode.trim()"
                @click="handleCreate"/>
    </template>
  </u-modal>
</template>
