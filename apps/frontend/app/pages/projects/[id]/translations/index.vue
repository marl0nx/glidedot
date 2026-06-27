<script setup lang="ts">
import { useTranslation } from '~/composables/localization/useTranslation'
import { useRoute, useRouter } from 'vue-router'

import TranslationActivityModal from '~/components/localization/translations/modal/TranslationActivityModal.vue'
import TranslationListModal from '~/components/localization/translations/modal/TranslationListModal.vue'
import TranslationLanguageCard from '~/components/localization/translations/TranslationLanguageCard.vue'
import TranslationLanguageRow from '~/components/localization/translations/TranslationLanguageRow.vue'
import TranslationSidebar from '~/components/localization/translations/TranslationSidebar.vue'
import type { Language } from '~/types'

const {
  init,
  languages,
  keys,
  sourceLanguage,
  visibleScopes,
  selectedScope,
  getLanguageProgress,
  targetLanguage,
  isModalOpen,
  activeKeyId
} = useTranslation()

const route = useRoute()
const router = useRouter()

const viewMode = useCookie<'grid' | 'list'>('translationsViewMode', { default: () => 'grid' })
const isListModalOpen = ref(false)
const listModalLanguage = ref<Language | null>(null)
const listModalSearch = ref('')

const openListModal = (lang: Language) => {
  listModalLanguage.value = lang
  isListModalOpen.value = true
}

const sortedLanguages = computed(() => {
  if (!languages.value) return []
  return [...languages.value].sort((a, b) => {
    if (a.code === sourceLanguage.value?.code) return -1
    if (b.code === sourceLanguage.value?.code) return 1
    return a.name.localeCompare(b.name)
  })
})

onMounted(async () => {
  await init()

  if (route.query.editKey && route.query.langId) {
    const editKeyStr = route.query.editKey as string
    const langIdNum = parseInt(route.query.langId as string)
    
    const targetLang = languages.value?.find((l: any) => l.id === langIdNum)
    const targetKey = keys.value?.find((k: any) => k.key === editKeyStr)
    
    if (targetLang && targetKey) {
      const parts = editKeyStr.split('.')
      if (parts.length > 0) {
        selectedScope.value = parts[0] || null
      }
      
      listModalLanguage.value = targetLang
      listModalSearch.value = editKeyStr
      isListModalOpen.value = true
      
      router.replace({ query: {} })
    }
  }
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 overflow-x-hidden md:overflow-x-visible">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0 mb-2">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-languages" class="w-5 h-5 text-primary-500" />
            Translations
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Select a scope and choose a language to start translating.</p>
      </div>
      <div class="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg shrink-0">
        <u-button 
          icon="i-lucide-layout-grid" 
          size="sm" 
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'" 
          :color="viewMode === 'grid' ? 'primary' : 'neutral'"
          @click="viewMode = 'grid'" 
        />
        <u-button 
          icon="i-lucide-list" 
          size="sm" 
          :variant="viewMode === 'list' ? 'soft' : 'ghost'" 
          :color="viewMode === 'list' ? 'primary' : 'neutral'"
          @click="viewMode = 'list'" 
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col md:flex-row gap-6 items-start w-full">

      <!-- Mobile Scope Selector -->
      <div class="md:hidden w-full flex flex-col gap-2 shrink-0 mb-1 px-4">
        <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Browse Namespace</span>
        <div class="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none snap-x">
          <u-button
            :variant="selectedScope === null ? 'soft' : 'outline'"
            :color="selectedScope === null ? 'primary' : 'neutral'"
            size="sm"
            class="snap-start shrink-0 rounded-full"
            @click="selectedScope = null"
          >
            <u-icon name="i-lucide-globe" class="w-4 h-4 mr-1" />
            All Translations
          </u-button>
          
          <u-button
            v-for="node in visibleScopes"
            :key="node.id"
            :variant="selectedScope === node.id ? 'soft' : 'outline'"
            :color="selectedScope === node.id ? 'primary' : 'neutral'"
            size="sm"
            class="snap-start shrink-0 rounded-full"
            @click="selectedScope = node.id"
          >
            <u-icon :name="node.hasChildren ? 'i-lucide-folder' : 'i-lucide-hash'" class="w-4 h-4 mr-1" />
            {{ node.name }}
            <span v-if="node.keyCount > 0" class="text-[9px] opacity-75 font-mono ml-1 bg-neutral-800 px-1 py-0.5 rounded">
              {{ node.keyCount }}
            </span>
          </u-button>
        </div>
      </div>

      <!-- Sidebar -->
      <translation-sidebar
          class="hidden md:block"
          v-model:selected-scope="selectedScope"
          :visible-scopes="visibleScopes"
      />

      <!-- Languages Container -->
      <div class="flex flex-col w-full min-w-0">
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          <translation-language-card
              v-for="lang in sortedLanguages"
              :key="lang.code"
              :lang="lang"
              :is-ref="lang.code === sourceLanguage?.code"
              :progress="getLanguageProgress(lang.code)"
              @edit-list="openListModal"
          />
        </div>
        
        <!-- List View -->
        <div v-else class="flex flex-col gap-3">
          <translation-language-row
              v-for="lang in sortedLanguages"
              :key="lang.code"
              :lang="lang"
              :is-ref="lang.code === sourceLanguage?.code"
              :progress="getLanguageProgress(lang.code)"
              @edit-list="openListModal"
          />
        </div>
      </div>
    </div>

    <!-- Teleport Flashcard Modal to body so it overlays everything smoothly -->
    <teleport to="body">
      <translation-activity-modal/>
    </teleport>

    <translation-list-modal v-model="isListModalOpen" :lang="listModalLanguage" :default-search="listModalSearch" />
  </div>
</template>
