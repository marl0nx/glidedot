<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import type { KeyTemplate, KeyTemplateSegment, KeyVariable } from '~/types'

const props = defineProps<{
  templates: KeyTemplate[]
  variables: KeyVariable[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'add', name: string, segments: KeyTemplateSegment[]): void
  (e: 'update', id: number, name: string, segments: KeyTemplateSegment[]): void
  (e: 'delete', id: number): void
}>()

const isModalOpen = ref(false)
const editingId = ref<number | null>(null)
const templateName = ref('')
const segments = ref<KeyTemplateSegment[]>([])
const allowInfinite = ref(false)

const search = ref('')
const pagination = ref({ pageIndex: 0, pageSize: 10 })

const isDeleteModalOpen = ref(false)
const templateToDelete = ref<number | null>(null)

const currentPagination = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (val) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: val - 1
    }
  }
})

const columns: TableColumn<KeyTemplate>[] = [
  { accessorKey: 'name', header: 'Template Name' },
  { accessorKey: 'preview', header: 'Schema Preview' },
  { id: 'actions', header: '' }
]

const segmentTypes = [
  { label: 'Free Text', value: 'free-text' },
  { label: 'Dropdown (Enum)', value: 'enum' },
  { label: 'Global Variable (Shared)', value: 'shared-enum' },
  { label: 'Constant', value: 'constant' }
]

const casingOptions = [
  { label: 'None (Any)', value: '' },
  { label: 'camelCase', value: 'camelCase' },
  { label: 'kebab-case', value: 'kebab-case' },
  { label: 'snake_case', value: 'snake_case' },
  { label: 'PascalCase', value: 'PascalCase' }
]

const openCreate = () => {
  editingId.value = null
  templateName.value = ''
  allowInfinite.value = false
  segments.value = [
    { type: 'free-text', name: '', delimiter: '.' }
  ]
  isModalOpen.value = true
}

const openEdit = (template: KeyTemplate) => {
  editingId.value = template.id
  templateName.value = template.name
  try {
    const parsed = JSON.parse(template.segments)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[parsed.length - 1].type === 'nested-path') {
      allowInfinite.value = true
      segments.value = parsed.slice(0, -1)
    } else {
      allowInfinite.value = false
      segments.value = parsed || []
    }
  } catch (e) {
    segments.value = []
    allowInfinite.value = false
  }
  isModalOpen.value = true
}

const addSegment = () => {
  segments.value.push({ type: 'free-text', name: 'New Segment', delimiter: '.' })
}

const removeSegment = (index: number) => {
  segments.value.splice(index, 1)
}

const moveSegment = (index: number, direction: -1 | 1) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= segments.value.length) return
  const temp = segments.value[index]
  const target = segments.value[newIndex]
  if (temp && target) {
    segments.value[index] = target
    segments.value[newIndex] = temp
    enforceOptionalRules()
  }
}

const enforceOptionalRules = () => {
  const firstOptIndex = segments.value.findIndex(s => s.isOptional)
  if (firstOptIndex !== -1) {
    for (let i = firstOptIndex + 1; i < segments.value.length; i++) {
      const s = segments.value[i]
      if (s) {
        s.isOptional = true
      }
    }
  }
}

const toggleOptional = (index: number, val: boolean) => {
  const current = segments.value[index]
  if (current) {
    current.isOptional = val
  }
  if (val) {
    // If making this optional, all subsequent must be optional
    for (let i = index + 1; i < segments.value.length; i++) {
      const s = segments.value[i]
      if (s) {
        s.isOptional = true
      }
    }
  } else {
    // If making this required, all preceding must be required
    for (let i = 0; i < index; i++) {
      const s = segments.value[i]
      if (s) {
        s.isOptional = false
      }
    }
  }
}

const saveTemplate = () => {
  if (!templateName.value.trim() || segments.value.length === 0) return
  
  const finalSegments = [...segments.value]
  if (allowInfinite.value) {
    finalSegments.push({ type: 'nested-path', name: 'path', delimiter: '.', casing: 'camelCase', isOptional: false })
  }
  
  if (editingId.value) {
    emit('update', editingId.value, templateName.value.trim(), finalSegments)
  } else {
    emit('add', templateName.value.trim(), finalSegments)
  }
  isModalOpen.value = false
}

