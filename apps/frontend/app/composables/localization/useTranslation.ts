import { ref, computed } from 'vue'
import type { TranslationKey, TranslationKeyScopeNode, Language } from '~/types'
import { useApi } from '~/composables/useApi'

// --- SHARED GLOBAL STATE ---
const languages = ref<Language[]>([])
const keys = ref<TranslationKey[]>([])
const labels = ref<{ id: number; name: string; color: string }[]>([])
const translations = ref<Record<number, Record<string, { text: string; isGenerated?: boolean; draftValue?: string; reviewStatus?: string }>>>({})

const selectedScope = ref<string | null>(null)
const expandedScopes = ref<Record<string, boolean>>({})

// Base UI State for Modal
const isModalOpen = ref(false)
const targetLanguage = ref<Language | null>(null)
const activeKeyId = ref<number | null>(null)
const isLoading = ref(false)

export function useTranslation() {
    const { fetchApi } = useApi()
    const route = useRoute()
    const toast = useToast()

    const projectId = computed(() => route.params.id ? parseInt(route.params.id as string) : null)

    const init = async () => {
        if (!projectId.value || isLoading.value) return
        isLoading.value = true

        try {
            const [langsData, keysData, labelsData] = await Promise.all([
                fetchApi(`/localization/projects/${projectId.value}/languages`),
                fetchApi(`/localization/keys/${projectId.value}`),
                fetchApi(`/localization/labels/${projectId.value}`)
            ])

            const mappedLangs = (langsData as { id: number; code: string; name: string; flag?: string; isSource?: boolean }[]).map(l => ({
                id: l.id,
                code: l.code,
                name: l.name,
                flag: l.flag || '🏳️',
                isRef: l.isSource 
            }))

            mappedLangs.sort((a, b) => {
                if (a.isRef && !b.isRef) return -1
                if (!a.isRef && b.isRef) return 1
                return a.name.localeCompare(b.name)
            })

            languages.value = mappedLangs
            
            labels.value = (labelsData as { id: number; name: string; color: string }[]).map(l => ({
                id: l.id,
                name: l.name,
                color: l.color
            }))

            keys.value = (keysData as { id: number; key: string; draftKey?: string; reviewStatus?: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED'; isPendingDelete?: boolean; labels: number[] }[]).map(k => ({
                id: k.id,
                key: k.key,
                draftKey: k.draftKey,
                reviewStatus: k.reviewStatus,
                isPendingDelete: k.isPendingDelete,
                labels: k.labels || []
            }))

            const transMap: Record<number, Record<string, { text: string; draftValue?: string; reviewStatus?: string; authorName?: string; authorAvatar?: string }>> = {}
            ;(keysData as { id: number; translations?: { languageId: number; value: string; draftValue?: string; reviewStatus?: string; authorName?: string; authorAvatar?: string }[] }[]).forEach(k => {
                transMap[k.id] = {}
                if (k.translations) {
                    k.translations.forEach((t) => {
                        const lang = languages.value.find(l => l.id === t.languageId)
                        if (lang) {
                            transMap[k.id][lang.code] = { 
                                text: t.value,
                                draftValue: t.draftValue,
                                reviewStatus: t.reviewStatus,
                                authorName: t.authorName,
                                authorAvatar: t.authorAvatar
                            }
                        }
                    })
                }
            })
            translations.value = transMap
        } catch (e) {
            console.error("Failed to load translation data", e)
        } finally {
            isLoading.value = false
        }
    }

    const sourceLanguage = computed(() => languages.value.find(l => l.isRef === true) || languages.value[0] || null)

    const toggleScope = (scope: string) => {
        expandedScopes.value[scope] = !expandedScopes.value[scope]
    }

    const visibleScopes = computed<TranslationKeyScopeNode[]>(() => {
        const scopes = new Set<string>()
        keys.value.forEach(k => {
            const parts = k.key.split('.')
            let current = ''
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i] || ''
                current = current ? current + '.' + part : part
                if (current) scopes.add(current)
            }
        })

        const sortedScopes = Array.from(scopes).sort()

        const result: TranslationKeyScopeNode[] = []
        for (const scope of sortedScopes) {
            const parts = scope.split('.')
            let visible = true
            let ancestor = ''
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i] || ''
                ancestor = ancestor ? ancestor + '.' + part : part
                if (ancestor && !expandedScopes.value[ancestor]) {
                    visible = false
                    break
                }
            }

            if (visible) {
                result.push({
                    id: scope,
                    name: parts[parts.length - 1] || '',
                    level: parts.length - 1,
                    hasChildren: sortedScopes.some(s => s !== scope && s.startsWith(scope + '.')),
                    isExpanded: !!expandedScopes.value[scope],
                    keyCount: getKeysInScope(scope).length
                })
            }
        }
        return result
    })

    const getKeysInScope = (scope: string | null): TranslationKey[] => {
        if (!scope) return keys.value
        return keys.value.filter(k => k.key.startsWith(`${scope}.`))
    }

    const currentScopeKeys = computed(() => getKeysInScope(selectedScope.value))

    const getLanguageProgress = (langCode: string) => {
        const scopeKeys = currentScopeKeys.value
        if (scopeKeys.length === 0) return { count: 0, liveCount: 0, pendingCount: 0, total: 0, percentage: 0 }

        let liveCount = 0
        let pendingCount = 0

        scopeKeys.forEach(k => {
            const t = translations.value[k.id]?.[langCode]
            if (t) {
                if (t.text && t.text.trim() !== '') {
                    liveCount++
                } else if (t.draftValue && t.reviewStatus === 'PENDING_REVIEW') {
                    pendingCount++
                }
            }
        })

        const count = liveCount + pendingCount

        return {
            count,
            liveCount,
            pendingCount,
            total: scopeKeys.length,
            percentage: count === scopeKeys.length ? 100 : Math.floor((count / scopeKeys.length) * 100)
        }
    }

    const openTranslationMode = (lang: Language) => {
        if (!lang || !lang.code) return

        targetLanguage.value = lang
        
        const firstUntranslated = currentScopeKeys.value.find(k => {
            const t = translations.value[k.id]?.[lang.code]
            if (!t) return true
            const hasLive = t.text && t.text.trim() !== ''
            const hasPending = t.draftValue && t.reviewStatus === 'PENDING_REVIEW'
            return !hasLive && !hasPending
        })

        if (firstUntranslated) {
            activeKeyId.value = firstUntranslated.id
        } else if (currentScopeKeys.value.length > 0) {
            activeKeyId.value = currentScopeKeys.value[0]?.id ?? null
        } else {
            activeKeyId.value = null
        }
        isModalOpen.value = true
    }

    const saveTranslation = async (keyId: number, langId: number, langCode: string, text: string, isGenerated: boolean, timeSpentMs: number = 0) => {
        if (!projectId.value) return

        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}/translations`, {
                method: 'POST',
                body: { languageId: langId, value: text, timeSpentMs, isAutomated: isGenerated }
            })

            if (!translations.value[keyId]) {
                translations.value[keyId] = {}
            }
            translations.value[keyId][langCode] = {text, isGenerated}
            toast.add({ title: 'Success', description: 'Translation saved successfully.', color: 'success' })
        } catch (e) {
            toast.add({ title: 'Error', description: 'Failed to save translation.', color: 'error' })
            console.error("Failed to save translation", e)
        }
    }

    const autoTranslate = async (keyId: number, targetLanguageIds: number[], provider: 'deepl' | 'google' = 'google') => {
        if (!projectId.value) return

        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}/auto-translate`, {
                method: 'POST',
                body: { targetLanguageIds, provider }
            })
            await init()
            toast.add({ title: 'Success', description: 'Auto-translate successful.', color: 'success' })
        } catch (e: unknown) {
            const err = e as { data?: { message?: string } }
            if (err?.data?.message === 'DeepL API Key is invalid or unauthorized.') {
                toast.add({ title: 'Error', description: `Invalid DeepL API Key - Please check your DeepL configuration.`, color: 'error' })
            } else if (err?.data?.message === 'Translation quota exceeded') {
                toast.add({ title: 'Error', description: 'Translation quota exceeded', color: 'error' })
            } else if (err?.data?.message === 'Translation suggestions are disabled for this user') {
                toast.add({ title: 'Error', description: 'Translations are disabled', color: 'error' })
                const { user } = useAuth()
                if (user.value) user.value.allowSuggestions = false
            } else {
                toast.add({ title: 'Error', description: 'Auto-translate failed.', color: 'error' })
                console.error("Failed to auto translate", e)
            }
        }
    }

    const suggestTranslation = async (keyId: number, targetLanguageId: number, provider: 'deepl' | 'google' = 'google', silentQuotaAlert = false) => {
        if (!projectId.value) return null

        try {
            const res = await fetchApi(`/localization/keys/${projectId.value}/${keyId}/suggest`, {
                method: 'POST',
                body: { targetLanguageId, provider }
            })
            return res as { suggestion: string, quotaRemaining: number }
        } catch (e: unknown) {
            const err = e as { data?: { message?: string } }
            if (err?.data?.message === 'Translation quota exceeded') {
                if (!silentQuotaAlert) {
                    toast.add({ title: 'Error', description: 'Translation quota exceeded', color: 'error' })
                }
                return { error: 'quota_exceeded' } as any
            } else if (err?.data?.message === 'Translation suggestions are disabled for this user') {
                toast.add({ title: 'Error', description: 'Suggestions are disabled', color: 'error' })
                const { user } = useAuth()
                if (user.value) user.value.allowSuggestions = false
            } else if (err?.data?.message === 'DeepL API Key is invalid or unauthorized.') {
                toast.add({ title: 'Error', description: `Invalid DeepL API Key - Please check your DeepL configuration.`, color: 'error' })
            } else {
                console.error("Failed to fetch suggestion", e)
            }
            return null
        }
    }

    const addKey = async (keyName: string, labelIds?: number[]) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}`, { method: 'POST', body: { key: keyName, labelIds } })
            toast.add({ title: 'Success', description: 'Key added successfully', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to add key', color: 'error' })
        }
    }

    const updateKey = async (keyId: number, keyName: string, forceReview: boolean = false) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}`, { method: 'PATCH', body: { key: keyName, forceReview } })
            toast.add({ title: 'Success', description: forceReview ? 'Key update sent for review' : 'Key updated successfully', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to update key', color: 'error' })
        }
    }

    const bulkUpdateKeys = async (updates: { id: number, key: string }[], forceReview: boolean = false) => {
        if (!projectId.value || !updates.length) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/bulk`, { method: 'PATCH', body: { updates, forceReview } })
            toast.add({ title: 'Success', description: forceReview ? `Sent ${updates.length} key updates for review` : `Successfully updated ${updates.length} keys`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to bulk update keys', color: 'error' })
        }
    }

    const deleteKey = async (keyId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}`, { method: 'DELETE' })
            toast.add({ title: 'Success', description: 'Key deleted', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to delete key', color: 'error' })
        }
    }

    const bulkDeleteKeys = async (keyIds: number[]) => {
        if (!projectId.value || !keyIds.length) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/bulk-delete`, { method: 'POST', body: { keyIds } })
            toast.add({ title: 'Success', description: `${keyIds.length} key(s) deleted`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to delete keys', color: 'error' })
        }
    }

    const addLabelToKey = async (keyId: number, labelId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}/labels`, { method: 'POST', body: { labelId } })
            toast.add({ title: 'Success', description: 'Label added to key', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to add label to key', color: 'error' })
        }
    }

    const bulkAddLabelToKeys = async (keyIds: number[], labelId: number) => {
        if (!projectId.value || !keyIds.length) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/bulk-labels-add`, { method: 'POST', body: { keyIds, labelId } })
            toast.add({ title: 'Success', description: `Label added to ${keyIds.length} key(s)`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to add label to keys', color: 'error' })
        }
    }

    const removeLabelFromKey = async (keyId: number, labelId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/${keyId}/labels/${labelId}`, { method: 'DELETE' })
            toast.add({ title: 'Success', description: 'Label removed from key', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to remove label from key', color: 'error' })
        }
    }

    const bulkRemoveLabelFromKeys = async (keyIds: number[], labelId: number) => {
        if (!projectId.value || !keyIds.length) return
        try {
            await fetchApi(`/localization/keys/${projectId.value}/bulk-labels-remove`, { method: 'POST', body: { keyIds, labelId } })
            toast.add({ title: 'Success', description: `Label removed from ${keyIds.length} key(s)`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to remove label from keys', color: 'error' })
        }
    }

    const addLabel = async (name: string, color: string) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/labels/${projectId.value}`, { method: 'POST', body: { name, color } })
            toast.add({ title: 'Success', description: 'Label created successfully', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to create label', color: 'error' })
        }
    }

    const updateLabel = async (labelId: number, name: string, color: string) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/labels/${projectId.value}/${labelId}`, { method: 'PATCH', body: { name, color } })
            toast.add({ title: 'Success', description: 'Label updated', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to update label', color: 'error' })
        }
    }

    const deleteLabel = async (labelId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/labels/${projectId.value}/${labelId}`, { method: 'DELETE' })
            toast.add({ title: 'Success', description: 'Label deleted', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to delete label', color: 'error' })
        }
    }

    const bulkDeleteLabels = async (labelIds: number[]) => {
        if (!projectId.value || !labelIds.length) return
        try {
            await fetchApi(`/localization/labels/${projectId.value}/bulk-delete`, { method: 'POST', body: { ids: labelIds } })
            toast.add({ title: 'Success', description: `${labelIds.length} label(s) deleted`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to delete labels', color: 'error' })
        }
    }

    const addProjectLanguage = async (code: string, name: string, flag?: string) => {
        if (!projectId.value) return
        try {
            let lang;
            try {
               const l = await fetchApi(`/localization/languages`, { method: 'POST', body: { code, name, flag } })
               lang = l
            } catch {
               const langs = await fetchApi(`/localization/languages`) as { id: number; code: string; name: string; flag?: string }[];
               lang = langs.find((l) => l.code === code)
            }
            if (lang) {
                await fetchApi(`/localization/projects/${projectId.value}/languages`, { method: 'POST', body: { languageId: lang.id } })
            }
            toast.add({ title: 'Success', description: 'Language added successfully', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to add language', color: 'error' })
        }
    }

    const removeProjectLanguage = async (languageId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/projects/${projectId.value}/languages/${languageId}`, { method: 'DELETE' })
            toast.add({ title: 'Success', description: 'Language removed successfully', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to remove language', color: 'error' })
        }
    }

    const bulkRemoveProjectLanguages = async (languageIds: number[]) => {
        if (!projectId.value || !languageIds.length) return
        try {
            await fetchApi(`/localization/projects/${projectId.value}/languages/bulk-delete`, { method: 'POST', body: { languageIds } })
            toast.add({ title: 'Success', description: `${languageIds.length} language(s) removed successfully`, color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to remove languages', color: 'error' })
        }
    }

    const setReferenceLanguage = async (languageId: number) => {
        if (!projectId.value) return
        try {
            await fetchApi(`/localization/projects/${projectId.value}/source-language`, { method: 'PUT', body: { languageId } })
            toast.add({ title: 'Success', description: 'Reference language updated', color: 'success' })
            await init()
        } catch {
            toast.add({ title: 'Error', description: 'Failed to update reference language', color: 'error' })
        }
    }

    return {
        init,
        isLoading,
        languages,
        keys,
        labels,
        translations,
        sourceLanguage,
        selectedScope,
        expandedScopes,
        visibleScopes,
        currentScopeKeys,
        getLanguageProgress,
        isModalOpen,
        targetLanguage,
        activeKeyId,
        toggleScope,
        openTranslationMode,
        saveTranslation,
        autoTranslate,
        suggestTranslation,
        addKey,
        updateKey,
        bulkUpdateKeys,
        deleteKey,
        bulkDeleteKeys,
        addLabelToKey,
        bulkAddLabelToKeys,
        removeLabelFromKey,
        bulkRemoveLabelFromKeys,
        addLabel,
        updateLabel,
        deleteLabel,
        bulkDeleteLabels,
        addProjectLanguage,
        removeProjectLanguage,
        bulkRemoveProjectLanguages,
        setReferenceLanguage
    }
}
