export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { isLoggedIn, fetchUser } = useAuth()
  const { loggedIn: oidcLoggedIn, fetch: fetchOidc } = useOidcAuth()
  const { fetchApi } = useApi()
  const config = useRuntimeConfig()

  // Check setup status FIRST
  try {
    const status = await fetchApi<{ setupRequired: boolean }>('/setup/status')
    if (status.setupRequired) {
      if (to.path !== '/setup') {
        return navigateTo('/setup')
      }
      return
    } else if (to.path === '/setup') {
      return navigateTo('/login')
    }
  } catch (e) {
    console.error('Failed to check setup status. Is the API reachable?', e)
    if (to.path === '/setup') {
      return
    }
  }

  // Ensure OIDC session is fetched before making redirect decisions
  if (!oidcLoggedIn.value && typeof fetchOidc === 'function') {
    try {
      await fetchOidc()
    } catch {
      // ignore
    }
  }

  // If going to /login but already logged in, redirect home
  if (to.path === '/login') {
    if (isLoggedIn.value) {
      return navigateTo('/')
    }
    return
  }

  // Skip if we are going to logout
  if (to.path === '/logout') return

  // If not logged in, try fetching user first
  let currentUser = undefined
  if (!isLoggedIn.value) {
    currentUser = await fetchUser()
    if (!currentUser) {
      return navigateTo('/login')
    }
  } else {
    currentUser = useAuth().user.value
  }

  // Admin route protection
  if (to.path.startsWith('/admin') && !currentUser?.isAdmin) {
    return navigateTo('/')
  }
})
