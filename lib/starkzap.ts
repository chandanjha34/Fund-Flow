// ============================================================================
// FUNDFLOW — StarkZap SDK Core
// ============================================================================
// All three StarkZap modules:
//   1. Wallets  — Cartridge Controller (social login + passkeys)
//   2. Paymaster — Cartridge built-in paymaster (gasless)
//   3. DeFi      — STRK staking + ERC20 token transfers
// Network: Starknet Sepolia testnet
// ============================================================================

import { StarkZap, StarkSigner, Amount, sepoliaTokens } from "starkzap";
import type { Token, Address } from "starkzap";

// ── Network ──────────────────────────────────────────────────────────────────

export const NETWORK = "sepolia" as const;

// ── SDK singleton (server/client shared) ──────────────────────────────────────
// Lazily created per-call to avoid SSR issues with browser APIs

let _sdk: InstanceType<typeof StarkZap> | null = null;
export function getSDK(): InstanceType<typeof StarkZap> {
  if (!_sdk) {
    _sdk = new StarkZap({ network: NETWORK });
  }
  return _sdk;
}

// ── Token presets (Sepolia) ────────────────────────────────────────────────────

export const STRK: Token = sepoliaTokens.STRK;
export const ETH: Token = sepoliaTokens.ETH;
export const USDC: Token = sepoliaTokens.USDC;

// Default token used for circle contributions
export const CIRCLE_TOKEN = STRK;
export const CIRCLE_JOIN_AMOUNT_STR = "10"; // 10 STRK to join a circle
export const CIRCLE_CONTRIBUTION_STR = "5"; // 5 STRK contribution

// ── Starknet Sepolia explorer ─────────────────────────────────────────────────

export const EXPLORER_BASE = "https://sepolia.voyager.online";
export function txExplorerUrl(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}
export function addressExplorerUrl(address: string) {
  return `${EXPLORER_BASE}/contract/${address}`;
}

// ── Sepolia faucet ────────────────────────────────────────────────────────────

export const FAUCET_URL = "https://starknet-faucet.vercel.app/";

// ── Amount helpers ────────────────────────────────────────────────────────────

export function parseSTRK(value: string | number): Amount {
  return Amount.parse(String(value), STRK);
}

export function formatTokenAmount(amount: Amount): string {
  return amount.toFormatted(true);
}

// ── StarkSigner helper for demo/dev mode ──────────────────────────────────────

export { StarkSigner, Amount };
export type { Token, Address };

// ── Cartridge Controller RPC URL ──────────────────────────────────────────────
// Used by CartridgeWallet when instantiated client-side

export const CARTRIDGE_RPC_URL =
  process.env.NEXT_PUBLIC_CARTRIDGE_RPC_URL ||
  "https://api.cartridge.gg/x/starknet/sepolia";

export const CARTRIDGE_CONTROLLER_URL =
  process.env.NEXT_PUBLIC_CARTRIDGE_CONTROLLER_URL;

export const CARTRIDGE_PRESET =
  process.env.NEXT_PUBLIC_CARTRIDGE_PRESET || "fundflow";

export const STARKNET_RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";

// ── Circle treasury concept ────────────────────────────────────────────────────
// Each circle is identified by its Firebase ID.
// On-chain interactions use the circle creator's address as treasury proxy.
// All contributions are tracked off-chain in Firebase with on-chain receipts.

export interface StarknetCircle {
  id: string;
  name: string;
  creator: string; // StarkNet address
  members: string[];
  totalCollected: number;
  fundingGoal: number;
  recurringPeriod: string;
  amountPerRecurrence: number;
  riskLevel: string;
  totalDuration: string;
  isPublic: boolean;
  createdAt: string;
  status: string;
  network: string; // "sepolia"
  token: string;   // "STRK"
}
