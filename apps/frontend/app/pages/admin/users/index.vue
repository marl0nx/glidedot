<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/composables/useUsers'

definePageMeta({
  layout: 'default'
})

const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser, resetApiKey } = useUsers()
const { user: currentUser } = useAuth()
const config = useRuntimeConfig()
const isOidcEnabled = computed(() => config.public.oidcEnabled)

onMounted(() => {
  fetchUsers()
})

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'avatarUrl', header: '' },
  { accessorKey: 'username', header: 'Username' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'isAdmin', header: 'Role' },
  { id: 'actions', header: '' }
]

const isModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isResetModalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<Partial<AppUser>>({})

const openCreateModal = () => {
  modalMode.value = 'create'
  selectedUser.value = { username: '', email: '', password: '', isAdmin: false, isReviewer: false, requiresReview: false, allowSuggestions: true, translationQuota: 500, avatarUrl: '' }
  isModalOpen.value = true
}

const openEditModal = (user: AppUser) => {
  modalMode.value = 'edit'
  selectedUser.value = { ...user, password: '' }
  isModalOpen.value = true
}

const openDeleteModal = (user: AppUser) => {
  selectedUser.value = { ...user }
  isDeleteModalOpen.value = true
}

const saveUser = async (user: Partial<AppUser>) => {
  if (!user.isOidc) {
    if (user.password) {
      const error = validatePasswordStrength(user.password)
      if (error) {
        useToast().add({ title: error, color: 'error' })
        return
      }
    } else if (modalMode.value === 'create') {
      useToast().add({ title: 'Password is required', color: 'error' })
      return
    }
  }

  if (modalMode.value === 'create') {
    await createUser(user)
  } else {
    if (user.id) {
      await updateUser(user.id, user)
    }
  }
  isModalOpen.value = false
}

const confirmDelete = async () => {
  if (selectedUser.value.id) {
    await deleteUser(selectedUser.value.id)
  }
  isDeleteModalOpen.value = false
}

const handleResetApiKey = (user: AppUser) => {
  selectedUser.value = { ...user }
  isResetModalOpen.value = true
}

const confirmResetApiKey = async () => {
  if (selectedUser.value.id) {
    await resetApiKey(selectedUser.value.id)
  }
  isResetModalOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
            Manage Users
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Create, edit, and manage user accounts.</p>
      </div>
      <div class="w-full md:w-auto shrink-0">
        <u-button icon="i-lucide-user-plus" label="Create User" color="neutral" variant="subtle" @click="openCreateModal" />
      </div>
    </div>

    <u-card :ui="{ body: 'p-0 sm:p-0' }">
      <u-table :data="users" :columns="columns" :loading="isLoading">
        <template #id-cell="{ row }">
          <span class="text-sm text-neutral-400">{{ row.original.id }}</span>
        </template>
        <template #avatarUrl-cell="{ row }">
          <u-avatar
            :src="row.original.avatarUrl || undefined"
            :icon="!row.original.avatarUrl ? 'i-lucide-user' : undefined"
            :class="!row.original.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
            size="sm"
          />
        </template>
        <template #username-cell="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ row.original.username }}</span>
            <u-badge v-if="row.original.isOidc" color="neutral" variant="subtle" size="sm" :class="{'opacity-50 blur-[2px] pointer-events-none select-none': !isOidcEnabled}">OIDC</u-badge>
          </div>
        </template>
        <template #isAdmin-cell="{ row }">
          <u-badge :color="row.original.isAdmin ? 'primary' : 'neutral'" variant="subtle">
            {{ row.original.isAdmin ? 'Admin' : 'Member' }}
          </u-badge>
        </template>
        <template #actions-cell="{ row }">
          <div v-if="row.original.id !== currentUser?.id" class="flex items-center justify-end gap-2">
            <u-button icon="i-lucide-refresh-cw" size="xs" color="error" variant="ghost" title="Reset API Key" @click="handleResetApiKey(row.original)" />
            <u-button icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEditModal(row.original)" />
            <u-button icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="openDeleteModal(row.original)" />
          </div>
          <div v-else class="text-xs text-neutral-500 italic pr-2">
            (You)
          </div>
        </template>
      </u-table>
    </u-card>

    <user-manage-modal
      v-model="isModalOpen"
      :mode="modalMode"
      :user="selectedUser"
      :is-oidc-enabled="isOidcEnabled"
      @save="saveUser"
    />

    <user-delete-modal
      v-model="isDeleteModalOpen"
      :username="selectedUser.username"
      @confirm="confirmDelete"
    />

    <user-reset-api-key-modal
      v-model="isResetModalOpen"
      :username="selectedUser.username"
      @confirm="confirmResetApiKey"
    />
  </div>
</template>
