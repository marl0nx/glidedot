<script setup lang="ts">
definePageMeta({
  layout: 'login'
})

const { fetchApi } = useApi()
const { settings, loadSettings } = useSettings()
await loadSettings()

const step = ref(1)
const loading = ref(false)

const setupData = ref({
  adminPassword: '',
  adminPasswordConfirm: '',
  initialProjectName: 'My Awesome Project'
})

const validatePassword = () => {
  if (setupData.value.adminPassword !== setupData.value.adminPasswordConfirm) {
    useToast().add({ title: 'Passwords do not match', color: 'error' })
    return
  }
  const error = validatePasswordStrength(setupData.value.adminPassword)
  if (error) {
    useToast().add({ title: error, color: 'error' })
    return
  }
  step.value = 2
}

const startSetup = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await fetchApi<{ success: boolean }>('/setup/initial', {
      method: 'POST',
      body: setupData.value
    })
    if (response.success) {
      step.value = 3
    }
  } catch (e) {
    console.error(e)
    alert('Setup failed. Check console for details.')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-svh flex flex-col justify-center items-center bg-neutral-950 p-6">
    <div class="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-8 shadow-2xl">

      <div class="flex flex-col items-center">
        <div class="font-black tracking-tighter text-white font-sans flex items-baseline mb-6 transition-all" :style="{ fontSize: (Number(settings.logoSize || 24) * 2) + 'px' }">
          <template v-if="settings.logoType === 'image'">
            <img :src="settings.logoUrlMinimal || settings.logoUrl" alt="Logo" class="w-auto max-w-[200px] object-contain shrink-0 transition-all" :style="{ height: (Number(settings.logoSize || 24) * 2) + 'px' }">
          </template>
          <template v-else>
            {{ settings.logoText || 'glide' }}<span v-if="settings.logoShowDot !== 'false'" class="text-primary-500">.</span>
          </template>
        </div>
        <h1 class="text-2xl font-bold text-white">Setup Wizard</h1>
        <p class="text-neutral-400 text-center mt-2 px-4">Welcome to glide.! Let's get your environment ready in just a few steps.</p>
      </div>

      <!-- Step 1: Welcome & Admin -->
      <div v-if="step === 1" class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-300">Set Admin Password</label>
            <u-input v-model="setupData.adminPassword" type="password" placeholder="Choose a secure password" size="xl" class="w-full" />
            <p class="text-[11px] text-neutral-500">Username will be 'admin'. You'll need this to login for the first time.</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-300">Confirm Admin Password</label>
            <u-input v-model="setupData.adminPasswordConfirm" type="password" placeholder="Repeat your secure password" size="xl" class="w-full" @keydown.enter="validatePassword"/>
          </div>
        </div>
        <u-button color="neutral" label="Continue" size="xl" class="w-full justify-center" :disabled="!setupData.adminPassword || !setupData.adminPasswordConfirm" @click="validatePassword"/>
      </div>

      <!-- Step 2: Settings & Project -->
      <div v-if="step === 2" class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-300">First Project Name</label>
            <u-input v-model="setupData.initialProjectName" placeholder="e.g. Mobile App" size="xl" class="w-full" @keydown.enter="startSetup"/>
          </div>
        </div>
        <div class="flex gap-3">
          <u-button color="neutral" variant="ghost" label="Back" size="xl" class="flex-1 justify-center" @click="step = 1"/>
          <u-button color="neutral" label="Finish Setup" size="xl" class="flex-1 justify-center" :loading="loading" @click="startSetup"/>
        </div>
      </div>

      <!-- Step 3: Success -->
      <div v-if="step === 3" class="text-center space-y-6 py-4">
        <div class="size-16 bg-success-500/20 text-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <u-icon name="i-lucide-check" class="size-8"/>
        </div>
        <h2 class="text-xl font-bold">You're all set!</h2>
        <p class="text-neutral-400">The database has been initialized, default languages created, and your admin account is ready.</p>
        <u-button color="neutral" label="Go to Login" size="xl" class="w-full justify-center" @click="goToLogin"/>
      </div>

    </div>
  </div>
</template>

