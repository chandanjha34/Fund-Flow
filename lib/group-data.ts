import { getGroup } from "@/lib/group-storage"
import { getGroupFromFirebase } from "@/lib/firebase-group-storage"

export interface GroupData {
  id: string
  name: string
  creator: string
  recurringPeriod: string
  amountPerRecurrence: number
  riskLevel: string
  totalDuration: string
  fundingGoal: number
  isPublic: boolean
  createdAt: string
  members: string[]
  totalCollected: number
  status?: string
  groupWalletAddress?: string
  onChainAddress?: string
  circleId?: string | null
  network?: string
  token?: string
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeGroupData(group: GroupData): GroupData {
  return {
    ...group,
    amountPerRecurrence: toNumber(group.amountPerRecurrence, 0),
    fundingGoal: toNumber(group.fundingGoal, 0),
    totalCollected: toNumber(group.totalCollected, 0),
    members: Array.isArray(group.members) ? group.members : [],
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])
}

export async function fetchGroupData(groupId: string): Promise<GroupData | null> {
  const localGroup = getGroup(groupId)
  if (localGroup) {
    return normalizeGroupData(localGroup)
  }

  try {
    const firebaseGroup = await withTimeout(getGroupFromFirebase(groupId), 4000)
    if (firebaseGroup) {
      return normalizeGroupData(firebaseGroup)
    }
  } catch (error) {
    console.warn("[FundFlow] Firebase lookup failed, falling back to local storage:", error)
  }

  return null
}