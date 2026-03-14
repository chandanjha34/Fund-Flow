"use client";

// ============================================================================
// FUNDFLOW — StarkNet Wallet Provider (React Context)
// ============================================================================
// StarkZap Module 1: Wallets
//   - Cartridge Controller: social login (Google/Discord), passkeys/Face ID
//   - Built-in paymaster = gasless transactions for users
// StarkZap Module 2: Paymaster
//   - Cartridge paymaster handles all gas fees automatically
// ============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CARTRIDGE_CONTROLLER_URL,
  CARTRIDGE_PRESET,
  CARTRIDGE_RPC_URL,
  CIRCLE_TOKEN,
  formatTokenAmount,
  getSDK,
} from "@/lib/starkzap";
import { Amount, ChainId } from "starkzap";
import { cairo } from "starknet";
import type { CartridgeWallet } from "starkzap/cartridge";

// ── Context types ──────────────────────────────────────────────────────────────

export interface StarknetWalletContextValue {
  // State
  connected: boolean;
  connecting: boolean;
  address: string | null;
  formattedAddress: string;
  strkBalance: string;
  ethBalance: string;
  walletType: "braavos" | "cartridge" | "demo" | null;

  // Actions
  connect: (mode?: "auto" | "braavos" | "cartridge") => Promise<void>;
  connectDemo: (privateKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;

  // Raw wallet for DeFi operations (staking, transfers, etc.)
  wallet: any | null;
}

const StarknetWalletContext = createContext<StarknetWalletContextValue | null>(null);

export function useStarknet(): StarknetWalletContextValue {
  const ctx = useContext(StarknetWalletContext);
  if (!ctx) throw new Error("useStarknet must be used inside StarknetWalletProvider");
  return ctx;
}

// ── Cartridge policies ─────────────────────────────────────────────────────────
// Preapprove common token operations so users don't need to confirm each tx

const CARTRIDGE_POLICIES = [
  // STRK token operations (transfer for contributions)
  { target: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", method: "transfer" },
  { target: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", method: "approve" },
  // ETH token operations
  { target: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", method: "transfer" },
  { target: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", method: "approve" },
];

// ── StorageKey for persisting wallet type ─────────────────────────────────────
const WALLET_TYPE_KEY = "fundflow_starknet_wallet_type";
const FALLBACK_PK_KEY = "fundflow_starknet_fallback_pk";

function createFallbackPrivateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

function createInjectedBraavosWallet(account: any) {
  const provider = account?.provider;
  if (!provider) {
    throw new Error("Braavos provider is unavailable");
  }

  const waitForTx = async (txLike: any) => {
    const txHash = txLike?.transaction_hash || txLike?.transactionHash;
    if (txHash && typeof provider.waitForTransaction === "function") {
      await provider.waitForTransaction(txHash);
    }
    return txLike;
  };

  return {
    address: account.address as string,
    execute: async (calls: any, _options?: any) => {
      const tx = await account.execute(calls);
      return {
        ...tx,
        wait: async () => waitForTx(tx),
      };
    },
    balanceOf: async (token: any) => {
      const result = await provider.callContract({
        contractAddress: token.address,
        entrypoint: "balanceOf",
        calldata: [account.address],
      });

      const low = BigInt(result?.[0] ?? 0);
      const high = BigInt(result?.[1] ?? 0);
      const raw = low + (high << 128n);
      return Amount.fromRaw(raw, token);
    },
    transfer: async (token: any, transfers: Array<{ to: string; amount: any }>, _options?: any) => {
      const calls = transfers.map((t) => {
        const uint = cairo.uint256(t.amount.toBase());
        return {
          contractAddress: token.address,
          entrypoint: "transfer",
          calldata: [t.to, uint.low, uint.high],
        };
      });

      const tx = await account.execute(calls);
      return {
        ...tx,
        wait: async () => waitForTx(tx),
      };
    },
    disconnect: async () => {
      if (typeof account.disconnect === "function") {
        await account.disconnect();
      }
    },
  };
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function StarknetWalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [strkBalance, setStrkBalance] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [walletType, setWalletType] = useState<"braavos" | "cartridge" | "demo" | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);

  // ── balance helper ────────────────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const [strk, eth] = await Promise.all([
        wallet.balanceOf(CIRCLE_TOKEN).catch(() => Amount.parse("0", CIRCLE_TOKEN)),
        wallet.balanceOf({ name: "Ether", address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7" as any, decimals: 18, symbol: "ETH" }).catch(() => Amount.parse("0", 18, "ETH")),
      ]);
      setStrkBalance(formatTokenAmount(strk));
      setEthBalance(formatTokenAmount(eth));
    } catch (e) {
      console.warn("[StarkNet] Balance refresh failed:", e);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) refreshBalance();
  }, [wallet, refreshBalance]);

  // ── Connect via Cartridge ──────────────────────────────────────────────────────
  // StarkZap Module 1: Wallets + Module 2: Paymaster
  const connect = useCallback(async (mode: "auto" | "braavos" | "cartridge" = "auto") => {
    if (connecting || connected) return;
    setConnecting(true);
    try {
      const sdk = getSDK();
      const canTryBraavos = mode === "auto" || mode === "braavos";
      const canTryCartridge = mode === "auto" || mode === "cartridge";
      const canTryDemoFallback = mode === "auto";

      // Try Braavos first when available as injected wallet provider.
      const braavos = (window as any)?.starknet_braavos;
      if (canTryBraavos && braavos && typeof braavos.enable === "function") {
        try {
          await braavos.enable({ showModal: true });
          const braavosAccount = braavos.account;

          if (!braavosAccount) {
            throw new Error("Braavos account not available after enable");
          }

          const braavosWallet = createInjectedBraavosWallet(braavosAccount);
          setWallet(braavosWallet);
          setAddress((braavosWallet.address as string) || (braavosAccount.address as string));
          setConnected(true);
          setWalletType("braavos");
          localStorage.setItem(WALLET_TYPE_KEY, "braavos");
          console.log("[StarkNet] ✅ Connected via Braavos:", braavosWallet.address || braavosAccount.address);
          return;
        } catch (braavosError) {
          console.warn("[StarkNet] Braavos connection failed:", braavosError);
          if (mode === "braavos") {
            throw braavosError;
          }
        }
      } else if (mode === "braavos") {
        throw new Error("Braavos wallet extension not detected in browser");
      }

      if (!canTryCartridge) {
        throw new Error("No wallet connected");
      }

      const { CartridgeWallet: CW } = await import("starkzap/cartridge");

      const attempts = [
        {
          name: "preset + policies",
          options: {
            rpcUrl: CARTRIDGE_RPC_URL,
            chainId: ChainId.SEPOLIA,
            policies: CARTRIDGE_POLICIES,
            preset: CARTRIDGE_PRESET,
            ...(CARTRIDGE_CONTROLLER_URL ? { url: CARTRIDGE_CONTROLLER_URL } : {}),
          },
        },
        {
          name: "policies only",
          options: {
            rpcUrl: CARTRIDGE_RPC_URL,
            chainId: ChainId.SEPOLIA,
            policies: CARTRIDGE_POLICIES,
            ...(CARTRIDGE_CONTROLLER_URL ? { url: CARTRIDGE_CONTROLLER_URL } : {}),
          },
        },
        {
          name: "minimal",
          options: {
            rpcUrl: CARTRIDGE_RPC_URL,
            chainId: ChainId.SEPOLIA,
            ...(CARTRIDGE_CONTROLLER_URL ? { url: CARTRIDGE_CONTROLLER_URL } : {}),
          },
        },
      ] as const;

      let cw: CartridgeWallet | null = null;
      const failures: string[] = [];

      for (const attempt of attempts) {
        try {
          cw = await CW.create(attempt.options as any);
          console.log(`[StarkNet] Cartridge init succeeded with: ${attempt.name}`);
          break;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          failures.push(`${attempt.name}: ${msg}`);
          console.warn(`[StarkNet] Cartridge init failed (${attempt.name}):`, error);
        }
      }

      if (!cw) {
        if (!canTryDemoFallback) {
          throw new Error("Cartridge initialization failed");
        }

        console.warn("[StarkNet] Falling back to local signer wallet after Cartridge init failures.");

        const { StarkSigner } = await import("starkzap");
        const persistedPk = localStorage.getItem(FALLBACK_PK_KEY);
        const privateKey = persistedPk || createFallbackPrivateKey();
        const signer = new StarkSigner(privateKey);
        const fallbackWallet = await sdk.connectWallet({ account: { signer } });

        if (!persistedPk) {
          localStorage.setItem(FALLBACK_PK_KEY, privateKey);
        }

        setWallet(fallbackWallet as any);
        setAddress(fallbackWallet.address as string);
        setConnected(true);
        setWalletType("demo");
        localStorage.setItem(WALLET_TYPE_KEY, "demo");

        console.warn("[StarkNet] Cartridge unavailable, connected fallback wallet:", fallbackWallet.address);
        console.warn("[StarkNet] Cartridge failure details:", failures.join(" | "));
        return;
      }

      setWallet(cw as any);
      setAddress(cw.address as string);
      setConnected(true);
      setWalletType("cartridge");
      localStorage.setItem(WALLET_TYPE_KEY, "cartridge");
      console.log("[StarkNet] ✅ Connected via Cartridge:", cw.address);
    } catch (err) {
      console.error("[StarkNet] Cartridge connection failed:", err);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [connecting, connected]);

  // ── Demo connect (dev only, never expose key in prod) ────────────────────────
  const connectDemo = useCallback(async (privateKey: string) => {
    if (connecting || connected) return;
    setConnecting(true);
    try {
      const { StarkSigner, Wallet } = await import("starkzap");
      const sdk = getSDK();
      const signer = new StarkSigner(privateKey);
      const demoWallet = await sdk.connectWallet({ account: { signer } });
      setWallet(demoWallet as any);
      setAddress(demoWallet.address as string);
      setConnected(true);
      setWalletType("demo");
      localStorage.setItem(WALLET_TYPE_KEY, "demo");
    } catch (err) {
      console.error("[StarkNet] Demo connection failed:", err);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [connecting, connected]);

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      if (wallet && walletType === "cartridge") {
        await (wallet as any).disconnect?.();
      }
    } catch (_) {}
    setWallet(null);
    setAddress(null);
    setConnected(false);
    setWalletType(null);
    setStrkBalance("");
    setEthBalance("");
    localStorage.removeItem(WALLET_TYPE_KEY);
  }, [wallet, walletType]);

  const formattedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const value: StarknetWalletContextValue = {
    connected,
    connecting,
    address,
    formattedAddress,
    strkBalance,
    ethBalance,
    walletType,
    connect,
    connectDemo,
    disconnect,
    refreshBalance,
    wallet,
  };

  return (
    <StarknetWalletContext.Provider value={value}>
      {children}
    </StarknetWalletContext.Provider>
  );
}
