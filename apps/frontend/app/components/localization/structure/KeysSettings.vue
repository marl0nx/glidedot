<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { TranslationKey, TranslationLabel, Project } from '~/types'
import { useTranslation } from '~/composables/localization/useTranslation'
import { useConventions } from '~/composables/localization/useConventions'
import { useRoute, useRouter } from 'vue-router'
import { useProject } from '~/composables/useProject'
import { useApi } from '~/composables/useApi'
import NamespaceGraph from '~/components/admin/insights/graphs/NamespaceGraph.vue'
import { watch } from 'vue'

const route = useRoute()
const router = useRouter()
const projectId = parseInt(route.params.id as string)
const { fetchApi } = useApi()

const {
  templates,
  glossary,
  variables,
  loadConventions
} = useConventions()

const { data: projectsData } = await useAsyncData(`projects-${projectId}`, () => fetchApi('/localization/projects'))
const projects = computed<Project[]>(() => (projectsData.value as Project[]) || [])
const { currentProject } = useProject(projects)
const toast = useToast()

const {
  init,
  keys: realKeys,
  labels: projectLabels,
  isLoading,
  addKey,
  updateKey,
  bulkDeleteKeys,
  bulkAddLabelToKeys,
  bulkRemoveLabelFromKeys,
  addLabelToKey,
  removeLabelFromKey,
  bulkUpdateKeys
} = useTranslation()

const search = ref((route.query.searchKey as string) || "")
const pagination = ref({pageIndex: 0, pageSize: 15})
const rowSelection = ref<Record<string, boolean>>({})
const isEditLabelsModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isAddKeyModalOpen = ref(false)
const editingKeyId = ref<number | null>(null)
const editingKeyName = ref("")
const showDiagram = ref(false)

watch(isEditLabelsModalOpen, (isOpen) => {
  if (!isOpen) {
    rowSelection.value = {}
  }
})

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const handleGraphGoToStructure = (keyName: string) => {
  search.value = keyName
  showDiagram.value = false
}

const handleGraphGoToTranslations = (keyName: string, langId: number) => {
  router.push({
    path: `/projects/${projectId}/translations`,
    query: { editKey: keyName, langId: langId.toString() }
  })
}

const columns: TableColumn<TranslationKey>[] = [
  {id: 'select'},
  {accessorKey: 'key', header: 'Translation Key'},
  {id: 'conventions', header: 'Conventions'},
  {accessorKey: 'labels', header: 'Labels'},
  {id: 'actions'}
]

onMounted(() => {
  init()
  loadConventions(projectId)
})

const selectedKeys = computed(() => {
  return realKeys.value.filter((_, index) => rowSelection.value[index.toString()])
})

const deleteSelectedKeys = async () => {
  const ids = selectedKeys.value.map(k => k.id)
  if (ids.length) {
    await bulkDeleteKeys(ids)
  }
  rowSelection.value = {}
  isDeleteModalOpen.value = false
}

const selectedRowsCount = computed(() => selectedKeys.value.length)

const commonLabels = computed(() => {
  if (selectedKeys.value.length === 0) return []
  const firstKeyLabels = selectedKeys.value[0]?.labels || []
  return firstKeyLabels.filter(label =>
      selectedKeys.value.every(key =>
          key.labels?.some(l => l.id === label.id)
      )
  )
})

const availableLabels = computed(() => {
  const commonIds = commonLabels.value.map(l => l.id)
  return projectLabels.value.filter(l => !commonIds.includes(l.id))
})

const addLabelToSelection = async (label: TranslationLabel) => {
  const ids = selectedKeys.value.filter(key => !key.labels?.some(l => l.id === label.id)).map(k => k.id)
  if (ids.length) {
    await bulkAddLabelToKeys(ids, label.id)
  }
}

const removeLabelFromSelection = async (labelId: number) => {
  const ids = selectedKeys.value.filter(key => key.labels?.some(l => l.id === labelId)).map(k => k.id)
  if (ids.length) {
    await bulkRemoveLabelFromKeys(ids, labelId)
  }
}

