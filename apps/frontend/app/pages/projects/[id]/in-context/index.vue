<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useTranslation } from '~/composables/localization/useTranslation'
import type { Language } from '~/types'
import TranslationActivityModal from '~/components/localization/translations/modal/TranslationActivityModal.vue'

const {
  init,
  keys,
  languages,
  targetLanguage,
  activeKeyId,
  isModalOpen,
  translations
} = useTranslation()

const route = useRoute()
const projectId = Number(route.params.id)

const iframeRef = ref<HTMLIFrameElement | null>(null)
const iframeLoaded = ref(false)
const iframeError = ref(false)

const { data: projectsData } = useNuxtData('projects')
const { currentProject } = useProject(projectsData as any)
const inContextUrl = computed(() => currentProject.value?.inContextUrl)
const iframeSrc = computed(() => {
  let urlString = currentProject.value?.inContextUrl
  if (!urlString) return ''
  
  if (!/^https?:\/\//i.test(urlString) && !urlString.startsWith('/')) {
    urlString = urlString.startsWith('localhost') ? `http://${urlString}` : `https://${urlString}`
  }

  try {
    const url = new URL(urlString)
    url.searchParams.set('_t', Date.now().toString())
    return url.toString()
  } catch (e) {
    try {
      const url = new URL(urlString, window.location.origin)
      url.searchParams.set('_t', Date.now().toString())
      return url.toString()
    } catch {
      return urlString
    }
  }
})

// Local state for target language selection
const localTargetLanguageId = ref<number | undefined>(undefined)

watch(languages, (langs) => {
  if (langs && langs.length > 0 && !localTargetLanguageId.value) {
    const firstLang = langs[0]
    if (firstLang) {
      localTargetLanguageId.value = firstLang.id
    }
  }
}, { immediate: true })

watch(localTargetLanguageId, (id) => {
  if (id) {
    const lang = languages.value?.find(l => String(l.id) === String(id))
    if (lang) {
      targetLanguage.value = lang
      sendTranslationsToIframe()
    }
  }
})

// Listen to changes in translations to update live preview
watch(translations, () => {
  sendTranslationsToIframe()
}, { deep: true })

onMounted(() => {
  init()
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})

const handleIframeLoad = () => {
  iframeLoaded.value = true
  iframeError.value = false
  // Note: the iframe might not have glide-client.js loaded yet, 
  // but we wait for GLIDE_INIT message anyway.
}

const handleIframeError = () => {
  iframeError.value = true
}

const handleMessage = async (event: MessageEvent) => {
  const data = event.data
  if (!data || data.source !== 'glide-client') return

  if (data.type === 'GLIDE_INIT') {
    // Client script is ready, send translations
    sendTranslationsToIframe()
  } else if (data.type === 'GLIDE_EDIT_REQUEST') {
    const keyName = data.key
    let keyObj = keys.value.find(k => k.key === keyName)
    
    if (!keyObj) {
      // Auto-create missing key
      const { addKey } = useTranslation()
      await addKey(keyName)
      keyObj = keys.value.find(k => k.key === keyName)
    }

    if (keyObj && targetLanguage.value) {
      activeKeyId.value = keyObj.id
      isModalOpen.value = true
    } else if (!targetLanguage.value) {
      const toast = useToast()
      toast.add({ title: 'Error', description: `No Language - Please select a preview language first.`, color: 'error' })
    }
  }
}

const sendTranslationsToIframe = () => {
  if (!iframeRef.value || !iframeRef.value.contentWindow || !targetLanguage.value) return

  // Flatten translations for the target language
  const flatTranslations: Record<string, string> = {}
  keys.value.forEach(keyObj => {
    const t = translations.value[keyObj.id]?.[targetLanguage.value!.code]
    if (t?.text) {
      flatTranslations[keyObj.key] = t.text
    }
  })

  iframeRef.value.contentWindow.postMessage({
    source: 'glide-dashboard',
    type: 'GLIDE_TRANSLATIONS',
    translations: flatTranslations
  }, '*')
}
</script>

<template>
  <div>
    <!-- Mobile Warning -->
    <div class="md:hidden flex flex-col items-center justify-center h-[50vh] text-center p-6">
      <div class="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-4">
        <u-icon name="i-lucide-monitor-x" size="xl" />
      </div>
      <h2 class="text-lg font-bold">Not available on mobile</h2>
      <p class="text-sm text-neutral-400 mt-2 max-w-sm">
        The In-Context Editor requires a larger screen. Please use a tablet or desktop device to access this feature.
      </p>
    </div>

    <!-- Desktop Editor -->
    <div class="hidden md:flex flex-col h-[calc(100vh-100px)] -m-4 sm:-m-6 lg:-m-8">
      <!-- Header Controls -->
      <div class="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between z-10 shrink-0 shadow-sm">
        <div class="flex items-center gap-3 ml-2">
          <h1 class="text-sm font-semibold text-neutral-400">In-Context Editor</h1>
          <span class="text-neutral-600 text-sm">|</span>
          <div class="text-xs text-neutral-400 max-w-sm truncate" v-if="inContextUrl">
            {{ inContextUrl }}
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Preview Language:</span>
          <u-select
            v-model="localTargetLanguageId"
            :items="languages?.map(l => ({ label: `${l.flag} ${l.name}`, value: l.id })) || []"
            size="sm"
            class="w-48"
            placeholder="Select language..."
          />
          <u-button 
            v-if="!inContextUrl"
            to="/admin/projects"
            color="primary"
            size="sm"
            variant="outline"
          >
            Setup URL in Admin
          </u-button>
        </div>
      </div>

      <!-- Iframe Container -->
      <div class="flex-1 relative bg-neutral-950 overflow-hidden">
        <div v-if="!inContextUrl" class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div class="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <u-icon name="i-lucide-globe" size="xl" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-neutral-200">No Preview URL Configured</h2>
            <p class="text-sm text-neutral-400 max-w-md mt-2">
              To use the In-Context Editor, you must configure an <strong>In-Context Preview URL</strong> in the project settings.
            </p>
          </div>
          <u-button to="/admin/projects" color="neutral" icon="i-lucide-settings">
            Go to Project Settings
          </u-button>
        </div>
        
        <template v-else>
          <!-- Loading State -->
          <div v-show="!iframeLoaded && !iframeError" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 z-10">
            <u-icon name="i-lucide-loader-circle" class="animate-spin text-primary-500" size="xl" />
            <span class="text-sm text-neutral-400 font-medium">Loading Preview...</span>
          </div>
          
          <!-- Iframe -->
          <iframe
            ref="iframeRef"
            :src="iframeSrc"
            class="w-full h-full border-none"
            @load="handleIframeLoad"
            @error="handleIframeError"
            title="In-Context Editor Preview"
          ></iframe>
        </template>
      </div>

      <teleport to="body">
        <translation-activity-modal/>
      </teleport>
    </div>
  </div>
</template>
