<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem, BreadcrumbItem } from '@nuxt/ui'
import type { Project } from '~/types'
import { useTranslation } from '~/composables/localization/useTranslation'

const route = useRoute();
const { fetchApi, isApiLoading } = useApi()
const { user, isAdmin } = useAuth()
const { settings, loadSettings } = useSettings()
const { languages: translationLanguages } = useTranslation()

await loadSettings()



const { data: projectsData } = await useAsyncData('projects', () => fetchApi('/localization/projects'))
const projects = computed<Project[]>(() => (projectsData.value as Project[]) || [])

const SIDEBAR_STORAGE_KEY = 'glide_sidebar_open'
const isSidebarOpen = ref(true)
const isMobileMenuOpen = ref(false)
const isSettingsMenuOpen = ref(false)

const isProjectContext = computed(() => route.path.startsWith("/projects/"))
const { currentProject } = useProject(projects)

// Aktive Plugins laden, um die Sidebar-Navigation dynamisch zu befüllen
const activePlugins = ref<any[]>([])

const fetchActivePlugins = async () => {
  if (!currentProject.value?.id) {
    activePlugins.value = []
    return
  }
  try {
    const data = await fetchApi<any[]>(`/plugins/projects/${currentProject.value.id}`)
    activePlugins.value = data.filter((p: any) => p.enabled)
  } catch (err) {
    console.error('Fehler beim Laden der aktiven Plugins im Layout:', err)
  }
}

watch(() => currentProject.value?.id, (newId) => {
  if (newId) {
    fetchActivePlugins()
  } else {
    activePlugins.value = []
  }
}, { immediate: true })

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (route.path === "/") return [{label: 'Home'}]

  const segments = route.path.split('/').filter(Boolean)
  return segments.map((segment, index) => {
    let label = segment.charAt(0).toUpperCase() + segment.slice(1)

    // Replace project ID with project name
    if (index === 1 && segments[0] === 'projects' && currentProject.value?.name) {
      label = currentProject.value.name
    }

    // Replace language code with language name
    if (index === 3 && segments[0] === 'projects' && segments[2] === 'translations') {
      const lang = translationLanguages.value.find(l => l.code === segment)
      if (lang) label = lang.name
    }

    return { label }
  })
})

const toggleSidebar = (): void => {
  isSidebarOpen.value = !isSidebarOpen.value;
}

const navLinkUi = computed(() => ({
  link: isSidebarOpen.value ? 'p-2 overflow-hidden' : 'size-10 p-0 justify-center mx-auto overflow-hidden'
}))

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
      active: !isSidebarOpen.value && route.path.startsWith('/projects'),
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
      active: !isSidebarOpen.value && route.path.startsWith('/admin'),
      defaultOpen: route.path.startsWith('/admin'),
      children: [
        {
          label: 'Manage Projects',
          icon: 'i-lucide-folder-git-2',
          href: '/admin/projects'
        },
        {
          label: 'Manage Teams',
          icon: 'i-lucide-shield-half',
          href: '/admin/teams'
        },
        {
          label: 'Manage Users',
          icon: 'i-lucide-users',
          href: '/admin/users'
        },
        {
          label: 'Insights',
          icon: 'i-lucide-bar-chart-2',
          href: '/admin/insights'
        },
        {
          label: 'Migration',
          icon: 'i-lucide-database',
          href: '/admin/migration'
        },
        {
          label: 'Manage Plugins',
          icon: 'i-lucide-puzzle',
          href: '/admin/plugins'
        },
        {
          label: 'Settings',
          icon: 'i-lucide-settings',
          defaultOpen: route.path.startsWith('/admin/settings'),
          children: [
            {
              label: 'General',
              icon: 'i-lucide-settings-2',
              href: '/admin/settings'
            },
            {
              label: 'Theming',
              icon: 'i-lucide-paintbrush',
              href: '/admin/settings/theming'
            }
          ]
        }
      ]
    })
  }

  return items
})

const secondaryItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'Structure',
      icon: 'i-lucide-layers',
      href: `/projects/${currentProject.value?.id}/structure`
    },
    {
      label: 'Conventions',
      icon: 'i-lucide-book-open',
      href: `/projects/${currentProject.value?.id}/conventions`
    },
    {
      label: 'Translations',
      icon: 'i-lucide-languages',
      href: `/projects/${currentProject.value?.id}/translations`
    },
    {
      label: 'In-Context Editor',
      icon: 'i-lucide-monitor-play',
      href: `/projects/${currentProject.value?.id}/in-context`,
      class: 'hidden md:flex'
    },
    {
      label: 'Sync',
      icon: 'i-lucide-refresh-cw',
      href: `/projects/${currentProject.value?.id}/sync`
    },
    {
      label: 'Reviews',
      icon: 'i-lucide-check-circle',
      href: `/projects/${currentProject.value?.id}/reviews`
    },
  ]

  // Active Plugins loaded from installed plugins list
  const extChildren: any[] = []
  for (const p of activePlugins.value) {
    if (p.extensions) {
      for (const ext of p.extensions) {
        extChildren.push({
          label: ext.label,
          icon: ext.icon || p.icon || 'i-lucide-toy-brick',
          href: `/projects/${currentProject.value?.id}/plugins/${p.id}/${ext.id}`
        })
      }
    }
  }

  if (extChildren.length > 0) {
    items.push({
      label: 'Plugins',
      icon: 'i-lucide-puzzle',
      defaultOpen: route.path.includes('/plugins/'),
      children: extChildren
    })
  }

  return items
})

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

