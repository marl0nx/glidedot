<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useConventions } from '~/composables/localization/useConventions'
import GlossarySettings from '~/components/localization/conventions/GlossarySettings.vue'
import KeyTemplatesSettings from '~/components/localization/conventions/KeyTemplatesSettings.vue'
import type { KeyTemplateSegment } from '~/types'

const route = useRoute()
const projectId = parseInt(route.params.id as string)

const {
  templates,
  glossary,
  isLoading,
  loadConventions,
  addGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  variables,
  addVariable,
  updateVariable,
  deleteVariable
} = useConventions()

const items = [{
  label: 'Key Templates',
  icon: 'i-lucide-braces',
  slot: 'templates'
}, {
  label: 'Global Variables',
  icon: 'i-lucide-variable',
  slot: 'variables'
}, {
  label: 'Glossary Linter',
  icon: 'i-lucide-book-a',
  slot: 'glossary'
}]


onMounted(() => {
  if (projectId) {
    loadConventions(projectId)
  }
})

const handleAddGlossary = async (badWord: string, goodWord: string) => {
  await addGlossaryTerm(projectId, badWord, goodWord)
}

const handleUpdateGlossary = async (id: number, badWord: string, goodWord: string) => {
  await updateGlossaryTerm(projectId, id, badWord, goodWord)
}

const handleDeleteGlossary = async (id: number) => {
  await deleteGlossaryTerm(projectId, id)
}

const handleAddVariable = async (name: string, options: string) => {
  await addVariable(projectId, name, options)
}

const handleUpdateVariable = async (id: number, name: string, options: string) => {
  await updateVariable(projectId, id, name, options)
}

const handleDeleteVariable = async (id: number) => {
  await deleteVariable(projectId, id)
}

const handleAddTemplate = async (name: string, segments: KeyTemplateSegment[]) => {
  await addTemplate(projectId, name, segments)
}

const handleUpdateTemplate = async (id: number, name: string, segments: KeyTemplateSegment[]) => {
  await updateTemplate(projectId, id, name, segments)
}

const handleDeleteTemplate = async (id: number) => {
  await deleteTemplate(projectId, id)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-book-open" class="w-5 h-5 text-primary-500" />
            Conventions
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Enforce naming rules and terminology across your translation keys.</p>
      </div>
    </div>
    
    <u-tabs 
      :items="items" 
      class="mt-4 w-full"
      :ui="{ list: 'bg-neutral-900 border border-neutral-800 w-full h-10', trigger: 'h-8 text-sm' }"
    >
      <template #templates="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-braces" class="w-5 h-5 text-primary-500" />
                Key Templates
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Define structural templates to enforce consistent key naming conventions.</p>
            </div>
          </div>
          <key-templates-settings 
            :templates="templates"
            :variables="variables"
            :is-loading="isLoading"
            @add="handleAddTemplate"
            @update="handleUpdateTemplate"
            @delete="handleDeleteTemplate"
          />
        </div>
      </template>
      <template #variables="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-variable" class="w-5 h-5 text-primary-500" />
                Variables
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Manage shared variables that can be used inside your key templates.</p>
            </div>
          </div>
          <variables-settings 
            :variables="variables"
            :is-loading="isLoading"
            @add="handleAddVariable"
            @update="handleUpdateVariable"
            @delete="handleDeleteVariable"
          />
        </div>
      </template>
      <template #glossary="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-book-a" class="w-5 h-5 text-primary-500" />
                Glossary
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Establish terminology rules to maintain consistent naming across keys.</p>
            </div>
          </div>
          <glossary-settings 
            :glossary="glossary"
            :is-loading="isLoading"
            @add="handleAddGlossary"
            @update="handleUpdateGlossary"
            @delete="handleDeleteGlossary"
          />
        </div>
      </template>
    </u-tabs>
  </div>
</template>
