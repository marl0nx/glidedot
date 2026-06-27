<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { KeyTemplate, KeyTemplateSegment, KeyGlossaryTerm, KeyVariable, TranslationLabel } from '~/types'

const props = defineProps<{
  modelValue: boolean
  templates?: KeyTemplate[]
  glossary?: KeyGlossaryTerm[]
  variables?: KeyVariable[]
  labels?: TranslationLabel[]
  requireTemplate?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'create', keyName: string, labelIds: number[]): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const newKeyName = ref("")
const selectedTemplateId = ref<number | 'freeform'>('freeform')
const templateValues = ref<string[]>([])
const selectedLabelIds = ref<number[]>([])

// Initialize state when modal opens
watch(isOpen, (val) => {
  if (val) {
    const firstTemplate = props.templates?.[0]
    if (props.requireTemplate && firstTemplate) {
      selectedTemplateId.value = firstTemplate.id
    } else {
      selectedTemplateId.value = 'freeform'
    }
    newKeyName.value = ""
    templateValues.value = []
    selectedLabelIds.value = []
  }
})

const toggleLabel = (id: number) => {
  if (selectedLabelIds.value.includes(id)) {
    selectedLabelIds.value = selectedLabelIds.value.filter(lId => lId !== id)
  } else {
    selectedLabelIds.value.push(id)
  }
}

const currentTemplate = computed(() => {
  if (selectedTemplateId.value === 'freeform') return null
  return props.templates?.find(t => t.id === selectedTemplateId.value) || null
})

const currentSegments = computed<KeyTemplateSegment[]>(() => {
  if (!currentTemplate.value) return []
  try {
    return JSON.parse(currentTemplate.value.segments)
  } catch (e) {
    return []
  }
})

// Update values array when template changes
watch(selectedTemplateId, () => {
  if (selectedTemplateId.value !== 'freeform') {
    templateValues.value = currentSegments.value.map(seg => {
      if (seg.type === 'constant') return seg.constantValue || ''
      if (seg.type === 'enum' && seg.options && seg.options.length > 0) return seg.options[0] || ''
      if (seg.type === 'shared-enum' && seg.variableId) {
        const v = props.variables?.find(v => v.id === seg.variableId)
        if (v) {
          const opts = v.options.split(',').map(s => s.trim()).filter(Boolean)
          if (opts.length > 0) return opts[0] || ''
        }
      }
      return ''
    })
  } else {
    templateValues.value = []
  }
})

const generatedKey = computed(() => {
  if (selectedTemplateId.value === 'freeform') return newKeyName.value.trim()
  
  return currentSegments.value.map((seg, idx) => {
    let val = templateValues.value[idx] || ''
    if (seg.type === 'constant') val = seg.constantValue || ''
    
    // Formatting rules
    if (val && seg.casing) {
      if (seg.casing === 'camelCase') val = val.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[A-Z]/, c => c.toLowerCase())
      else if (seg.casing === 'kebab-case') val = val.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase()
      else if (seg.casing === 'snake_case') val = val.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase()
      else if (seg.casing === 'PascalCase') val = val.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[a-z]/, c => c.toUpperCase())
    }
    
    if (seg.isOptional && !val) return ''
    
    if (seg.delimiter !== undefined && seg.delimiter !== null) {
      // Don't add delimiter if it's the last segment and it's empty? Wait, usually we just append delimiter if value exists or it's not the last.
      // Let's just append delimiter if it's not the absolute end, but for simplicity, we append it if there are following non-empty segments.
      const hasFollowingNonEmpty = currentSegments.value.slice(idx + 1).some((s, i) => {
        const v = templateValues.value[idx + 1 + i]
        if (s.type === 'constant') return true
        if (s.isOptional && !v) return false
        return true
      })
      if (hasFollowingNonEmpty && val) {
        return val + seg.delimiter
      }
      return val
    }
    
    // Default delimiter '.'
    const hasFollowingNonEmpty = currentSegments.value.slice(idx + 1).some((s, i) => {
      const v = templateValues.value[idx + 1 + i]
      if (s.type === 'constant') return true
      if (s.isOptional && !v) return false
      return true
    })
    
    if (hasFollowingNonEmpty && val) {
      return val + '.'
    }
    return val
  }).join('')
})

