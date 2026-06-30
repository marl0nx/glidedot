<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default'
})

const { fetchApi } = useApi()
const toast = useToast()

const plugins = ref<any[]>([])
const selectedPlugin = ref<any | null>(null)
const projectStatuses = ref<any[]>([])
const isLoadingPlugins = ref(false)
const isLoadingStatuses = ref(false)
const isSavingSetting = ref(false)

// Modals / Editing state
const isAssignmentsModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isInstallModalOpen = ref(false)
const isUninstallModalOpen = ref(false)
const pluginToUninstall = ref<any | null>(null)
const isUninstalling = ref(false)
const pluginUrl = ref('')
const isInstalling = ref(false)
const activeEditingProject = ref<any | null>(null)
const configData = ref<Record<string, any>>({})

const columns = [
  { id: 'name', header: 'Plugin' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'version', header: 'Version' },
  { accessorKey: 'author', header: 'Author' },
  { id: 'actions', header: '' }
]



const fetchPlugins = async () => {
  isLoadingPlugins.value = true
  try {
    plugins.value = await fetchApi<any[]>('/plugins/admin/list')
  } catch (err: any) {
    toast.add({ title: 'Error', description: 'Failed to load plugins list', color: 'error' })
  } finally {
    isLoadingPlugins.value = false
  }
}

const openAssignments = async (plugin: any) => {
  selectedPlugin.value = plugin
  isLoadingStatuses.value = true
  isAssignmentsModalOpen.value = true
  try {
    projectStatuses.value = await fetchApi<any[]>(`/plugins/admin/project-status/${plugin.id}`)
  } catch (err: any) {
    toast.add({ title: 'Error', description: `Failed to load assignments for ${plugin.name}`, color: 'error' })
    isAssignmentsModalOpen.value = false
  } finally {
    isLoadingStatuses.value = false
  }
}

const toggleProjectPlugin = async (projectStatus: any, enabled: boolean) => {
  try {
    projectStatus.enabled = enabled
    await fetchApi('/plugins/admin/toggle', {
      method: 'POST',
      body: {
        projectId: projectStatus.projectId,
        pluginId: selectedPlugin.value.id,
        enabled
      }
    })
    toast.add({
      title: enabled ? 'Plugin Enabled' : 'Plugin Disabled',
      description: `${selectedPlugin.value.name} is now ${enabled ? 'active' : 'inactive'} for ${projectStatus.projectName}.`,
      color: 'success'
    })
    
    // Refresh active plugins to update sidebar immediately
    await refreshNuxtData('projects')
  } catch (err: any) {
    projectStatus.enabled = !enabled // rollback UI
    toast.add({ title: 'Error', description: err.message || 'Failed to toggle plugin status', color: 'error' })
  }
}

const openSettingsModal = (projStatus: any) => {
  activeEditingProject.value = projStatus
  
  // Clone current settings or initialize defaults
  const settings = projStatus.settings || {}
  const schema = selectedPlugin.value.settingsSchema || {}
  
  const initialData: Record<string, any> = {}
  for (const [key, field] of Object.entries(schema) as [string, any][]) {
    let val = settings[key]
    
    if (field.type === 'boolean') {
      initialData[key] = val === 'true' || val === true || (val === undefined && field.default === true)
    } else {
      initialData[key] = val !== undefined ? val : (field.default !== undefined ? field.default : '')
    }
  }
  
  configData.value = initialData
  isSettingsModalOpen.value = true
}

const saveProjectSettings = async () => {
  if (!activeEditingProject.value || !selectedPlugin.value) return
  isSavingSetting.value = true
  
  try {
    const settingsToSend: Record<string, string> = {}
    for (const [key, val] of Object.entries(configData.value)) {
      settingsToSend[key] = typeof val === 'boolean' ? String(val) : String(val)
    }

    await fetchApi('/plugins/admin/settings', {
      method: 'POST',
      body: {
        projectId: activeEditingProject.value.projectId,
        pluginId: selectedPlugin.value.id,
        settings: settingsToSend
      }
    })
    
    activeEditingProject.value.settings = { ...configData.value }
    toast.add({
      title: 'Settings Saved',
      description: `Settings for ${selectedPlugin.value.name} updated successfully in ${activeEditingProject.value.projectName}.`,
      color: 'success'
    })
    isSettingsModalOpen.value = false
    activeEditingProject.value = null
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Failed to save settings', color: 'error' })
  } finally {
    isSavingSetting.value = false
  }
}

const openInstallModal = () => {
  pluginUrl.value = ''
  isInstallModalOpen.value = true
}

const installPlugin = async () => {
  if (!pluginUrl.value.trim() || !pluginUrl.value.startsWith('http')) {
    toast.add({ title: 'Error', description: 'Please enter a valid HTTP/HTTPS URL.', color: 'error' })
    return
  }
  
  isInstalling.value = true
  try {
    const res = await fetchApi<{ success: boolean; manifest: any }>('/plugins/admin/install', {
      method: 'POST',
      body: { url: pluginUrl.value.trim() }
    })
    
    if (res.success) {
      toast.add({
        title: 'Plugin Installed',
        description: `Successfully installed "${res.manifest.name}" (v${res.manifest.version}).`,
        color: 'success'
      })
      isInstallModalOpen.value = false
      await fetchPlugins()
    }
  } catch (err: any) {
    toast.add({
      title: 'Installation Failed',
      description: err.message || 'An error occurred while installing the plugin.',
      color: 'error'
    })
  } finally {
    isInstalling.value = false
  }
}

