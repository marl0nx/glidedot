<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem, BreadcrumbItem } from '@nuxt/ui'
import type { Project } from '~/types'

const route = useRoute();
const { fetchApi, isApiLoading } = useApi()
const { user, isAdmin } = useAuth()
const { settings, loadSettings } = useSettings()
const appConfig = useAppConfig()



await loadSettings()



const { data: projectsData } = await useAsyncData('projects', () => fetchApi('/localization/projects'))
const projects = computed<Project[]>(() => (projectsData.value as Project[]) || [])

const isSidebarOpen = ref(true)
const isMobileMenuOpen = ref(false)
const isSettingsMenuOpen = ref(false)
const openPrimaryItems = ref([])
const openSecondaryItems = ref(['item-0'])

const isProjectContext = computed(() => route.path.startsWith("/projects/"))
const { currentProject } = useProject(projects)

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (route.path === "/") return [{label: 'Home'}]

  const segments = route.path.split('/').filter(Boolean)
  return segments.map((segment, index) => {
    let label = segment.charAt(0).toUpperCase() + segment.slice(1)
    
    // Replace project ID with project name
    if (index === 1 && segments[0] === 'projects' && currentProject.value?.name) {
      label = currentProject.value.name
    }
    
    return { label }
  })
})

const toggleSidebar = (): void => {
  isSidebarOpen.value = !isSidebarOpen.value;
}

const apiDocsItems: ComputedRef<NavigationMenuItem[]> = computed(() => [
  {
    label: 'API-Docs',
    icon: 'i-lucide-book-open',
    href: '/docs/api',
  }
])

const primaryItems: ComputedRef<NavigationMenuItem[]> = computed(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'Home',
      icon: 'i-lucide-house',
      href: '/',
    },
    {
      label: 'Projects',
      icon: 'i-lucide-layout-dashboard',
      defaultOpen: route.path.startsWith('/projects'),
      children: projects.value.length > 0 ? [
        ...projects.value.map(project => ({
          label: project.name,
          icon: 'i-lucide-folder',
          href: `/projects/${project.id}`,
          class: currentProject.value?.id === project.id ? '!text-primary !bg-transparent font-medium' : ''
        }))
      ] : (isAdmin.value ? [
        {
          label: 'Create Project',
          icon: 'i-lucide-plus',
          href: '/admin/projects'
        }
      ] : [])
    },
  ]

  if (isAdmin.value) {
    items.push({
      label: 'Admin',
      icon: 'i-lucide-shield-check',
      class: 'hidden md:flex',
      defaultOpen: route.path.startsWith('/admin'),
      children: [
        {
          label: 'Manage Projects',
          icon: 'i-lucide-folder-cog',
          href: '/admin/projects'
        },
        {
          label: 'Manage Teams',
          icon: 'i-lucide-users-round',
          href: '/admin/teams'
        },
        {
          label: 'Manage Users',
          icon: 'i-lucide-user-cog',
          href: '/admin/users'
        },
        {
          label: 'Insights',
          icon: 'i-lucide-activity',
          href: '/admin/insights'
        },
        {
          label: 'Migration',
          icon: 'i-lucide-file-json-2',
          href: '/admin/migration'
        },
        {
          label: 'Settings',
          icon: 'i-lucide-settings',
          defaultOpen: route.path.startsWith('/admin/settings'),
          children: [
            {
              label: 'General',
              icon: 'i-lucide-sliders',
              href: '/admin/settings'
            },
            {
              label: 'Theming',
              icon: 'i-lucide-palette',
              href: '/admin/settings/theming'
            }
          ]
        }
      ]
    })
  }

  return items
})

const secondaryItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Structure',
    icon: 'i-lucide-database',
    href: `/projects/${currentProject.value?.id}/structure`
  },
  {
    label: 'Conventions',
    icon: 'i-lucide-book-dashed',
    href: `/projects/${currentProject.value?.id}/conventions`
  },
  {
    label: 'Translations',
    icon: 'i-lucide-a-large-small',
    href: `/projects/${currentProject.value?.id}/translations`
  },
  {
    label: 'In-Context Editor',
    icon: 'i-lucide-monitor-play',
    href: `/projects/${currentProject.value?.id}/in-context`,
    class: 'hidden md:flex'
  },
  {
    label: 'Reviews',
    icon: 'i-lucide-check-circle',
    href: `/projects/${currentProject.value?.id}/reviews`
  },
])

const profileItems: DropdownMenuItem[] = [
  {
    label: 'Account',
    icon: 'i-lucide-user',
    href: '/settings/account'
  },
  {
    label: 'Settings',
    icon: 'i-lucide-cog',
    href: '/settings'
  },
  {
    label: 'Logout',
    icon: 'i-lucide-log-out',
    href: '/logout'
  }
]

