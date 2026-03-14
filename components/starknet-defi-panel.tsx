"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStarknet } from "@/components/starknet-wallet-provider";
import { getSDK } from "@/lib/starkzap";
import { Amount, sepoliaValidators } from "starkzap";
import type { Pool } from "starkzap";
import { Loader2, Coins, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function StarknetDefiPanel() {
  const { wallet, connected } = useStarknet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [stakeAmount, setStakeAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [positionText, setPositionText] = useState<string>("Not staked yet");
  const [rewardText, setRewardText] = useState<string>("0 STRK");

  const loadPools = useCallback(async () => {
    if (!connected || !wallet) return;

    setIsLoading(true);
    try {
      const sdk = getSDK();
      const validator = Object.values(sepoliaValidators)[0];
      if (!validator) {
        throw new Error("No Sepolia validators available in StarkZap presets");
      }

      const availablePools = await sdk.getStakerPools(validator.stakerAddress as any);
      setPools(availablePools);

      const strkPool =
        availablePools.find((pool) => pool.token.symbol === "STRK") ||
        availablePools[0] ||
        null;

      setSelectedPool(strkPool);

      if (strkPool) {
        const position = await wallet.getPoolPosition(strkPool.poolContract as any);
        if (position) {
          setPositionText(position.staked.toFormatted(true));
          setRewardText(position.rewards.toFormatted(true));
        } else {
          setPositionText("Not staked yet");
          setRewardText("0 STRK");
        }
      }
    } catch (error) {
      console.error("[DeFi] Failed to load staking pools:", error);
      toast.error("Could not load staking pools", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }, [connected, wallet]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  const selectedTokenSymbol = useMemo(
    () => selectedPool?.token.symbol ?? "STRK",
    [selectedPool],
  );

  const handleStake = async () => {
    if (!wallet || !selectedPool) {
      toast.error("Connect wallet and select a pool first");
      return;
    }

    const amountNum = Number(stakeAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsStaking(true);
    try {
      const amount = Amount.parse(String(amountNum), selectedPool.token);
      const tx = await wallet.stake(selectedPool.poolContract as any, amount, {
        feeMode: "sponsored",
      });
      await tx.wait();

      toast.success("Staking transaction sent", {
        description: `Staked ${amount.toFormatted(true)} in ${selectedPool.token.symbol} pool`,
      });

      await loadPools();
    } catch (error) {
      console.error("[DeFi] Staking failed:", error);
      toast.error("Staking failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!wallet || !selectedPool) {
      toast.error("Connect wallet and select a pool first");
      return;
    }

    setIsClaiming(true);
    try {
      const tx = await wallet.claimPoolRewards(selectedPool.poolContract as any, {
        feeMode: "sponsored",
      });
      await tx.wait();
      toast.success("Rewards claimed");
      await loadPools();
    } catch (error) {
      console.error("[DeFi] Claim failed:", error);
      toast.error("Claim failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">Starknet DeFi (StarkZap)</h3>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadPools} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">Wallets: Cartridge</Badge>
          <Badge variant="outline">Paymaster: Gasless</Badge>
          <Badge className="bg-accent/15 text-accent border-accent/30">Module: DeFi</Badge>
        </div>

        {!connected && (
          <p className="text-sm text-muted-foreground">Connect your Starknet wallet to use staking.</p>
        )}

        {connected && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Available pools: <span className="text-foreground font-medium">{pools.length}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground mb-1">Current Position</p>
                <p className="font-semibold">{positionText}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground mb-1">Rewards</p>
                <p className="font-semibold">{rewardText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder={`Amount in ${selectedTokenSymbol}`}
              />
              <Button
                type="button"
                className="bg-accent hover:bg-accent/90"
                onClick={handleStake}
                disabled={isStaking || !selectedPool}
              >
                {isStaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                <span className="ml-2">Stake</span>
              </Button>
            </div>

            <Button type="button" variant="outline" onClick={handleClaimRewards} disabled={isClaiming || !selectedPool}>
              {isClaiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Claim Rewards
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