const addNewKey = async (keyName: string, labelIds: number[]) => {
  await addKey(keyName, labelIds)
  isAddKeyModalOpen.value = false
}

const startEditingKey = (keyObj: TranslationKey) => {
  editingKeyId.value = keyObj.id
  editingKeyName.value = keyObj.key
}

const saveKeyName = async (keyId: number) => {
  if (editingKeyId.value === keyId && editingKeyName.value.trim() !== '') {
    const keyToUpdate = realKeys.value.find(k => k.id === keyId)
    if (keyToUpdate && keyToUpdate.key !== editingKeyName.value) {
      await updateKey(keyId, editingKeyName.value)
    }
  }
  editingKeyId.value = null
}

const confirmDeleteSingleKey = (keyObj: TranslationKey) => {
  isDeleteModalOpen.value = true
  rowSelection.value = { [realKeys.value.indexOf(keyObj).toString()]: true }
}


const getGlossaryFixes = (keyName: string) => {
  if (!glossary.value || glossary.value.length === 0) return []
  const fixes: { badWord: string, goodWord: string }[] = []
  
  glossary.value.forEach(term => {
    const badWords = term.badWord.split(',').map(w => w.trim()).filter(Boolean)
    for (const word of badWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|[\\.\\-_\\s])${escapedWord}([\\.\\-_\\s]|$)`, 'i')
      if (regex.test(keyName)) {
        fixes.push({ badWord: word, goodWord: term.goodWord })
      }
    }
  })
  return fixes
}

const applyGlossaryFixesToName = (keyName: string, fixes: { badWord: string, goodWord: string }[]) => {
  let newName = keyName
  for (const fix of fixes) {
    const escapedWord = fix.badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[\\.\\-_\\s])(${escapedWord})([\\.\\-_\\s]|$)`, 'gi')
    newName = newName.replace(regex, (match, p1, p2, p3) => p1 + fix.goodWord + p3)
  }
  return newName
}

const autoFixKey = async (keyObj: TranslationKey) => {
  const fixes = getGlossaryFixes(keyObj.key)
  if (fixes.length > 0) {
    const newName = applyGlossaryFixesToName(keyObj.key, fixes)
    if (newName !== keyObj.key) {
      if (realKeys.value.some(k => k.key === newName)) {
        toast.add({ title: 'Conflict', description: `Cannot auto-fix: a key with the name '${newName}' already exists.`, color: 'error' })
        return
      }
      try {
        await updateKey(keyObj.id, newName, true)
        toast.add({ title: 'Success', description: 'Key auto-fix sent for review', color: 'success' })
      } catch(e) {
        toast.add({ title: 'Error', description: 'Failed to auto-fix key', color: 'error' })
      }
    }
  }
}

const isAutoFixingAll = ref(false)

const keysWithGlossaryWarnings = computed(() => {
  return realKeys.value.filter(k => {
    if (k.reviewStatus === 'PENDING_REVIEW') return false;
    const fixes = getGlossaryFixes(k.key);
    if (fixes.length === 0) return false;
    
    // Ensure auto-fix wouldn't cause a conflict
    const newName = applyGlossaryFixesToName(k.key, fixes);
    const wouldConflict = realKeys.value.some(rk => rk.id !== k.id && rk.key === newName);
    return !wouldConflict;
  })
})

const autoFixAllKeys = async () => {
  const keysToFix = keysWithGlossaryWarnings.value
  if (!keysToFix.length) return
  
  isAutoFixingAll.value = true
  
  const updates: { id: number, key: string }[] = []
  
  for (const k of keysToFix) {
    const fixes = getGlossaryFixes(k.key)
    const newName = applyGlossaryFixesToName(k.key, fixes)
    if (newName !== k.key) {
      updates.push({ id: k.id, key: newName })
    }
  }
  
  if (updates.length > 0) {
    await bulkUpdateKeys(updates, true)
  }
  
  isAutoFixingAll.value = false
}


