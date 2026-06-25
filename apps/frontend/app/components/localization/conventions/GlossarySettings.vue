<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { KeyGlossaryTerm } from '~/types'

const props = defineProps<{
  glossary: KeyGlossaryTerm[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'add', badWord: string, goodWord: string): void
  (e: 'update', id: number, badWord: string, goodWord: string): void
  (e: 'delete', id: number): void
}>()

const search = ref('')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const isModalOpen = ref(false)
const editingId = ref<number | null>(null)

const deleteModalOpen = ref(false)
const deletingId = ref<number | null>(null)

const newBadWord = ref('')
const newGoodWord = ref('')

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const columns: TableColumn<KeyGlossaryTerm>[] = [
  { accessorKey: 'goodWord', header: 'Preferred Word' },
  { accessorKey: 'arrow', header: '' },
  { accessorKey: 'badWord', header: 'Banned Words / Aliases' },
  { id: 'actions', header: '' }
]

const openAddModal = () => {
  editingId.value = null
  newBadWord.value = ''
  newGoodWord.value = ''
  isModalOpen.value = true
}

const openEditModal = (term: KeyGlossaryTerm) => {
  editingId.value = term.id
  newBadWord.value = term.badWord
  newGoodWord.value = term.goodWord
  isModalOpen.value = true
}

const handleSave = () => {
  if (newBadWord.value.trim() && newGoodWord.value.trim()) {
    if (editingId.value) {
      emit('update', editingId.value, newBadWord.value.trim(), newGoodWord.value.trim())
    } else {
      emit('add', newBadWord.value.trim(), newGoodWord.value.trim())
    }
    isModalOpen.value = false
  }
}

const confirmDelete = (id: number) => {
  deletingId.value = id
  deleteModalOpen.value = true
}

const performDelete = () => {
  if (deletingId.value) {
    emit('delete', deletingId.value)
    deleteModalOpen.value = false
    deletingId.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center mb-2">
      <div class="flex flex-col">
        <h2 class="text-lg font-semibold">Glossary Linter</h2>
        <p class="text-sm text-neutral-400">Map bad terminology to preferred words. The linter will highlight these during key creation.</p>
      </div>
      <u-button 
        label="Add Term" 
        icon="i-lucide-plus" 
        color="neutral" 
        variant="subtle"
        @click="openAddModal" 
      />
    </div>

    <div class="flex justify-between py-2">
      <u-input v-model="search" icon="i-lucide-search" placeholder="Search terms..." class="w-80" />
    </div>

    <u-table
      v-model:pagination="pagination"
      v-model:global-filter="search"
      :data="glossary"
      :columns="columns"
      :loading="isLoading"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      class="font-mono"
    >
      <template #goodWord-cell="{ row }">
        <span class="text-success font-medium text-base">{{ row.original.goodWord }}</span>
      </template>

      <template #arrow-cell>
        <u-icon name="i-lucide-arrow-left" class="text-neutral-500 w-4 h-4 mx-auto" />
      </template>

      <template #badWord-cell="{ row }">
        <div class="flex flex-wrap gap-2">
          <u-badge 
            v-for="word in row.original.badWord.split(',').map(w => w.trim()).filter(Boolean)" 
            :key="word" 
            color="error" 
            variant="subtle" 
            class="line-through opacity-80"
          >
            {{ word }}
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

    <div class="flex items-center justify-between border-t border-default pt-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">Rows per page</span>
        <u-select
          :model-value="pagination.pageSize"
          :items="[10, 20, 50, 100]"
          class="w-20"
          @update:model-value="(val) => { pagination = { ...pagination, pageSize: Number(val), pageIndex: 0 } }"
        />
      </div>
      <div class="flex items-center gap-4">
          <span class="text-sm text-neutral-500">
            {{ glossary.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, glossary.length) }} of {{ glossary.length }}
          </span>
          <u-pagination
        v-model:page="currentPagination"
        :total="glossary.length"
        :items-per-page="pagination.pageSize"
      />
        </div>
    </div>

    <u-modal v-model:open="isModalOpen" :title="editingId ? 'Edit Glossary Term' : 'Add Glossary Term'" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="p-6 flex flex-col gap-6">
          <u-form-field label="Preferred Word" required description="The correct terminology (e.g., 'desc')">
            <u-input v-model="newGoodWord" placeholder="desc" size="xl" class="w-full text-lg font-mono" autofocus @keyup.enter="handleSave" />
          </u-form-field>

          <u-form-field label="Banned Words / Aliases" required description="Comma-separated wrong words (e.g., 'description, descr, info')">
            <u-input v-model="newBadWord" placeholder="description, descr, info" size="xl" class="w-full text-lg font-mono" @keyup.enter="handleSave" />
          </u-form-field>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-2">
          <u-button color="neutral" variant="ghost" label="Cancel" size="lg" @click="isModalOpen = false" />
          <u-button :label="editingId ? 'Save Changes' : 'Add Term'" color="neutral" size="lg" :disabled="!newBadWord.trim() || !newGoodWord.trim()" @click="handleSave" />
        </div>
      </template>
    </u-modal>

    <u-modal v-model:open="deleteModalOpen" title="Delete Glossary Term">
      <template #body>
        <div class="p-6">
          <p class="text-neutral-300">Are you sure you want to delete this glossary term? It will no longer trigger linter warnings.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-2">
          <u-button color="neutral" variant="ghost" label="Cancel" @click="deleteModalOpen = false" />
          <u-button color="error" label="Delete" @click="performDelete" />
        </div>
      </template>
    </u-modal>
  </div>
</template>
