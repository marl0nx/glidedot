<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import UnsavedChangesAlert from '~/components/UnsavedChangesAlert.vue'

definePageMeta({
  layout: 'default'
})

const { user, fetchUser, logout } = useAuth()
const { fetchApi } = useApi()
const toast = useToast()

const formData = ref({
  username: '',
  email: '',
  avatarUrl: '',
  oldPassword: '',
  password: '',
  repeatPassword: ''
})

const originalData = ref({
  username: '',
  email: '',
  avatarUrl: ''
})

const isLoading = ref(false)
const apiKeyVisible = ref(false)
const isResetModalOpen = ref(false)

onMounted(async () => {
  if (!user.value) {
    await fetchUser()
  }
  
  if (user.value) {
    formData.value.username = user.value.username || ''
    formData.value.avatarUrl = user.value.avatarUrl || ''
    // Try to fetch email from backend me response if available
    const meData = await fetchApi('/users/me') as { id: number; username: string; email: string; avatarUrl?: string }
    if (meData?.email) {
      formData.value.email = meData.email
    }
  }

  originalData.value = {
    username: formData.value.username,
    email: formData.value.email,
    avatarUrl: formData.value.avatarUrl
  }
})

const hasUnsavedChanges = computed(() => {
  return formData.value.username !== originalData.value.username ||
         formData.value.email !== originalData.value.email ||
         formData.value.avatarUrl !== originalData.value.avatarUrl ||
         !!formData.value.oldPassword ||
         !!formData.value.password ||
         !!formData.value.repeatPassword
})

const discard = () => {
  formData.value.username = originalData.value.username
  formData.value.email = originalData.value.email
  formData.value.avatarUrl = originalData.value.avatarUrl
  formData.value.oldPassword = ''
  formData.value.password = ''
  formData.value.repeatPassword = ''
}

