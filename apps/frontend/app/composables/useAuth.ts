import { ref, computed } from 'vue'
import type { User } from '~/types'

interface OidcUserInfo {
  sub?: string
  id?: string
  userId?: string
  email?: string
  preferred_username?: string
  display_name?: string
  name?: string
  nickname?: string
  iss?: string
  picture?: string
  groups?: string[]
  userInfo?: OidcUserInfo
}

const user = ref<User | null>(null)

export const useAuth = () => {
  const { fetchApi } = useApi()
  const apiKeyCookie = useCookie('glide_api_key')

  const { loggedIn: oidcLoggedIn, user: oidcUser } = useOidcAuth()

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => !!user.value?.isAdmin)
  const isReviewer = computed(() => !!user.value?.isReviewer)

  const fetchUser = async () => {
    // Sync OIDC user to backend to get API key if missing
    if (oidcLoggedIn.value && oidcUser.value && !apiKeyCookie.value) {
      try {
        const oidcInfo = oidcUser.value as unknown as OidcUserInfo;
        console.log('Syncing OIDC user:', JSON.parse(JSON.stringify(oidcInfo)));
        const info = oidcInfo.userInfo || oidcInfo;
        const userId = info.sub || info.id || info.userId || 'undefined_id';
        const email = info.email || `${userId}@oidc.local`;
        const username = info.preferred_username || info.display_name || info.name || info.nickname || email.split('@')[0];
        const issuer = info.iss;
        const avatarUrl = info.picture || `${issuer}/api/users/${userId}/profile-picture.png`;
        
        const data = await fetchApi<User>(`/sessions/login/oidc`, {
          method: 'POST',
          body: {
            email,
            username,
            avatarUrl,
            groups: info.groups || []
          }
        });
        apiKeyCookie.value = data.apiKey;
        user.value = data;
        console.log('OIDC Sync successful, apiKey generated');
        return user.value;
      } catch (e) {
        console.error('OIDC Sync failed', e);
      }
    }

    if (!apiKeyCookie.value) return null
    try {
      const data = await fetchApi('/users/me')
      user.value = data as User
      return user.value
    } catch {
      apiKeyCookie.value = null
      user.value = null
      return null
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const data = await fetchApi<User>(`/sessions/login`, {
        method: 'POST',
        body: { username, password }
      })

      apiKeyCookie.value = data.apiKey
      user.value = data
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    apiKeyCookie.value = null
    user.value = null
    navigateTo('/login')
  }

  return {
    user,
    isLoggedIn,
    isAdmin,
    isReviewer,
    fetchUser,
    login,
    logout
  }
}