const confirmDelete = (id: number) => {
  templateToDelete.value = id
  isDeleteModalOpen.value = true
}

const performDelete = () => {
  if (templateToDelete.value !== null) {
    emit('delete', templateToDelete.value)
    isDeleteModalOpen.value = false
    templateToDelete.value = null
  }
}

const generatePreview = (segments: KeyTemplateSegment[]) => {
  return segments.map((seg, idx) => {
    let str = ''
    if (seg.type === 'constant') {
      str = seg.constantValue || 'const'
    } else if (seg.type === 'shared-enum') {
      const v = props.variables.find(v => v.id === seg.variableId)
      if (v) {
        str = `[${v.name}]`
      } else {
        str = `[var]`
      }
    } else if (seg.type === 'nested-path') {
      str = `[${seg.name}...]`
    } else {
      str = `[${seg.name}]`
    }
    
    if (seg.isOptional) str = str + '?'
    
    if (idx === segments.length - 1) return str;
    
    if (seg.delimiter !== undefined && seg.delimiter !== null) {
      return str + seg.delimiter
    }
    return str + '.'
  }).join('')
}

const formatOptions = (opts?: string[]) => {
  if (!opts) return ''
  return opts.join(', ')
}

const updateOptions = (segment: KeyTemplateSegment, val: string) => {
  segment.options = val.split(',').map(s => s.trim()).filter(Boolean)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center py-2">
      <u-input v-model="search" icon="i-lucide-search" placeholder="Search templates..." class="w-80" />
      <u-button 
        label="Create Template" 
        icon="i-lucide-plus" 
        color="neutral" 
        variant="subtle"
        @click="openCreate" 
      />
    </div>

    <u-table
      v-model:pagination="pagination"
      v-model:global-filter="search"
      :data="templates"
      :columns="columns"
      :loading="isLoading"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      class="font-mono"
    >
      <template #name-cell="{ row }">
        <span class="font-bold">{{ row.original.name }}</span>
      </template>

      <template #preview-cell="{ row }">
        <span class="font-mono text-sm text-primary-400">
          {{ generatePreview(JSON.parse(row.original.segments)) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <u-button 
            icon="i-lucide-pencil" 
            color="neutral" 
            variant="ghost" 
            size="sm"
            @click="openEdit(row.original)" 
          />
          <u-button 
            icon="i-lucide-trash-2" 
            color="error" 
            variant="ghost" 
            size="sm"
            @click="confirmDelete(row.original.id)" 
          />
        </div>
      </template>
    </u-table>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-default pt-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">Rows per page</span>
        <u-select
          :model-value="pagination.pageSize"
          :items="[10, 20, 50, 100]"
          class="w-20"
          @update:model-value="(val) => { pagination = { ...pagination, pageSize: Number(val), pageIndex: 0 } }"
        />
      </div>
      <div class="flex flex-col min-[450px]:flex-row items-center gap-3 min-[450px]:gap-4">
        <span class="text-sm text-neutral-500">
          {{ templates.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0 }}-{{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, templates.length) }} of {{ templates.length }}
        </span>
        <u-pagination
          v-model:page="currentPagination"
          :total="templates.length"
          :items-per-page="pagination.pageSize"
        />
      </div>
    </div>

    <u-modal v-model:open="isModalOpen" :title="editingId ? 'Edit Template' : 'Create Template'" :ui="{ content: 'sm:max-w-4xl sm:w-full' }">
      <template #body>
        <div class="p-4 flex flex-col gap-6">
          <u-form-field label="Template Name" required>
            <u-input v-model="templateName" placeholder="e.g. Standard Component" class="w-full" autofocus />
          </u-form-field>

          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center">
              <label class="font-medium text-sm">Segments (Schema Builder)</label>
              <u-button label="Add Segment" icon="i-lucide-plus" size="xs" color="neutral" variant="subtle" @click="addSegment" />
            </div>

            <div class="flex flex-col gap-3">
              <div v-for="(seg, idx) in segments" :key="idx" class="flex flex-col md:flex-row gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg items-start">
                <div class="flex flex-col gap-1 w-full md:w-1/4">
                  <span class="text-xs text-neutral-400">Type</span>
                  <u-select v-model="seg.type" :items="segmentTypes" />
                </div>

                <div class="flex flex-col gap-1 w-full md:w-1/4">
                  <span class="text-xs text-neutral-400">Name / Label</span>
                  <u-input 
                    :model-value="seg.type === 'shared-enum' ? (variables.find(v => v.id === seg.variableId)?.name || 'Select Variable...') : seg.name" 
                    @update:model-value="val => seg.name = val as string"
                    placeholder="Segment Name" 
                    :disabled="seg.type === 'shared-enum'" 
                  />
                </div>

                <div class="flex flex-col gap-1 w-full md:w-1/3">
                  <template v-if="seg.type === 'enum'">
                    <span class="text-xs text-neutral-400">Allowed Values (comma separated)</span>
                    <u-input :model-value="formatOptions(seg.options)" @update:model-value="(val) => updateOptions(seg, val as string)" placeholder="button, label, title" />
                  </template>
                  <template v-else-if="seg.type === 'shared-enum'">
                    <span class="text-xs text-neutral-400">Select Global Variable</span>
                    <u-select 
                      v-model="seg.variableId" 
                      :items="variables.map(v => ({ label: v.name, value: v.id }))" 
                      placeholder="Choose variable..."
                    />
                  </template>
                  <template v-else-if="seg.type === 'constant'">
                    <span class="text-xs text-neutral-400">Constant Value</span>
                    <u-input v-model="seg.constantValue" placeholder="app" />
                  </template>
                  <template v-else-if="seg.type === 'free-text'">
                    <span class="text-xs text-neutral-400">Casing Rule</span>
                    <u-select v-model="seg.casing" :items="casingOptions" placeholder="No Rule" />
                  </template>
                </div>

                <div class="flex flex-col items-center gap-1 w-20 pt-6">
                  <u-checkbox :model-value="seg.isOptional" @update:model-value="val => toggleOptional(idx, val as boolean)" label="Optional" />
                </div>

                <div class="flex items-center gap-1 pt-6 ml-auto">
                  <u-button icon="i-lucide-arrow-up" color="neutral" variant="ghost" size="xs" :disabled="idx === 0" @click="moveSegment(idx, -1)" />
                  <u-button icon="i-lucide-arrow-down" color="neutral" variant="ghost" size="xs" :disabled="idx === segments.length - 1" @click="moveSegment(idx, 1)" />
                  <u-button icon="i-lucide-x" color="error" variant="ghost" size="xs" @click="removeSegment(idx)" />
                </div>
              </div>
            </div>
            
            <div class="mt-4 flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
              <div class="flex flex-col gap-1">
                <span class="font-medium text-sm">Allow infinite nested paths</span>
                <span class="text-xs text-neutral-400">If enabled, users can append any number of dot-separated path segments at the end.</span>
              </div>
              <u-switch v-model="allowInfinite" color="primary" />
            </div>
            
            <div class="mt-4 p-4 bg-neutral-950 rounded-lg border border-neutral-800">
              <span class="text-xs text-neutral-500 block mb-2">Live Preview:</span>
              <span class="font-mono text-primary-400 text-lg break-all">{{ generatePreview(allowInfinite ? [...segments, {type: 'nested-path', name: 'path', delimiter: '.'}] : segments) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button color="neutral" variant="ghost" label="Cancel" @click="isModalOpen = false" />
          <u-button label="Save Template" color="neutral" :disabled="!templateName.trim() || segments.length === 0" @click="saveTemplate" />
        </div>
      </template>
    </u-modal>

    <u-modal v-model:open="isDeleteModalOpen" title="Delete Template">
      <template #body>
        <div class="p-6">
          <p class="text-neutral-300">Are you sure you want to delete this template? Any translation keys using this template may become invalid.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-2">
          <u-button color="neutral" variant="ghost" label="Cancel" @click="isDeleteModalOpen = false" />
          <u-button color="error" label="Delete" @click="performDelete" />
        </div>
      </template>
    </u-modal>
  </div>
</template>