const bulkActions = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Edit Labels',
      icon: 'i-lucide-tag',
      onSelect: () => {
        isEditLabelsModalOpen.value = true
      }
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => {
        isDeleteModalOpen.value = true
      }
    }
  ]
])

const filteredKeysMobile = computed(() => {
  if (!search.value) return realKeys.value
  const s = search.value.toLowerCase()
  return realKeys.value.filter(k => k.key.toLowerCase().includes(s))
})

const paginatedKeysMobile = computed(() => {
  const start = pagination.value.pageIndex * pagination.value.pageSize
  return filteredKeysMobile.value.slice(start, start + pagination.value.pageSize)
})

const toggleSelection = (keyObj: TranslationKey) => {
  const idx = realKeys.value.indexOf(keyObj).toString()
  rowSelection.value[idx] = !rowSelection.value[idx]
}

const getRegexForTemplate = (segments: any[], variables: any[]) => {
  let pattern = '^'
  let isOptionalGroupOpen = 0
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    let segPattern = ''
    
    if (seg.type === 'constant') {
      segPattern = (seg.constantValue || '').replace(/\./g, '\\.')
    } else if (seg.type === 'enum') {
      const opts = seg.options || []
      segPattern = opts.length > 0 ? `(${opts.join('|')})` : '[^.]+'
    } else if (seg.type === 'shared-enum') {
      const v = variables.find((v: any) => v.id === seg.variableId)
      if (v) {
        const opts = v.options.split(',').map((s: string) => s.trim()).filter(Boolean)
        segPattern = opts.length > 0 ? `(${opts.join('|')})` : '[^.]+'
      } else {
        segPattern = '[^.]+'
      }
    } else if (seg.type === 'nested-path') {
      segPattern = '.*'
    } else {
      segPattern = '[^.]+'
    }
    
    const isLast = i === segments.length - 1
    
    if (seg.isOptional) {
      pattern += `(?:${segPattern}`
      if (!isLast && seg.type !== 'nested-path') pattern += '\\.'
      isOptionalGroupOpen++
    } else {
      pattern += segPattern
      if (!isLast && seg.type !== 'nested-path') pattern += '\\.'
    }
  }
  
  pattern += ')'.repeat(isOptionalGroupOpen)
  pattern += '$'
  return new RegExp(pattern)
}

const validateKeyCache = new Map<string, string[]>()

