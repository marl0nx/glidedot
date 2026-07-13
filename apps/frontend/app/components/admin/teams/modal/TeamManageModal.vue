<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Team, User, Project } from '~/types'
import UnsavedChangesAlert from '~/components/UnsavedChangesAlert.vue'

const props = defineProps<{
  modelValue: boolean
  team: Team | null
  users: User[]
  projects: Project[]
  isOidcEnabled: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: { name: string, mappedGroups: string[] }): void
  (e: 'add-member' | 'remove-member' | 'add-project' | 'remove-project', id: number): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localName = ref('')
const mappedGroups = ref<string[]>([])
const mappedGroupInput = ref('')
const selectedUserToAdd = ref<number | undefined>(undefined)
const selectedProjectToAdd = ref<number | undefined>(undefined)

watch(() => props.team, (newTeam) => {
  if (newTeam) {
    localName.value = newTeam.name || ''
    try {
      mappedGroups.value = newTeam.oidcMappedGroups ? JSON.parse(newTeam.oidcMappedGroups) : []
    } catch {
      mappedGroups.value = []
    }
  }
}, { immediate: true })

const originalName = computed(() => props.team?.name || '')
const originalMappedGroups = computed(() => {
  try {
    return props.team?.oidcMappedGroups ? JSON.parse(props.team.oidcMappedGroups) : []
  } catch {
    return []
  }
})

const hasUnsavedChanges = computed(() => {
  if (localName.value !== originalName.value) return true
  
  if (mappedGroups.value.length !== originalMappedGroups.value.length) return true
  // simple array equality since order doesn't strictly matter if we just check items, but order might be preserved
  for (let i = 0; i < mappedGroups.value.length; i++) {
    if (mappedGroups.value[i] !== originalMappedGroups.value[i]) return true
  }
  return false
})

const discard = () => {
  localName.value = originalName.value
  mappedGroups.value = [...originalMappedGroups.value]
}

const handleSave = () => {
  emit('save', { name: localName.value, mappedGroups: mappedGroups.value })
}

const handleAddMember = () => {
  if (selectedUserToAdd.value) {
    emit('add-member', selectedUserToAdd.value)
    selectedUserToAdd.value = undefined
  }
}

const handleAddProject = () => {
  if (selectedProjectToAdd.value) {
    emit('add-project', selectedProjectToAdd.value)
    selectedProjectToAdd.value = undefined
  }
}

const addMappedGroup = () => {
  const groups = mappedGroupInput.value.split(',').map(g => g.trim()).filter(Boolean)
  for (const g of groups) {
    if (!mappedGroups.value.includes(g)) {
      mappedGroups.value.push(g)
    }
  }
  mappedGroupInput.value = ''
}

const removeMappedGroup = (group: string) => {
  mappedGroups.value = mappedGroups.value.filter(g => g !== group)
}

</script>