const saveChanges = async () => {
  isLoading.value = true
  try {
    const payload: Record<string, string> = {}
    if (formData.value.username !== user.value?.username) payload.username = formData.value.username
    if (formData.value.avatarUrl !== user.value?.avatarUrl) payload.avatarUrl = formData.value.avatarUrl
    if (formData.value.email) payload.email = formData.value.email
    if (formData.value.password) {
      if (formData.value.password !== formData.value.repeatPassword) {
        toast.add({ title: 'Passwords do not match', color: 'error' })
        isLoading.value = false
        return
      }
      if (!formData.value.oldPassword) {
        toast.add({ title: 'Current password is required to set a new password', color: 'error' })
        isLoading.value = false
        return
      }
      const error = validatePasswordStrength(formData.value.password)
      if (error) {
        toast.add({ title: error, color: 'error' })
        isLoading.value = false
        return
      }
      payload.password = formData.value.password
      payload.oldPassword = formData.value.oldPassword
    }

    if (Object.keys(payload).length === 0) {
      toast.add({ title: 'No changes made', color: 'neutral' })
      return
    }

    await fetchApi('/users/me', {
      method: 'PATCH',
      body: payload
    })
    
    if (payload.password) {
      toast.add({ title: 'Password changed successfully. Please log in again.', color: 'success' })
      logout()
      return
    }

    await fetchUser() // refresh state
    formData.value.oldPassword = ''
    formData.value.password = ''
    formData.value.repeatPassword = ''

    originalData.value = {
      username: formData.value.username,
      email: formData.value.email,
      avatarUrl: formData.value.avatarUrl
    }

    toast.add({ title: 'Account updated successfully', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to update account', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const copyApiKey = () => {
  if (user.value?.apiKey) {
    navigator.clipboard.writeText(user.value.apiKey)
    toast.add({ title: 'API Key copied to clipboard', color: 'success' })
  }
}

const confirmResetApiKey = async () => {
  try {
    await fetchApi('/users/me/api-key', { method: 'POST' })
    toast.add({ title: 'API Key reset successfully. Please log in again.', color: 'success' })
    logout()
  } catch {
    toast.add({ title: 'Failed to reset API Key', color: 'error' })
  } finally {
    isResetModalOpen.value = false
  }
}

const resetApiKey = () => {
  isResetModalOpen.value = true
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Account Settings</h1>
      <p class="text-neutral-400">Manage your profile and security settings.</p>
    </div>

    <div class="space-y-6">
      <u-card :ui="{ body: { padding: 'p-6 sm:p-6' } }">
        <template #header>
          <div class="flex items-center gap-4 py-1">
            <u-avatar
              :src="formData.avatarUrl || undefined"
              :icon="!formData.avatarUrl ? 'i-lucide-user' : undefined"
              :class="!formData.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
              size="2xl"
            />
            <div>
              <h3 class="text-lg font-medium text-neutral-100">Profile Picture</h3>
              <p class="text-sm text-neutral-400">Update your avatar using a direct URL.</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <u-alert
            v-if="user?.isOidc"
            title="Managed by OIDC"
            description="Your profile details (Username, Email, Password, and Avatar) are managed by your OIDC provider and cannot be changed here."
            color="primary"
            variant="soft"
            class="mb-4"
          />
          <u-form-field label="Username">
            <u-input v-model="formData.username" disabled placeholder="johndoe" class="w-full" />
          </u-form-field>

          <u-form-field label="Email Address">
            <u-input v-model="formData.email" :disabled="user?.isOidc" type="email" placeholder="john@example.com" class="w-full" />
          </u-form-field>

          <u-form-field label="Avatar URL">
            <u-input v-model="formData.avatarUrl" :disabled="user?.isOidc" placeholder="https://example.com/avatar.png" class="w-full" />
          </u-form-field>
        </div>
      </u-card>

      <u-card :ui="{ body: { padding: 'p-6 sm:p-6' } }">
        <template #header>
          <div>
            <h3 class="text-lg font-medium text-neutral-100">Security</h3>
            <p class="text-sm text-neutral-400">Update your password here. Leave blank if you don't want to change it.</p>
          </div>
        </template>

        <div class="space-y-4">
          <u-form-field label="Current Password">
            <u-input v-model="formData.oldPassword" type="password" placeholder="••••••••" class="w-full" :disabled="user?.isOidc" />
          </u-form-field>
          <u-form-field label="New Password">
            <u-input v-model="formData.password" type="password" placeholder="••••••••" class="w-full" :disabled="user?.isOidc" />
          </u-form-field>
          <u-form-field label="Repeat New Password">
            <u-input v-model="formData.repeatPassword" type="password" placeholder="••••••••" class="w-full" :disabled="user?.isOidc" />
          </u-form-field>
        </div>
      </u-card>

      <u-card :ui="{ body: { padding: 'p-6 sm:p-6' } }">
        <template #header>
          <div>
            <h3 class="text-lg font-medium text-neutral-100">API Key</h3>
            <p class="text-sm text-neutral-400">Use this key to authenticate external API requests.</p>
          </div>
        </template>
        <div class="space-y-4">
          <u-form-field label="Your API Key">
            <div class="flex items-center gap-2">
              <u-input :model-value="user?.apiKey" readonly class="w-full font-mono text-sm" :type="apiKeyVisible ? 'text' : 'password'" />
              <u-button :icon="apiKeyVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" variant="ghost" @click="apiKeyVisible = !apiKeyVisible" />
              <u-button icon="i-lucide-copy" color="neutral" variant="ghost" @click="copyApiKey" />
              <u-button icon="i-lucide-refresh-cw" color="error" variant="ghost" @click="resetApiKey" />
            </div>
            <span class="text-xs text-neutral-500 mt-1 block">Keep this key secret. Resetting it will break any existing integrations.</span>
          </u-form-field>
        </div>
      </u-card>

      <div class="flex justify-end pt-4">
        <u-button 
          color="neutral" 
          label="Save Changes" 
          :loading="isLoading" 
          @click="saveChanges" 
        />
      </div>
    </div>

    <user-reset-api-key-modal
      v-model="isResetModalOpen"
      :username="user?.username"
      @confirm="confirmResetApiKey"
    />

    <unsaved-changes-alert 
      :has-unsaved-changes="hasUnsavedChanges" 
      :loading="isLoading" 
      @save="saveChanges" 
      @discard="discard" 
    />
  </div>
</template>
