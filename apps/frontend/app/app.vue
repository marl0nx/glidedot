<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSettings } from '~/composables/useSettings'

import { useThemeColor } from '~/composables/useThemeColor'
import { useThemeBackground } from '~/composables/useThemeBackground'

const appConfig = useAppConfig()
const auth = useAuth()
const route = useRoute()
const { settings, loadSettings } = useSettings()
const isInitializing = ref(true)

useThemeColor(computed(() => appConfig.ui.colors.primary))
useThemeBackground(computed(() => settings.value.themeMode || 'dark'), computed(() => settings.value.customBackgroundColor || '#111111'))

const isMaintenanceActive = computed(() => settings.value.maintenanceMode === 'true')

onMounted(async () => {
  const saved = localStorage.getItem('glide_primary_color')
  if (saved) {
    appConfig.ui.colors.primary = saved
  }
  
  await loadSettings()
  
  if (settings.value.primaryColor) {
    appConfig.ui.colors.primary = settings.value.primaryColor
  }

  isInitializing.value = false

  // Prevent programmatic and multi-touch pinch-to-zoom on mobile devices
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault()
  })
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
})

const handleLogout = async () => {
  await auth.logout()
  navigateTo('/login')
}
</script>

<template>
  <u-app>
    <div v-if="isInitializing" class="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center">
      <u-icon name="i-lucide-loader-2" class="w-8 h-8 text-primary-500 animate-spin" />
    </div>

    <!-- For normal users, block the app completely EXCEPT on the login page -->
    <div v-else-if="isMaintenanceActive && !auth.isAdmin.value && route.path !== '/login'" class="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col justify-center items-center space-y-4">
      
      <div class="flex items-center justify-center mb-4 mt-8">
        <div class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (Number(settings.logoSize || 24) * 2) + 'px' }">
          <template v-if="settings.logoType === 'image'">
            <img :src="settings.logoUrlMinimal || settings.logoUrl" alt="Logo" class="w-auto max-w-[200px] object-contain shrink-0 transition-all" :style="{ height: (Number(settings.logoSize || 24) * 2) + 'px' }">
          </template>
          <template v-else>
            {{ settings.logoText || 'glide' }}<span v-if="settings.logoShowDot !== 'false'" class="text-primary-500">.</span>
          </template>
        </div>
      </div>

      <div class="flex flex-col items-center border border-accented rounded-lg p-4 w-100 h-auto pb-8 text-center">
        <div class="flex flex-col items-center mt-4 px-4">
          <h1 class="mb-2 text-xl font-bold">Maintenance Mode</h1>
          <p class="text-neutral-400 text-sm">The administrator has temporarily disabled access to the system.</p>
        </div>
        
        <div class="mt-8">
          <u-button color="neutral" label="Back to Login" class="w-80 h-10 justify-center text-base" @click="handleLogout" />
        </div>
      </div>
    </div>

    <!-- For admins, show the app with a floating warning pill -->
    <div v-else class="h-full flex flex-col">
      <NuxtLink v-if="isMaintenanceActive && auth.isAdmin.value" 
           to="/admin/settings"
           class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-md border border-warning-500/30 rounded-full shadow-2xl shadow-warning-500/10 cursor-pointer hover:bg-neutral-800/90 transition-all hover:scale-105 group">
        <div class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"/>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning-500"/>
        </div>
        <span class="text-warning-400 text-sm font-semibold tracking-wide">Maintenance Active</span>
        <u-icon name="i-lucide-arrow-right" class="w-4 h-4 text-warning-500/50 group-hover:text-warning-400 transition-colors" />
      </NuxtLink>
      
      <NuxtLoadingIndicator color="var(--color-primary-500)" :height="3" />
      <div class="flex-1 relative">
        <nuxt-layout>
          <nuxt-page/>
        </nuxt-layout>
      </div>
    </div>
  </u-app>
</template>