<template>
  <u-modal v-model:open="isOpen" :dismissible="!hasUnsavedChanges" :title="`Manage Team (ID: ${team?.id})`" :ui="{ content: 'sm:max-w-2xl' }">
    <template v-if="team" #body>
      <div class="p-4 space-y-8">
        <!-- Team Name -->
        <div class="space-y-4">
          <h3 class="font-semibold text-neutral-200">Team Name</h3>
          <u-input v-model="localName" placeholder="e.g. Frontend Team" class="w-full" @keyup.enter="handleSave" />
        </div>

        <!-- OIDC Mapping -->
        <div class="space-y-4" :class="{'opacity-50 pointer-events-none': !isOidcEnabled}">
          <h3 class="font-semibold text-neutral-200">
            OIDC Mapped Groups
            <u-badge v-if="!isOidcEnabled" color="warning" variant="subtle" size="xs" class="ml-2">OIDC Not Configured</u-badge>
          </h3>
          <p class="text-sm text-neutral-400">Users in these OIDC groups will automatically be added to this team. You can still paste comma-separated groups to add multiple.</p>
          
          <div v-if="mappedGroups.length > 0" class="flex flex-wrap gap-2">
            <u-badge v-for="group in mappedGroups" :key="group" color="neutral" variant="subtle" class="flex items-center gap-1 pl-2 pr-1 py-1 text-sm">
              {{ group }}
              <u-button icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :padded="false" class="ml-1" @click="removeMappedGroup(group)" />
            </u-badge>
          </div>

          <div class="flex gap-2">
            <u-input v-model="mappedGroupInput" placeholder="Add group (e.g. developer_backend)" class="flex-1" @keydown.enter.prevent="addMappedGroup" />
            <u-button icon="i-lucide-plus" label="Add" color="neutral" variant="subtle" :disabled="!mappedGroupInput.trim()" @click="addMappedGroup" />
          </div>
        </div>

        <!-- Members -->
        <div class="space-y-4">
          <h3 class="font-semibold text-neutral-200">Team Members</h3>
          <div class="bg-neutral-900 border border-neutral-800 rounded-lg divide-y divide-neutral-800">
            <div v-for="member in team.members" :key="member.userId" class="flex justify-between items-center p-3">
              <div class="flex items-center gap-3">
                <u-avatar
                  :src="users?.find(u => u.id === member.userId)?.avatarUrl || undefined"
                  :icon="!(users?.find(u => u.id === member.userId)?.avatarUrl) ? 'i-lucide-user' : undefined"
                  class="rounded-full"
                  size="sm"
                />
                <span class="text-sm font-medium">{{ member.username }}</span>
                <u-badge v-if="users?.find(u => u.id === member.userId)?.isOidc" color="neutral" variant="solid" size="xs">Managed by OIDC</u-badge>
              </div>
              <u-button 
                v-if="!users?.find(u => u.id === member.userId)?.isOidc"
                icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" 
                @click="emit('remove-member', member.userId)" 
              />
            </div>
            <div v-if="!team?.members?.length" class="p-4 text-center text-sm text-neutral-500 italic">
              No members assigned
            </div>
          </div>
          
          <div class="flex gap-2">
            <u-select
              v-model="selectedUserToAdd"
              :items="users?.filter(u => !team?.members?.some((m: { userId: number }) => m.userId === u.id)).map(u => ({ label: u.username + (u.isOidc ? ' (Managed by OIDC)' : ''), value: u.id, disabled: u.isOidc })) || []"
              placeholder="Select user to add"
              class="flex-1"
            />
            <u-button icon="i-lucide-plus" label="Add Member" color="neutral" variant="subtle" :disabled="!selectedUserToAdd" @click="handleAddMember"/>
          </div>
        </div>

        <!-- Projects -->
        <div class="space-y-4">
          <h3 class="font-semibold text-neutral-200">Linked Projects</h3>
          <div class="bg-neutral-900 border border-neutral-800 rounded-lg divide-y divide-neutral-800">
            <div v-for="projectId in team?.projects" :key="projectId" class="flex justify-between items-center p-3">
              <div class="flex items-center gap-3">
                <u-icon name="i-lucide-folder" class="w-4 h-4 text-neutral-400" />
                <span class="text-sm font-medium">{{ projects?.find(p => p.id === String(projectId))?.name || `Project #${projectId}` }}</span>
              </div>
              <u-button icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="emit('remove-project', projectId)" />
            </div>
            <div v-if="!team?.projects?.length" class="p-4 text-center text-sm text-neutral-500 italic">
              No linked projects
            </div>
          </div>

          <div class="flex gap-2">
            <u-select
              v-model="selectedProjectToAdd"
              :items="projects?.filter(p => !team?.projects?.includes(Number(p.id))).map(p => ({ label: p.name, value: Number(p.id) })) || []"
              placeholder="Select project to link"
              class="flex-1"
            />
            <u-button icon="i-lucide-plus" label="Link Project" color="neutral" variant="subtle" :disabled="!selectedProjectToAdd" @click="handleAddProject"/>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="() => { isOpen = false }" />
      </div>

      <unsaved-changes-alert 
        :has-unsaved-changes="hasUnsavedChanges" 
        :loading="loading" 
        @save="handleSave" 
        @discard="discard" 
      />
    </template>
  </u-modal>
</template>
