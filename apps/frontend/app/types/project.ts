export interface Project {
    id: string
    name: string
    description?: string | null
    reviewEnabled?: boolean
    requireTemplate?: boolean
    inContextUrl?: string | null
    sourceLanguageId?: number | null
}