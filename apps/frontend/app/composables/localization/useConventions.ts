import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { useToast } from '#imports'
import type { KeyTemplate, KeyGlossaryTerm, KeyVariable } from '~/types'

export const useConventions = () => {
  const { fetchApi } = useApi()
  const toast = useToast()

  const templates = ref<KeyTemplate[]>([])
  const glossary = ref<KeyGlossaryTerm[]>([])
  const variables = ref<KeyVariable[]>([])
  const isLoading = ref(false)

  const loadConventions = async (projectId: number) => {
    isLoading.value = true
    try {
      const [tpls, glos, vars] = await Promise.all([
        fetchApi(`/localization/projects/${projectId}/templates`),
        fetchApi(`/localization/projects/${projectId}/glossary`),
        fetchApi(`/localization/projects/${projectId}/variables`)
      ])
      templates.value = tpls as KeyTemplate[]
      glossary.value = glos as KeyGlossaryTerm[]
      variables.value = vars as KeyVariable[]
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Error', description: 'Failed to load conventions', color: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  // --- Glossary Methods ---
  const addGlossaryTerm = async (projectId: number, badWord: string, goodWord: string) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/glossary`, {
        method: 'POST',
        body: { badWord, goodWord }
      })
      glossary.value.push(result[0])
      toast.add({ title: 'Success', description: 'Glossary term added', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to add glossary term', color: 'error' })
      return false
    }
  }

  const updateGlossaryTerm = async (projectId: number, glossaryId: number, badWord: string, goodWord: string) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/glossary/${glossaryId}`, {
        method: 'PATCH',
        body: { badWord, goodWord }
      })
      const idx = glossary.value.findIndex(g => g.id === glossaryId)
      if (idx !== -1) {
        glossary.value[idx] = result[0]
      }
      toast.add({ title: 'Success', description: 'Glossary term updated', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to update glossary term', color: 'error' })
      return false
    }
  }

  const deleteGlossaryTerm = async (projectId: number, glossaryId: number) => {
    try {
      await fetchApi(`/localization/projects/${projectId}/glossary/${glossaryId}`, {
        method: 'DELETE'
      })
      glossary.value = glossary.value.filter(g => g.id !== glossaryId)
      toast.add({ title: 'Success', description: 'Glossary term deleted', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to delete glossary term', color: 'error' })
    }
  }

  // --- Template Methods ---
  const addTemplate = async (projectId: number, name: string, segments: any[]) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/templates`, {
        method: 'POST',
        body: { name, segments: JSON.stringify(segments) }
      })
      templates.value.push(result[0])
      toast.add({ title: 'Success', description: 'Template added', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to add template', color: 'error' })
      return false
    }
  }

  const updateTemplate = async (projectId: number, templateId: number, name: string, segments: any[]) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/templates/${templateId}`, {
        method: 'PATCH',
        body: { name, segments: JSON.stringify(segments) }
      })
      const idx = templates.value.findIndex(t => t.id === templateId)
      if (idx !== -1) {
        templates.value[idx] = result[0]
      }
      toast.add({ title: 'Success', description: 'Template updated', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to update template', color: 'error' })
      return false
    }
  }

  const deleteTemplate = async (projectId: number, templateId: number) => {
    try {
      await fetchApi(`/localization/projects/${projectId}/templates/${templateId}`, {
        method: 'DELETE'
      })
      templates.value = templates.value.filter(t => t.id !== templateId)
      toast.add({ title: 'Success', description: 'Template deleted', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to delete template', color: 'error' })
    }
  }

  const addVariable = async (projectId: number, name: string, options: string) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/variables`, {
        method: 'POST',
        body: { name, options }
      })
      variables.value.push(result[0])
      toast.add({ title: 'Success', description: 'Variable created', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to create variable', color: 'error' })
      return false
    }
  }

  const updateVariable = async (projectId: number, variableId: number, name: string, options: string) => {
    try {
      const result = await fetchApi(`/localization/projects/${projectId}/variables/${variableId}`, {
        method: 'PATCH',
        body: { name, options }
      })
      const idx = variables.value.findIndex(v => v.id === variableId)
      if (idx !== -1) variables.value[idx] = result[0]
      toast.add({ title: 'Success', description: 'Variable updated', color: 'success' })
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to update variable', color: 'error' })
      return false
    }
  }

  const deleteVariable = async (projectId: number, variableId: number) => {
    try {
      await fetchApi(`/localization/projects/${projectId}/variables/${variableId}`, {
        method: 'DELETE'
      })
      variables.value = variables.value.filter(v => v.id !== variableId)
      toast.add({ title: 'Success', description: 'Variable deleted', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to delete variable', color: 'error' })
    }
  }

  const exportConventions = async (projectId: number) => {
    try {
      return await fetchApi(`/localization/projects/${projectId}/conventions/export`)
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to export conventions', color: 'error' })
      return null
    }
  }

  const importConventions = async (projectId: number, data: any) => {
    try {
      await fetchApi(`/localization/projects/${projectId}/conventions/import`, {
        method: 'POST',
        body: data
      })
      toast.add({ title: 'Success', description: 'Conventions imported successfully', color: 'success' })
      await loadConventions(projectId)
      return true
    } catch (e) {
      toast.add({ title: 'Error', description: 'Failed to import conventions', color: 'error' })
      return false
    }
  }

  return {
    templates,
    glossary,
    variables,
    isLoading,
    loadConventions,
    addGlossaryTerm,
    updateGlossaryTerm,
    deleteGlossaryTerm,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addVariable,
    updateVariable,
    deleteVariable,
    exportConventions,
    importConventions
  }
}
