<script setup lang="ts">
import { ref } from 'vue'
import type { Team, User, Project } from '~/types'

definePageMeta({
  layout: 'default'
})

const { fetchApi } = useApi()
const toast = useToast()
const config = useRuntimeConfig()
const isOidcEnabled = computed(() => config.public.oidcEnabled)
const loading = ref(false)

const { data: teams, refresh: refreshTeams } = await useAsyncData<Team[]>('teams', () => fetchApi('/admin/teams'))
const { data: users } = await useAsyncData<User[]>('users', () => fetchApi('/users'))
const { data: projects } = await useAsyncData<Project[]>('projects', () => fetchApi('/localization/projects'))

const isCreateModalOpen = ref(false)
const isManageModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedTeam = ref<Team | null>(null)


const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Team Name' },
  { accessorKey: 'membersCount', header: 'Members' },
  { accessorKey: 'projectsCount', header: 'Linked Projects' },
  { id: 'actions', header: '' }
]

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const openManageModal = (team: Team) => {
  selectedTeam.value = { ...team }
  isManageModalOpen.value = true
}

const openDeleteModal = (team: Team) => {
  selectedTeam.value = team
  isDeleteModalOpen.value = true
}

const createTeam = async (teamName: string) => {
  if (!teamName) return
  loading.value = true
  try {
    await fetchApi('/admin/teams', {
      method: 'POST',
      body: { name: teamName }
    })
    isCreateModalOpen.value = false
    await refreshTeams()
    await refreshNuxtData('projects')
    toast.add({ title: 'Success', description: 'Team created successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to create team', color: 'error' })
  } finally {
    loading.value = false
  }
}

const addMember = async (userId: number) => {
  if (!selectedTeam.value || !userId) return
  try {
    await fetchApi(`/admin/teams/${selectedTeam.value.id}/members`, {
      method: 'POST',
      body: { userId }
    })
    await refreshTeams()
    updateSelectedTeamRef()
    toast.add({ title: 'Success', description: 'Member added successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to add member', color: 'error' })
  }
}

const addProject = async (projectId: number) => {
  if (!selectedTeam.value || !projectId) return
  try {
    await fetchApi(`/admin/teams/${selectedTeam.value.id}/projects`, {
      method: 'POST',
      body: { projectId }
    })
    await refreshTeams()
    updateSelectedTeamRef()
    await refreshNuxtData('projects')
    toast.add({ title: 'Success', description: 'Project linked successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to link project', color: 'error' })
  }
}

const removeMember = async (teamId: number, userId: number) => {
  try {
    await fetchApi(`/admin/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
    await refreshTeams()
    updateSelectedTeamRef()
    toast.add({ title: 'Success', description: 'Member removed successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to remove member', color: 'error' })
  }
}

const removeProject = async (teamId: number, projectId: number) => {
  try {
    await fetchApi(`/admin/teams/${teamId}/projects/${projectId}`, { method: 'DELETE' })
    await refreshTeams()
    updateSelectedTeamRef()
    await refreshNuxtData('projects')
    toast.add({ title: 'Success', description: 'Project unlinked successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to unlink project', color: 'error' })
  }
}

const confirmDelete = async () => {
  if (!selectedTeam.value) return
  try {
    await fetchApi(`/admin/teams/${selectedTeam.value.id}`, { method: 'DELETE' })
    isDeleteModalOpen.value = false
    await refreshTeams()
    await refreshNuxtData('projects')
    toast.add({ title: 'Success', description: 'Team deleted successfully', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to delete team', color: 'error' })
  }
}

const saveTeamSettings = async (payload: { name: string, mappedGroups: string[] }) => {
  if (!selectedTeam.value || !payload.name?.trim()) return
  loading.value = true
  try {
    await fetchApi(`/admin/teams/${selectedTeam.value.id}`, {
      method: 'PATCH',
      body: { 
        name: payload.name,
        oidcMappedGroups: JSON.stringify(payload.mappedGroups)
      }
    })
    await refreshTeams()
    toast.add({ title: 'Success', description: 'Team settings saved successfully', color: 'success' })
    isManageModalOpen.value = false
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error', description: 'Failed to save team settings', color: 'error' })
  } finally {
    loading.value = false
  }
}

const updateSelectedTeamRef = () => {
  if (selectedTeam.value) {
    const updated = (teams.value as Team[])?.find(t => t.id === selectedTeam.value?.id)
    if (updated) {
      selectedTeam.value = updated
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
            Manage Teams
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Create and organize collaboration teams.</p>
      </div>
      <u-button icon="i-lucide-users" label="Create Team" color="neutral" variant="subtle" @click="openCreateModal" />
    </div>

    <u-card :ui="{ body: 'p-0 sm:p-0' }">
      <u-table :data="teams || []" :columns="columns">
        <template #id-cell="{ row }">
          <span class="text-sm text-neutral-400">{{ row.original.id }}</span>
        </template>
        <template #name-cell="{ row }">
          <span class="font-medium flex items-center gap-2">
            <u-icon name="i-lucide-users-round" class="w-4 h-4 text-neutral-400" />
            {{ row.original.name }}
          </span>
        </template>
        <template #membersCount-cell="{ row }">
          <u-badge color="neutral" variant="subtle">
            {{ row.original.members?.length || 0 }} Members
          </u-badge>
        </template>
        <template #projectsCount-cell="{ row }">
          <u-badge color="neutral" variant="subtle">
            {{ row.original.projects?.length || 0 }} Projects
          </u-badge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <u-button icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openManageModal(row.original)" />
            <u-button icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="openDeleteModal(row.original)" />
          </div>
        </template>
      </u-table>
    </u-card>

    <team-create-modal
      v-model="isCreateModalOpen"
      :loading="loading"
      @create="createTeam"
    />

    <team-manage-modal
      v-model="isManageModalOpen"
      :team="selectedTeam"
      :users="users || []"
      :projects="projects || []"
      :is-oidc-enabled="isOidcEnabled"
      :loading="loading"
      @save="saveTeamSettings"
      @add-member="addMember"
      @remove-member="removeMember(selectedTeam!.id, $event)"
      @add-project="addProject"
      @remove-project="removeProject(selectedTeam!.id, $event)"
    />

    <team-delete-modal
      v-model="isDeleteModalOpen"
      :team-name="selectedTeam?.name"
      @confirm="confirmDelete"
    />

  </div>
</template>