// Linting
const lintWarnings = computed(() => {
  if (!props.glossary || props.glossary.length === 0) return []
  
  const warnings: { badWord: string, goodWord: string, index?: number }[] = []
  const textToCheck = selectedTemplateId.value === 'freeform' ? newKeyName.value : templateValues.value.join(' ')
  
  props.glossary.forEach(term => {
    const badWords = term.badWord.split(',').map(w => w.trim()).filter(Boolean)
    for (const word of badWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|[\\.\\-_\\s])${escapedWord}([\\.\\-_\\s]|$)`, 'i')
      if (regex.test(textToCheck)) {
        warnings.push({ badWord: word, goodWord: term.goodWord })
      }
    }
  })
  
  return warnings
})

const applyFix = (warning: { badWord: string, goodWord: string }) => {
  const escapedWord = warning.badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(^|[\\.\\-_\\s])(${escapedWord})([\\.\\-_\\s]|$)`, 'gi')
  if (selectedTemplateId.value === 'freeform') {
    newKeyName.value = newKeyName.value.replace(regex, (match, p1, p2, p3) => p1 + warning.goodWord + p3)
  } else {
    templateValues.value = templateValues.value.map(v => v.replace(regex, (match, p1, p2, p3) => p1 + warning.goodWord + p3))
  }
}

const isValid = computed(() => {
  if (selectedTemplateId.value === 'freeform') return newKeyName.value.trim().length > 0
  
  return currentSegments.value.every((seg, idx) => {
    if (seg.isOptional) return true
    if (seg.type === 'constant') return true
    return (templateValues.value[idx] || '').trim().length > 0
  })
})

const handleCreate = () => {
  if (isValid.value) {
    emit('create', generatedKey.value, [...selectedLabelIds.value])
    isOpen.value = false
  }
}
</script>

<template>
  <u-modal
    v-model:open="isOpen"
    title="Add New Key"
    description="Enter the identifier for your new translation key."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="p-4 flex flex-col gap-6">
        
        <!-- Template Selection -->
        <div v-if="templates && templates.length > 0" class="flex flex-col gap-2">
          <label class="font-medium text-sm">Key Template</label>
          <u-select
            v-model="selectedTemplateId"
            :items="[
              ...(requireTemplate ? [] : [{ label: 'Freeform (No Template)', value: 'freeform' }]),
              ...templates.map(t => ({ label: t.name, value: t.id }))
            ]"
            class="w-full"
          />
        </div>
        
        <!-- Freeform Input -->
        <div v-if="selectedTemplateId === 'freeform'">
          <u-form-field label="Key Identifier">
            <u-input
              v-model="newKeyName"
              placeholder="e.g., dashboard.welcome.title"
              autofocus
              class="w-full"
              @keyup.enter="handleCreate"
            />
          </u-form-field>
        </div>
        
        <!-- Template Inputs -->
        <div v-else class="flex flex-col gap-4 bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <template v-for="(seg, idx) in currentSegments" :key="idx">
              
              <u-form-field v-if="seg.type === 'free-text' || seg.type === 'nested-path'" :label="`${idx + 1}. ${seg.name}${seg.isOptional ? ' (Optional)' : ''}`" :required="!seg.isOptional" :class="seg.type === 'nested-path' ? 'md:col-span-2' : ''">
                <u-input 
                  v-model="templateValues[idx]" 
                  :placeholder="seg.type === 'nested-path' ? 'e.g. profile.avatar.image' : 'e.g. submit'" 
                  class="w-full"
                  @keyup.enter="handleCreate"
                />
              </u-form-field>

              <u-form-field v-else-if="seg.type === 'enum'" :label="`${idx + 1}. ${seg.name}${seg.isOptional ? ' (Optional)' : ''}`" :required="!seg.isOptional">
                <u-select
                  v-model="templateValues[idx]"
                  :items="seg.options?.map(o => ({ label: o, value: o })) || []"
                  class="w-full"
                />
              </u-form-field>
              
              <u-form-field v-else-if="seg.type === 'shared-enum'" :label="`${idx + 1}. ${(props.variables?.find(v => v.id === seg.variableId)?.name || 'Variable')}${seg.isOptional ? ' (Optional)' : ''}`" :required="!seg.isOptional">
                <u-select
                  v-model="templateValues[idx]"
                  :items="(props.variables?.find(v => v.id === seg.variableId)?.options.split(',').map(s => s.trim()).filter(Boolean) || []).map(o => ({ label: o, value: o }))"
                  class="w-full"
                />
              </u-form-field>
              
              <div v-else-if="seg.type === 'constant'" class="flex flex-col gap-1">
                <span class="font-medium text-sm text-neutral-400">{{ idx + 1 }}. {{ seg.name }} (Constant)</span>
                <span class="text-neutral-300 font-mono text-sm py-1.5 px-3 bg-neutral-950 rounded border border-neutral-800 opacity-50 cursor-not-allowed">
                  {{ seg.constantValue }}
                </span>
              </div>
              
            </template>
          </div>
          
          <!-- Live Preview -->
          <div class="mt-2 flex flex-col gap-1">
            <span class="text-xs text-neutral-500">Live Preview:</span>
            <div class="font-mono text-primary-400 text-lg break-all p-3 bg-neutral-950 rounded-lg border border-primary-500/30">
              {{ generatedKey || '...' }}
            </div>
          </div>
        </div>

        <!-- Labels Selection -->
        <div v-if="labels && labels.length > 0" class="flex flex-col gap-2 pt-2 border-t border-neutral-800">
          <label class="font-medium text-sm">Labels (Optional)</label>
          <div class="flex flex-wrap gap-2">
            <u-badge
              v-for="label in labels"
              :key="label.id"
              variant="subtle"
              color="neutral"
              size="lg"
              class="cursor-pointer transition-all"
              :style="{ 
                backgroundColor: selectedLabelIds.includes(label.id) ? `${label.color}30` : `${label.color}10`, 
                color: label.color, 
                borderColor: selectedLabelIds.includes(label.id) ? label.color : `${label.color}20`,
                borderWidth: '1px'
              }"
              @click="toggleLabel(label.id)"
            >
              {{ label.name }}
              <u-icon
                :name="selectedLabelIds.includes(label.id) ? 'i-lucide-check' : 'i-lucide-plus'"
                class="ml-1.5 w-3.5 h-3.5"
                :class="selectedLabelIds.includes(label.id) ? 'opacity-100' : 'opacity-50'"
              />
            </u-badge>
          </div>
        </div>

        <!-- Linter Warnings -->
        <div v-if="lintWarnings.length > 0" class="flex flex-col gap-2">
          <div v-for="(warn, i) in lintWarnings" :key="i" class="flex items-center justify-between p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
            <div class="flex items-center gap-2 text-warning-400">
              <u-icon name="i-lucide-alert-triangle" class="w-4 h-4" />
              <span class="text-sm">In this project, we use <strong class="text-warning-300 font-mono">{{ warn.goodWord }}</strong> instead of <strong class="text-warning-300 font-mono">{{ warn.badWord }}</strong>.</span>
            </div>
            <u-button label="Auto-Fix" color="warning" variant="subtle" size="xs" @click="applyFix(warn)" />
          </div>
        </div>
        
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <u-button color="neutral" variant="ghost" label="Cancel" @click="isOpen = false"/>
        <u-button label="Add Key" color="neutral" :disabled="!isValid" @click="handleCreate"/>
      </div>
    </template>
  </u-modal>
</template>
