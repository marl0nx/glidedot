<script setup lang="ts">
import { ref, onMounted, shallowRef, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchApi } = useApi()

const projectId = route.params.id as string
const pluginId = route.params.pluginId as string
const extensionId = route.params.extensionId as string

const isLoading = ref(true)
const plugin = ref<any>(null)
const extension = ref<any>(null)

// The actual dynamically loaded Vue component
const PluginComponent = shallowRef<any>(null)

const handleToast = (payload: any) => {
  toast.add(payload)
}

const loadPluginScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const scriptId = `plugin-script-${pluginId}`
    if (document.getElementById(scriptId)) {
      // Already loaded
      resolve((window as any).DiscordNewsPlugin)
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    // Nuxt runtime config to get apiBase, assuming /v1
    const config = useRuntimeConfig()
    script.src = `${config.public.apiBase}/plugins/serve-ui/${pluginId}`
    script.onload = () => resolve((window as any).DiscordNewsPlugin)
    script.onerror = () => reject(new Error('Failed to load plugin UI script'))
    document.body.appendChild(script)
  })
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

    // Make Vue available globally for the UMD bundle
    if (!(window as any).Vue) {
      // In Nuxt 3, Vue is exported but tricky to assign globally dynamically.
      // UMD bundle externalizes Vue. So we assign it.
      const Vue = await import('vue')
      ;(window as any).Vue = Vue
    }

    const pluginModule = await loadPluginScript()
    if (pluginModule && pluginModule.views && pluginModule.views[foundExt.views?.[0]?.id || 'manage']) {
      PluginComponent.value = markRaw(pluginModule.views[foundExt.views?.[0]?.id || 'manage'])
    } else {
       toast.add({ title: 'Error', description: 'Plugin UI module not correctly exported.', color: 'error' })
    }

  } catch (err: any) {
    console.error(err)
    toast.add({ title: 'Error', description: 'Failed to load plugin UI', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPluginAndExtension()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
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
      <!-- Dynamically injected Vue component -->
      <component 
        :is="PluginComponent" 
        v-if="PluginComponent"
        :projectId="projectId"
        :pluginId="pluginId"
        :fetchApi="fetchApi"
        @toast="handleToast"
      />
      <u-card v-else>
        <div class="text-center py-12">
          <u-icon name="i-lucide-alert-circle" class="w-8 h-8 text-neutral-500 mx-auto mb-2" />
          <p class="text-neutral-400">Failed to mount plugin UI component.</p>
        </div>
      </u-card>
    </div>
  </div>
</template>
