import type { GroupData } from "@/lib/group-data";
import { contributeOnchain, createCircleOnchain, joinCircleOnchain } from "@/lib/fundflow-contract";
import { db } from "@/lib/firebase";
import { getGroup, saveGroup } from "@/lib/group-storage";
import { get, ref, set, update } from "firebase/database";

const GROUPS_PATH = "groups";
const CREATE_SYNC_TIMEOUT_MS = 2500;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createGroupId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function createStarknetGroup(
  group: Omit<GroupData, "id" | "createdAt" | "status">,
  wallet?: any,
): Promise<string> {
  const groupId = createGroupId();
  const groupRef = ref(db, `${GROUPS_PATH}/${groupId}`);

  const payload: GroupData = {
    ...group,
    id: groupId,
    createdAt: new Date().toISOString(),
    status: "active",
    onChainAddress: group.creator,
    circleId: groupId,
  };

  // Save locally first so UI can navigate instantly even on slow network.
  saveGroup(payload);

  // Optional: register the circle in Starknet contract when configured.
  if (wallet) {
    try {
      await createCircleOnchain(wallet, {
        code: groupId,
        fundingGoal: payload.fundingGoal,
        recurringAmount: payload.amountPerRecurrence,
        riskLevel: payload.riskLevel,
        totalDuration: payload.totalDuration,
        isPublic: payload.isPublic,
      });
    } catch (error) {
      console.warn("[FundFlow] On-chain circle creation failed, continuing with off-chain storage:", error);
    }
  }

  const firebaseWrite = set(groupRef, payload);
  try {
    await withTimeout(firebaseWrite, CREATE_SYNC_TIMEOUT_MS);
  } catch (error) {
    console.warn("[FundFlow] Firebase create is slow/unavailable, continuing with local group.", error);
    // Keep syncing in background so the group becomes shareable once network recovers.
    void firebaseWrite.catch((syncError) => {
      console.warn("[FundFlow] Background Firebase sync failed:", syncError);
    });
  }

  return groupId;
}

export async function joinStarknetGroup(
  groupId: string,
  memberAddress: string,
  wallet?: any,
): Promise<void> {
  const groupRef = ref(db, `${GROUPS_PATH}/${groupId}`);
  let group: GroupData | null = null;

  try {
    const snapshot = await get(groupRef);
    if (snapshot.exists()) {
      group = snapshot.val() as GroupData;
    }
  } catch (error) {
    console.warn("[FundFlow] Firebase read failed during join, trying local cache:", error);
  }

  if (!group) {
    group = getGroup(groupId);
  }

  if (!group) {
    throw new Error("Group not found");
  }

  if (wallet) {
    try {
      await joinCircleOnchain(wallet, groupId);
    } catch (error) {
      console.warn("[FundFlow] On-chain join failed, continuing with off-chain membership:", error);
    }
  }

  if (group.members.includes(memberAddress)) {
    return;
  }

  const nextMembers = [...group.members, memberAddress];
  const nextTotalCollected = toNumber(group.totalCollected, 0) + 10;

  // Update local cache first.
  saveGroup({
    ...group,
    members: nextMembers,
    totalCollected: nextTotalCollected,
  });

  try {
    await update(groupRef, {
      members: nextMembers,
      totalCollected: nextTotalCollected,
    });
  } catch (error) {
    console.warn("[FundFlow] Firebase join update failed, local state kept:", error);
  }
}

export async function contributeToStarknetGroup(
  groupId: string,
  amount: number,
  wallet?: any,
): Promise<void> {
  const groupRef = ref(db, `${GROUPS_PATH}/${groupId}`);
  let group: GroupData | null = null;

  try {
    const snapshot = await get(groupRef);
    if (snapshot.exists()) {
      group = snapshot.val() as GroupData;
    }
  } catch (error) {
    console.warn("[FundFlow] Firebase read failed during contribution, trying local cache:", error);
  }

  if (!group) {
    group = getGroup(groupId);
  }

  if (!group) {
    throw new Error("Group not found");
  }

  const normalizedAmount = toNumber(amount, 0);
  if (normalizedAmount <= 0) {
    throw new Error("Contribution amount must be greater than 0");
  }

  if (wallet) {
    try {
      await contributeOnchain(wallet, groupId, normalizedAmount);
    } catch (error) {
      console.warn("[FundFlow] On-chain contribution failed, continuing with off-chain update:", error);
    }
  }

  const nextTotalCollected = toNumber(group.totalCollected, 0) + normalizedAmount;

  saveGroup({
    ...group,
    totalCollected: nextTotalCollected,
  });

  try {
    await update(groupRef, {
      totalCollected: nextTotalCollected,
    });
  } catch (error) {
    console.warn("[FundFlow] Firebase contribution update failed, local state kept:", error);
  }
}
