<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { useTranslation } from '~/composables/localization/useTranslation'

interface Language {
  id: number
  code: string
  name: string
  flag: string
}

const search = ref("")
const pagination = ref({pageIndex: 0, pageSize: 15})
const rowSelection = ref<Record<string, boolean>>({})

const isDeleteModalOpen = ref(false)
const isAddModalOpen = ref(false)

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const columns: TableColumn<Language>[] = [
  {id: 'select'},
  {accessorKey: 'name', header: 'Name'},
  {accessorKey: 'flag', header: 'Flag'},
  {accessorKey: 'code', header: 'Language Code'},
  {accessorKey: 'reference', header: 'Reference'},
  {id: 'actions'}
]

const {
  init,
  languages: realLanguages,
  isLoading,
  addProjectLanguage,
  bulkRemoveProjectLanguages,
  updateLanguage,
  setReferenceLanguage
} = useTranslation()

onMounted(() => {
  init()
})

const selectedLanguages = computed(() => {
  return realLanguages.value.filter((_, index) => rowSelection.value[index.toString()])
})

const selectedRowsCount = computed(() => selectedLanguages.value.length)

const deleteSelected = async () => {
  const languageIds = selectedLanguages.value.map(lang => lang.id);
  if (languageIds.length > 0) {
    await bulkRemoveProjectLanguages(languageIds);
  }
  rowSelection.value = {}
  isDeleteModalOpen.value = false
}

const addLanguage = async (payload: { code: string, name: string, flag: string }) => {
  await addProjectLanguage(payload.code, payload.name, payload.flag)
  isAddModalOpen.value = false
}

const isEditModalOpen = ref(false)
const languageToEdit = ref<Language | null>(null)

const openEditModal = (lang: Language) => {
  languageToEdit.value = lang
  isEditModalOpen.value = true
}

const saveEditedLanguage = async (payload: { id: number, code: string, name: string, flag: string }) => {
  await updateLanguage(payload.id, payload.code, payload.name, payload.flag)
}

const confirmDeleteSingle = (lang: Language) => {
  isDeleteModalOpen.value = true
  rowSelection.value = { [realLanguages.value.indexOf(lang).toString()]: true }
}

const bulkActions = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Set as Reference',
      icon: 'i-lucide-check-circle',
      color: 'success' as const,
      disabled: selectedLanguages.value.length !== 1,
      onSelect: () => {
        if (selectedLanguages.value.length === 1) {
           setReferenceLanguage(selectedLanguages.value[0].id)
           rowSelection.value = {}
        }
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



const filteredLanguagesMobile = computed(() => {
  if (!search.value) return realLanguages.value
  const s = search.value.toLowerCase()
  return realLanguages.value.filter(l => l.name.toLowerCase().includes(s) || l.code.toLowerCase().includes(s))
})

const paginatedLanguagesMobile = computed(() => {
  const start = pagination.value.pageIndex * pagination.value.pageSize
  return filteredLanguagesMobile.value.slice(start, start + pagination.value.pageSize)
})

const toggleSelection = (lang: Language) => {
  const idx = realLanguages.value.indexOf(lang).toString()
  rowSelection.value[idx] = !rowSelection.value[idx]
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <!-- Title was removed as it's now in the parent page -->
    </div>

    <language-delete-modal
      v-model="isDeleteModalOpen"
      :selected-count="selectedRowsCount"
      @confirm="deleteSelected"
    />

    <language-create-modal
      v-model="isAddModalOpen"
      :existing-languages="realLanguages"
      @create="addLanguage"
    />

    <language-edit-modal
      v-model="isEditModalOpen"
      :language="languageToEdit"
      @save="saveEditedLanguage"
    />

    <div class="flex flex-col md:flex-row justify-between py-4 gap-4">
      <u-input v-model="search" icon="i-lucide-search" size="lg" placeholder="Search languages..." class="w-full md:w-80"/>
      <div class="flex items-center gap-2 w-full md:w-auto justify-end">
        <u-dropdown-menu v-if="selectedRowsCount > 0" :items="bulkActions">
          <u-button
              variant="subtle"
              color="neutral"
              :label="`Actions (${selectedRowsCount})`"
              icon="i-lucide-chevron-down"
              trailing
          />
        </u-dropdown-menu>
        <u-button
            variant="subtle"
            color="neutral"
            label="Add Language"
            icon="i-lucide-plus"
            @click="isAddModalOpen = true"
        />
      </div>
    </div>

    <div class="w-full space-y-4 pb-4">
      <div class="hidden md:block">
        <u-table
            v-model:row-selection="rowSelection"
            v-model:pagination="pagination"
            v-model:global-filter="search"
            :data="realLanguages"
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

          <template #name-cell="{ row }">
            <span class="font-medium text-neutral-800 dark:text-neutral-200">{{ row.getValue('name') }}</span>
          </template>

          <template #flag-cell="{ row }">
            <span class="text-2xl" aria-hidden="true">{{ row.original.flag }}</span>
          </template>

          <template #code-cell="{ row }">
            <u-badge variant="subtle" color="neutral" size="sm" class="font-mono">
              {{ row.getValue('code') }}
            </u-badge>
          </template>

          <template #reference-cell="{ row }">
            <u-icon v-if="row.original.isRef" name="i-lucide-circle-check-big" class="size-4 text-success"/>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-2" @click.stop>
              <u-button 
                icon="i-lucide-pencil" 
                color="neutral" 
                variant="ghost" 
                size="sm"
                @click="openEditModal(row.original)" 
              />
              <u-button 
                icon="i-lucide-trash-2" 
                color="error" 
                variant="ghost" 
                size="sm"
                @click="confirmDeleteSingle(row.original)" 
              />
            </div>
          </template>
        </u-table>
      </div>

      <!-- Mobile List -->
      <div class="flex flex-col gap-3 md:hidden">
        <u-card v-for="lang in paginatedLanguagesMobile" :key="lang.id" :ui="{ body: { padding: 'p-4' } }" class="cursor-pointer" @click="toggleSelection(lang)">
          <div class="flex items-center gap-4">
            <u-checkbox
              :model-value="rowSelection[realLanguages.indexOf(lang).toString()]"
              @update:model-value="(val) => rowSelection[realLanguages.indexOf(lang).toString()] = !!val"
              @click.stop
            />
            <span class="text-3xl">{{ lang.flag }}</span>
            <div class="flex flex-col flex-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-neutral-200">{{ lang.name }}</span>
                <div class="flex items-center gap-1" @click.stop>
                  <u-button 
                    icon="i-lucide-pencil" 
                    size="xs" 
                    variant="ghost" 
                    color="neutral" 
                    @click="openEditModal(lang)" 
                  />
                  <u-button 
                    icon="i-lucide-trash-2" 
                    size="xs" 
                    variant="ghost" 
                    color="error" 
                    @click="confirmDeleteSingle(lang)" 
                  />
                </div>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <u-badge variant="subtle" color="neutral" size="xs" class="font-mono">{{ lang.code }}</u-badge>
                <u-badge v-if="lang.isRef" variant="subtle" color="success" size="xs">Reference</u-badge>
              </div>
            </div>
          </div>
        </u-card>
        <div v-if="paginatedLanguagesMobile.length === 0" class="text-center py-8 text-neutral-500 text-sm">
          No languages found.
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
            {{ realLanguages.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, realLanguages.length) }} of {{ realLanguages.length }}
          </span>
          <u-pagination
            v-model:page="currentPagination"
            :total="realLanguages.length"
            :items-per-page="pagination.pageSize"
          />
        </div>
      </div>
    </div>
  </div>
</template>