const validateKey = (keyName: string) => {
  if (validateKeyCache.has(keyName)) return validateKeyCache.get(keyName)!
  const warnings: string[] = []
  
  // Glossary
  glossary.value.forEach(term => {
    const badWords = term.badWord.split(',').map(w => w.trim()).filter(Boolean)
    for (const word of badWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|[\\.\\-_\\s])${escapedWord}([\\.\\-_\\s]|$)`, 'i')
      if (regex.test(keyName)) {
        warnings.push(`Forbidden word: "${word}" (Use "${term.goodWord}")`)
      }
    }
  })
  
  // Templates
  if (currentProject.value?.requireTemplate && templates.value.length > 0) {
    let matchesTemplate = false
    for (const t of templates.value) {
      try {
        const segments = JSON.parse(t.segments)
        const regex = getRegexForTemplate(segments, variables.value)
        if (regex.test(keyName)) {
          matchesTemplate = true
          break
        }
      } catch(e) {}
    }
    if (!matchesTemplate) {
      warnings.push("Does not match any Key Template schema")
    }
  }
  
  validateKeyCache.set(keyName, warnings)
  return warnings
}

watch([glossary, templates, variables], () => {
  validateKeyCache.clear()
}, { deep: true })
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <!-- Title was removed as it's now in the parent page -->
    </div>

    <key-edit-labels-modal
      v-model="isEditLabelsModalOpen"
      :selected-count="selectedRowsCount"
      :common-labels="commonLabels"
      :available-labels="availableLabels"
      @add-label="addLabelToSelection"
      @remove-label="removeLabelFromSelection"
    />

    <key-delete-modal
      v-model="isDeleteModalOpen"
      :selected-count="selectedRowsCount"
      @confirm="deleteSelectedKeys"
    />

    <key-create-modal
      v-model="isAddKeyModalOpen"
      :templates="templates"
      :glossary="glossary"
      :variables="variables"
      :labels="projectLabels"
      :require-template="currentProject?.requireTemplate"
      @create="addNewKey"
    />

    <div class="flex flex-col md:flex-row justify-between py-4 gap-4">
      <u-input v-if="!showDiagram" v-model="search" icon="i-lucide-search" size="lg" placeholder="Search keys..." class="w-full md:w-80"/>
      <div v-else class="flex items-center text-neutral-300 font-medium">Visualizing Project Keys</div>
      <div class="flex items-center gap-2 w-full md:w-auto justify-end">
        <u-button
            v-if="showDiagram"
            variant="subtle"
            color="neutral"
            label="Back to List"
            icon="i-lucide-list"
            @click="showDiagram = false"
        />
        <u-button
            v-else
            variant="subtle"
            color="neutral"
            label="Diagram View"
            icon="i-lucide-folder-tree"
            @click="showDiagram = true"
        />
        <u-dropdown-menu v-if="!showDiagram && selectedRowsCount > 0" :items="bulkActions">
          <u-button
              variant="subtle"
              color="neutral"
              :label="`Actions (${selectedRowsCount})`"
              icon="i-lucide-chevron-down"
              trailing
          />
        </u-dropdown-menu>
        <u-button
            v-if="!showDiagram && keysWithGlossaryWarnings.length > 0"
            variant="soft"
            color="warning"
            :loading="isAutoFixingAll"
            :label="`Fix ${keysWithGlossaryWarnings.length} Glossary Error${keysWithGlossaryWarnings.length > 1 ? 's' : ''}`"
            icon="i-lucide-wand-2"
            @click="autoFixAllKeys"
        />
        <u-button
            v-if="!showDiagram"
            variant="subtle"
            color="neutral"
            label="Add Key"
            icon="i-lucide-plus"
            @click="isAddKeyModalOpen = true"
        />
      </div>
    </div>

    <div v-if="showDiagram" class="w-full pb-4">
      <namespace-graph 
        :project-id="projectId" 
        @go-to-structure="handleGraphGoToStructure"
        @go-to-translations="handleGraphGoToTranslations"
      />
    </div>

    <div v-else class="w-full space-y-4 pb-4">
      <div class="hidden md:block">
        <u-table
            v-model:row-selection="rowSelection"
            v-model:pagination="pagination"
            v-model:global-filter="search"
            :data="realKeys"
            :columns="columns"
            :loading="isLoading"
            :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
            class="font-mono"
        >

          <template #select-header="{ table }">
            <u-checkbox
                :model-value="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
                aria-label="Select all"
                @update:model-value="(val) => table.toggleAllPageRowsSelected(!!val)"
            />
          </template>

          <template #select-cell="{ row }">
            <u-checkbox
                :model-value="row.getIsSelected()"
                aria-label="Select row"
                @update:model-value="(val) => row.toggleSelected(!!val)"
            />
          </template>

          <template #key-cell="{ row }">
            <div class="flex items-center gap-2 group">
              <span v-if="editingKeyId !== row.original.id" class="font-medium">{{ row.getValue('key') }}</span>
              <u-input 
                v-else 
                v-model="editingKeyName" 
                size="xs" 
                autofocus 
                @keyup.enter="saveKeyName(row.original.id)" 
                @keyup.esc="editingKeyId = null" 
                @blur="saveKeyName(row.original.id)" 
                @click.stop
              />
              <u-button 
                v-if="editingKeyId !== row.original.id" 
                icon="i-lucide-pencil" 
                size="xs" 
                variant="ghost" 
                color="neutral" 
                class="opacity-0 group-hover:opacity-100 transition-opacity ml-2" 
                @click="startEditingKey(row.original)" 
              />
            </div>
          </template>

          <template #conventions-cell="{ row }">
            <div class="flex items-center gap-2">
              <template v-if="row.original.reviewStatus === 'PENDING_REVIEW'">
                <u-badge color="warning" variant="subtle" size="sm" class="opacity-70"><u-icon name="i-lucide-clock" class="mr-1 w-3 h-3" /> Pending Review</u-badge>
              </template>
              <template v-else-if="validateKey(row.original.key).length === 0">
                <u-badge color="success" variant="subtle" size="sm" class="opacity-70"><u-icon name="i-lucide-check-circle" class="mr-1 w-3 h-3" /> Valid</u-badge>
              </template>
              <template v-else>
                <div class="flex items-center gap-1">
                  <u-tooltip :text="validateKey(row.original.key).join(' • ')">
                    <u-badge color="warning" variant="subtle" size="sm" class="cursor-help"><u-icon name="i-lucide-alert-triangle" class="mr-1 w-3 h-3" /> Invalid</u-badge>
                  </u-tooltip>
                  <template v-if="getGlossaryFixes(row.original.key).length > 0">
                    <u-tooltip v-if="realKeys.some(rk => rk.id !== row.original.id && rk.key === applyGlossaryFixesToName(row.original.key, getGlossaryFixes(row.original.key)))" text="Auto-fix unavailable: The destination key name already exists.">
                      <u-button
                        icon="i-lucide-wand-2"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        class="opacity-50 cursor-not-allowed"
                      />
                    </u-tooltip>
                    <u-button
                      v-else
                      icon="i-lucide-wand-2"
                      size="xs"
                      color="warning"
                      variant="ghost"
                      @click.stop="autoFixKey(row.original)"
                    />
                  </template>
                </div>
              </template>
            </div>
          </template>

          <template #labels-cell="{ row }">
            <div class="flex gap-1 items-center flex-wrap group">
              <template v-if="row.original.labels?.length">
                <u-badge v-for="label in row.original.labels" :key="label.id" variant="subtle" color="neutral" size="md"
                        :style="{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}20` }">
                  {{ label.name }}
                  <u-button icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :padded="false" class="ml-1 -mr-1 opacity-50 hover:opacity-100" @click.stop="removeLabelFromKey(row.original.id, label.id)" />
                </u-badge>
              </template>
              
              <u-popover>
                <u-button icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" :class="row.original.labels?.length ? 'opacity-0 group-hover:opacity-100 transition-opacity' : 'opacity-60 hover:opacity-100 transition-opacity'" />
                <template #content>
                  <div class="p-2 flex flex-col gap-1 w-48">
                    <span class="text-xs font-semibold text-neutral-400 mb-1 px-1">Add Label</span>
                    <div v-if="projectLabels.filter(l => !row.original.labels?.some(rl => rl.id === l.id)).length === 0" class="text-xs text-neutral-500 px-1 italic">
                      No available labels
                    </div>
                    <u-button 
                      v-for="l in projectLabels.filter(l => !row.original.labels?.some(rl => rl.id === l.id))" 
                      :key="l.id"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="justify-start w-full"
                      @click="addLabelToKey(row.original.id, l.id)"
                    >
                      <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: l.color }"></div>
                      {{ l.name }}
                    </u-button>
                  </div>
                </template>
              </u-popover>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-2" @click.stop>
              <u-button 
                icon="i-lucide-pencil" 
                color="neutral" 
                variant="ghost" 
                size="sm"
                @click="startEditingKey(row.original)" 
              />
              <u-button 
                icon="i-lucide-trash-2" 
                color="error" 
                variant="ghost" 
                size="sm"
                @click="confirmDeleteSingleKey(row.original)" 
              />
            </div>
          </template>
        </u-table>
      </div>

      <!-- Mobile List -->
      <div class="flex flex-col gap-3 md:hidden">
        <u-card v-for="keyObj in paginatedKeysMobile" :key="keyObj.id" :ui="{ body: 'p-4' }" class="cursor-pointer" @click="toggleSelection(keyObj)">
          <div class="flex items-start gap-4">
            <u-checkbox
              class="mt-1"
              :model-value="rowSelection[realKeys.indexOf(keyObj).toString()]"
              @update:model-value="(val) => rowSelection[realKeys.indexOf(keyObj).toString()] = !!val"
              @click.stop
            />
            <div class="flex flex-col flex-1 gap-2 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span v-if="editingKeyId !== keyObj.id" class="font-bold text-neutral-200 font-mono break-all text-sm">{{ keyObj.key }}</span>
                <u-input 
                  v-else 
                  v-model="editingKeyName" 
                  size="xs" 
                  autofocus 
                  @keyup.enter="saveKeyName(keyObj.id)" 
                  @keyup.esc="editingKeyId = null" 
                  @blur="saveKeyName(keyObj.id)" 
                  @click.stop
                />
                <div class="flex items-center gap-1" @click.stop>
                  <u-button 
                    v-if="editingKeyId !== keyObj.id" 
                    icon="i-lucide-pencil" 
                    size="xs" 
                    variant="ghost" 
                    color="neutral" 
                    @click="startEditingKey(keyObj)" 
                  />
                  <u-button 
                    v-if="editingKeyId !== keyObj.id" 
                    icon="i-lucide-trash-2" 
                    size="xs" 
                    variant="ghost" 
                    color="error" 
                    @click="confirmDeleteSingleKey(keyObj)" 
                  />
                  <div class="flex items-center">
                    <template v-if="validateKey(keyObj.key).length === 0">
                      <u-badge color="success" variant="subtle" size="xs" class="opacity-70"><u-icon name="i-lucide-check-circle" class="w-3 h-3" /></u-badge>
                    </template>
                    <template v-else>
                      <div class="flex items-center gap-1">
                        <u-tooltip :text="validateKey(keyObj.key).join(' • ')">
                           <u-badge color="warning" variant="subtle" size="xs"><u-icon name="i-lucide-alert-triangle" class="w-3 h-3" /></u-badge>
                        </u-tooltip>
                        <u-button
                          v-if="getGlossaryFixes(keyObj.key).length > 0"
                          icon="i-lucide-wand-2"
                          size="xs"
                          color="warning"
                          variant="ghost"
                          @click.stop="autoFixKey(keyObj)"
                        />
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap group">
                <template v-if="keyObj.labels?.length">
                  <u-badge v-for="label in keyObj.labels" :key="label.id" variant="subtle" color="neutral" size="xs"
                          :style="{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}20` }">
                    {{ label.name }}
                    <u-button icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :padded="false" class="ml-1 -mr-1 opacity-50 hover:opacity-100" @click.stop="removeLabelFromKey(keyObj.id, label.id)" />
                  </u-badge>
                </template>

                <u-popover>
                  <u-button icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" @click.stop :class="keyObj.labels?.length ? '' : 'opacity-60 hover:opacity-100'" />
                  <template #content>
                    <div class="p-2 flex flex-col gap-1 w-48" @click.stop>
                      <span class="text-xs font-semibold text-neutral-400 mb-1 px-1">Add Label</span>
                      <div v-if="projectLabels.filter(l => !keyObj.labels?.some(rl => rl.id === l.id)).length === 0" class="text-xs text-neutral-500 px-1 italic">
                        No available labels
                      </div>
                      <u-button 
                        v-for="l in projectLabels.filter(l => !keyObj.labels?.some(rl => rl.id === l.id))" 
                        :key="l.id"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        class="justify-start w-full"
                        @click.stop="addLabelToKey(keyObj.id, l.id)"
                      >
                        <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: l.color }"></div>
                        {{ l.name }}
                      </u-button>
                    </div>
                  </template>
                </u-popover>
              </div>
            </div>
          </div>
        </u-card>
        <div v-if="paginatedKeysMobile.length === 0" class="text-center py-8 text-neutral-500 text-sm">
          No keys found.
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-default pt-4 px-4">
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
            {{ realKeys.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, realKeys.length) }} of {{ realKeys.length }}
          </span>
          <u-pagination
            v-model:page="currentPagination"
            :total="realKeys.length"
            :items-per-page="pagination.pageSize"
          />
        </div>
      </div>
    </div>
  </div>
</template>