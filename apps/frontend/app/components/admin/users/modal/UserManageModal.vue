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
  (e: 'save'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const originalUser = ref('')
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    originalUser.value = JSON.stringify(props.user)
  }
})

const hasUnsavedChanges = computed(() => {
  if (props.mode === 'create') return false
  return JSON.stringify(props.user) !== originalUser.value
})
</script>

<template>
  <u-modal v-model:open="isOpen" :title="mode === 'create' ? 'Create User' : `Edit User (ID: ${user.id})`">
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <u-alert
          v-if="user.isOidc"
          title="Managed by OIDC"
          description="Username, Email, Password and Avatar are managed by the OIDC provider."
          color="primary"
          variant="soft"
          class="mb-2"
        />

        <u-form-field label="Username" required>
          <u-input v-model="user.username" :disabled="user.isOidc" placeholder="johndoe" class="w-full" autofocus />
        </u-form-field>

        <u-form-field label="Email" required>
          <u-input v-model="user.email" type="email" :disabled="user.isOidc" placeholder="john@example.com" class="w-full" />
        </u-form-field>

        <u-form-field :label="mode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'" :required="mode === 'create'">
          <u-input v-model="user.password" type="password" placeholder="••••••••" class="w-full" :disabled="user.isOidc" />
        </u-form-field>

        <u-form-field label="Avatar URL">
          <u-input v-model="user.avatarUrl" :disabled="user.isOidc" placeholder="https://example.com/avatar.png" class="w-full" />
        </u-form-field>

        <u-form-field label="Administrator">
          <div class="flex items-center gap-2 mt-2">
            <u-switch v-model="user.isAdmin" />
            <span class="text-sm text-neutral-400">Grant admin privileges</span>
          </div>
        </u-form-field>

        <u-form-field label="Reviewer">
          <div class="flex items-center gap-2 mt-2">
            <u-switch v-model="user.isReviewer" />
            <span class="text-sm text-neutral-400">Can approve pending translations</span>
          </div>
        </u-form-field>

        <u-form-field label="Requires Review">
          <div class="flex items-center gap-2 mt-2">
            <u-switch v-model="user.requiresReview" />
            <span class="text-sm text-neutral-400">Translations from this user must be reviewed</span>
          </div>
        </u-form-field>

        <u-form-field label="Translation Suggestions">
          <div class="flex items-center gap-2 mt-2">
            <u-switch v-model="user.allowSuggestions" />
            <span class="text-sm text-neutral-400">Allow user to use AI translation suggestions</span>
          </div>
        </u-form-field>

        <u-form-field v-if="user.allowSuggestions" label="Current Remaining Quota">
          <u-input v-model.number="user.translationQuota" type="number" class="w-full" />
          <span class="text-xs text-neutral-500 mt-1 block">The exact number of suggestions left before the next reset.</span>
        </u-form-field>

        <u-form-field v-if="user.allowSuggestions" label="Auto-Reset Quota">
          <div class="flex items-center gap-2 mt-2">
            <u-input v-model.number="user.baseTranslationQuota" type="number" placeholder="Base Quota" class="w-32" />
            <span class="text-neutral-500 text-sm">every</span>
            <u-input v-model.number="user.quotaResetPeriodValue" type="number" placeholder="e.g. 1" class="w-24" />
            <u-select
              v-model="user.quotaResetPeriodUnit"
              :items="[{label: 'Days', value: 'days'}, {label: 'Weeks', value: 'weeks'}, {label: 'Months', value: 'months'}]"
              placeholder="Unit"
              class="w-32"
            />
          </div>
          <span class="text-xs text-neutral-500 mt-1 block">
            Automatically resets current quota to the base quota after this period (leave empty to disable).
            <span v-if="user.quotaNextResetAt" class="text-primary font-medium">Next reset: {{ new Date(user.quotaNextResetAt).toLocaleString() }}</span>
          </span>
        </u-form-field>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="isOpen = false" />
        <u-button :label="mode === 'create' ? 'Create' : 'Save Changes'" color="neutral" @click="emit('save')" />
      </div>

      <unsaved-changes-alert 
        :has-unsaved-changes="hasUnsavedChanges" 
        :hide-buttons="true"
      />
    </template>
  </u-modal>
</template>
