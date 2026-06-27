export interface TeamMember {
  userId: number
  username: string
}

export interface Team {
  id: number
  name: string
  membersCount: number
  projectsCount: number
  members?: TeamMember[]
  projects?: number[]
  oidcMappedGroups?: string
}
