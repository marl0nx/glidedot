export interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
  isOidc: boolean
  isReviewer: boolean
  requiresReview: boolean
  allowSuggestions?: boolean
  enableSuggestions: boolean
  apiKey: string
  avatarUrl?: string
  hasDeepL?: boolean
  translationQuota?: number
}
