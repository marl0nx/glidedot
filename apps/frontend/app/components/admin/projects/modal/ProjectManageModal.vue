<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Project } from '~/types'
import UnsavedChangesAlert from '~/components/UnsavedChangesAlert.vue'
import ProjectGitSyncConfig from './ProjectGitSyncConfig.vue'
import ProjectTraduoraSyncConfig from './ProjectTraduoraSyncConfig.vue'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  project: Partial<Project>
  languages: { id: number; code: string; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const originalProject = ref('')
const traduoraConfigRef = ref<any>(null)
const isTraduoraDirty = ref(false)

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    originalProject.value = JSON.stringify(props.project)
  }
})

const onTraduoraDirty = (val: boolean) => {
  isTraduoraDirty.value = val
}

const hasUnsavedChanges = computed(() => {
  if (props.mode === 'create') return false
  return (JSON.stringify(props.project) !== originalProject.value) || isTraduoraDirty.value
})

const inContextUrlProxy = computed({
  get: () => props.project.inContextUrl || '',
  set: (val) => {
    props.project.inContextUrl = val || undefined
  }
})

const discard = () => {
  if (originalProject.value) {
    const orig = JSON.parse(originalProject.value)
    Object.assign(props.project, orig)
  }
  if (traduoraConfigRef.value) {
    traduoraConfigRef.value.reset()
  }
}

const isSaving = ref(false)

const handleSave = async () => {
  isSaving.value = true
  try {
    if (isTraduoraDirty.value && traduoraConfigRef.value) {
      const success = await traduoraConfigRef.value.saveConfig()
      if (!success) {
        // Stop the save event and keep the modal open to correct validation issues
        return
      }
    }
    emit('save')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <u-modal v-model:open="isOpen" :dismissible="!hasUnsavedChanges" :title="mode === 'create' ? 'Create Project' : 'Edit Project'">
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <u-form-field label="Project Name" required>
          <u-input v-model="project.name" placeholder="e.g. Mobile App" class="w-full" autofocus @keyup.enter="handleSave" />
        </u-form-field>



        <u-form-field v-if="mode === 'edit'" label="In-Context Preview URL" description="URL where your app is running to enable live visual editing.">
          <u-input v-model="inContextUrlProxy" placeholder="https://staging.myapp.com" class="w-full" @keyup.enter="handleSave" />
          <div v-if="project.inContextUrl" class="mt-2 p-3 bg-amber-500/10 border border-warning-500/25 rounded-lg text-xs text-neutral-300 space-y-1">
            <p class="font-semibold text-warning-500 flex items-center gap-1.5">
              <u-icon name="i-lucide-alert-triangle" class="w-4 h-4" />
              In-Context Setup Notice
            </p>
            <p>
              Ensure your development or staging environment renders <strong>raw translation keys with dots</strong> (e.g., <code>homepage.hero.title</code>) instead of actual translated values. glide. will automatically scan the page, detect these keys, and replace them with interactive translations.
            </p>
          </div>
        </u-form-field>

        <div v-if="mode === 'edit'" class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Project-Wide Review Mode</span>
            <span class="text-xs text-neutral-400">Require approval for all translation changes in this project.</span>
          </div>
          <u-switch v-model="project.reviewEnabled" />
        </div>

        <div v-if="mode === 'edit'" class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Require Templates for Keys</span>
            <span class="text-xs text-neutral-400">Disable freeform keys. New keys must use a predefined schema template.</span>
          </div>
          <u-switch v-model="project.requireTemplate" />
        </div>

        <div v-if="mode === 'edit' && project.id" class="mt-4 pt-4 border-t border-neutral-800 space-y-6">
          <ProjectGitSyncConfig :project-id="Number(project.id)" />
          <div class="border-t border-neutral-800 pt-4">
            <ProjectTraduoraSyncConfig ref="traduoraConfigRef" :project-id="Number(project.id)" @dirty="onTraduoraDirty" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="isOpen = false" />
        <u-button v-if="mode === 'create'" label="Create Project" color="neutral" :disabled="!project.name?.trim()" @click="handleSave" />
      </div>

      <unsaved-changes-alert 
        :has-unsaved-changes="hasUnsavedChanges" 
        :loading="isSaving"
        @save="handleSave"
        @discard="discard"
      />
    </template>
  </u-modal>
</template>
