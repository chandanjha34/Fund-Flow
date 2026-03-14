import { db } from './firebase'
import { ref, push, set, get, update, onValue } from 'firebase/database'
import { syncWithKalshi, isKalshiAvailable, placeKalshiBet } from './kalshi-integration'
import { Amount, CIRCLE_TOKEN } from '@/lib/starkzap'

const LOCAL_PREDICTIONS_KEY = 'fundflow_predictions'
const LOCAL_VOTES_KEY = 'fundflow_prediction_votes'

export interface PredictionProposal {
  id: string
  circleId: string
  creator: string
  createdAt: number
  
  // Proposal details
  title: string
  description: string
  closesAt: number // timestamp when voting closes
  
  // Market details
  options: PredictionOption[]
  totalStake: number
  
  // Status
  status: 'active' | 'closed' | 'pending_result' | 'resolved'
  winningOption?: string
  resultSubmittedBy?: string
  resultSubmittedAt?: number
  settleAfter?: number
  payoutWindowHours?: number
  treasuryAddress?: string
  resultInputs?: Record<string, string>
  settledAt?: number
  payoutTxHash?: string
  
  // Kalshi integration
  kalshiTicker?: string
  kalshiSynced?: boolean
  kalshiSyncMessage?: string
}

export interface PredictionOption {
  id: string
  label: string
  stake: number
  voters: string[] // wallet addresses
}

export interface Vote {
  proposalId: string
  voter: string
  optionId: string
  amount: number
  timestamp: number
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined'
}

