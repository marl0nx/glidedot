<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useTranslation } from '~/composables/localization/useTranslation'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'

interface Review {
  keyId: number
  keyName: string
  languageId?: number
  languageCode: string
  languageName?: string
  originalValue?: string
  draftValue?: string
  authorName: string
  authorAvatar?: string
}

interface Project {
  id: number | string
  reviewEnabled?: boolean
}

definePageMeta({
  layout: 'default'
})

const {
  init,
  languages,
  keys,
  translations,
  isLoading
} = useTranslation()

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const { isAdmin, isReviewer } = useAuth()
const toast = useToast()

const currentProject = ref<Project | null>(null)

onMounted(async () => {
  await init()
  try {
    const projectsList = await fetchApi('/localization/projects')
    const project = (projectsList as { id: number | string }[]).find(p => String(p.id) === String(projectId))
    if (project) {
      currentProject.value = project
    }
  } catch (e) {
    console.error("Failed to fetch project", e)
  }
})

const selectedTab = ref(0)
const tabs = [
  { label: 'Translations', slot: 'translations', icon: 'i-lucide-languages' },
  { label: 'Keys', slot: 'keys', icon: 'i-lucide-logs' }
]

const searchQuery = ref('')

const pendingReviews = computed(() => {
  const pending: Review[] = []
  if (!keys.value || !translations.value) return pending

  keys.value.forEach(key => {
    const keyTrans = translations.value[key.id]
    if (keyTrans) {
      Object.entries(keyTrans).forEach(([langCode, t]) => {
        if (t.reviewStatus === 'PENDING_REVIEW') {
          const lang = languages.value.find(l => l.code === langCode)
          pending.push({
            keyId: key.id,
            keyName: key.key,
            languageId: lang?.id,
            languageCode: langCode,
            languageName: lang?.name,
            originalValue: t.text,
            draftValue: t.draftValue,
            authorName: t.authorName || 'Unknown User',
            authorAvatar: t.authorAvatar
          })
        }
      })
    }
  })
  return pending
})

const filteredReviews = computed(() => {
  if (!searchQuery.value) return pendingReviews.value
  const query = searchQuery.value.toLowerCase()
  return pendingReviews.value.filter(review => {
    return (
      String(review.keyName).toLowerCase().includes(query) ||
      String(review.languageCode).toLowerCase().includes(query) ||
      String(review.languageName).toLowerCase().includes(query) ||
      String(review.draftValue || '').toLowerCase().includes(query) ||
      String(review.originalValue || '').toLowerCase().includes(query) ||
      String(review.authorName || '').toLowerCase().includes(query)
    )
  })
})

const pendingKeys = computed(() => {
  if (!keys.value) return []
  return keys.value.filter(k => k.reviewStatus === 'PENDING_REVIEW')
})

const filteredKeys = computed(() => {
  if (!searchQuery.value) return pendingKeys.value
  const query = searchQuery.value.toLowerCase()
  return pendingKeys.value.filter(key => {
    return (
      String(key.key).toLowerCase().includes(query) ||
      String(key.draftKey || '').toLowerCase().includes(query)
    )
  })
})

const columns = [
  { accessorKey: 'language', header: 'Language' },
  { accessorKey: 'keyName', header: 'Key' },
  { accessorKey: 'diff', header: 'Translation Diff' },
  { accessorKey: 'author', header: 'Translator' },
  { id: 'actions', header: '' }
]

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const currentPagination = computed({
  get() {
    return pagination.value.pageIndex + 1
  },
  set(val) {
    pagination.value.pageIndex = val - 1
  }
})

const paginatedReviewsMobile = computed(() => {
  const start = pagination.value.pageIndex * pagination.value.pageSize
  return filteredReviews.value.slice(start, start + pagination.value.pageSize)
})


