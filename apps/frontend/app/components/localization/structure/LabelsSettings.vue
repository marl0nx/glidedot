<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { TranslationLabel } from '~/types'
import { useTranslation } from '~/composables/localization/useTranslation'
import { useDebounceFn } from '@vueuse/core'

const search = ref("")
const pagination = ref({pageIndex: 0, pageSize: 15})
const rowSelection = ref<Record<string, boolean>>({})

const isDeleteModalOpen = ref(false)
const isAddLabelModalOpen = ref(false)
const editingLabelId = ref<number | null>(null)
const editingLabelName = ref("")


const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const columns: TableColumn<TranslationLabel>[] = [
  {id: 'select'},
  {accessorKey: 'name', header: 'Label Name'},
  {accessorKey: 'color', header: 'Color'},
  {id: 'actions'}
]

const {
  init,
  labels: realLabels,
  isLoading,
  addLabel,
  updateLabel,
  bulkDeleteLabels
} = useTranslation()

onMounted(() => {
  init()
})

const selectedLabels = computed(() => {
  return realLabels.value.filter((_, index) => rowSelection.value[index.toString()])
})

const selectedRowsCount = computed(() => selectedLabels.value.length)

const deleteSelectedLabels = async () => {
  const ids = selectedLabels.value.map(l => l.id)
  if (ids.length) {
    await bulkDeleteLabels(ids)
  }
  rowSelection.value = {}
  isDeleteModalOpen.value = false
}

const addNewLabel = async (payload: { name: string, color: string }) => {
  await addLabel(payload.name, payload.color)
  isAddLabelModalOpen.value = false
}

const startEditingLabel = (label: TranslationLabel) => {
  editingLabelId.value = label.id
  editingLabelName.value = label.name
}

const saveLabelName = async (labelId: number) => {
  if (editingLabelId.value === labelId && editingLabelName.value.trim() !== '') {
    const labelToUpdate = realLabels.value.find(l => l.id === labelId)
    if (labelToUpdate && labelToUpdate.name !== editingLabelName.value) {
      await updateLabel(labelId, editingLabelName.value, labelToUpdate.color)
    }
  }
  editingLabelId.value = null
}

const confirmDeleteSingleLabel = (label: TranslationLabel) => {
  isDeleteModalOpen.value = true
  rowSelection.value = { [realLabels.value.indexOf(label as { id: number; name: string; color: string }).toString()]: true }
}

const updateLabelColor = useDebounceFn(async (label: TranslationLabel, newColor: string) => {
  if (label.color !== newColor) {
    const oldColor = label.color
    label.color = newColor
    try {
      await updateLabel(label.id, label.name, newColor)
    } catch {
      label.color = oldColor
    }
  }
}, 500)

