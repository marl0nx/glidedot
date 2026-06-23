<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue'
import { useApi } from '~/composables/useApi'
import { use, registerTheme } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TreeChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import type { TranslationKey, Project } from '~/types'

provide(THEME_KEY, 'glide-dark')

use([
  CanvasRenderer,
  TreeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
])

const props = defineProps<{ projectId: number }>()

const { fetchApi } = useApi()

const keys = ref<TranslationKey[]>([])
const isLoading = ref(true)

const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const chartRef = ref<any>(null)
const focusedNodeId = ref<string | null>(null)
const isFullscreen = ref(false)
const chartKey = ref(0)

let searchTimeout: any = null
watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = val
    focusedNodeId.value = 'root'
  }, 300)
})

watch([debouncedSearchQuery, focusedNodeId], () => {
  chartKey.value++
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await fetchProjects()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// ECharts dark theme base configuration
registerTheme('glide-dark', {
  color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
  backgroundColor: 'transparent',
  textStyle: { color: '#a3a3a3' },
  title: { textStyle: { color: '#e5e5e5' } },
  tooltip: {
    backgroundColor: 'rgba(23, 23, 23, 0.95)',
    borderColor: '#262626',
    textStyle: { color: '#e5e5e5' }
  }
})

const fetchKeys = async () => {
  if (!props.projectId) return
  isLoading.value = true
  try {
    keys.value = await fetchApi(`/localization/keys/${props.projectId}`) as TranslationKey[]
    focusedNodeId.value = 'root'
  } catch (e) {
    keys.value = []
  } finally {
    isLoading.value = false
  }
}

watch(() => props.projectId, () => {
  fetchKeys()
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await fetchKeys()
})

const buildTreeData = (keysList: TranslationKey[]) => {
  const root = { id: 'root', name: 'Project Keys', children: [] as any[] }

  keysList.forEach(k => {
    const parts = k.key.split('.')
    let currentLevel = root.children
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}.${part}` : part
      let existingNode = currentLevel.find((n: any) => n.name === part)
      if (!existingNode) {
        existingNode = { id: currentPath, name: part, children: [], originalKey: k.key }
        currentLevel.push(existingNode)
      }
      
      if (index === parts.length - 1) {
        existingNode.value = 1
      }
      
      currentLevel = existingNode.children
    })
  })
  
  const cleanTree = (node: any) => {
    if (node.children && node.children.length === 0) {
      delete node.children
    } else if (node.children) {
      node.children.forEach(cleanTree)
    }
    return node
  }

  return cleanTree(root)
}

const filteredKeys = computed(() => {
  if (!debouncedSearchQuery.value) return keys.value
  const q = debouncedSearchQuery.value.toLowerCase()
  return keys.value.filter(k => k.key.toLowerCase().includes(q))
})

const fullTreeData = computed(() => {
  if (!filteredKeys.value.length) return null
  return buildTreeData(filteredKeys.value)
})

const getSubTree = (node: any, targetId: string): any => {
  if (node.id === targetId) return node
  if (node.children) {
    for (const child of node.children) {
      const found = getSubTree(child, targetId)
      if (found) return found
    }
  }
  return null
}

const displayTreeData = computed(() => {
  if (!fullTreeData.value) return null
  if (!focusedNodeId.value || focusedNodeId.value === 'root') return fullTreeData.value
  
  const subTree = getSubTree(fullTreeData.value, focusedNodeId.value)
  // Clone the subtree so ECharts recognizes it as a new dataset and re-renders properly
  return subTree ? JSON.parse(JSON.stringify(subTree)) : fullTreeData.value
})

const goUp = () => {
  if (!focusedNodeId.value || focusedNodeId.value === 'root') return
  const parts = focusedNodeId.value.split('.')
  parts.pop()
  if (parts.length === 0) {
    focusedNodeId.value = 'root'
  } else {
    focusedNodeId.value = parts.join('.')
  }
}

const handleNodeClick = (params: any) => {
  if (params.data && params.data.id) {
    if (!params.data.children || params.data.children.length === 0) return
    focusedNodeId.value = params.data.id
  }
}

const chartOptions = computed(() => {
  if (!displayTreeData.value) return {}
  
  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params.data.originalKey) {
          return `Key: <b class="text-white">${params.data.originalKey}</b>`
        }
        return `Namespace: <b class="text-white">${params.name}</b><br/>Contains ${params.data.children?.length || 0} nested items<br/><span class="text-xs text-neutral-500">Click to drill down</span>`
      }
    },
    series: [
      {
        type: 'tree',
        data: [displayTreeData.value],
        orient: 'TB',
        top: '10%',
        left: '5%',
        bottom: '20%',
        right: '5%',
        roam: true,
        symbolSize: (value: any, params: any) => {
          return params.data.children ? 14 : 10;
        },
        initialTreeDepth: debouncedSearchQuery.value ? -1 : 3,
        expandAndCollapse: true,
        itemStyle: {
          color: 'var(--color-primary-500)',
          borderColor: 'var(--color-primary-600)'
        },
        label: {
          position: 'top',
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 12,
          color: 'var(--color-neutral-300)'
        },
        leaves: {
          label: {
            position: 'bottom',
            rotate: -90,
            verticalAlign: 'middle',
            align: 'left'
          },
          itemStyle: {
            color: 'var(--color-neutral-500)',
            borderColor: 'var(--color-neutral-600)'
          }
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            color: 'var(--color-primary-400)',
            borderColor: 'var(--color-primary-500)',
            borderWidth: 2
          }
        },
        animationDuration: 550,
        animationDurationUpdate: 750
      }
    ]
  }
})
</script>

<template>
  <div :class="isFullscreen ? 'fixed inset-0 z-[9999] bg-neutral-950 p-4 md:p-8 flex flex-col gap-4 overflow-hidden' : 'flex flex-col gap-4'">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl shrink-0">
      <div class="flex items-center gap-4 w-full md:w-auto">
        <h3 class="font-medium text-white px-2">Key Hierarchy</h3>
        <u-tooltip text="Go Up" v-if="focusedNodeId && focusedNodeId !== 'root'">
          <u-button 
            icon="i-lucide-corner-up-left" 
            color="neutral" 
            variant="outline" 
            @click="goUp"
          />
        </u-tooltip>
      </div>
      
      <div class="flex items-center gap-2 w-full md:w-auto">
        <u-input
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Filter namespaces/keys (auto-expands)..."
          class="w-full md:w-80"
        />
        <u-tooltip :text="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
          <u-button 
            :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'" 
            color="neutral" 
            variant="ghost" 
            @click="isFullscreen = !isFullscreen" 
          />
        </u-tooltip>
      </div>
    </div>

    <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }" class="flex-1 min-h-0 flex flex-col">
      <div v-if="isLoading" :class="isFullscreen ? 'h-full min-h-[400px]' : 'h-[600px]'" class="flex items-center justify-center flex-1">
        <u-icon name="i-lucide-loader-2" class="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
      <div v-else-if="!displayTreeData" :class="isFullscreen ? 'h-full min-h-[400px]' : 'h-[600px]'" class="flex flex-col items-center justify-center text-neutral-500 gap-2 flex-1">
        <u-icon name="i-lucide-network" class="w-12 h-12 text-neutral-700" />
        <p>No keys found matching your search.</p>
      </div>
      <div v-else :class="isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[600px]'" class="w-full p-4 overflow-hidden relative flex-1">
        <div v-if="focusedNodeId && focusedNodeId !== 'root'" class="absolute top-4 left-4 z-10 bg-neutral-900/80 backdrop-blur border border-neutral-800 px-3 py-1.5 rounded text-xs font-mono text-primary-400">
          Viewing: {{ focusedNodeId }}
        </div>
        <v-chart
          :key="chartKey"
          ref="chartRef"
          :option="chartOptions"
          :update-options="{ notMerge: true }"
          autoresize
          class="w-full h-full"
          @click="handleNodeClick"
        />
      </div>
    </u-card>
  </div>
</template>