// Persist sidebar open/collapsed state across sessions
onMounted(() => {
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
  if (stored !== null) {
    isSidebarOpen.value = stored === 'true'
  }
})

watch(isSidebarOpen, (isOpen) => {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen))
})

// Watch for route changes to close mobile menu
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
  isSettingsMenuOpen.value = false
})

const isBottomSheetOpen = ref(false)
const bottomSheetType = ref<'more' | 'projects' | 'admin' | 'profile' | null>(null)

const openBottomSheet = (type: 'more' | 'projects' | 'admin' | 'profile') => {
  bottomSheetType.value = type
  isBottomSheetOpen.value = true
}

const closeBottomSheet = () => {
  isBottomSheetOpen.value = false
}

const navigateAndClose = (href: string) => {
  closeBottomSheet()
  useRouter().push(href)
}

const navigateToProject = (id: number | string) => {
  closeBottomSheet()
  useRouter().push(`/projects/${id}`)
}

const adminItems = [
  { label: 'Projects', icon: 'i-lucide-folder-git-2', href: '/admin/projects' },
  { label: 'Teams', icon: 'i-lucide-users', href: '/admin/teams' },
  { label: 'Users', icon: 'i-lucide-users', href: '/admin/users' },
  { label: 'Plugins', icon: 'i-lucide-puzzle', href: '/admin/plugins' },
  { label: 'Insights', icon: 'i-lucide-bar-chart-2', href: '/admin/insights' },
  { label: 'Migration', icon: 'i-lucide-database', href: '/admin/migration' },
  { label: 'Settings', icon: 'i-lucide-settings-2', href: '/admin/settings' },
  { label: 'Theming', icon: 'i-lucide-paintbrush', href: '/admin/settings/theming' },
]

const projectMoreItems = computed(() => [
  { label: 'Conventions', icon: 'i-lucide-book-open', href: `/projects/${currentProject.value?.id}/conventions` },
  { label: 'Sync', icon: 'i-lucide-refresh-cw', href: `/projects/${currentProject.value?.id}/sync` },
  { label: 'Reviews', icon: 'i-lucide-check-circle', href: `/projects/${currentProject.value?.id}/reviews` },
  { label: 'In-Context Editor', icon: 'i-lucide-monitor-play', href: `/projects/${currentProject.value?.id}/in-context`, badge: 'Desktop Only' },
  { label: 'Back to Dashboard', icon: 'i-lucide-arrow-left', href: '/' },
])

const mobileNavItems = computed(() => {
  if (isProjectContext.value) {
    return [
      {
        label: 'Back',
        icon: 'i-lucide-arrow-left',
        href: '/',
        active: false
      },
      {
        label: 'Translations',
        icon: 'i-lucide-languages',
        href: `/projects/${currentProject.value?.id}/translations`,
        active: route.path.startsWith(`/projects/${currentProject.value?.id}/translations`)
      },
      {
        label: 'Structure',
        icon: 'i-lucide-layers',
        href: `/projects/${currentProject.value?.id}/structure`,
        active: route.path.startsWith(`/projects/${currentProject.value?.id}/structure`)
      },
      {
        label: 'More',
        icon: 'i-lucide-menu',
        onClick: () => openBottomSheet('more'),
        active: isBottomSheetOpen.value && bottomSheetType.value === 'more'
      }
    ]
  } else {
    return [
      {
        label: 'Home',
        icon: 'i-lucide-house',
        href: '/',
        active: route.path === '/'
      },
      {
        label: 'Projects',
        icon: 'i-lucide-folder',
        onClick: () => openBottomSheet('projects'),
        active: isBottomSheetOpen.value && bottomSheetType.value === 'projects'
      },
      ...(isAdmin.value ? [{
        label: 'Admin',
        icon: 'i-lucide-shield-check',
        onClick: () => openBottomSheet('admin'),
        active: (isBottomSheetOpen.value && bottomSheetType.value === 'admin') || route.path.startsWith('/admin')
      }] : []),
      {
        label: 'Profile',
        icon: 'i-lucide-user',
        onClick: () => openBottomSheet('profile'),
        active: isBottomSheetOpen.value && bottomSheetType.value === 'profile'
      }
    ]
  }
})

