<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AppUser } from '~/composables/useUsers'
import UnsavedChangesAlert from '~/components/UnsavedChangesAlert.vue'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  user: Partial<AppUser>
  isOidcEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', user: Partial<AppUser>): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localUser = ref<Partial<AppUser>>({ ...props.user })
const originalUser = ref('')
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localUser.value = { ...props.user }
    originalUser.value = JSON.stringify(localUser.value)
  }
})

const hasUnsavedChanges = computed(() => {
  if (props.mode === 'create') return false
  return JSON.stringify(localUser.value) !== originalUser.value
})

const quotaResetPeriodValueProxy = computed({
  get: () => localUser.value.quotaResetPeriodValue ?? undefined,
  set: (val) => {
    localUser.value.quotaResetPeriodValue = val ?? null
  }
})

const quotaResetPeriodUnitProxy = computed({
  get: () => localUser.value.quotaResetPeriodUnit ?? undefined,
  set: (val) => {
    localUser.value.quotaResetPeriodUnit = val ?? null
  }
})

const discard = () => {
  if (originalUser.value) {
    localUser.value = JSON.parse(originalUser.value)
  }
}
</script>

<template>
  <u-modal v-model:open="isOpen" :dismissible="!hasUnsavedChanges" :title="mode === 'create' ? 'Create User' : `Edit User (ID: ${localUser.id})`">
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <u-form-field label="Username" required>
          <u-input v-model="localUser.username" placeholder="e.g. johndoe" class="w-full" autofocus :disabled="isOidcEnabled && localUser.isOidc" />
        </u-form-field>

        <u-form-field label="Email" required>
          <u-input v-model="localUser.email" type="email" placeholder="e.g. john@example.com" class="w-full" :disabled="isOidcEnabled && localUser.isOidc" />
        </u-form-field>

        <u-form-field v-if="mode === 'create'" label="Password" required>
          <u-input v-model="localUser.password" type="password" class="w-full" />
        </u-form-field>

        <div class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Administrator</span>
            <span class="text-xs text-neutral-400">Grant full access to all projects, teams, settings and users.</span>
          </div>
          <u-switch v-model="localUser.isAdmin" />
        </div>

        <div class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Reviewer Status</span>
            <span class="text-xs text-neutral-400">Can approve, reject, or mark translation reviews.</span>
          </div>
          <u-switch v-model="localUser.isReviewer" />
        </div>

        <div class="flex items-center justify-between p-4 rounded-lg ring-1 ring-default bg-neutral-800/50 mt-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Requires Review</span>
            <span class="text-xs text-neutral-400">This user's translations must always be approved by a reviewer.</span>
          </div>
          <u-switch v-model="localUser.requiresReview" />
        </div>

        <u-form-field label="Suggestions (AI)">
          <div class="flex items-center gap-4 mt-2">
            <u-switch v-model="localUser.allowSuggestions" />
            <span class="text-sm text-neutral-400">Allow user to use AI translation suggestions</span>
          </div>
        </u-form-field>

        <u-form-field v-if="localUser.allowSuggestions" label="Current Remaining Quota">
          <u-input v-model.number="localUser.translationQuota" type="number" class="w-full" />
          <span class="text-xs text-neutral-500 mt-1 block">The exact number of suggestions left before the next reset.</span>
        </u-form-field>

        <u-form-field v-if="localUser.allowSuggestions" label="Auto-Reset Quota">
          <div class="flex items-center gap-2 mt-2">
            <u-input v-model.number="localUser.baseTranslationQuota" type="number" placeholder="Base Quota" class="w-32" />
            <span class="text-neutral-500 text-sm">every</span>
            <u-input v-model.number="quotaResetPeriodValueProxy" type="number" placeholder="e.g. 1" class="w-24" />
            <u-select
              v-model="quotaResetPeriodUnitProxy"
              :items="[{label: 'Days', value: 'days'}, {label: 'Weeks', value: 'weeks'}, {label: 'Months', value: 'months'}]"
              placeholder="Unit"
              class="w-32"
            />
          </div>
          <span class="text-xs text-neutral-500 mt-1 block">
            Automatically resets current quota to the base quota after this period (leave empty to disable).
            <span v-if="localUser.quotaNextResetAt" class="text-primary font-medium">Next reset: {{ new Date(localUser.quotaNextResetAt).toLocaleString() }}</span>
          </span>
        </u-form-field>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
        <u-button v-if="mode === 'create'" label="Create" color="neutral" @click="emit('save', localUser)" />
      </div>

      <unsaved-changes-alert
        :has-unsaved-changes="hasUnsavedChanges"
        @save="emit('save', localUser)"
        @discard="discard"
      />
    </template>
  </u-modal>
</template>
