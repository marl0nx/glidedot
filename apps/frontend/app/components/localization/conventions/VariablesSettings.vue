<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { KeyVariable } from '~/types'

defineProps<{
  variables: KeyVariable[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'add', name: string, options: string): void
  (e: 'update', id: number, name: string, options: string): void
  (e: 'delete', id: number): void
}>()

const search = ref('')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const isModalOpen = ref(false)
const editingId = ref<number | null>(null)

const isDeleteModalOpen = ref(false)
const variableToDelete = ref<number | null>(null)

const newName = ref('')
const newOptions = ref('')

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const columns: TableColumn<KeyVariable>[] = [
  { accessorKey: 'name', header: 'Variable Name' },
  { accessorKey: 'options', header: 'Options (Comma-separated)' },
  { id: 'actions', header: '' }
]

const openAddModal = () => {
  editingId.value = null
  newName.value = ''
  newOptions.value = ''
  isModalOpen.value = true
}

const openEditModal = (v: KeyVariable) => {
  editingId.value = v.id
  newName.value = v.name
  newOptions.value = v.options
  isModalOpen.value = true
}

const handleSave = () => {
  if (newName.value.trim() && newOptions.value.trim()) {
    if (editingId.value) {
      emit('update', editingId.value, newName.value.trim(), newOptions.value.trim())
    } else {
      emit('add', newName.value.trim(), newOptions.value.trim())
    }
    isModalOpen.value = false
  }
}

const confirmDelete = (id: number) => {
  variableToDelete.value = id
  isDeleteModalOpen.value = true
}

const performDelete = () => {
  if (variableToDelete.value !== null) {
    emit('delete', variableToDelete.value)
    isDeleteModalOpen.value = false
    variableToDelete.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center py-2">
      <u-input v-model="search" icon="i-lucide-search" placeholder="Search variables..." class="w-80" />
      <u-button 
        label="Add Variable" 
        icon="i-lucide-plus" 
        color="neutral" 
        variant="subtle"
        @click="openAddModal" 
      />
    </div>

    <u-table
      v-model:pagination="pagination"
      v-model:global-filter="search"
      :data="variables"
      :columns="columns"
      :loading="isLoading"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      class="font-mono"
    >
      <template #name-cell="{ row }">
        <span class="font-bold text-primary-400">{{ row.original.name }}</span>
      </template>

      <template #options-cell="{ row }">
        <div class="flex flex-wrap gap-2">
          <u-badge 
            v-for="opt in row.original.options.split(',').map(o => o.trim()).filter(Boolean)" 
            :key="opt" 
            color="neutral" 
            variant="subtle" 
          >
            {{ opt }}
          </u-badge>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
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
            @click="confirmDelete(row.original.id)" 
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
          {{ variables.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, variables.length) }} of {{ variables.length }}
        </span>
        <u-pagination
          v-model:page="currentPagination"
          :total="variables.length"
          :items-per-page="pagination.pageSize"
        />
      </div>
    </div>

    <u-modal v-model:open="isModalOpen" :title="editingId ? 'Edit Variable' : 'Add Variable'" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="p-6 flex flex-col gap-6">
          <u-form-field label="Variable Name" required description="E.g., 'Modules'">
            <u-input v-model="newName" placeholder="Modules" size="xl" class="w-full text-lg font-mono" autofocus @keyup.enter="handleSave" />
          </u-form-field>

          <u-form-field label="Options" required description="Comma-separated values (e.g., 'dashboard, settings, profile')">
            <u-input v-model="newOptions" placeholder="dashboard, settings, profile" size="xl" class="w-full text-lg font-mono" @keyup.enter="handleSave" />
          </u-form-field>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-2">
          <u-button color="neutral" variant="ghost" label="Cancel" size="lg" @click="() => { isModalOpen = false }" />
          <u-button :label="editingId ? 'Save Changes' : 'Create'" color="neutral" size="lg" :disabled="!newName.trim() || !newOptions.trim()" @click="handleSave" />
        </div>
      </template>
    </u-modal>

    <u-modal v-model:open="isDeleteModalOpen" title="Delete Variable">
      <template #body>
        <div class="p-6">
          <p class="text-neutral-300">Are you sure you want to delete this variable? Templates relying on this variable might break.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-2">
          <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isDeleteModalOpen = false }" />
          <u-button color="error" label="Delete" @click="performDelete" />
        </div>
      </template>
    </u-modal>
  </div>
</template>
