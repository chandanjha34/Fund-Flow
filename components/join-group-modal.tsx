"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStarknet } from "@/components/starknet-wallet-provider"
import { fetchGroupData } from "@/lib/group-data"
import { joinStarknetGroup } from "@/lib/starknet-group-storage"
import { Loader2, QrCode, ArrowRight, Wallet, Coins } from "lucide-react"
import { QrScannerDialog } from "./qr-scanner-dialog"
import { toast } from "sonner"
import { Amount } from "starkzap"
import { CIRCLE_JOIN_AMOUNT_STR, CIRCLE_TOKEN, FAUCET_URL } from "@/lib/starkzap"

interface JoinCircleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinCircleModal({ open, onOpenChange }: JoinCircleModalProps) {
  const router = useRouter()
  const { address, connected, wallet } = useStarknet()

  const [isJoining, setIsJoining] = useState(false)
  const [groupCode, setGroupCode] = useState("")
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [showTransactionSimulation, setShowTransactionSimulation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected || !address || !wallet) {
      toast.error("Connect your Starknet wallet first")
      return
    }

    const normalizedCode = groupCode.trim().toUpperCase()
    if (!normalizedCode) {
      toast.error("Enter a circle code")
      return
    }

    if (normalizedCode.length < 6) {
      toast.error("Circle code should be 6 characters")
      return
    }

    setIsJoining(true)
    setShowTransactionSimulation(true)

    try {
      const group = await fetchGroupData(normalizedCode)
      if (!group) {
        throw new Error("Circle not found. Check the code and try again.")
      }

      const tx = await wallet.transfer(
        CIRCLE_TOKEN,
        [{ to: group.creator as any, amount: Amount.parse(CIRCLE_JOIN_AMOUNT_STR, CIRCLE_TOKEN) }],
        { feeMode: "sponsored" },
      )
      await tx.wait()
      await joinStarknetGroup(normalizedCode, address, wallet)

      setShowTransactionSimulation(false)
      toast.success("Joined circle successfully")
      router.push(`/circle/${normalizedCode}`)
      onOpenChange(false)
      setGroupCode("")
    } catch (error) {
      console.error("[FundFlow] Error joining circle:", error)
      setShowTransactionSimulation(false)

      if (error instanceof Error && /reject|cancel/i.test(error.message)) {
        toast.info("Transaction cancelled", {
          description: "You can retry whenever you are ready.",
        })
        return
      }

      const errorMessage = error instanceof Error ? error.message : "Please check the code and try again."
      toast.error("Failed to join circle", {
        description: errorMessage,
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleQrScan = (scannedCode: string) => {
    setGroupCode(scannedCode.toUpperCase())
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Join a Circle</DialogTitle>
            <DialogDescription>Enter the circle code or scan a QR code to join</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="group-code">Circle Code</Label>
              <Input
                id="group-code"
                placeholder="Enter 6-digit code"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                maxLength={6}
                minLength={6}
                className="text-center text-lg tracking-widest font-mono"
                required
              />
            </div>

            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">Joining Tip</p>
                  <p className="text-sm text-muted-foreground">
                    A one-time tip of{" "}
                    <span className="font-semibold text-foreground flex items-center gap-1 inline-flex">
                      <Coins className="h-4 w-4" />
                      {CIRCLE_JOIN_AMOUNT_STR} STRK
                    </span>{" "}
                    is required to join this circle and support the collective fund.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Transactions are sponsored, but your wallet still needs testnet STRK. {" "}
                    <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      Get test STRK
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => setShowQrScanner(true)}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scan QR Code
            </Button>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isJoining}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isJoining || !connected || groupCode.trim().length < 6}>
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <span className="flex items-center gap-1">
                    Join & Pay <Coins className="h-4 w-4 ml-1" /> {CIRCLE_JOIN_AMOUNT_STR} STRK
                  </span>
                )}
              </Button>
            </div>

            {!connected && (
              <p className="text-sm text-muted-foreground text-center">Connect your Starknet wallet to join this circle.</p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <QrScannerDialog open={showQrScanner} onOpenChange={setShowQrScanner} onScan={handleQrScan} />

      <Dialog open={showTransactionSimulation} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Processing Transaction</DialogTitle>
            <DialogDescription>Sending {CIRCLE_JOIN_AMOUNT_STR} STRK joining tip to the circle</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm font-mono">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-mono">Circle Wallet</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {CIRCLE_JOIN_AMOUNT_STR} STRK
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-sm text-muted-foreground">Confirming transaction on Starknet...</span>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              Confirm the transaction in your wallet popup.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