const handleReview = async (review: Review, action: 'approve' | 'reject') => {
  try {
    const res = await fetchApi(`/localization/keys/${currentProject.value?.id}/${review.keyId}/translations/${review.languageId}/${action}`, {
      method: 'POST'
    })
    
    // Update local state
    if (translations.value[review.keyId] && translations.value[review.keyId][review.languageCode]) {
      if (action === 'approve') {
        translations.value[review.keyId][review.languageCode].text = res.value
        translations.value[review.keyId][review.languageCode].reviewStatus = 'APPROVED'
        translations.value[review.keyId][review.languageCode].draftValue = undefined
      } else {
        translations.value[review.keyId][review.languageCode].reviewStatus = 'REJECTED'
        translations.value[review.keyId][review.languageCode].draftValue = undefined
      }
    }
    
    toast.add({ title: 'Success', description: `Translation ${action}d successfully.`, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Error', description: (error as Error).message || `Failed to ${action} translation`, color: 'error' })
  }
}

const handleKeyReview = async (keyData: any, action: 'approve' | 'reject') => {
  try {
    const res = await fetchApi(`/localization/keys/${currentProject.value?.id}/${keyData.id}/${action}`, {
      method: 'POST'
    })
    
    // Refresh data globally to update UI
    await init()
    
    toast.add({ title: 'Success', description: `Key ${action}d successfully.`, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Error', description: (error as Error).message || `Failed to ${action} key`, color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0 mb-2">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-check-circle" class="w-5 h-5 text-primary-500" />
            Reviews
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Review and approve suggested translations before they go live.</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-4">
      <u-tabs
        :items="tabs"
        class="w-full"
      >
        <template #translations="{ item }">
          <div class="flex flex-col gap-4 mt-4">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
              <div>
                <h3 class="text-white font-medium flex items-center gap-2">
                  <u-icon name="i-lucide-languages" class="w-5 h-5 text-primary-500" />
                  Translation Reviews
                </h3>
                <p class="text-sm text-neutral-400 mt-1">Review, approve or reject AI-suggested and manually drafted translations.</p>
              </div>
            </div>
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
              <u-input v-model="searchQuery" icon="i-lucide-search" placeholder="Search translation reviews..." class="w-full md:max-w-sm" />
            </div>
            <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }">
              <div v-if="isLoading" class="p-8 text-center text-neutral-500">
          <u-icon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2" />
          Loading reviews...
        </div>
        
        <div v-else-if="filteredReviews.length === 0" class="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
          <u-icon name="i-lucide-check-circle-2" class="w-12 h-12 text-success-500/50 mb-2" />
          <h3 class="text-lg font-medium text-neutral-300">All caught up!</h3>
          <p class="max-w-md" v-if="searchQuery">No reviews match your search query.</p>
          <p class="max-w-md" v-else>There are no translations pending review right now.</p>
        </div>
        
        <div v-else>
          <div class="hidden md:block">
            <u-table 
              v-model:pagination="pagination"
              :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
              :data="filteredReviews" 
              :columns="columns" 
              :loading="isLoading"
            >
              <template #language-cell="{ row }">
                <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{{ row.original.languageName }} ({{ row.original.languageCode }})</span>
              </template>
              
              <template #keyName-cell="{ row }">
                <span class="font-mono text-sm text-primary-400 break-all">{{ row.original.keyName }}</span>
              </template>
              
              <template #diff-cell="{ row }">
                <div class="flex flex-col gap-3 min-w-[200px] w-full bg-neutral-950 p-4 rounded-lg border border-neutral-800/50">
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-neutral-500">Current Live Value</span>
                    <p class="text-sm text-neutral-300 break-words" :class="{'opacity-50 italic': !row.original.originalValue}">
                      {{ row.original.originalValue || '(Empty)' }}
                    </p>
                  </div>
                  
                  <div class="h-px w-full bg-neutral-800/50"/>
                  
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-amber-500">Suggested Draft</span>
                    <p class="text-sm text-amber-400 break-words">
                      {{ row.original.draftValue }}
                    </p>
                  </div>
                </div>
              </template>
              
              <template #author-cell="{ row }">
                <div class="flex items-center gap-2">
                  <u-avatar 
                    :src="row.original.authorAvatar || undefined" 
                    :icon="!row.original.authorAvatar ? 'i-lucide-user' : undefined"
                    :class="!row.original.authorAvatar ? 'bg-neutral-800 text-neutral-400' : ''"
                    size="sm" 
                  />
                  <span class="text-sm text-neutral-300">{{ row.original.authorName }}</span>
                </div>
              </template>
              
              <template #actions-cell="{ row }">
                <div class="flex items-center gap-2 justify-end">
                  <template v-if="isAdmin || isReviewer">
                    <u-button 
                      icon="i-lucide-x" 
                      color="error" 
                      variant="soft" 
                      size="sm"
                      label="Reject"
                      @click="handleReview(row.original, 'reject')"
                    />
                    <u-button 
                      icon="i-lucide-check" 
                      color="success" 
                      size="sm"
                      label="Approve"
                      @click="handleReview(row.original, 'approve')"
                    />
                  </template>
                  <div v-else class="text-xs text-neutral-500 italic">
                    Waiting for Reviewer
                  </div>
                </div>
              </template>
            </u-table>
          </div>
          
          <!-- Mobile List -->
          <div class="flex flex-col gap-4 p-4 md:hidden">
            <u-card v-for="(review, index) in paginatedReviewsMobile" :key="review.keyId + '-' + review.languageCode" :ui="{ body: { padding: 'p-4' } }">
              <div class="flex flex-col gap-4">
                <div class="flex justify-between items-start">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-neutral-500 uppercase">{{ review.languageName }} ({{ review.languageCode }})</span>
                    <span class="font-mono text-sm text-primary-400 break-all">{{ review.keyName }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <u-avatar 
                      :src="review.authorAvatar || undefined" 
                      :icon="!review.authorAvatar ? 'i-lucide-user' : undefined"
                      :class="!review.authorAvatar ? 'bg-neutral-800 text-neutral-400' : ''"
                      size="xs" 
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-3 w-full bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-neutral-500">Current</span>
                    <p class="text-xs text-neutral-300 break-words" :class="{'opacity-50 italic': !review.originalValue}">
                      {{ review.originalValue || '(Empty)' }}
                    </p>
                  </div>
                  
                  <div class="h-px w-full bg-neutral-800/50"/>
                  
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] uppercase font-bold text-amber-500">Draft</span>
                    <p class="text-xs text-amber-400 break-words">
                      {{ review.draftValue }}
                    </p>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 justify-end mt-2">
                  <template v-if="isAdmin || isReviewer">
                    <u-button 
                      icon="i-lucide-x" 
                      color="error" 
                      variant="soft" 
                      size="xs"
                      label="Reject"
                      @click="handleReview(review, 'reject')"
                    />
                    <u-button 
                      icon="i-lucide-check" 
                      color="success" 
                      size="xs"
                      label="Approve"
                      @click="handleReview(review, 'approve')"
                    />
                  </template>
                  <div v-else class="text-[10px] text-neutral-500 italic">
                    Waiting for Reviewer
                  </div>
                </div>
              </div>
            </u-card>
            <div v-if="paginatedReviewsMobile.length === 0" class="text-center py-8 text-neutral-500 text-sm">
              No reviews match your search.
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-neutral-800">
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
                {{ pendingReviews.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, pendingReviews.length) }} of {{ pendingReviews.length }}
              </span>
              <u-pagination
                v-model:page="currentPagination"
                :total="pendingReviews.length"
                :items-per-page="pagination.pageSize"
              />
            </div>
          </div>
        </div>
      </u-card>
      </div>
      </template>

      <template #keys="{ item }">
        <div class="flex flex-col gap-4 mt-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-logs" class="w-5 h-5 text-primary-500" />
                Key Reviews
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Review structural changes such as new keys or renamed keys before they merge.</p>
            </div>
          </div>
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <u-input v-model="searchQuery" icon="i-lucide-search" placeholder="Search key reviews..." class="w-full md:max-w-sm" />
          </div>
          <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }">
            <div v-if="isLoading" class="p-8 text-center text-neutral-500">
              <u-icon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading reviews...
            </div>
            
            <div v-else-if="filteredKeys.length === 0" class="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
              <u-icon name="i-lucide-check-circle-2" class="w-12 h-12 text-success-500/50 mb-2" />
              <h3 class="text-lg font-medium text-neutral-300">All caught up!</h3>
              <p class="max-w-md" v-if="searchQuery">No key reviews match your search query.</p>
              <p class="max-w-md" v-else>There are no keys pending review right now.</p>
            </div>
            
            <div v-else>
              <div class="hidden md:block">
                <u-table 
                  :data="filteredKeys" 
                  :columns="[{ accessorKey: 'key', header: 'Key Name' }, { accessorKey: 'diff', header: 'Change' }, { id: 'actions', header: '' }]" 
                  :loading="isLoading"
                >
                  <template #key-cell="{ row }">
                    <span class="font-mono text-sm text-neutral-400 break-all">{{ row.original.key }}</span>
                  </template>
                  
                  <template #diff-cell="{ row }">
                    <div class="flex items-center gap-4 text-sm font-mono p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <template v-if="!row.original.draftKey">
                        <u-badge color="success" variant="subtle" size="xs">NEW KEY</u-badge>
                        <span class="text-success-400">{{ row.original.key }}</span>
                      </template>
                      <template v-else>
                        <span class="text-error-400 line-through opacity-70">{{ row.original.key }}</span>
                        <u-icon name="i-lucide-arrow-right" class="w-4 h-4 text-neutral-500" />
                        <span class="text-success-400">{{ row.original.draftKey }}</span>
                      </template>
                    </div>
                  </template>
                  
                  <template #actions-cell="{ row }">
                    <div class="flex items-center gap-2 justify-end">
                      <template v-if="isAdmin || isReviewer">
                        <u-button 
                          icon="i-lucide-x" 
                          color="error" 
                          variant="soft" 
                          size="sm"
                          label="Reject"
                          @click="handleKeyReview(row.original, 'reject')"
                        />
                        <u-button 
                          icon="i-lucide-check" 
                          color="success" 
                          size="sm"
                          label="Approve"
                          @click="handleKeyReview(row.original, 'approve')"
                        />
                      </template>
                      <div v-else class="text-xs text-neutral-500 italic">
                        Waiting for Reviewer
                      </div>
                    </div>
                  </template>
                </u-table>
              </div>

              <!-- Mobile List -->
              <div class="md:hidden flex flex-col p-4 gap-4">
                <u-card v-for="key in filteredKeys" :key="key.id" :ui="{ body: { padding: 'p-4' } }">
                  <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2 font-mono text-sm bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                      <template v-if="!key.draftKey">
                        <div class="flex items-center gap-2">
                          <u-badge color="success" variant="subtle" size="xs">NEW KEY</u-badge>
                          <span class="text-success-400 break-all">{{ key.key }}</span>
                        </div>
                      </template>
                      <template v-else>
                        <div class="flex flex-col gap-1">
                          <span class="text-[10px] uppercase font-bold text-error-500 font-sans">Current</span>
                          <span class="text-error-400 line-through opacity-70 break-all">{{ key.key }}</span>
                        </div>
                        <div class="h-px w-full bg-neutral-800"></div>
                        <div class="flex flex-col gap-1">
                          <span class="text-[10px] uppercase font-bold text-success-500 font-sans">Suggested</span>
                          <span class="text-success-400 break-all">{{ key.draftKey }}</span>
                        </div>
                      </template>
                    </div>
                    
                    <div class="flex items-center gap-2 justify-end">
                      <template v-if="isAdmin || isReviewer">
                        <u-button 
                          icon="i-lucide-x" 
                          color="error" 
                          variant="soft" 
                          size="xs"
                          label="Reject"
                          @click="handleKeyReview(key, 'reject')"
                        />
                        <u-button 
                          icon="i-lucide-check" 
                          color="success" 
                          size="xs"
                          label="Approve"
                          @click="handleKeyReview(key, 'approve')"
                        />
                      </template>
                      <div v-else class="text-[10px] text-neutral-500 italic">
                        Waiting for Reviewer
                      </div>
                    </div>
                  </div>
                </u-card>
              </div>
            </div>
          </u-card>
        </div>
      </template>
    </u-tabs>
    </div>
  </div>
</template>
