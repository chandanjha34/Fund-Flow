import { ref, set, get, remove, push, query, orderByChild, equalTo } from 'firebase/database'
import { db } from './firebase'
import type { AvatarData } from './avatar-storage'

const AVATARS_PATH = 'avatars'

// Default color palette that matches your accent color
export const DEFAULT_AVATAR_COLORS = [
  "#10b981", // emerald-500 (your accent color)
  "#059669", // emerald-600
  "#047857", // emerald-700
  "#065f46", // emerald-800
  "#064e3b", // emerald-900
  "#6ee7b7", // emerald-300
  "#a7f3d0", // emerald-200
  "#d1fae5", // emerald-100
]

// Generate a deterministic hash for consistent avatar generation
function generateAvatarHash(name: string, variant: string): string {
  let hash = 0
  const input = `${name}-${variant}`
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

// Get or create avatar data for a user/group from Firebase
export async function getAvatarData(id: string, name: string, type: "user" | "group"): Promise<AvatarData> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${id}`)
  
  try {
    const snapshot = await get(avatarRef)
    
    if (snapshot.exists()) {
      const avatarData: AvatarData = snapshot.val()
      // Verify the data is still valid
      if (avatarData.id === id && avatarData.name === name) {
        console.log(`[FundFlow] Loaded avatar data from Firebase for ${type}:`, id)
        return avatarData
      }
    }
  } catch (error) {
    console.warn("[FundFlow] Failed to load avatar data from Firebase:", error)
  }
  
  // Create new avatar data
  const variant = type === "user" ? "marble" : "beam"
  const avatarData: AvatarData = {
    id,
    name,
    variant,
    colors: DEFAULT_AVATAR_COLORS,
    lastUpdated: new Date().toISOString()
  }
  
  // Store the new avatar data in Firebase
  await saveAvatarData(avatarData, type)
  
  return avatarData
}

// Save avatar data to Firebase
export async function saveAvatarData(avatarData: AvatarData, type: "user" | "group"): Promise<void> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${avatarData.id}`)
  
  try {
    await set(avatarRef, avatarData)
    console.log(`[FundFlow] Saved avatar data to Firebase for ${type}:`, avatarData.id)
  } catch (error) {
    console.error("[FundFlow] Failed to save avatar data to Firebase:", error)
    throw error
  }
}

// Update avatar variant in Firebase
export async function updateAvatarVariant(id: string, variant: AvatarData["variant"], type: "user" | "group"): Promise<void> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${id}`)
  
  try {
    const snapshot = await get(avatarRef)
    if (snapshot.exists()) {
      const avatarData: AvatarData = snapshot.val()
      avatarData.variant = variant
      avatarData.lastUpdated = new Date().toISOString()
      await saveAvatarData(avatarData, type)
      console.log(`[FundFlow] Updated avatar variant in Firebase for ${type}:`, id)
    }
  } catch (error) {
    console.error("[FundFlow] Failed to update avatar variant in Firebase:", error)
    throw error
  }
}

// Update avatar colors in Firebase
export async function updateAvatarColors(id: string, colors: string[], type: "user" | "group"): Promise<void> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${id}`)
  
  try {
    const snapshot = await get(avatarRef)
    if (snapshot.exists()) {
      const avatarData: AvatarData = snapshot.val()
      avatarData.customColors = colors
      avatarData.lastUpdated = new Date().toISOString()
      await saveAvatarData(avatarData, type)
      console.log(`[FundFlow] Updated avatar colors in Firebase for ${type}:`, id)
    }
  } catch (error) {
    console.error("[FundFlow] Failed to update avatar colors in Firebase:", error)
    throw error
  }
}

// Get all stored avatars from Firebase (for debugging/admin purposes)
export async function getAllStoredAvatars(): Promise<{ users: AvatarData[], groups: AvatarData[] }> {
  const users: AvatarData[] = []
  const groups: AvatarData[] = []
  
  try {
    // Get all user avatars
    const usersRef = ref(db, `${AVATARS_PATH}/user`)
    const usersSnapshot = await get(usersRef)
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val()
      Object.values(usersData).forEach((avatar: any) => {
        users.push(avatar as AvatarData)
      })
    }
    
    // Get all group avatars
    const groupsRef = ref(db, `${AVATARS_PATH}/group`)
    const groupsSnapshot = await get(groupsRef)
    if (groupsSnapshot.exists()) {
      const groupsData = groupsSnapshot.val()
      Object.values(groupsData).forEach((avatar: any) => {
        groups.push(avatar as AvatarData)
      })
    }
    
    console.log(`[FundFlow] Loaded ${users.length} user avatars and ${groups.length} group avatars from Firebase`)
  } catch (error) {
    console.error("[FundFlow] Failed to get all stored avatars from Firebase:", error)
  }
  
  return { users, groups }
}

// Clear all avatar data from Firebase (for testing/reset purposes)
export async function clearAllAvatarData(): Promise<void> {
  try {
    const avatarsRef = ref(db, AVATARS_PATH)
    await remove(avatarsRef)
    console.log("[FundFlow] Cleared all avatar data from Firebase")
  } catch (error) {
    console.error("[FundFlow] Failed to clear avatar data from Firebase:", error)
    throw error
  }
}

// Get avatar data for a specific user or group
export async function getAvatarById(id: string, type: "user" | "group"): Promise<AvatarData | null> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${id}`)
  
  try {
    const snapshot = await get(avatarRef)
    if (snapshot.exists()) {
      return snapshot.val() as AvatarData
    }
    return null
  } catch (error) {
    console.error("[FundFlow] Failed to get avatar by ID from Firebase:", error)
    return null
  }
}

// Delete avatar data for a specific user or group
export async function deleteAvatarData(id: string, type: "user" | "group"): Promise<void> {
  const avatarRef = ref(db, `${AVATARS_PATH}/${type}/${id}`)
  
  try {
    await remove(avatarRef)
    console.log(`[FundFlow] Deleted avatar data from Firebase for ${type}:`, id)
  } catch (error) {
    console.error("[FundFlow] Failed to delete avatar data from Firebase:", error)
    throw error
  }
}

// Search avatars by name
export async function searchAvatarsByName(name: string, type: "user" | "group"): Promise<AvatarData[]> {
  const avatarsRef = ref(db, `${AVATARS_PATH}/${type}`)
  const nameQuery = query(avatarsRef, orderByChild('name'), equalTo(name))
  
  try {
    const snapshot = await get(nameQuery)
    const avatars: AvatarData[] = []
    
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.values(data).forEach((avatar: any) => {
        avatars.push(avatar as AvatarData)
      })
    }
    
    return avatars
  } catch (error) {
    console.error("[FundFlow] Failed to search avatars by name in Firebase:", error)
    return []
  }
}
