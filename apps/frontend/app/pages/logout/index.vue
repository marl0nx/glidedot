<script setup lang="ts">
import { onMounted } from 'vue'

definePageMeta({
  layout: 'login'
})

const { logout } = useAuth()
const { logout: oidcLogout } = useOidcAuth()

onMounted(async () => {
  try {
    await oidcLogout()
  } catch {
    // ignore
  }
  logout() // this will clear local auth and navigate to /login
})
</script>

<template>
  <div class="min-h-svh flex items-center justify-center text-neutral-400">
    Logging out...
  </div>
</template>
