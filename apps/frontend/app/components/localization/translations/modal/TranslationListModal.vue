<script setup lang="ts">
import { computed, ref, reactive, watch, nextTick } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import { useTranslation } from '~/composables/localization/useTranslation'
import { useTranslationTimer } from '~/composables/localization/useTranslationTimer'
import type { Language } from '~/types'

interface TranslationRow {
  keyId: number
  keyName: string
  sourceText: string
  targetText: string
  reviewStatus?: string
}

const props = defineProps<{
  modelValue: boolean
  lang: Language | null
  defaultSearch?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const {
  currentScopeKeys,
  translations,
  saveTranslation,
  sourceLanguage,
  isLoading
} = useTranslation()

const search = ref('')

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.defaultSearch) {
    search.value = props.defaultSearch
  } else if (!isOpen) {
    search.value = ''
  }
})
const pagination = ref({ pageIndex: 0, pageSize: 15 })

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const tableData = computed(() => {
  if (!props.lang || !sourceLanguage.value) return []
  
  return currentScopeKeys.value.map(k => {
    const src = translations.value[k.id]?.[sourceLanguage.value!.code]
    const tgt = translations.value[k.id]?.[props.lang!.code]
    return {
      keyId: k.id,
      keyName: k.key,
      sourceText: src?.text || '',
      targetText: tgt?.text || '',
      reviewStatus: tgt?.reviewStatus
    }
  })
})

const columns: TableColumn<TranslationRow>[] = [
  { accessorKey: 'keyName', header: 'Translation Key' },
  { accessorKey: 'sourceText', header: 'Reference' },
  { accessorKey: 'targetText', header: 'Translation' }
]

const updateTranslation = (keyId: number, newText: string, timeSpentMs: number) => {
  if (!props.lang) return
  saveTranslation(keyId, props.lang.id, props.lang.code, newText, false, timeSpentMs)
}

const localTranslations = reactive<Record<number, string>>({})
const focusedKeyId = ref<number | null>(null)

const timer = useTranslationTimer()

const handleUpdate = (keyId: number, val: string) => {
  localTranslations[keyId] = val
  timer.registerActivity()
}

const handleBlur = (keyId: number, originalText: string) => {
  focusedKeyId.value = null
  timer.stopTracking()
  const timeSpentMs = timer.timeSpentMs.value
  timer.resetTimer()
  
  const val = localTranslations[keyId]
  // Only save if the value was modified and is different from the original text
  if (val !== undefined && val !== originalText) {
    updateTranslation(keyId, val, timeSpentMs)
  }
}

const handleFocus = (keyId: number, event: FocusEvent) => {
  focusedKeyId.value = keyId
  timer.startTracking()
  const target = event.target as HTMLTextAreaElement
  if (target) {
    nextTick(() => {
      target.dispatchEvent(new Event('input'))
    })
  }
}
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    :title="`Edit Translations: ${lang?.name || ''}`"
    description="Edit existing translations in a list format."
    fullscreen
  >
    <template #body>
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-row justify-between">
          <u-input v-model="search" icon="i-lucide-search" size="lg" placeholder="Search keys or text..." class="w-80" />
        </div>

        <div class="w-full space-y-4">
          <u-table
              v-model:pagination="pagination"
              v-model:global-filter="search"
              :data="tableData"
              :columns="columns"
              :loading="isLoading"
              :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
              class="font-mono"
          >
            <template #keyName-cell="{ row }">
              <span class="font-medium block" :title="row.original.keyName">
                {{ row.original.keyName }}
              </span>
            </template>
            <template #sourceText-cell="{ row }">
              <div 
                class="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs line-clamp-2 hover:line-clamp-none transition-all"
                :title="row.original.sourceText"
              >
                {{ row.original.sourceText || '(empty)' }}
              </div>
            </template>
            <template #targetText-cell="{ row }">
              <div class="w-full min-w-[300px] relative">
                <u-badge v-if="row.original.reviewStatus === 'PENDING_REVIEW'" color="warning" variant="subtle" size="sm" class="absolute -top-3 right-2 z-10 scale-[0.65] origin-top-right shadow-sm pointer-events-none">Pending Review</u-badge>
                <u-badge v-if="row.original.reviewStatus === 'REJECTED'" color="error" variant="subtle" size="sm" class="absolute -top-3 right-2 z-10 scale-[0.65] origin-top-right shadow-sm pointer-events-none">Rejected</u-badge>
                <u-textarea
                  :model-value="localTranslations[row.original.keyId] ?? row.original.targetText"
                  class="w-full"
                  :rows="1"
                  :ui="{ base: focusedKeyId !== row.original.keyId ? 'px-3 py-2 overflow-hidden whitespace-nowrap text-ellipsis resize-none !h-[36px]' : 'p-3' }"
                  placeholder="Enter translation..."
                  autoresize
                  :maxrows="focusedKeyId === row.original.keyId ? 10 : 10"
                  @update:model-value="(val) => handleUpdate(row.original.keyId, val)"
                  @focus="handleFocus(row.original.keyId, $event)"
                  @blur="handleBlur(row.original.keyId, row.original.targetText)"
                />
              </div>
            </template>
          </u-table>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-default pt-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-neutral-500">Rows per page</span>
              <u-select
                :model-value="pagination.pageSize"
                :items="[10, 20, 50, 100]"
                class="w-20"
                @update:model-value="(val) => { pagination = { ...pagination, pageSize: Number(val), pageIndex: 0 } }"
              />
            </div>
            <div class="flex flex-col min-[450px]:flex-row items-center gap-3 min-[450px]:gap-4">
              <span class="text-sm text-neutral-500">
                {{ tableData.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, tableData.length) }} of {{ tableData.length }}
              </span>
              <u-pagination
                v-model:page="currentPagination"
                :total="tableData.length"
                :items-per-page="pagination.pageSize"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </u-modal>
</template>
