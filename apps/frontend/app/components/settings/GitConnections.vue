<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

const toast = useToast()
const { fetchApi } = useApi()
const isLoading = ref(false)

const connections = ref<any[]>([])

const fetchConnections = async () => {
  try {
    isLoading.value = true
    connections.value = await fetchApi('/git/connections')
  } catch (err: any) {
    if (err?._toastShown) return
    toast.add({ title: 'Error', description: 'Failed to load connections', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const isConnecting = ref(false)
const connectModalOpen = ref(false)
const connectProvider = ref<'github' | 'gitlab' | 'forgejo'>('github')
const connectToken = ref('')
const connectBaseUrl = ref('')

const openConnectModal = (provider: 'github' | 'gitlab' | 'forgejo') => {
  connectProvider.value = provider
  connectToken.value = ''
  connectBaseUrl.value = ''
  connectModalOpen.value = true
}

const saveConnection = async () => {
  isConnecting.value = true
  try {
    await fetchApi('/git/connections', {
      method: 'POST',
      body: {
        provider: connectProvider.value,
        token: connectToken.value,
        baseUrl: connectProvider.value !== 'github' ? connectBaseUrl.value : undefined
      }
    })
    toast.add({ title: 'Success', description: 'Account connected successfully', color: 'success' })
    connectModalOpen.value = false
    await fetchConnections()
  } catch (err: any) {
    if (err?._toastShown) return
    toast.add({ title: 'Error', description: 'Failed to connect. Check token.', color: 'error' })
  } finally {
    isConnecting.value = false
  }
}

const deleteConnection = async (provider: string) => {
  try {
    await fetchApi(`/git/connections/${provider}`, { method: 'DELETE' })
    toast.add({ title: 'Disconnected', description: `${provider} disconnected.`, color: 'success' })
    await fetchConnections()
  } catch (err: any) {
    if (err?._toastShown) return
    toast.add({ title: 'Error', description: `Failed to disconnect ${provider}.`, color: 'error' })
  }
}

const isConnected = (provider: string) => connections.value.some(c => c.provider === provider)

onMounted(() => {
  fetchConnections()
})
</script>

<template>
  <u-card>
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-semibold text-neutral-200">Linked Accounts (Git Sync)</h2>
        <p class="text-sm text-neutral-400 mt-1">Connect your version control providers using Personal Access Tokens (PAT).</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- GitHub -->
        <div class="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between items-start gap-4">
          <div class="flex items-center gap-3">
            <u-icon name="i-simple-icons-github" class="w-6 h-6 text-white" />
            <h3 class="font-bold text-white">GitHub</h3>
          </div>
          <u-button v-if="!isConnected('github')" label="Connect GitHub" color="neutral" variant="soft" @click="openConnectModal('github')" />
          <u-button v-else label="Disconnect" color="error" variant="ghost" @click="deleteConnection('github')" />
        </div>

        <!-- GitLab -->
        <div class="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between items-start gap-4">
          <div class="flex items-center gap-3">
            <u-icon name="i-simple-icons-gitlab" class="w-6 h-6 text-[#FC6D26]" />
            <h3 class="font-bold text-white">GitLab</h3>
          </div>
          <u-button v-if="!isConnected('gitlab')" label="Connect GitLab" color="neutral" variant="soft" @click="openConnectModal('gitlab')" />
          <u-button v-else label="Disconnect" color="error" variant="ghost" @click="deleteConnection('gitlab')" />
        </div>

        <!-- Forgejo / Gitea -->
        <div class="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between items-start gap-4">
          <div class="flex items-center gap-3">
            <u-icon name="i-simple-icons-forgejo" class="w-6 h-6 text-[#FB8F2B]" />
            <h3 class="font-bold text-white">Forgejo / Gitea</h3>
          </div>
          <u-button v-if="!isConnected('forgejo')" label="Connect Forgejo" color="neutral" variant="soft" @click="openConnectModal('forgejo')" />
          <u-button v-else label="Disconnect" color="error" variant="ghost" @click="deleteConnection('forgejo')" />
        </div>
      </div>
    </div>

    <!-- Connect Modal -->
    <u-modal v-model:open="connectModalOpen" :title="`Connect ${connectProvider}`">
      <template #body>
        <div class="space-y-4">
          <u-form-field label="Personal Access Token (PAT)" description="Must have read/write access to repositories.">
            <u-input v-model="connectToken" type="password" placeholder="Token..." class="w-full" />
          </u-form-field>

          <u-form-field v-if="connectProvider !== 'github'" label="Instance Base URL" description="The base URL of your self-hosted instance (e.g. https://git.company.com).">
            <u-input v-model="connectBaseUrl" placeholder="https://..." class="w-full" />
          </u-form-field>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button label="Cancel" color="neutral" variant="ghost" @click="() => { connectModalOpen = false }" />
          <u-button label="Connect" color="neutral" :loading="isConnecting" @click="saveConnection" />
        </div>
      </template>
    </u-modal>
  </u-card>
</template>
