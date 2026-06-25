import { computed } from 'vue'
import { useTranslation } from '../useTranslation'

export function useTranslationFlashcard() {
    const {
        keys,
        currentScopeKeys,
        translations,
        sourceLanguage,
        isModalOpen,
        targetLanguage,
        activeKeyId,
        saveTranslation,
        autoTranslate,
        suggestTranslation,
        getLanguageProgress
    } = useTranslation()

    const isOpen = computed({
        get: () => isModalOpen.value,
        set: (v) => isModalOpen.value = v
    })

    const currentKey = computed(() => {
        if (!activeKeyId.value) return null
        return keys.value.find(k => k.id === activeKeyId.value) || null
    })

    const sourceText = computed(() => {
        if (!currentKey.value || !sourceLanguage.value) return ''
        const t = translations.value[currentKey.value.id]?.[sourceLanguage.value.code]
        return t?.text || ''
    })

    const currentTranslationText = computed(() => {
        if (!currentKey.value || !targetLanguage.value) return ''
        const t = translations.value[currentKey.value.id]?.[targetLanguage.value.code]
        return t?.text || ''
    })

    const currentTranslationReviewStatus = computed(() => {
        if (!currentKey.value || !targetLanguage.value) return null
        const t = translations.value[currentKey.value.id]?.[targetLanguage.value.code]
        return t?.reviewStatus || null
    })

    const isTranslated = computed(() => {
        return currentTranslationText.value.trim().length > 0
    })

    // Get index of the active key within the current scope keys
    const currentIndex = computed(() => {
        return currentScopeKeys.value.findIndex(k => k.id === activeKeyId.value)
    })

    const isUntranslated = (t: { text?: string; draftValue?: string; reviewStatus?: string } | undefined | null) => {
        if (!t) return true
        const hasLive = t.text && t.text.trim() !== ''
        const hasPending = t.draftValue && t.reviewStatus === 'PENDING_REVIEW'
        return !hasLive && !hasPending
    }

    const canGoNext = computed(() => {
        if (!targetLanguage.value || currentIndex.value < 0) return false
        for (let i = currentIndex.value + 1; i < currentScopeKeys.value.length; i++) {
            const key = currentScopeKeys.value[i]
            const t = translations.value[key.id]?.[targetLanguage.value.code]
            if (isUntranslated(t)) return true
        }
        return false
    })

    const canGoPrev = computed(() => {
        if (!targetLanguage.value || currentIndex.value <= 0) return false
        for (let i = currentIndex.value - 1; i >= 0; i--) {
            const key = currentScopeKeys.value[i]
            const t = translations.value[key.id]?.[targetLanguage.value.code]
            if (isUntranslated(t)) return true
        }
        return false
    })

    const progressPercentage = computed(() => {
        if (!targetLanguage.value) return 0
        return getLanguageProgress(targetLanguage.value.code).percentage
    })

    const close = () => {
        isOpen.value = false
        activeKeyId.value = null
    }

    const next = () => {
        if (!targetLanguage.value) return
        for (let i = currentIndex.value + 1; i < currentScopeKeys.value.length; i++) {
            const key = currentScopeKeys.value[i]
            const t = translations.value[key.id]?.[targetLanguage.value.code]
            if (isUntranslated(t)) {
                activeKeyId.value = key.id
                return
            }
        }
    }

    const prev = () => {
        if (!targetLanguage.value) return
        for (let i = currentIndex.value - 1; i >= 0; i--) {
            const key = currentScopeKeys.value[i]
            const t = translations.value[key.id]?.[targetLanguage.value.code]
            if (isUntranslated(t)) {
                activeKeyId.value = key.id
                return
            }
        }
    }

    const save = (text: string, isGenerated: boolean, timeSpentMs: number = 0) => {
        if (!currentKey.value || !targetLanguage.value) return
        saveTranslation(currentKey.value.id, targetLanguage.value.id, targetLanguage.value.code, text, isGenerated, timeSpentMs)
    }

    const autoTranslateKey = async (provider: 'deepl' | 'google' = 'google') => {
        if (!currentKey.value || !targetLanguage.value) return
        await autoTranslate(currentKey.value.id, [targetLanguage.value.id], provider)
    }

    const getSuggestion = async (provider: 'deepl' | 'google' = 'google', silentQuotaAlert = false) => {
        if (!currentKey.value || !targetLanguage.value) return null
        return await suggestTranslation(currentKey.value.id, targetLanguage.value.id, provider, silentQuotaAlert)
    }

    return {
        isOpen,
        targetLanguage,
        currentKey,
        sourceLanguage,
        sourceText,
        currentTranslationText,
        isTranslated,
        progressPercentage,
        currentIndex,
        totalCount: computed(() => currentScopeKeys.value.length),
        canGoNext,
        canGoPrev,
        currentTranslationReviewStatus,
        close,
        next,
        prev,
        save,
        autoTranslateKey,
        getSuggestion
    }
}
