<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTranslationFlashcard } from '../../../../composables/localization/modal/useTranslationFlashcard'
import { useShortcuts } from '~/composables/useShortcuts'
import { useAuth } from '~/composables/useAuth'
import confetti from 'canvas-confetti'

const { user: currentUser } = useAuth()

const {
  isOpen,
  targetLanguage,
  currentKey,
  sourceLanguage,
  sourceText,
  currentTranslationText,
  currentTranslationReviewStatus,
  progressPercentage,
  currentIndex,
  totalCount,
  canGoNext,
  canGoPrev,
  close,
  next,
  prev,
  save,
  getSuggestion
} = useTranslationFlashcard()

const { matchShortcut, loadShortcuts } = useShortcuts()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const tempText = ref('')
const isGenerating = ref(false)
const suggestionText = ref('')
const provider = ref<'deepl' | 'google'>('deepl')
const enableShortcuts = ref(true)
const translatedThisSession = ref(0)

const fetchSuggestion = async () => {
  if (currentUser.value?.enableSuggestions === false || currentUser.value?.allowSuggestions === false) {
    suggestionText.value = ''
    return
  }

  if (!sourceText.value || currentTranslationText.value.trim().length > 0) {
    suggestionText.value = ''
    return
  }
  
  isGenerating.value = true
  try {
    const text = await getSuggestion(currentUser.value?.hasDeepL ? 'deepl' : 'google')
    if (text) {
      suggestionText.value = text.suggestion
      if (currentUser.value) {
         currentUser.value.translationQuota = text.quotaRemaining
      }
    }
  } catch (e) {
    console.error("Suggestion failed", e)
  } finally {
    isGenerating.value = false
  }
}

const toast = useToast()

const lockScroll = () => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
}

const unlockScroll = () => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    translatedThisSession.value = 0
    lockScroll()
    if (currentUser.value?.enableSuggestions === false || currentUser.value?.allowSuggestions === false) {
      toast.add({ title: 'Suggestions are disabled', description: 'AI translation suggestions are disabled or not allowed.', color: 'error' })
    }
  } else {
    unlockScroll()
  }
}, { immediate: true })

const fireConfetti = () => {
  confetti({
    particleCount: 100,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.8 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  });
  confetti({
    particleCount: 100,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.8 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  });
}

watch(progressPercentage, (newVal, oldVal) => {
  if (newVal === 100 && oldVal !== undefined && oldVal < 100 && isOpen.value) {
    if (translatedThisSession.value > 1) {
      fireConfetti()
    }
    setTimeout(() => {
      if (isOpen.value) {
        doClose()
      }
    }, 1500)
  }
})

watch([currentKey, provider], () => {
  if (currentKey.value) {
    tempText.value = currentTranslationText.value
    suggestionText.value = ''
    fetchSuggestion()
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
}, {immediate: true})

const autoTranslate = async () => {
  if (suggestionText.value) {
    tempText.value = suggestionText.value
  }
}

const flushSave = () => {
  if (tempText.value !== currentTranslationText.value) {
    translatedThisSession.value++
    save(tempText.value, false)
  }
}

const doNext = () => {
  flushSave()
  next()
}

const doPrev = () => {
  flushSave()
  prev()
}

const doClose = () => {
  flushSave()
  close()
}

const touchStartX = ref(0)
const touchStartY = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0].screenX
  touchStartY.value = e.changedTouches[0].screenY
}

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0].screenX
  const touchEndY = e.changedTouches[0].screenY
  
  const diffX = touchStartX.value - touchEndX
  const diffY = touchStartY.value - touchEndY
  
  // Check if horizontal swipe is dominant and exceeds threshold
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
    if (diffX > 0 && canGoNext.value) {
      // Swiped left
      doNext()
    } else if (diffX < 0 && canGoPrev.value) {
      // Swiped right
      doPrev()
    }
  }
}



