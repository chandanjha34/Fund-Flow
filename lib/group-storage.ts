import type { GroupData } from "./group-data"

const STORAGE_KEY = "fundflow_groups"

export function getAllGroups(): Record<string, GroupData> {
  if (typeof window === "undefined") return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("[FundFlow] Error reading groups from storage:", error)
    return {}
  }
}

export function getPublicGroups(): GroupData[] {
  if (typeof window === "undefined") return []

  try {
    const groups = getAllGroups()
    return Object.values(groups).filter((group) => group.isPublic)
  } catch (error) {
    console.error("[FundFlow] Error getting public groups:", error)
    return []
  }
}

export function saveGroup(group: GroupData): void {
  if (typeof window === "undefined") return

  try {
    const groups = getAllGroups()
    groups[group.id] = group
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
    console.log("[FundFlow] Group saved to storage:", group.id)
  } catch (error) {
    console.error("[FundFlow] Error saving group to storage:", error)
    throw new Error("Failed to save group")
  }
}

export function getGroup(groupId: string): GroupData | null {
  if (typeof window === "undefined") return null

  try {
    const groups = getAllGroups()
    return groups[groupId] || null
  } catch (error) {
    console.error("[FundFlow] Error getting group from storage:", error)
    return null
  }
}

export function updateGroup(groupId: string, updates: Partial<GroupData>): void {
  if (typeof window === "undefined") return

  try {
    const groups = getAllGroups()
    const existingGroup = groups[groupId]

    if (!existingGroup) {
      throw new Error("Group not found")
    }

    groups[groupId] = { ...existingGroup, ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
    console.log("[FundFlow] Group updated in storage:", groupId)
  } catch (error) {
    console.error("[FundFlow] Error updating group in storage:", error)
    throw new Error("Failed to update group")
  }
}

export function addMemberToGroup(groupId: string, memberAddress: string): void {
  if (typeof window === "undefined") return

  try {
    const group = getGroup(groupId)

    if (!group) {
      throw new Error("Group not found")
    }

    if (!group.members.includes(memberAddress)) {
      group.members.push(memberAddress)
      group.totalCollected += 10
      saveGroup(group)
      console.log("[FundFlow] Member added to group:", memberAddress)
    }
  } catch (error) {
    console.error("[FundFlow] Error adding member to group:", error)
    throw new Error("Failed to add member to group")
  }
}

export function addContribution(groupId: string, amount: number): void {
  if (typeof window === "undefined") return

  try {
    const group = getGroup(groupId)

    if (!group) {
      throw new Error("Group not found")
    }

    group.totalCollected += amount
    saveGroup(group)
    console.log("[FundFlow] Contribution added to group:", amount, "USDC")
  } catch (error) {
    console.error("[FundFlow] Error adding contribution:", error)
    throw new Error("Failed to add contribution")
  }
}
