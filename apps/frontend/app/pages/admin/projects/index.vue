<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Project } from '~/types'

definePageMeta({
  layout: 'default'
})

const { fetchApi } = useApi()
const toast = useToast()

const projects = ref<Project[]>([])
const languages = ref<{ id: number; code: string; name: string }[]>([])
const isLoading = ref(false)

const isModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedProject = ref<Partial<Project>>({})

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Project Name' },
  { id: 'actions', header: '' }
]

const loadData = async () => {
  isLoading.value = true
  try {
    const [projs, langs] = await Promise.all([
      fetchApi('/localization/projects'),
      fetchApi('/localization/languages')
    ])
    projects.value = projs as Project[]
    languages.value = langs as { id: number; code: string; name: string }[]
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load projects', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

const openCreateModal = () => {
  modalMode.value = 'create'
  selectedProject.value = { name: '', sourceLanguageId: null }
  isModalOpen.value = true
}

const openEditModal = (project: Project) => {
  modalMode.value = 'edit'
  selectedProject.value = { ...project }
  isModalOpen.value = true
}

const openDeleteModal = (project: Project) => {
  selectedProject.value = { ...project }
  isDeleteModalOpen.value = true
}

const saveProject = async () => {
  if (!selectedProject.value.name?.trim()) return

  try {
    if (modalMode.value === 'create') {
      await fetchApi('/localization/projects', {
        method: 'POST',
        body: {
          name: selectedProject.value.name,
          sourceLanguageId: selectedProject.value.sourceLanguageId
        }
      })
      toast.add({ title: 'Success', description: 'Project created successfully', color: 'success' })
    } else if (selectedProject.value.id) {
      await fetchApi(`/localization/projects/${selectedProject.value.id}`, {
        method: 'PATCH',
        body: {
          name: selectedProject.value.name,
          sourceLanguageId: selectedProject.value.sourceLanguageId,
          inContextUrl: selectedProject.value.inContextUrl,
          reviewEnabled: selectedProject.value.reviewEnabled,
          requireTemplate: selectedProject.value.requireTemplate
        }
      })
      toast.add({ title: 'Success', description: 'Project updated successfully', color: 'success' })
    }
    isModalOpen.value = false
    await loadData()
    await refreshNuxtData('projects')
  } catch {
    toast.add({ title: 'Error', description: 'Failed to save project', color: 'error' })
  }
}

const confirmDelete = async () => {
  if (!selectedProject.value.id) return
  try {
    await fetchApi(`/localization/projects/${selectedProject.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Project deleted successfully', color: 'success' })
    isDeleteModalOpen.value = false
    await loadData()
    await refreshNuxtData('projects')
  } catch {
    toast.add({ title: 'Error', description: 'Failed to delete project', color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-folder-git-2" class="w-5 h-5 text-primary-500" />
            Manage Projects
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Create, edit, and manage your localization projects.</p>
      </div>
      <u-button icon="i-lucide-folder-plus" label="Create Project" color="neutral" variant="subtle" @click="openCreateModal" />
    </div>

    <u-card :ui="{ body: 'p-0 sm:p-0' }">
      <u-table :data="projects" :columns="columns" :loading="isLoading">
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <u-button icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEditModal(row.original)" />
            <u-button icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="openDeleteModal(row.original)" />
          </div>
        </template>
      </u-table>
    </u-card>

    <project-manage-modal
      v-model="isModalOpen"
      :mode="modalMode"
      :project="selectedProject"
      :languages="languages"
      @save="saveProject"
    />

    <project-delete-modal
      v-model="isDeleteModalOpen"
      :project-name="selectedProject.name"
      @confirm="confirmDelete"
    />
  </div>
</template>
