<script setup lang="ts">
import { useTranslation } from '~/composables/localization/useTranslation'
import { useTranslationTimer } from '~/composables/localization/useTranslationTimer'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const {
  init,
  currentScopeKeys,
  translations,
  saveTranslation,
  sourceLanguage,
  languages,
  labels: projectLabels,
  addLabelToKey,
  removeLabelFromKey,
  isLoading
} = useTranslation()

const lang = computed(() => languages.value.find(l => l.code === route.params.langCode as string) || null)

onMounted(async () => {
  if (!languages.value.length) {
    await init()
  }
  if (route.query.editKey) {
    search.value = route.query.editKey as string
    router.replace({ query: {} })
  }
})

const search = ref('')
const hideTranslated = ref(false)

interface TranslationRow {
  keyId: number
  keyName: string
  labels: { id: number; name: string; color: string }[]
  sourceText: string
  targetText: string
  reviewStatus?: string
}

const allRows = computed<TranslationRow[]>(() => {
  if (!lang.value || !sourceLanguage.value) return []

  return currentScopeKeys.value.map(k => {
    const src = translations.value[k.id]?.[sourceLanguage.value!.code]
    const tgt = translations.value[k.id]?.[lang.value!.code]
    return {
      keyId: k.id,
      keyName: k.key,
      labels: k.labels || [],
      sourceText: src?.text || '',
      targetText: tgt?.text || '',
      reviewStatus: tgt?.reviewStatus
    }
  })
})

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allRows.value.filter(row => {
    if (hideTranslated.value && row.targetText.trim() !== '') return false
    if (!query) return true
    return row.keyName.toLowerCase().includes(query)
      || row.sourceText.toLowerCase().includes(query)
      || row.targetText.toLowerCase().includes(query)
  })
})

const pageSize = ref(15)
const pageIndex = ref(0)

watch([search, hideTranslated], () => {
  pageIndex.value = 0
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))

watch(pageCount, (count) => {
  if (pageIndex.value > count - 1) pageIndex.value = count - 1
})

const currentPage = computed({
  get: () => pageIndex.value + 1,
  set: (val) => { pageIndex.value = val - 1 }
})

