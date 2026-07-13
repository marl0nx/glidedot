<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchApi } = useApi()

const projectId = route.params.id as string
const pluginId = route.params.pluginId as string
const extensionId = route.params.extensionId as string

const isLoading = ref(false)
const plugin = ref<any>(null)
const extension = ref<any>(null)

// Store dynamic data for components (e.g. table rows, form inputs)
const tableData = ref<Record<string, any[]>>({})
const tableLoading = ref<Record<string, boolean>>({})
const formData = ref<Record<string, Record<string, any>>>({})
const formSubmitting = ref<Record<string, boolean>>({})

// Helper to check if view has both form and table to use layout grid
const hasFormAndTable = (view: any) => {
  const types = view.components?.map((c: any) => c.type) || []
  return types.includes('form') && types.includes('table')
}

// Convert backend column layout into Nuxt UI Table columns
const getUTableColumns = (comp: any) => {
  const cols = comp.columns?.map((col: any) => ({
    accessorKey: col.key,
    header: col.label
  })) || []
  if (comp.actions && comp.actions.length > 0) {
    cols.push({
      id: 'actions',
      header: ''
    })
  }
  return cols
}

const fetchPluginAndExtension = async () => {
  isLoading.value = true
  try {
    const plugins = await fetchApi<any[]>(`/plugins/projects/${projectId}`)
    const foundPlugin = plugins.find(p => p.id === pluginId)
    
    if (!foundPlugin || !foundPlugin.enabled) {
      toast.add({ title: 'Error', description: 'Plugin not found or disabled', color: 'error' })
      router.push(`/projects/${projectId}`)
      return
    }

    plugin.value = foundPlugin
    const foundExt = foundPlugin.extensions?.find((e: any) => e.id === extensionId)
    
    if (!foundExt) {
      toast.add({ title: 'Error', description: 'Plugin view not found', color: 'error' })
      router.push(`/projects/${projectId}`)
      return
    }

    extension.value = foundExt

    // Initialize state for components in the views
    for (const view of foundExt.views || []) {
      for (const comp of view.components || []) {
        if (comp.type === 'table' && comp.apiEndpoint) {
          await loadTableData(comp)
        } else if (comp.type === 'form') {
          formData.value[comp.id || comp.apiEndpoint] = {}
          // Set defaults
          if (comp.fields) {
            for (const f of comp.fields) {
              formData.value[comp.id || comp.apiEndpoint][f.name] = f.default !== undefined ? f.default : ''
            }
          }
        }
      }
    }
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load plugin information', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const loadTableData = async (comp: any) => {
  const key = comp.id || comp.apiEndpoint
  tableLoading.value[key] = true
  try {
    // We pass projectId in query so plugin endpoint knows the context!
    const querySign = comp.apiEndpoint.includes('?') ? '&' : '?'
    const data = await fetchApi<any[]>(`${comp.apiEndpoint}${querySign}projectId=${projectId}`)
    tableData.value[key] = data
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load list data', color: 'error' })
  } finally {
    tableLoading.value[key] = false
  }
}

const submitForm = async (comp: any) => {
  const key = comp.id || comp.apiEndpoint
  formSubmitting.value[key] = true
  try {
    // Client-side required fields validation
    if (comp.fields) {
      const missingFields: string[] = []
      for (const f of comp.fields) {
        if (f.required) {
          const val = formData.value[key]?.[f.name]
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            missingFields.push(f.label || f.name)
          }
        }
      }
      if (missingFields.length > 0) {
        toast.add({
          title: 'Missing Required Fields',
          description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
          color: 'error'
        })
        formSubmitting.value[key] = false
        return
      }
    }

    const payload = {
      projectId: parseInt(projectId),
      ...formData.value[key]
    }

    await fetchApi(comp.apiEndpoint, {
      method: 'POST',
      body: payload
    })

    toast.add({ title: 'Success', description: comp.successMessage || 'Action executed successfully', color: 'success' })
    
    // Reset form
    if (comp.fields) {
      for (const f of comp.fields) {
        formData.value[key][f.name] = f.default !== undefined ? f.default : ''
      }
    }

    // Refresh tables in the same view if any exist
    if (extension.value) {
      for (const view of extension.value.views || []) {
        for (const c of view.components || []) {
          if (c.type === 'table') {
            await loadTableData(c)
          }
        }
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Failed to submit form', color: 'error' })
  } finally {
    formSubmitting.value[key] = false
  }
}

const executeTableAction = async (comp: any, row: any, action: any) => {
  try {
    // Replace URL parameters like :id with actual row values
    let url = action.apiEndpoint
    if (url.includes(':id') && row.id) {
      url = url.replace(':id', String(row.id))
    }
    
    const querySign = url.includes('?') ? '&' : '?'
    await fetchApi(`${url}${querySign}projectId=${projectId}`, {
      method: action.action === 'delete' ? 'DELETE' : 'POST'
    })

    toast.add({ title: 'Success', description: action.successMessage || 'Action executed', color: 'success' })
    await loadTableData(comp) // refresh table
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Action failed', color: 'error' })
  }
}

const projectLanguages = ref<any[]>([])

const fetchProjectLanguages = async () => {
  try {
    const langs = await fetchApi<any[]>(`/localization/projects/${projectId}/languages`)
    projectLanguages.value = langs || []
  } catch (err) {
    console.error('Failed to load project languages:', err)
  }
}

const toggleLanguage = (key: string, fieldName: string, code: string) => {
  if (!formData.value[key]) {
    formData.value[key] = {}
  }
  const currentVal = formData.value[key][fieldName] || ''
  let selected = currentVal ? currentVal.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean) : []
  
  const targetCode = code.toLowerCase()
  if (selected.includes(targetCode)) {
    selected = selected.filter((c: string) => c !== targetCode)
  } else {
    selected.push(targetCode)
  }
  
  formData.value[key][fieldName] = selected.join(',')
}

const isLanguageSelected = (key: string, fieldName: string, code: string) => {
  const currentVal = formData.value[key]?.[fieldName] || ''
  if (!currentVal) return false
  const selected = currentVal.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
  return selected.includes(code.toLowerCase())
}

onMounted(() => {
  fetchPluginAndExtension()
  fetchProjectLanguages()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header (Identical premium pattern to standard pages) -->
    <div v-if="isLoading" class="animate-pulse flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-neutral-800 rounded-xl" />
        <div class="space-y-2">
          <div class="h-5 w-48 bg-neutral-800 rounded" />
          <div class="h-3 w-64 bg-neutral-800 rounded" />
        </div>
      </div>
    </div>

    <div v-else-if="extension" class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
          <u-icon :name="extension.icon || plugin?.icon || 'i-lucide-toy-brick'" class="w-5 h-5 text-primary-500" />
          {{ extension.label }}
        </h1>
        <p class="text-sm text-neutral-400 mt-1">
          Plugin: <strong class="text-neutral-300 font-normal">{{ plugin?.name }}</strong> &bull; {{ extension.description }}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="isLoading" class="space-y-6">
      <u-card class="h-64 animate-pulse" />
    </div>

    <div v-else-if="extension" class="space-y-6">
      <div v-for="view in extension.views" :key="view.id" class="space-y-6">
        <!-- Optional View Title Header -->
        <div v-if="view.title" class="border-b border-neutral-800 pb-3">
          <h2 class="text-lg font-semibold text-white">{{ view.title }}</h2>
          <p v-if="view.description" class="text-neutral-400 text-sm mt-1">{{ view.description }}</p>
        </div>

        <!-- Render components, dynamically styled in a grid if both a form and a table are present -->
        <div :class="hasFormAndTable(view) ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'flex flex-col gap-6'">
          <div 
            v-for="(comp, cIdx) in view.components" 
            :key="cIdx" 
            :class="hasFormAndTable(view) ? (comp.type === 'form' ? 'lg:col-span-5' : 'lg:col-span-7') : 'w-full'"
          >
            
            <!-- TABLE COMPONENT -->
            <u-card v-if="comp.type === 'table'" :ui="{ body: 'p-0 sm:p-0' }">
              <template v-if="comp.title" #header>
                <span class="text-sm font-semibold text-neutral-300">{{ comp.title }}</span>
              </template>

              <div v-if="tableLoading[comp.id || comp.apiEndpoint]" class="py-12 text-center">
                <u-icon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary mx-auto" />
                <p class="text-xs text-neutral-500 mt-2">Loading...</p>
              </div>

              <div v-else-if="!tableData[comp.id || comp.apiEndpoint] || tableData[comp.id || comp.apiEndpoint].length === 0" class="text-center py-12 text-neutral-500 text-sm">
                <u-icon name="i-lucide-info" class="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p class="font-medium text-xs">No data available</p>
              </div>

              <u-table 
                v-else 
                :data="tableData[comp.id || comp.apiEndpoint]" 
                :columns="getUTableColumns(comp)"
              >
                <!-- Dynamic cells for table columns -->
                <template v-for="col in comp.columns" :key="col.key" #[`${col.key}-cell`]="{ row }">
                  <span v-if="col.key === 'publishedAt' || col.key === 'createdAt'" class="text-neutral-400 text-xs">
                    {{ new Date(row.original[col.key]).toLocaleString() }}
                  </span>
                  <span v-else class="font-medium text-sm text-neutral-200">
                    {{ row.original[col.key] }}
                  </span>
                </template>

                <!-- Actions Cell -->
                <template v-if="comp.actions && comp.actions.length > 0" #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-2 pr-4">
                    <u-button
                      v-for="(act, aIdx) in comp.actions"
                      :key="aIdx"
                      :color="act.action === 'delete' ? 'error' : 'primary'"
                      variant="subtle"
                      size="xs"
                      @click="executeTableAction(comp, row.original, act)"
                    >
                      {{ act.label }}
                    </u-button>
                  </div>
                </template>
              </u-table>
            </u-card>

            <!-- FORM COMPONENT -->
            <u-card v-else-if="comp.type === 'form'">
              <template v-if="comp.title" #header>
                <span class="text-sm font-semibold text-neutral-300">{{ comp.title }}</span>
                <p v-if="comp.description" class="text-xs text-neutral-400 mt-1 leading-relaxed">{{ comp.description }}</p>
              </template>

              <form class="space-y-4" @submit.prevent="submitForm(comp)">
                <div v-for="field in comp.fields" :key="field.name">
                  <u-form-field :label="field.label" :description="field.description" :required="field.required">
                    <!-- Text Area / Markdown -->
                    <u-textarea
                      v-if="field.type === 'markdown' || field.type === 'textarea'"
                      v-model="formData[comp.id || comp.apiEndpoint][field.name]"
                      :placeholder="field.placeholder"
                      rows="6"
                      class="w-full font-sans mt-1"
                    />

                    <!-- Switch for Booleans -->
                    <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2 mt-2">
                      <u-switch
                        v-model="formData[comp.id || comp.apiEndpoint][field.name]"
                      />
                      <span class="text-xs text-neutral-400">Enabled</span>
                    </div>

                    <!-- Clickable language badges selector -->
                    <div v-else-if="field.type === 'languages'" class="flex flex-wrap gap-2 mt-2">
                      <u-badge
                        v-for="lang in projectLanguages"
                        :key="lang.code"
                        :color="isLanguageSelected(comp.id || comp.apiEndpoint, field.name, lang.code) ? 'primary' : 'neutral'"
                        :variant="isLanguageSelected(comp.id || comp.apiEndpoint, field.name, lang.code) ? 'solid' : 'subtle'"
                        size="sm"
                        class="cursor-pointer select-none transition-all hover:scale-105 active:scale-95"
                        @click="toggleLanguage(comp.id || comp.apiEndpoint, field.name, lang.code)"
                      >
                        <u-icon v-if="isLanguageSelected(comp.id || comp.apiEndpoint, field.name, lang.code)" name="i-lucide-check" class="w-3.5 h-3.5 mr-1 text-inherit" />
                        {{ lang.name }} ({{ lang.code.toUpperCase() }})
                      </u-badge>
                      <div v-if="projectLanguages.length === 0" class="text-xs text-neutral-500 italic">
                        No languages defined for this project.
                      </div>
                    </div>

                    <!-- Plain String Input -->
                    <u-input
                      v-else
                      v-model="formData[comp.id || comp.apiEndpoint][field.name]"
                      :placeholder="field.placeholder"
                      class="w-full mt-1"
                    />
                  </u-form-field>
                </div>

                <div class="pt-2">
                  <u-button
                    type="submit"
                    color="neutral"
                    :loading="formSubmitting[comp.id || comp.apiEndpoint]"
                  >
                    {{ comp.submitLabel || 'Submit' }}
                  </u-button>
                </div>
              </form>
            </u-card>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