const handleMobileNavClick = (item: any) => {
  if (item.onClick) {
    item.onClick()
  } else if (item.href) {
    closeBottomSheet()
    useRouter().push(item.href)
  }
}

// Removed v-model arrays and watchers entirely to let UNavigationMenu run uncontrolled.
// This prevents the Nuxt UI 3 bug where clicking a nested child Accordion 
// overwrites the root Accordion's v-model and forces the parent to collapse.
</script>

<template>
<div class="fixed inset-0 flex bg-black overflow-hidden">
  <u-sidebar
    v-model:open="isSidebarOpen"
    class="flex max-md:!hidden"
    variant="inset"
    collapsible="icon"
    side="left"
    title="Navigation"
    :ui="{ header: 'min-h-none p-2', body: isSidebarOpen ? '' : 'px-2' }"
  >

      <template #header>
        <div class="flex flex-col items-center w-full">
          <div class="flex flex-row items-center">
            <a href="/" class="flex items-center justify-center py-2 px-1">
              <div v-if="isSidebarOpen" class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (Number(settings.logoSize || 24)) + 'px' }">
                <template v-if="settings.logoType === 'image'">
                  <img :src="settings.logoUrl" alt="Logo" class="w-auto object-contain shrink-0 transition-all" :style="{ height: (Number(settings.logoSize || 24)) + 'px' }">
                </template>
                <template v-else>
                  {{ settings.logoText || 'glide' }}<span v-if="settings.logoShowDot !== 'false'" class="text-primary-500">.</span>
                </template>
              </div>
              <div v-else class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (Math.max(16, Number(settings.logoSize || 24) - 4)) + 'px' }">
                <template v-if="settings.logoType === 'image'">
                  <img :src="settings.logoUrlMinimal || settings.logoUrl" alt="Logo" class="w-auto object-contain shrink-0 transition-all" :style="{ height: (Math.max(16, Number(settings.logoSize || 24) - 4)) + 'px' }">
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
                         :collapsed="!isSidebarOpen" popover :ui="navLinkUi"/>
      <u-separator/>
      <u-navigation-menu v-if="isProjectContext" :key="`secondary-${route.path.split('/')[1]}`" :items="secondaryItems" multiple
                         orientation="vertical" :collapsed="!isSidebarOpen" popover :ui="navLinkUi"/>
                         
      <div class="mt-auto" />
      <u-separator/>
      <u-navigation-menu :key="`api-docs-${route.path.split('/')[1]}`" :items="apiDocsItems" orientation="vertical"
                         :collapsed="!isSidebarOpen" popover :ui="navLinkUi"/>

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

    <div class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden md:rounded-xl md:ring md:ring-default bg-neutral-900 md:my-6 md:mr-6 relative">

      <div class="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-xl py-2 flex items-center px-4 border-b border-default space-x-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <u-button
            class="hidden md:inline-flex"
            :icon="isSidebarOpen ? 'i-lucide-panel-left' : 'i-lucide-panel-right'"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="toggleSidebar"
        />

        <div class="flex-1 overflow-x-auto scrollbar-none select-none py-1">
          <u-breadcrumb :items="breadcrumbItems">
            <template #separator>
              <span class="mx-2 text-muted">/</span>
            </template>
          </u-breadcrumb>
        </div>
      </div>

      <div class="flex-1 p-4 relative pb-28 md:pb-4">
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

    <!-- Floating Bottom Navigation Bar (Mobile only) -->
    <div 
      class="md:hidden fixed left-4 right-4 h-16 bg-neutral-950/80 backdrop-blur-xl border border-neutral-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[60] flex items-center justify-around px-2 select-none"
      style="bottom: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom, 0px));"
    >
      <button
        v-for="item in mobileNavItems"
        :key="item.label"
        class="flex flex-col items-center justify-center flex-1 py-1.5 relative transition-all duration-200 active:scale-95 text-neutral-400"
        :class="item.active ? 'text-primary-500' : 'hover:text-white'"
        @click="handleMobileNavClick(item)"
      >
        <u-icon :name="item.icon" class="w-6 h-6 transition-transform duration-200" :class="item.active ? 'scale-110' : ''" />
        <span class="text-[10px] mt-1 font-medium">{{ item.label }}</span>
        <span 
          v-if="item.active" 
          class="absolute bottom-0 w-1.5 h-1.5 bg-primary-500 rounded-full shadow-[0_0_10px_rgba(var(--color-primary-500),0.8)]"
        />
      </button>
    </div>

    <!-- Custom Slide-Up Bottom Sheet & Backdrop (Mobile only) -->
    <teleport to="body">
      <!-- Backdrop -->
      <transition name="fade">
        <div 
          v-if="isBottomSheetOpen" 
          class="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" 
          @click="closeBottomSheet"
        />
      </transition>

      <!-- Bottom Sheet Drawer -->
      <transition name="slide-up">
        <div 
          v-if="isBottomSheetOpen" 
          class="md:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] bg-neutral-950/95 border-t border-neutral-800/80 rounded-t-[2rem] shadow-[0_-15px_30px_rgba(0,0,0,0.5)] z-[100] flex flex-col backdrop-blur-2xl"
          style="padding-bottom: 1.5rem; padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));"
        >
          <!-- Handle bar drag indicator -->
          <div class="w-12 h-1 bg-neutral-800 rounded-full mx-auto my-3 shrink-0"/>

          <!-- Sheet Content -->
          <div class="overflow-y-auto px-6 py-2 flex-1">
            <!-- MORE MENU (Project Context) -->
            <div v-if="bottomSheetType === 'more'" class="flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-2">
                <u-icon name="i-lucide-menu" class="w-5 h-5 text-primary-500" />
                <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Project Navigation</h3>
              </div>
              <div class="flex flex-col gap-2">
                <button
                  v-for="sub in projectMoreItems"
                  :key="sub.href"
                  class="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 text-left transition-all duration-200 active:scale-98"
                  @click="navigateAndClose(sub.href)"
                >
                  <u-icon :name="sub.icon" class="w-5 h-5 text-neutral-400" />
                  <span class="text-sm font-medium text-white flex-1">{{ sub.label }}</span>
                  <u-badge v-if="sub.badge" size="xs" variant="soft" color="neutral" class="shrink-0">{{ sub.badge }}</u-badge>
                  <u-icon v-else name="i-lucide-chevron-right" class="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            </div>

            <!-- PROJECTS SELECTION (Global Context) -->
            <div v-if="bottomSheetType === 'projects'" class="flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-2">
                <u-icon name="i-lucide-folder" class="w-5 h-5 text-primary-500" />
                <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Select Project</h3>
              </div>
              <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                <button
                  v-for="project in projects"
                  :key="project.id"
                  class="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition-all duration-200 active:scale-98"
                  @click="navigateToProject(project.id)"
                >
                  <div class="w-10 h-10 rounded-lg bg-neutral-800/80 flex items-center justify-center border border-neutral-700/50">
                    <u-icon name="i-lucide-folder" class="w-5 h-5 text-neutral-400" />
                  </div>
                  <div class="flex-grow min-w-0">
                    <div class="font-medium text-white text-sm truncate">{{ project.name }}</div>
                    <div v-if="project.description" class="text-xs text-neutral-500 truncate">{{ project.description }}</div>
                  </div>
                  <u-icon name="i-lucide-chevron-right" class="w-4 h-4 text-neutral-500" />
                </button>
                <div v-if="projects.length === 0" class="text-center py-6 text-neutral-500 text-sm">
                  No projects found.
                </div>
              </div>
            </div>

            <!-- ADMIN CONTROLS (Global Context, Admin only) -->
            <div v-if="bottomSheetType === 'admin'" class="flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-2">
                <u-icon name="i-lucide-shield-check" class="w-5 h-5 text-primary-500" />
                <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Admin Controls</h3>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="sub in adminItems"
                  :key="sub.href"
                  class="flex flex-col items-center justify-center p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-center transition-all duration-200 active:scale-95 gap-2"
                  @click="navigateAndClose(sub.href)"
                >
                  <u-icon :name="sub.icon" class="w-6 h-6 text-neutral-400" />
                  <span class="text-xs font-medium text-neutral-300">{{ sub.label }}</span>
                </button>
              </div>
            </div>

            <!-- PROFILE MENU (Global/Project Context) -->
            <div v-if="bottomSheetType === 'profile'" class="flex flex-col gap-4">
              <div class="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 mb-2">
                <u-avatar
                  :src="user?.avatarUrl || undefined"
                  :icon="!user?.avatarUrl ? 'i-lucide-user' : undefined"
                  :class="!user?.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
                  size="lg"
                />
                <div class="flex-grow min-w-0">
                  <div class="font-bold text-white text-base truncate">{{ user?.username }}</div>
                  <div class="text-xs text-neutral-400 truncate">{{ user?.isAdmin ? 'Administrator' : 'Member' }}</div>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <button
                  v-for="sub in profileItems"
                  :key="sub.href as string"
                  class="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 text-left transition-all duration-200 active:scale-98"
                  @click="navigateAndClose(sub.href as string)"
                >
                  <u-icon :name="sub.icon" class="w-5 h-5 text-neutral-400" />
                  <span class="text-sm font-medium text-white flex-1">{{ sub.label }}</span>
                  <u-icon name="i-lucide-chevron-right" class="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>