const bulkActions = computed<DropdownMenuItem[][]>(() => [
  [
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

const filteredLabelsMobile = computed(() => {
  if (!search.value) return realLabels.value
  const s = search.value.toLowerCase()
  return realLabels.value.filter(l => l.name.toLowerCase().includes(s))
})

const paginatedLabelsMobile = computed(() => {
  const start = pagination.value.pageIndex * pagination.value.pageSize
  return filteredLabelsMobile.value.slice(start, start + pagination.value.pageSize)
})

const toggleSelection = (label: TranslationLabel) => {
  const idx = realLabels.value.indexOf(label as { id: number; name: string; color: string }).toString()
  rowSelection.value[idx] = !rowSelection.value[idx]
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <!-- Title was removed as it's now in the parent page -->
    </div>

    <label-delete-modal
      v-model="isDeleteModalOpen"
      :selected-count="selectedRowsCount"
      @confirm="deleteSelectedLabels"
    />

    <label-create-modal
      v-model="isAddLabelModalOpen"
      @create="addNewLabel"
    />

    <div class="flex flex-col md:flex-row justify-between py-4 gap-4">
      <u-input v-model="search" icon="i-lucide-search" size="lg" placeholder="Search labels..." class="w-full md:w-80"/>
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
            label="Add Label"
            icon="i-lucide-plus"
            @click="isAddLabelModalOpen = true"
        />
      </div>
    </div>

    <div class="w-full space-y-4 pb-4">
      <div class="hidden md:block">
        <u-table
            v-model:row-selection="rowSelection"
            v-model:pagination="pagination"
            v-model:global-filter="search"
            :data="realLabels"
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
            <div class="flex items-center gap-2 group">
              <span v-if="editingLabelId !== row.original.id" class="font-medium">{{ row.getValue('name') }}</span>
              <u-input 
                v-else 
                v-model="editingLabelName" 
                size="xs" 
                autofocus 
                @keyup.enter="saveLabelName(row.original.id)" 
                @keyup.esc="editingLabelId = null" 
                @blur="saveLabelName(row.original.id)" 
                @click.stop
              />
              <u-button 
                v-if="editingLabelId !== row.original.id" 
                icon="i-lucide-pencil" 
                size="xs" 
                variant="ghost" 
                color="neutral" 
                class="opacity-0 group-hover:opacity-100 transition-opacity ml-2" 
                @click="startEditingLabel(row.original)" 
              />
            </div>
          </template>

          <template #color-cell="{ row }">
            <u-popover>
              <u-badge
                  variant="subtle"
                  color="neutral"
                  size="md"
                  class="cursor-pointer hover:opacity-80 transition-opacity"
                  :style="{ backgroundColor: `${row.original.color}20`, color: row.original.color, borderColor: `${row.original.color}20` }"
              >
                {{ row.original.color }}
              </u-badge>
              
              <template #content>
                <div class="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl flex flex-col gap-3 min-w-[200px]" @click.stop>
                  <u-color-picker 
                    :model-value="row.original.color" 
                    @update:model-value="val => updateLabelColor(row.original, val || '#ffffff')"
                  />
                  <u-input 
                    :model-value="row.original.color" 
                    @update:model-value="val => updateLabelColor(row.original, val || '#ffffff')"
                    placeholder="#000000" 
                    size="sm"
                  />
                </div>
              </template>
            </u-popover>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-2" @click.stop>
              <u-button 
                icon="i-lucide-pencil" 
                color="neutral" 
                variant="ghost" 
                size="sm"
                @click="startEditingLabel(row.original)" 
              />
              <u-button 
                icon="i-lucide-trash-2" 
                color="error" 
                variant="ghost" 
                size="sm"
                @click="confirmDeleteSingleLabel(row.original)" 
              />
            </div>
          </template>
        </u-table>
      </div>

      <!-- Mobile List -->
      <div class="flex flex-col gap-3 md:hidden">
        <u-card v-for="label in paginatedLabelsMobile" :key="label.id" :ui="{ body: 'p-4' }" class="cursor-pointer" @click="toggleSelection(label)">
          <div class="flex items-center gap-4">
            <u-checkbox
              :model-value="rowSelection[realLabels.indexOf(label).toString()]"
              @update:model-value="(val) => rowSelection[realLabels.indexOf(label).toString()] = !!val"
              @click.stop
            />
            <div class="flex flex-col flex-1 gap-2">
              <div class="flex items-center justify-between gap-2">
                <span v-if="editingLabelId !== label.id" class="font-bold text-neutral-200">{{ label.name }}</span>
                <u-input 
                  v-else 
                  v-model="editingLabelName" 
                  size="xs" 
                  autofocus 
                  @keyup.enter="saveLabelName(label.id)" 
                  @keyup.esc="editingLabelId = null" 
                  @blur="saveLabelName(label.id)" 
                  @click.stop
                />
                <div class="flex items-center gap-1" @click.stop>
                  <u-button 
                    v-if="editingLabelId !== label.id" 
                    icon="i-lucide-pencil" 
                    size="xs" 
                    variant="ghost" 
                    color="neutral" 
                    @click="startEditingLabel(label)" 
                  />
                  <u-button 
                    v-if="editingLabelId !== label.id" 
                    icon="i-lucide-trash-2" 
                    size="xs" 
                    variant="ghost" 
                    color="error" 
                    @click="confirmDeleteSingleLabel(label)" 
                  />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <u-popover>
                  <u-badge
                      variant="subtle"
                      color="neutral"
                      size="sm"
                      class="cursor-pointer hover:opacity-80 transition-opacity"
                      :style="{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}20` }"
                  >
                    {{ label.color }}
                  </u-badge>
                  
                  <template #content>
                    <div class="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl flex flex-col gap-3 min-w-[200px]" @click.stop>
                      <u-color-picker 
                        :model-value="label.color" 
                        @update:model-value="val => updateLabelColor(label, val || '#ffffff')"
                      />
                      <u-input 
                        :model-value="label.color" 
                        @update:model-value="val => updateLabelColor(label, val || '#ffffff')"
                        placeholder="#000000" 
                        size="sm"
                      />
                    </div>
                  </template>
                </u-popover>
              </div>
            </div>
          </div>
        </u-card>
        <div v-if="paginatedLabelsMobile.length === 0" class="text-center py-8 text-neutral-500 text-sm">
          No labels found.
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
            {{ realLabels.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, realLabels.length) }} of {{ realLabels.length }}
          </span>
          <u-pagination
            v-model:page="currentPagination"
            :total="realLabels.length"
            :items-per-page="pagination.pageSize"
          />
        </div>
      </div>
    </div>
  </div>
</template>