// Watch for sidebar changes
watch(isSidebarOpen, (isOpen) => {
  // If we needed to handle anything on close, we could do it here
})

// Watch for route changes to close mobile menu
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
  isSettingsMenuOpen.value = false
})

// Removed v-model arrays and watchers entirely to let UNavigationMenu run uncontrolled.
// This prevents the Nuxt UI 3 bug where clicking a nested child Accordion 
// overwrites the root Accordion's v-model and forces the parent to collapse.
</script>

<template>
  <div class="fixed inset-0 flex bg-black overflow-hidden">
    <u-sidebar class="flex" v-model:open="isSidebarOpen" variant="inset" collapsible="icon" side="left" title="Navigation"
               :ui="{ header: 'min-h-none p-2' }">

      <template #header>
        <div class="flex flex-col items-center w-full">
          <div class="flex flex-row items-center">
            <a href="/" class="flex items-center justify-center py-2 px-1">
              <div v-if="isSidebarOpen" class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (settings.logoSize || 24) + 'px' }">
                <template v-if="settings.logoType === 'image'">
                  <img :src="settings.logoUrl" alt="Logo" class="w-auto object-contain shrink-0 transition-all" :style="{ height: (settings.logoSize || 24) + 'px' }">
                </template>
                <template v-else>
                  {{ settings.logoText || 'glide' }}<span v-if="settings.logoShowDot !== 'false'" class="text-primary-500">.</span>
                </template>
              </div>
              <div v-else class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (Math.max(16, (settings.logoSize || 24) - 4)) + 'px' }">
                <template v-if="settings.logoType === 'image'">
                  <img :src="settings.logoUrlMinimal || settings.logoUrl" alt="Logo" class="w-auto object-contain shrink-0 transition-all" :style="{ height: (Math.max(16, (settings.logoSize || 24) - 4)) + 'px' }">
                </template>
                <template v-else>
                  {{ settings.logoTextMinimal || 'g' }}<span v-if="settings.logoShowDot !== 'false'" class="text-primary-500">.</span>
                </template>
              </div>
            </a>
          </div>
        </div>
      </template>

      <u-navigation-menu :key="route.path.split('/')[1]" :items="primaryItems" orientation="vertical" multiple
                         :ui="{ link: 'p-2 overflow-hidden' }"/>
      <u-separator/>
      <u-navigation-menu v-if="isProjectContext" :key="`secondary-${route.path.split('/')[1]}`" :items="secondaryItems" multiple
                         orientation="vertical" :ui="{ link: 'p-2 overflow-hidden' }"/>
                         
      <div class="mt-auto"></div>
      <u-separator/>
      <u-navigation-menu :key="`api-docs-${route.path.split('/')[1]}`" :items="apiDocsItems" orientation="vertical"
                         :ui="{ link: 'p-2 overflow-hidden' }"/>

      <template #footer>
        <u-dropdown-menu :items="profileItems" :content="{ side: 'top' }" class="cursor-pointer">
          <div v-if="isSidebarOpen" class="flex flex-col w-full p-2 rounded-lg hover:bg-neutral-800">
            <u-user
                :name="user?.username"
                :description="user?.isAdmin ? 'Administrator' : 'Member'"
                :avatar="{
                    src: user?.avatarUrl || undefined,
                    icon: !user?.avatarUrl ? 'i-lucide-user' : undefined,
                    loading: 'lazy',
                    class: !user?.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''
                }"
            />
          </div>
          <div v-else class="flex flex-col items-center w-full h-auto">
            <u-avatar
                :src="user?.avatarUrl || undefined"
                :icon="!user?.avatarUrl ? 'i-lucide-user' : undefined"
                :class="!user?.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
                loading="lazy"
                size="md"
            />
          </div>
        </u-dropdown-menu>
      </template>
    </u-sidebar>

    <div class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden md:rounded-xl md:ring md:ring-default bg-neutral-900 md:my-6 relative">

      <div class="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-xl py-2 flex items-center px-4 border-b border-default space-x-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <u-button
            class="hidden md:inline-flex"
            :icon="isSidebarOpen ? 'i-lucide-panel-left' : 'i-lucide-panel-right'"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="toggleSidebar"
        />

        <u-breadcrumb :items="breadcrumbItems">
          <template #separator>
            <span class="mx-2 text-muted">/</span>
          </template>
        </u-breadcrumb>
      </div>

      <div class="flex-1 p-4 relative">
        <transition 
          enter-active-class="transition-opacity duration-300 delay-150" 
          enter-from-class="opacity-0" 
          enter-to-class="opacity-100" 
          leave-active-class="transition-opacity duration-200" 
          leave-from-class="opacity-100" 
          leave-to-class="opacity-0"
        >
          <div v-if="isApiLoading" class="absolute inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center rounded-b-xl">
             <u-icon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </transition>
        <slot/>
      </div>
    </div>

  </div>
</template>