function getLocalPredictionsStore(): Record<string, Record<string, PredictionProposal>> {
  if (!canUseLocalStorage()) return {}

  try {
    const raw = window.localStorage.getItem(LOCAL_PREDICTIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalPredictionsStore(store: Record<string, Record<string, PredictionProposal>>): void {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(LOCAL_PREDICTIONS_KEY, JSON.stringify(store))
}

function getLocalVotesStore(): Record<string, Record<string, Vote>> {
  if (!canUseLocalStorage()) return {}

  try {
    const raw = window.localStorage.getItem(LOCAL_VOTES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalVotesStore(store: Record<string, Record<string, Vote>>): void {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(store))
}

function saveLocalProposal(circleId: string, proposal: PredictionProposal): void {
  const store = getLocalPredictionsStore()
  store[circleId] = store[circleId] || {}
  store[circleId][proposal.id] = proposal
  saveLocalPredictionsStore(store)
}

function updateLocalProposal(circleId: string, proposalId: string, updates: Partial<PredictionProposal>): PredictionProposal | null {
  const store = getLocalPredictionsStore()
  const existing = store[circleId]?.[proposalId]
  if (!existing) return null

  const next = normalizeProposal({ ...existing, ...updates })
  store[circleId][proposalId] = next
  saveLocalPredictionsStore(store)
  return next
}

function getLocalCircleProposals(circleId: string): PredictionProposal[] {
  const proposals = Object.values(getLocalPredictionsStore()[circleId] || {})
  return proposals.map(normalizeProposal).sort((a, b) => b.createdAt - a.createdAt)
}

function getLocalProposal(circleId: string, proposalId: string): PredictionProposal | null {
  const proposal = getLocalPredictionsStore()[circleId]?.[proposalId]
  return proposal ? normalizeProposal(proposal) : null
}

function saveLocalVote(vote: Vote): void {
  const store = getLocalVotesStore()
  store[vote.proposalId] = store[vote.proposalId] || {}
  store[vote.proposalId][vote.voter] = vote
  saveLocalVotesStore(store)
}

function getLocalProposalVotes(proposalId: string): Record<string, Vote> {
  return getLocalVotesStore()[proposalId] || {}
}

function normalizeProposal(proposal: any): PredictionProposal {
  const normalized: PredictionProposal = {
    ...proposal,
    options: Array.isArray(proposal.options)
      ? proposal.options.map((opt: any) => ({
          ...opt,
          voters: Array.isArray(opt.voters) ? opt.voters : [],
          stake: typeof opt.stake === 'number' ? opt.stake : Number(opt.stake || 0),
        }))
      : [],
    totalStake: typeof proposal.totalStake === 'number' ? proposal.totalStake : Number(proposal.totalStake || 0),
    status: proposal.status || 'active',
    payoutWindowHours:
      typeof proposal.payoutWindowHours === 'number' && proposal.payoutWindowHours > 0
        ? proposal.payoutWindowHours
        : 24,
    resultInputs: proposal.resultInputs && typeof proposal.resultInputs === 'object' ? proposal.resultInputs : {},
  }

  if (normalized.status === 'active' && Date.now() > normalized.closesAt) {
    normalized.status = 'closed'
  }

  return normalized
}

async function getProposal(circleId: string, proposalId: string): Promise<PredictionProposal> {
  const localProposal = getLocalProposal(circleId, proposalId)
  if (localProposal) {
    return localProposal
  }

  const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
  const snapshot = await get(proposalRef)
  if (!snapshot.exists()) {
    throw new Error('Proposal not found')
  }

  const proposal = normalizeProposal(snapshot.val())
  if (proposal.status === 'closed' && snapshot.val().status !== 'closed') {
    await update(proposalRef, { status: 'closed' })
  }
  return proposal
}

async function getProposalVotes(proposalId: string): Promise<Record<string, Vote>> {
  const localVotes = getLocalProposalVotes(proposalId)
  if (Object.keys(localVotes).length > 0) {
    return localVotes
  }

  const voteRef = ref(db, `votes/${proposalId}`)
  const snapshot = await get(voteRef)
  if (!snapshot.exists()) return {}
  return snapshot.val() as Record<string, Vote>
}

/**
 * Create a new prediction proposal
 */
export async function createProposal(
  circleId: string,
  creator: string,
  title: string,
  description: string,
  options: string[],
  durationHours: number,
  kalshiTicker?: string,
  config?: { treasuryAddress?: string; payoutWindowHours?: number }
): Promise<string> {
  try {
    // Only one active proposal per circle; resolved/closed proposals are allowed.
    const existingProposals = await getCircleProposals(circleId)
    const now = Date.now()
    const hasActive = existingProposals.some(
      (proposal) => proposal.status === 'active' && proposal.closesAt > now,
    )
    if (hasActive) {
      throw new Error('This circle already has an active prediction proposal. Only one proposal per circle is allowed.')
    }

    const proposalsRef = ref(db, `predictions/${circleId}`)
    const newProposalRef = push(proposalsRef)
    const proposalId = newProposalRef.key!

    const closesAt = Date.now() + (durationHours * 60 * 60 * 1000)

    const proposal: PredictionProposal = {
      id: proposalId,
      circleId,
      creator,
      createdAt: Date.now(),
      title,
      description,
      closesAt,
      options: options.map(label => ({
        id: `opt_${Math.random().toString(36).substring(7)}`,
        label,
        stake: 0,
        voters: [] // Always initialize as empty array
      })),
      totalStake: 0,
      status: 'active',
      payoutWindowHours: config?.payoutWindowHours ?? 24,
      treasuryAddress: config?.treasuryAddress,
    }

    saveLocalProposal(circleId, proposal)

    try {
      await set(newProposalRef, proposal)
    } catch (error) {
      console.warn('[PredictionMarket] Firebase create failed, keeping local proposal:', error)
    }
    
    // If Kalshi ticker provided directly, use it
    if (kalshiTicker) {
      console.log('[PredictionMarket] ✅ Linking to Kalshi market:', kalshiTicker)
        const kalshiUpdates = {
        kalshiTicker: kalshiTicker,
        kalshiSynced: true,
        kalshiSyncMessage: `Linked to Kalshi market: ${kalshiTicker}`
        }
        updateLocalProposal(circleId, proposalId, kalshiUpdates)
        try {
          await update(newProposalRef, kalshiUpdates)
        } catch (error) {
          console.warn('[PredictionMarket] Firebase Kalshi link update failed:', error)
        }
    } else {
      // Otherwise, try to sync with Kalshi if available
      console.log('[PredictionMarket] Syncing with Kalshi...')
      const kalshiSync = await syncWithKalshi(proposalId, {
        title,
        description,
        options,
        totalStake: 0,
        closesAt
      })
      
      // Update proposal with Kalshi sync status
      if (kalshiSync.synced) {
        const kalshiUpdates = {
          kalshiTicker: kalshiSync.kalshiTicker,
          kalshiSynced: true,
          kalshiSyncMessage: kalshiSync.message
        }
        updateLocalProposal(circleId, proposalId, kalshiUpdates)
        try {
          await update(newProposalRef, kalshiUpdates)
        } catch (error) {
          console.warn('[PredictionMarket] Firebase Kalshi sync update failed:', error)
        }
        console.log('[PredictionMarket] ✅ Synced with Kalshi:', kalshiSync.kalshiTicker)
      } else {
        const localOnlyUpdates = {
          kalshiSynced: false,
          kalshiSyncMessage: kalshiSync.message
        }
        updateLocalProposal(circleId, proposalId, localOnlyUpdates)
        try {
          await update(newProposalRef, localOnlyUpdates)
        } catch (error) {
          console.warn('[PredictionMarket] Firebase local-mode update failed:', error)
        }
        console.log('[PredictionMarket] ℹ️ Running in local mode:', kalshiSync.message)
      }
    }
    
    return proposalId
  } catch (error) {
    console.error('Error creating proposal:', error)
    throw error
  }
}

/**
 * Get all proposals for a circle
 */
export async function getCircleProposals(circleId: string): Promise<PredictionProposal[]> {
  try {
    const localProposals = getLocalCircleProposals(circleId)
    const proposalsRef = ref(db, `predictions/${circleId}`)
    const snapshot = await get(proposalsRef)
    
    if (!snapshot.exists()) {
      return localProposals
    }

    const proposals: PredictionProposal[] = []
    snapshot.forEach((child) => {
      const proposal = normalizeProposal(child.val())
      proposals.push(proposal)
    })

    const mergedById = new Map<string, PredictionProposal>()
    for (const proposal of proposals) mergedById.set(proposal.id, proposal)
    for (const proposal of localProposals) mergedById.set(proposal.id, proposal)

    return Array.from(mergedById.values()).sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return getLocalCircleProposals(circleId)
  }
}

/**
 * Place a bet on a proposal option
 */
export async function placeBet(
  proposalId: string,
  circleId: string,
  voter: string,
  optionId: string,
  amount: number,
  wallet?: any,
  treasuryAddress?: string,
): Promise<void> {
  try {
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Bet amount must be greater than 0')
    }

    const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
    const proposal = await getProposal(circleId, proposalId)
    
    if (proposal.status !== 'active') {
      throw new Error('Proposal is not active')
    }

    if (Date.now() > proposal.closesAt) {
      throw new Error('Voting has closed')
    }

    // Update option
    const optionIndex = proposal.options.findIndex(opt => opt.id === optionId)
    if (optionIndex === -1) {
      throw new Error('Option not found')
    }

    // Check if user already voted (with defensive checks)
    const hasVoted = proposal.options.some(opt => 
      opt.voters && Array.isArray(opt.voters) && opt.voters.includes(voter)
    )
    if (hasVoted) {
      throw new Error('You have already placed a bet on this proposal')
    }

    // Ensure voters array exists before pushing
    if (!proposal.options[optionIndex].voters) {
      proposal.options[optionIndex].voters = []
    }

    if (wallet && (treasuryAddress || proposal.treasuryAddress)) {
      const recipient = treasuryAddress || proposal.treasuryAddress
      if (!recipient) {
        throw new Error('Treasury address missing for bet transfer')
      }
      const tx = await wallet.transfer(
        CIRCLE_TOKEN,
        [{ to: recipient as any, amount: Amount.parse(String(amount), CIRCLE_TOKEN) }],
        { feeMode: 'sponsored' },
      )
      if (typeof tx?.wait === 'function') {
        await tx.wait()
      }
    }

    proposal.options[optionIndex].stake = (proposal.options[optionIndex].stake || 0) + amount
    proposal.options[optionIndex].voters.push(voter)
    proposal.totalStake = (proposal.totalStake || 0) + amount

    updateLocalProposal(circleId, proposalId, {
      options: proposal.options,
      totalStake: proposal.totalStake,
    })

    try {
      await update(proposalRef, {
        options: proposal.options,
        totalStake: proposal.totalStake
      })
    } catch (error) {
      console.warn('[PredictionMarket] Firebase bet update failed, keeping local state:', error)
    }

    // Record the vote
    const voteRef = ref(db, `votes/${proposalId}/${voter}`)
    const vote: Vote = {
      proposalId,
      voter,
      optionId,
      amount,
      timestamp: Date.now()
    }
    saveLocalVote(vote)
    try {
      await set(voteRef, vote)
    } catch (error) {
      console.warn('[PredictionMarket] Firebase vote write failed, keeping local vote:', error)
    }
    
    // Sync bet with Kalshi if market is linked
    if (proposal.kalshiTicker && isKalshiAvailable()) {
      console.log('[PredictionMarket] Syncing bet with Kalshi...')
      const selectedOption = proposal.options[optionIndex]
      
      // For binary markets (Yes/No), map to Kalshi sides
      const side = selectedOption.label.toLowerCase().includes('yes') ? 'yes' : 'no'
      
      try {
        await placeKalshiBet(proposal.kalshiTicker, side, amount)
        console.log('[PredictionMarket] ✅ Bet synced with Kalshi')
      } catch (kalshiError) {
        console.warn('[PredictionMarket] Kalshi bet sync failed, continuing with local bet:', kalshiError)
        // Don't throw - local bet is still valid even if Kalshi sync fails
      }
    }
  } catch (error) {
    console.error('Error placing bet:', error)
    throw error
  }
}

/**
 * Subscribe to proposals updates for a circle
 */
export function subscribeToProposals(
  circleId: string,
  callback: (proposals: PredictionProposal[]) => void
): () => void {
  callback(getLocalCircleProposals(circleId))

  const proposalsRef = ref(db, `predictions/${circleId}`)
  
  const unsubscribe = onValue(proposalsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(getLocalCircleProposals(circleId))
      return
    }

    const proposals: PredictionProposal[] = []
    snapshot.forEach((child) => {
      const proposal = normalizeProposal(child.val())
      proposals.push(proposal)
    })

    const localProposals = getLocalCircleProposals(circleId)
    const mergedById = new Map<string, PredictionProposal>()
    for (const proposal of proposals) mergedById.set(proposal.id, proposal)
    for (const proposal of localProposals) mergedById.set(proposal.id, proposal)

    callback(Array.from(mergedById.values()).sort((a, b) => b.createdAt - a.createdAt))
  })

  return unsubscribe
}

/**
 * Resolve a proposal (admin only)
 */
export async function resolveProposal(
  proposalId: string,
  circleId: string,
  winningOptionId: string
): Promise<void> {
  try {
    const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
    updateLocalProposal(circleId, proposalId, {
      status: 'resolved',
      winningOption: winningOptionId,
    })
    
    try {
      await update(proposalRef, {
        status: 'resolved',
        winningOption: winningOptionId
      })
    } catch (error) {
      console.warn('[PredictionMarket] Firebase resolve failed, keeping local state:', error)
    }
  } catch (error) {
    console.error('Error resolving proposal:', error)
    throw error
  }
}

export async function submitProposalResult(
  proposalId: string,
  circleId: string,
  resolver: string,
  winningOptionId: string,
): Promise<void> {
  const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
  const proposal = await getProposal(circleId, proposalId)

  if (Date.now() < proposal.closesAt) {
    throw new Error('You can submit result only after the market deadline')
  }

  const optionExists = proposal.options.some((opt) => opt.id === winningOptionId)
  if (!optionExists) {
    throw new Error('Invalid winning option')
  }

  const now = Date.now()
  const payoutWindowHours = proposal.payoutWindowHours || 24

  const pendingResultUpdate = {
    status: 'pending_result',
    winningOption: winningOptionId,
    resultSubmittedBy: resolver,
    resultSubmittedAt: now,
    settleAfter: now + payoutWindowHours * 60 * 60 * 1000,
    resultInputs: {
      ...(proposal.resultInputs || {}),
      [resolver]: winningOptionId,
    },
  }

  updateLocalProposal(circleId, proposalId, pendingResultUpdate)
  try {
    await update(proposalRef, pendingResultUpdate)
  } catch (error) {
    console.warn('[PredictionMarket] Firebase pending-result update failed, keeping local state:', error)
  }
}

export async function submitResultInput(
  proposalId: string,
  circleId: string,
  voter: string,
  optionId: string,
): Promise<void> {
  const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
  const proposal = await getProposal(circleId, proposalId)

  if (proposal.status !== 'pending_result') {
    throw new Error('Result input is available only during pending result window')
  }

  if (!proposal.settleAfter || Date.now() > proposal.settleAfter) {
    throw new Error('Result input window has closed')
  }

  const optionExists = proposal.options.some((opt) => opt.id === optionId)
  if (!optionExists) {
    throw new Error('Invalid option')
  }

  const resultInputUpdate = {
    resultInputs: {
      ...(proposal.resultInputs || {}),
      [voter]: optionId,
    },
  }

  updateLocalProposal(circleId, proposalId, resultInputUpdate)
  try {
    await update(proposalRef, resultInputUpdate)
  } catch (error) {
    console.warn('[PredictionMarket] Firebase result-input update failed, keeping local state:', error)
  }
}

export async function finalizeProposalAndPayout(
  proposalId: string,
  circleId: string,
  resolverAddress: string,
  wallet?: any,
): Promise<void> {
  const proposalRef = ref(db, `predictions/${circleId}/${proposalId}`)
  const proposal = await getProposal(circleId, proposalId)

  if (proposal.status !== 'pending_result') {
    throw new Error('Proposal is not ready for final settlement')
  }

  if (!proposal.settleAfter || Date.now() < proposal.settleAfter) {
    throw new Error('Settlement window is still active')
  }

  if (!proposal.treasuryAddress) {
    throw new Error('Treasury address missing on proposal')
  }

  if (resolverAddress.toLowerCase() !== proposal.treasuryAddress.toLowerCase()) {
    throw new Error('Only the circle treasury owner can finalize payouts')
  }

  if (!wallet || typeof wallet.transfer !== 'function') {
    throw new Error('A connected wallet is required to send payouts')
  }

  const votesByAddress = await getProposalVotes(proposalId)
  const resultInputs = proposal.resultInputs || {}

  const inputCounts: Record<string, number> = {}
  Object.values(resultInputs).forEach((optionId) => {
    inputCounts[optionId] = (inputCounts[optionId] || 0) + 1
  })

  let finalWinningOption = proposal.winningOption || ''
  const majorityOption = Object.entries(inputCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (majorityOption) {
    finalWinningOption = majorityOption
  }

  if (!finalWinningOption) {
    throw new Error('No winning option selected')
  }

  const winningVotes = Object.values(votesByAddress).filter((vote) => vote.optionId === finalWinningOption)
  const totalWinningStake = winningVotes.reduce((sum, vote) => sum + Number(vote.amount || 0), 0)
  const totalPot = Number(proposal.totalStake || 0)

  if (totalPot <= 0) {
    const noPayoutUpdate = {
      status: 'resolved',
      winningOption: finalWinningOption,
      settledAt: Date.now(),
    }
    updateLocalProposal(circleId, proposalId, noPayoutUpdate)
    try {
      await update(proposalRef, noPayoutUpdate)
    } catch (error) {
      console.warn('[PredictionMarket] Firebase finalize update failed, keeping local state:', error)
    }
    return
  }

  const transfers: Array<{ to: string; amount: Amount }> = []

  if (totalWinningStake > 0) {
    for (const vote of winningVotes) {
      const ratio = Number(vote.amount || 0) / totalWinningStake
      const payout = Math.max(0, Number((totalPot * ratio).toFixed(6)))
      if (payout > 0) {
        transfers.push({
          to: vote.voter,
          amount: Amount.parse(String(payout), CIRCLE_TOKEN),
        })
      }
    }
  } else {
    // No winner selected by bets; refund everyone.
    for (const vote of Object.values(votesByAddress)) {
      const refund = Math.max(0, Number(vote.amount || 0))
      if (refund > 0) {
        transfers.push({
          to: vote.voter,
          amount: Amount.parse(String(refund), CIRCLE_TOKEN),
        })
      }
    }
  }

  let payoutTxHash = ''
  if (transfers.length > 0) {
    const tx = await wallet.transfer(CIRCLE_TOKEN, transfers, { feeMode: 'sponsored' })
    payoutTxHash = (tx as any)?.hash || (tx as any)?.transaction_hash || ''
    if (typeof tx?.wait === 'function') {
      await tx.wait()
    }
  }

  const finalUpdate = {
    status: 'resolved',
    winningOption: finalWinningOption,
    settledAt: Date.now(),
    payoutTxHash,
  }
  updateLocalProposal(circleId, proposalId, finalUpdate)
  try {
    await update(proposalRef, finalUpdate)
  } catch (error) {
    console.warn('[PredictionMarket] Firebase payout finalize failed, keeping local state:', error)
  }
}

/**
 * Calculate payout for a voter
 */
export function calculatePayout(
  proposal: PredictionProposal,
  voter: string
): number {
  if (proposal.status !== 'resolved' || !proposal.winningOption) {
    return 0
  }

  const winningOption = proposal.options.find(opt => opt.id === proposal.winningOption)
  if (!winningOption) {
    return 0
  }

  if (!winningOption.voters.includes(voter)) {
    return 0
  }

  // Simple proportional payout
  // Payout = (user's stake / total winning stake) * total pot
  const userVote = winningOption.voters.filter(v => v === voter).length
  const totalWinningStake = winningOption.stake
  
  return (userVote / totalWinningStake) * proposal.totalStake
}