const openUninstallModal = (plugin: any) => {
  pluginToUninstall.value = plugin
  isUninstallModalOpen.value = true
}

const uninstallPlugin = async () => {
  if (!pluginToUninstall.value) return
  isUninstalling.value = true
  try {
    await fetchApi(`/plugins/admin/uninstall/${pluginToUninstall.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Plugin Uninstalled',
      description: `Successfully uninstalled "${pluginToUninstall.value.name}".`,
      color: 'success'
    })
    isUninstallModalOpen.value = false
    await fetchPlugins()
    await refreshNuxtData('projects')
  } catch (err: any) {
    toast.add({
      title: 'Uninstall Failed',
      description: err.message || 'An error occurred while uninstalling the plugin.',
      color: 'error'
    })
  } finally {
    isUninstalling.value = false
  }
}

onMounted(() => {
  fetchPlugins()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header (Identical pattern to Projects/Teams Admin pages) -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
          <u-icon name="i-lucide-puzzle" class="w-5 h-5 text-primary-500" />
          Manage Plugins
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Discover, enable, and centrally configure integration plugins across your projects.</p>
      </div>
      <div class="w-full md:w-auto shrink-0">
        <u-button icon="i-lucide-download" label="Install Plugin" color="neutral" variant="subtle" @click="openInstallModal" />
      </div>
    </div>

    <!-- Main Plugins Table (Matches standard u-card & u-table look) -->
    <u-card :ui="{ body: 'p-0 sm:p-0' }">
      <u-table :data="plugins" :columns="columns" :loading="isLoadingPlugins">
        <!-- Empty State -->
        <template #empty>
          <div class="text-center py-12 text-neutral-500">
            <u-icon name="i-lucide-puzzle" class="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p class="text-sm font-medium">No Plugins Discovered</p>
            <p class="text-xs text-neutral-600 mt-1">
              Place plugin folders inside the root <code class="bg-neutral-800 px-1 py-0.5 rounded text-neutral-400">plugins/</code> directory.
            </p>
          </div>
        </template>

        <!-- Name column (Icon + Name + Description) -->
        <template #name-cell="{ row }">
          <div class="flex gap-3 items-center py-2 max-w-lg">
            <div class="p-1 shrink-0">
              <u-icon :name="row.original.icon || 'i-lucide-puzzle'" class="w-5 h-5 text-neutral-400" />
            </div>
            <div class="min-w-0">
              <span class="font-semibold text-white text-sm block">{{ row.original.name }}</span>
              <span class="text-xs text-neutral-400 line-clamp-1 mt-0.5">{{ row.original.description }}</span>
            </div>
          </div>
        </template>

        <!-- Category column -->
        <template #category-cell="{ row }">
          <span v-if="row.original.category" class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
            {{ row.original.category }}
          </span>
          <span v-else class="text-neutral-500 text-xs">-</span>
        </template>

        <!-- Version column -->
        <template #version-cell="{ row }">
          <span class="font-mono text-xs text-neutral-400">v{{ row.original.version }}</span>
        </template>

        <!-- Author column -->
        <template #author-cell="{ row }">
          <span class="text-xs text-neutral-400">{{ row.original.author || '-' }}</span>
        </template>

        <!-- Actions column (Button to view assignments modal) -->
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2 pr-4">
            <u-button 
              icon="i-lucide-settings-2" 
              label="Assignments" 
              size="xs" 
              color="neutral" 
              variant="subtle" 
              @click="openAssignments(row.original)" 
            />
            <u-button 
              icon="i-lucide-trash-2" 
              size="xs" 
              color="error" 
              variant="ghost" 
              @click="openUninstallModal(row.original)" 
            />
          </div>
        </template>
      </u-table>
    </u-card>

    <!-- 1. Assignments Configuration Modal (Native style & structure) -->
    <u-modal v-model:open="isAssignmentsModalOpen" :title="`${selectedPlugin?.name} - Project Assignments`">
      <template #body>
        <div class="p-4 flex flex-col gap-4">
          <div>
            <p class="text-xs text-neutral-400 leading-relaxed">
              Enable or disable <strong class="text-neutral-200">{{ selectedPlugin?.name }}</strong> on a project-by-project basis, and configure its credentials centrally.
            </p>
          </div>

          <div v-if="isLoadingStatuses" class="py-12 text-center">
            <u-icon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary mx-auto" />
            <p class="text-xs text-neutral-500 mt-2">Loading project configurations...</p>
          </div>

          <div v-else class="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            <div 
              v-for="projStatus in projectStatuses" 
              :key="projStatus.projectId"
              class="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/20 transition-colors"
            >
              <div class="flex items-center gap-3">
                <u-icon 
                  :name="selectedPlugin?.icon || 'i-lucide-puzzle'"
                  class="w-5 h-5 transition-colors duration-200"
                  :class="projStatus.enabled ? 'text-primary' : 'text-neutral-500'"
                />
                <div>
                  <span class="font-medium text-white text-sm block">{{ projStatus.projectName }}</span>
                  <span class="text-[10px] text-neutral-500 font-mono">ID: {{ projStatus.projectId }}</span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <u-button 
                  v-if="projStatus.enabled && selectedPlugin?.settingsSchema"
                  icon="i-lucide-settings"
                  label="Configure"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="openSettingsModal(projStatus)"
                />
                <u-switch 
                  :model-value="projStatus.enabled"
                  @update:model-value="(val) => toggleProjectPlugin(projStatus, val)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button 
            color="neutral" 
            variant="ghost" 
            label="Close"
            @click="isAssignmentsModalOpen = false"
          />
        </div>
      </template>
    </u-modal>

    <!-- 2. Dynamic Settings Config Modal (Opened as subset configuration) -->
    <u-modal v-model:open="isSettingsModalOpen" :title="`Configure ${selectedPlugin?.name}`">
      <template #body>
        <div class="p-4 flex flex-col gap-4">
          <div class="flex items-center gap-3 bg-neutral-800/20 border border-neutral-800 p-3 rounded-xl mb-2">
            <u-icon :name="selectedPlugin?.icon || 'i-lucide-puzzle'" class="w-5 h-5 text-primary" />
            <div>
              <p class="text-xs font-medium text-white">Project Specific Settings</p>
              <p class="text-[11px] text-neutral-400 mt-0.5">Editing credentials for: {{ activeEditingProject?.projectName }}</p>
            </div>
          </div>

          <div v-if="selectedPlugin?.settingsSchema" class="flex flex-col gap-4">
            <div v-for="(field, key) in selectedPlugin.settingsSchema" :key="key">
              <u-form-field 
                :label="field.label" 
                :description="field.description"
                :required="field.required"
              >
                <!-- Boolean Switch -->
                <div v-if="field.type === 'boolean'" class="flex items-center gap-2 mt-2">
                  <u-switch 
                    v-model="configData[key]"
                  />
                  <span class="text-xs text-neutral-400">Enabled</span>
                </div>

                <!-- Secret/Password Input -->
                <u-input 
                  v-else-if="field.type === 'string' && field.secret"
                  v-model="configData[key]"
                  type="password"
                  :placeholder="field.placeholder"
                  class="w-full mt-1"
                  icon="i-lucide-key"
                />

                <!-- Text Input -->
                <u-input 
                  v-else
                  v-model="configData[key]"
                  :placeholder="field.placeholder"
                  class="w-full mt-1"
                />
              </u-form-field>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button 
            color="neutral" 
            variant="ghost" 
            label="Cancel"
            @click="isSettingsModalOpen = false"
          />
          <u-button 
            color="neutral" 
            label="Save Settings"
            :loading="isSavingSetting"
            @click="saveProjectSettings"
          />
        </div>
      </template>
    </u-modal>

    <!-- 3. Plugin Installer Modal -->
    <u-modal v-model:open="isInstallModalOpen" title="Install Plugin from URL">
      <template #body>
        <div class="p-4 flex flex-col gap-4">
          <div>
            <p class="text-xs text-neutral-400 leading-relaxed">
              Enter the URL of a plugin ZIP archive. glide. will automatically download, extract, and register the plugin so it becomes instantly available.
            </p>
          </div>

          <u-form-field label="Plugin ZIP URL" required description="Must be a direct HTTP/HTTPS link to a ZIP file (e.g., GitHub Release ZIP).">
            <u-input 
              v-model="pluginUrl" 
              placeholder="https://github.com/username/glide-plugin/archive/refs/heads/main.zip" 
              class="w-full mt-1"
              autofocus
              @keyup.enter="installPlugin"
            />
          </u-form-field>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button 
            color="neutral" 
            variant="ghost" 
            label="Cancel" 
            @click="isInstallModalOpen = false" 
          />
          <u-button 
            color="neutral" 
            label="Install Plugin" 
            :loading="isInstalling" 
            :disabled="!pluginUrl.trim()" 
            @click="installPlugin" 
          />
        </div>
      </template>
    </u-modal>

    <!-- 4. Plugin Uninstall Confirmation Modal -->
    <u-modal v-model:open="isUninstallModalOpen" :title="`Uninstall ${pluginToUninstall?.name}`">
      <template #body>
        <p class="p-4 text-sm text-neutral-400">
          Are you sure you want to uninstall <strong class="text-neutral-200">{{ pluginToUninstall?.name }}</strong>? This action cannot be undone and will permanently delete all files and configuration settings.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button color="neutral" variant="ghost" label="Cancel" @click="isUninstallModalOpen = false" />
          <u-button label="Uninstall Plugin" color="error" :loading="isUninstalling" @click="uninstallPlugin" />
        </div>
      </template>
    </u-modal>
  </div>
</template>