const pageRows = computed(() => {
  const start = pageIndex.value * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const updateTranslation = (keyId: number, newText: string, timeSpentMs: number) => {
  if (!lang.value) return
  saveTranslation(keyId, lang.value.id, lang.value.code, newText, false, timeSpentMs)
}

const localTranslations = reactive<Record<number, string>>({})
const timer = useTranslationTimer()

const handleUpdate = (keyId: number, val: string) => {
  localTranslations[keyId] = val
  timer.registerActivity()
}

const handleBlur = (keyId: number, originalText: string) => {
  timer.stopTracking()
  const timeSpentMs = timer.timeSpentMs.value
  timer.resetTimer()

  const val = localTranslations[keyId]
  if (val !== undefined && val !== originalText) {
    updateTranslation(keyId, val, timeSpentMs)
  }
}

const handleFocus = (keyId: number, event: FocusEvent) => {
  timer.startTracking()
  const target = event.target as HTMLTextAreaElement
  if (target) {
    nextTick(() => {
      target.dispatchEvent(new Event('input'))
    })
  }
}

const availableLabelsFor = (row: TranslationRow) => {
  return projectLabels.value.filter(l => !row.labels.some(rl => rl.id === l.id))
}

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="flex flex-col gap-4 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div class="flex items-center gap-3">
        <u-button icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push(`/projects/${route.params.id}/translations`)" />
        <span class="text-2xl leading-none">{{ lang?.flag }}</span>
        <div>
          <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            {{ lang?.name || 'Translations' }}
            <u-badge v-if="lang?.code === sourceLanguage?.code" variant="subtle" color="primary" size="xs" class="uppercase tracking-wider">Ref</u-badge>
          </h1>
          <p class="text-xs text-neutral-400 font-mono mt-0.5">{{ lang?.code }}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 w-full md:w-auto">
        <u-input v-model="search" icon="i-lucide-search" size="lg" placeholder="Search keys or text..." class="w-full md:w-80" />
        <u-checkbox v-model="hideTranslated" label="Hide translated" />
      </div>
    </div>

    <!-- Top Pagination -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">Rows per page</span>
        <u-select
            :model-value="pageSize"
            :items="[10, 20, 50, 100]"
            class="w-20"
            @update:model-value="(val) => { pageSize = Number(val); pageIndex = 0 }"
        />
      </div>
      <div class="flex flex-col min-[450px]:flex-row items-center gap-3 min-[450px]:gap-4">
        <span class="text-sm text-neutral-500">
          {{ filteredRows.length > 0 ? (pageIndex * pageSize + 1) : 0 }}-{{ Math.min((pageIndex + 1) * pageSize, filteredRows.length) }} of {{ filteredRows.length }}
        </span>
        <u-pagination v-model:page="currentPage" :total="filteredRows.length" :items-per-page="pageSize" />
      </div>
    </div>

    <!-- Term Cards -->
    <div class="flex flex-col gap-4">
      <div v-if="isLoading && allRows.length === 0" class="text-center text-neutral-500 py-12">Loading...</div>
      <div v-else-if="pageRows.length === 0" class="text-center text-neutral-500 py-12">No terms match your filters.</div>

      <div
          v-for="row in pageRows"
          :key="row.keyId"
          class="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
      >
        <!-- Term header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 gap-3 flex-wrap">
          <span class="font-mono text-sm text-neutral-200">{{ row.keyName }}</span>
          <div class="flex items-center gap-1 flex-wrap">
            <u-badge v-for="label in row.labels" :key="label.id" variant="subtle" color="neutral" size="sm"
                     class="flex items-center gap-1"
                     :style="{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}20` }">
              {{ label.name }}
              <u-icon name="i-lucide-x" class="w-3.5 h-3.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" @click="removeLabelFromKey(row.keyId, label.id)" />
            </u-badge>
            <u-popover>
              <u-button icon="i-lucide-plus" label="Label" size="xs" color="neutral" variant="ghost" />
              <template #content>
                <div class="p-2 flex flex-col gap-1 w-48">
                  <span class="text-xs font-semibold text-neutral-400 mb-1 px-1">Add Label</span>
                  <div v-if="availableLabelsFor(row).length === 0" class="text-xs text-neutral-500 px-1 italic">
                    No available labels
                  </div>
                  <u-button
                      v-for="l in availableLabelsFor(row)"
                      :key="l.id"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="justify-start w-full"
                      @click="addLabelToKey(row.keyId, l.id)"
                  >
                    <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: l.color }" />
                    {{ l.name }}
                  </u-button>
                </div>
              </template>
            </u-popover>
          </div>
        </div>

        <!-- Source row -->
        <div class="flex items-start gap-3 px-4 py-3 border-b border-neutral-800/60">
          <div class="flex items-center gap-2 w-32 shrink-0 pt-2">
            <span class="text-lg leading-none">{{ sourceLanguage?.flag }}</span>
            <u-badge variant="subtle" color="neutral" size="xs" class="font-mono">{{ sourceLanguage?.code }}</u-badge>
          </div>
          <p class="text-sm text-neutral-400 pt-2 flex-1">{{ row.sourceText || '(empty)' }}</p>
        </div>

        <!-- Target row -->
        <div class="flex items-start gap-3 px-4 py-3 relative">
          <div class="flex items-center gap-2 w-32 shrink-0 pt-2">
            <span class="text-lg leading-none">{{ lang?.flag }}</span>
            <u-badge variant="subtle" color="primary" size="xs" class="font-mono">{{ lang?.code }}</u-badge>
          </div>
          <div class="flex-1 relative">
            <u-badge v-if="row.reviewStatus === 'PENDING_REVIEW'" color="warning" variant="subtle" size="sm" class="absolute -top-1 right-2 z-10 scale-[0.65] origin-top-right shadow-sm pointer-events-none">Pending Review</u-badge>
            <u-badge v-if="row.reviewStatus === 'REJECTED'" color="error" variant="subtle" size="sm" class="absolute -top-1 right-2 z-10 scale-[0.65] origin-top-right shadow-sm pointer-events-none">Rejected</u-badge>
            <u-textarea
                :model-value="localTranslations[row.keyId] ?? row.targetText"
                class="w-full"
                :rows="1"
                :ui="{ base: 'px-3 py-1.5 resize-none leading-snug' }"
                placeholder="Enter translation..."
                autoresize
                :maxrows="6"
                @update:model-value="(val) => handleUpdate(row.keyId, val)"
                @focus="handleFocus(row.keyId, $event)"
                @blur="handleBlur(row.keyId, row.targetText)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Pagination -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800 pt-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">Rows per page</span>
        <u-select
            :model-value="pageSize"
            :items="[10, 20, 50, 100]"
            class="w-20"
            @update:model-value="(val) => { pageSize = Number(val); pageIndex = 0 }"
        />
      </div>
      <div class="flex flex-col min-[450px]:flex-row items-center gap-3 min-[450px]:gap-4">
        <span class="text-sm text-neutral-500">
          {{ filteredRows.length > 0 ? (pageIndex * pageSize + 1) : 0 }}-{{ Math.min((pageIndex + 1) * pageSize, filteredRows.length) }} of {{ filteredRows.length }}
        </span>
        <u-pagination v-model:page="currentPage" :total="filteredRows.length" :items-per-page="pageSize" />
      </div>
    </div>
  </div>
</template>