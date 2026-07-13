<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  isRestoring: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', options: { projects: boolean, conventions: boolean }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const restoreProjects = ref(true)
const restoreConventions = ref(true)

const canConfirm = computed(() => restoreProjects.value || restoreConventions.value)
</script>

<template>
  <u-modal v-model:open="isOpen" title="Restore System Backup">
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <u-alert 
          title="Important" 
          description="It may take a few minutes until all changes are fully loaded and applied. Please do not close the page during this process." 
          color="warning" 
          variant="subtle" 
          icon="i-lucide-clock" 
        />
        <p class="text-sm text-neutral-400">
          Are you sure you want to restore the system backup? This will replace your current data with the contents of the uploaded backup file. This action cannot be undone.
        </p>

        <div class="flex flex-col gap-2 p-4 rounded-xl border border-neutral-800 bg-neutral-900/30">
          <h3 class="font-medium text-sm">What to restore?</h3>
          <p class="text-xs text-neutral-400 mb-2">Select which components of the backup should be restored.</p>
          
          <u-form-field>
            <div class="flex items-center gap-2">
              <u-switch v-model="restoreProjects" />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-neutral-200">Projects & Translations</span>
                <span class="text-xs text-neutral-400">Languages, Keys, Labels, and translation values.</span>
              </div>
            </div>
          </u-form-field>

          <u-form-field class="mt-2">
            <div class="flex items-center gap-2">
              <u-switch v-model="restoreConventions" />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-neutral-200">Formatting Conventions</span>
                <span class="text-xs text-neutral-400">Glossary terms, Key Templates, and Variables.</span>
              </div>
            </div>
          </u-form-field>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
        <u-button label="Yes, Select Backup File" color="error" :disabled="!canConfirm" :loading="isRestoring" @click="emit('confirm', { projects: restoreProjects, conventions: restoreConventions })" />
      </div>
    </template>
  </u-modal>
</template>
