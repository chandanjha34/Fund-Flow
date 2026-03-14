import { 
  ref, 
  set, 
  get, 
  push, 
  update,
  query,
  orderByChild,
  equalTo,
  getDatabase
} from 'firebase/database'
import { db } from './firebase'
import type { GroupData } from './group-data'

const GROUPS_PATH = 'groups'

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  if (typeof value === 'number') return value === 1
  return false
}

function normalizeMembers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((member): member is string => typeof member === 'string')
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(
      (member): member is string => typeof member === 'string',
    )
  }

  return []
}

function normalizeFirebaseGroup(groupId: string, data: any): GroupData {
  return {
    id: groupId,
    name: data?.name ?? '',
    creator: data?.creator ?? '',
    recurringPeriod: data?.recurringPeriod ?? 'monthly',
    amountPerRecurrence: toNumber(data?.amountPerRecurrence, 0),
    riskLevel: data?.riskLevel ?? 'low',
    totalDuration: data?.totalDuration ?? '',
    fundingGoal: toNumber(data?.fundingGoal, 0),
    isPublic: toBoolean(data?.isPublic),
    members: normalizeMembers(data?.members),
    totalCollected: toNumber(data?.totalCollected, 0),
    createdAt: data?.createdAt || new Date().toISOString(),
    groupWalletAddress: data?.groupWalletAddress,
  } as GroupData
}

export async function saveGroupToFirebase(group: GroupData): Promise<string> {
  try {
    console.log('[FundFlow] Saving group to Firebase Realtime Database:', group.id)
    
    // Prepare data for Firebase Realtime Database
    const groupData = {
      name: group.name,
      creator: group.creator,
      recurringPeriod: group.recurringPeriod,
      amountPerRecurrence: group.amountPerRecurrence,
      riskLevel: group.riskLevel,
      totalDuration: group.totalDuration,
      fundingGoal: group.fundingGoal,
      isPublic: group.isPublic,
      members: group.members,
      totalCollected: group.totalCollected,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString(),
      // Phase 1: Simple wallet
      groupWalletAddress: group.groupWalletAddress,
      // Phase 2: Multisig (commented out for now)
      // onChainAddress: group.onChainAddress,
      // squadsVaultAddress: group.squadsVaultAddress,
      // squadsMultisigAddress: group.squadsMultisigAddress,
    }
    
    console.log('[FundFlow] Group data prepared for Firebase:', groupData)
    
    // Use the group ID as the key in Realtime Database
    const groupRef = ref(db, `${GROUPS_PATH}/${group.id}`)
    await set(groupRef, groupData)
    console.log('[FundFlow] Group saved to Firebase with ID:', group.id)
    return group.id
  } catch (error) {
    console.error('[FundFlow] Error saving group to Firebase:', error)
    console.error('[FundFlow] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Failed to save group to Firebase')
  }
}

export async function getGroupFromFirebase(groupId: string): Promise<GroupData | null> {
  try {
    console.log('[FundFlow] Fetching group from Firebase Realtime Database:', groupId)
    
    const groupRef = ref(db, `${GROUPS_PATH}/${groupId}`)
    const snapshot = await get(groupRef)
    
    if (snapshot.exists()) {
      const data = snapshot.val()
      console.log('[FundFlow] Group found in Firebase:', data)

      return normalizeFirebaseGroup(groupId, data)
    } else {
      console.log('[FundFlow] Group not found in Firebase')
      return null
    }
  } catch (error) {
    console.error('[FundFlow] Error fetching group from Firebase:', error)
    throw new Error('Failed to fetch group from Firebase')
  }
}

export async function getAllGroupsFromFirebase(): Promise<GroupData[]> {
  try {
    console.log('[FundFlow] Fetching all groups from Firebase Realtime Database')
    
    const groupsRef = ref(db, GROUPS_PATH)
    const snapshot = await get(groupsRef)
    
    const groups: GroupData[] = []
    
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.keys(data).forEach((groupId) => {
        const groupData = data[groupId]
        groups.push(normalizeFirebaseGroup(groupId, groupData))
      })
    }
    
    console.log('[FundFlow] Found', groups.length, 'groups in Firebase')
    return groups
  } catch (error) {
    console.error('[FundFlow] Error fetching all groups from Firebase:', error)
    throw new Error('Failed to fetch groups from Firebase')
  }
}

export async function getPublicGroupsFromFirebase(): Promise<GroupData[]> {
  try {
    console.log('[FundFlow] Fetching public groups from Firebase Realtime Database')
    
    const groupsRef = ref(db, GROUPS_PATH)
    const snapshot = await get(groupsRef)
    
    const groups: GroupData[] = []
    
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.keys(data).forEach((groupId) => {
        const groupData = data[groupId]
        if (toBoolean(groupData?.isPublic)) {
          groups.push(normalizeFirebaseGroup(groupId, groupData))
        }
      })
    }
    
    // Sort by createdAt in JavaScript
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    console.log('[FundFlow] Found', groups.length, 'public groups in Firebase')
    return groups
  } catch (error) {
    console.error('[FundFlow] Error fetching public groups from Firebase:', error)
    throw new Error('Failed to fetch public groups from Firebase')
  }
}

export async function updateGroupInFirebase(groupId: string, updates: Partial<GroupData>): Promise<void> {
  try {
    console.log('[FundFlow] Updating group in Firebase Realtime Database:', groupId)
    
    const groupRef = ref(db, `${GROUPS_PATH}/${groupId}`)
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    await update(groupRef, updateData)
    console.log('[FundFlow] Group updated in Firebase:', groupId)
  } catch (error) {
    console.error('[FundFlow] Error updating group in Firebase:', error)
    throw new Error('Failed to update group in Firebase')
  }
}

export async function addMemberToGroupInFirebase(groupId: string, memberAddress: string): Promise<void> {
  try {
    console.log('[FundFlow] Adding member to group in Firebase Realtime Database:', groupId, memberAddress)
    
    const group = await getGroupFromFirebase(groupId)
    if (!group) {
      throw new Error('Group not found')
    }
    
    if (!group.members.includes(memberAddress)) {
      const updatedMembers = [...group.members, memberAddress]
      const updatedTotalCollected = group.totalCollected + 10 // $10 joining tip
      
      await updateGroupInFirebase(groupId, {
        members: updatedMembers,
        totalCollected: updatedTotalCollected,
      })
      
      console.log('[FundFlow] Member added to group in Firebase:', memberAddress)
    }
  } catch (error) {
    console.error('[FundFlow] Error adding member to group in Firebase:', error)
    throw new Error('Failed to add member to group in Firebase')
  }
}

export async function addContributionToGroupInFirebase(groupId: string, amount: number): Promise<void> {
  try {
    console.log('[FundFlow] Adding contribution to group in Firebase Realtime Database:', groupId, amount)
    
    const group = await getGroupFromFirebase(groupId)
    if (!group) {
      throw new Error('Group not found')
    }
    
    const updatedTotalCollected = group.totalCollected + amount
    
    await updateGroupInFirebase(groupId, {
      totalCollected: updatedTotalCollected,
    })
    
    console.log('[FundFlow] Contribution added to group in Firebase:', amount, 'USDC')
  } catch (error) {
    console.error('[FundFlow] Error adding contribution to group in Firebase:', error)
    throw new Error('Failed to add contribution to group in Firebase')
  }
}