const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value || e.repeat) return

  if (matchShortcut(e, 'close')) {
    e.preventDefault()
    doClose()
    return
  }

  if (!enableShortcuts.value) return

  if (matchShortcut(e, 'approve')) {
    if (!isGenerating.value && suggestionText.value && !tempText.value.trim()) {
      e.preventDefault()
      autoTranslate()
      return
    }
  }

  if (matchShortcut(e, 'saveNext')) {
    e.preventDefault()
    doNext()
    return
  }

  if (matchShortcut(e, 'prev')) {
    if (canGoPrev.value) {
      e.preventDefault()
      doPrev()
    }
  }

  if (matchShortcut(e, 'next')) {
    if (canGoNext.value) {
      e.preventDefault()
      doNext()
    }
  }
}

onMounted(() => {
  loadShortcuts()
  
  const savedShortcuts = localStorage.getItem('glide_enable_shortcuts')
  if (savedShortcuts) {
    enableShortcuts.value = savedShortcuts === 'true'
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  unlockScroll()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="isOpen && targetLanguage && currentKey"
       class="fixed inset-0 flex flex-col backdrop-blur-lg text-neutral-200">

    <!-- Modal Header -->
    <div class="h-16 px-4 md:px-6 border-b border-neutral-800/60 flex items-center justify-between shrink-0 shadow-sm relative z-10 bg-neutral-950">
      <div class="flex items-center gap-2 md:gap-4">
        <h2 class="hidden md:block text-sm font-semibold text-neutral-200">Translate Mode</h2>
        <div class="flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
          <span class="text-sm">{{ targetLanguage.flag }}</span>
          <span class="hidden md:inline text-xs font-medium text-neutral-300">{{ targetLanguage.name }}</span>
          <span class="text-neutral-600 text-xs hidden md:inline">•</span>
          <span class="text-xs font-bold text-primary-500">{{ progressPercentage }}%</span>
        </div>
      </div>

      <div class="flex items-center gap-5">
        <button class="pl-2 pr-3 py-1.5 -mr-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-neutral-700" @click="doClose">
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 font-sans text-[10px] font-bold text-neutral-400">ESC</kbd>
          <u-icon name="i-lucide-x" size="md"/>
        </button>
      </div>
    </div>

    <div class="h-0.5 bg-neutral-900 w-full relative z-10">
      <div class="h-full bg-primary-500 transition-all duration-300" :style="{ width: `${progressPercentage}%` }"/>
    </div>

    <!-- Content Area -->
    <div 
      class="flex-1 flex flex-col items-center justify-start md:justify-center p-4 md:p-6 min-h-0 relative overflow-y-auto pb-32 overscroll-none"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- Key Display -->
      <div class="flex flex-col items-center gap-2 md:gap-4 mb-8 md:mb-16 mt-4 md:mt-0">
        <span class="text-[10px] md:text-[11px] font-bold tracking-widest text-neutral-500 uppercase text-center">
          Current Key ( {{ currentIndex + 1 }} / {{ totalCount }} )
        </span>
        <h1 class="text-xl md:text-3xl font-mono text-neutral-100 font-semibold text-center break-all">
          {{ currentKey.key }}
        </h1>
      </div>

      <!-- Translation Workspace -->
      <div class="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-8 max-w-6xl w-full">

        <!-- Source Language (Reference) -->
        <div class="w-full md:w-[420px] rounded-2xl bg-[#121212] border border-neutral-800/60 shadow-lg flex flex-col overflow-hidden shrink-0">
          <div class="px-4 md:px-6 py-3 md:py-5 border-b border-neutral-800/40 flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-neutral-500">
            <span>{{ sourceLanguage?.flag }}</span>
            <span>{{ sourceLanguage?.name }} (Reference)</span>
          </div>
          <div class="p-4 md:p-6 flex-1 text-sm text-neutral-300 leading-relaxed font-medium min-h-[80px] md:min-h-[140px]">
            {{ sourceText || 'No source text available' }}
          </div>
        </div>

        <!-- Divider -->
        <div class="hidden md:flex my-auto items-center justify-center relative min-h-[140px] shrink-0">
          <div class="w-10 h-10 rounded-full border border-neutral-800 bg-[#151515] flex items-center justify-center text-neutral-500 shadow-sm relative z-10">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>

        <!-- Target Language -->
        <div class="flex flex-col w-full md:w-[420px] gap-4 shrink-0">
          <!-- Target Input -->
          <div class="w-full rounded-2xl bg-[#0a0a0a] border border-primary-500 shadow-[0_0_20px_-5px_rgba(var(--color-primary-500),0.2)] flex flex-col relative overflow-hidden transition-all focus-within:shadow-[0_0_30px_-5px_rgba(var(--color-primary-500),0.3)]">
            <div class="px-4 md:px-6 py-3 md:py-5 flex items-center justify-between">
              <div class="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-neutral-400">
                <span>{{ targetLanguage.flag }}</span>
                <span>{{ targetLanguage.name }}</span>
              </div>
              <div class="flex items-center gap-2">
                <u-badge v-if="currentTranslationReviewStatus === 'PENDING_REVIEW'" color="warning" variant="subtle" size="sm">Pending Review</u-badge>
                <u-badge v-if="currentTranslationReviewStatus === 'REJECTED'" color="error" variant="subtle" size="sm">Rejected</u-badge>
              </div>
            </div>

            <div class="flex-1 relative">
              <textarea
                  ref="textareaRef"
                  v-model="tempText"
                  class="w-full min-h-[100px] md:min-h-[140px] px-4 md:px-6 text-sm font-medium text-neutral-100 bg-transparent resize-none focus:outline-none leading-relaxed"
                  placeholder="Enter translation here..."
              />
            </div>

            <div class="px-6 py-4 border-t border-neutral-800/40 flex items-center justify-between bg-neutral-950/40">
              <div class="flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                <svg class="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                <span>Changes are also saved when moving to another key</span>
              </div>
              
              <u-button 
                size="xs" 
                color="primary" 
                :disabled="tempText === currentTranslationText"
                class="px-4"
                @click="flushSave"
              >
                Save
              </u-button>
            </div>
          </div>

          <!-- Translation Suggestion Widget -->
          <div v-if="currentUser?.enableSuggestions !== false && currentUser?.allowSuggestions !== false && sourceText && !tempText.trim()"
              class="flex flex-col md:flex-row items-start md:items-center w-full rounded-xl p-3 bg-accented/20 border border-accented/50 shadow-sm gap-3 shrink-0">
            <div class="flex flex-col flex-1 gap-1">
              <div class="flex items-center gap-2">
                <u-icon name="i-lucide-sparkles" size="xs" class="text-amber-500"/>
                <h3 class="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">SUGGESTION ({{ currentUser?.hasDeepL ? 'DeepL' : 'Google' }})</h3>
              </div>
              <p class="text-sm font-medium leading-relaxed text-neutral-300 line-clamp-3">
                {{ isGenerating ? 'Generating...' : (suggestionText || 'No suggestion available') }}
              </p>
              
              <div v-if="currentUser?.translationQuota !== undefined && !currentUser.isAdmin && currentUser.translationQuota <= 50" class="flex items-center justify-between bg-amber-500/10 rounded mt-1 p-1.5 text-[10px]">
                <div class="flex items-center gap-1.5 text-amber-500 font-medium">
                  <u-icon name="i-lucide-alert-triangle" size="xs" />
                  <span>{{ currentUser.translationQuota }} left</span>
                </div>
              </div>
            </div>
            
            <u-button
                :disabled="isGenerating || !suggestionText"
                size="xs"
                color="neutral"
                variant="outline"
                class="shrink-0 w-full md:w-auto justify-center"
                @click="autoTranslate"
            >
              Approve
            </u-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Navigation -->
    <div class="fixed bottom-0 left-0 right-0 p-3 md:p-6 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 flex items-center justify-between md:justify-center gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <button
          :disabled="!canGoPrev"
          class="px-5 py-2.5 rounded-full bg-neutral-100 text-neutral-900 text-[11px] font-bold flex items-center gap-3 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all"
          @click="doPrev"
      >
        <span>&lt; Prev</span> <span class="opacity-30">|</span> <kbd class="font-sans font-medium text-neutral-500">⌘
        ←</kbd>
      </button>

      <button
          :disabled="!canGoNext"
          class="px-5 py-2.5 rounded-full bg-neutral-100 text-neutral-900 text-[11px] font-bold flex items-center gap-3 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all"
          @click="doNext"
      >
        <span>Next &gt;</span> <span class="opacity-30">|</span> <kbd class="font-sans font-medium text-neutral-500">⌘ →</kbd>
      </button>
    </div>
  </div>
</template>
