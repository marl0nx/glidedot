import { ref } from 'vue'

export interface AppUser {
  id: number
  username: string
  email: string
  isAdmin: boolean
  isOidc: boolean
  enableSuggestions: boolean
  allowSuggestions: boolean
  translationQuota: number
  baseTranslationQuota: number
  quotaResetPeriodValue: number | null
  quotaResetPeriodUnit: string | null
  quotaNextResetAt: number | null
  avatarUrl?: string
  password?: string
}

export const useUsers = () => {
  const { fetchApi } = useApi()
  const toast = useToast()

  const users = ref<AppUser[]>([])
  const isLoading = ref(false)

  const fetchUsers = async () => {
    isLoading.value = true
    try {
      const data = await fetchApi('/users')
      users.value = data as AppUser[]
    } catch {
      toast.add({ title: 'Error', description: 'Failed to load users', color: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  const createUser = async (user: Partial<AppUser>) => {
    try {
      await fetchApi('/users', { method: 'POST', body: user })
      toast.add({ title: 'Success', description: 'User created successfully', color: 'success' })
      await fetchUsers()
      return true
    } catch {
      toast.add({ title: 'Error', description: 'Failed to create user', color: 'error' })
      return false
    }
  }

  const updateUser = async (id: number, user: Partial<AppUser>) => {
    try {
      await fetchApi(`/users/${id}`, { method: 'PATCH', body: user })
      toast.add({ title: 'Success', description: 'User updated successfully', color: 'success' })
      await fetchUsers()
      return true
    } catch {
      toast.add({ title: 'Error', description: 'Failed to update user', color: 'error' })
      return false
    }
  }

  const deleteUser = async (id: number) => {
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Success', description: 'User deleted successfully', color: 'success' })
      await fetchUsers()
      return true
    } catch {
      toast.add({ title: 'Error', description: 'Failed to delete user', color: 'error' })
      return false
    }
  }

  const resetApiKey = async (id: number) => {
    try {
      await fetchApi(`/users/${id}/api-key`, { method: 'POST' })
      toast.add({ title: 'Success', description: 'User API Key reset successfully', color: 'success' })
      await fetchUsers()
      return true
    } catch {
      toast.add({ title: 'Error', description: 'Failed to reset API Key', color: 'error' })
      return false
    }
  }

  return {
    users,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetApiKey
  }
}
