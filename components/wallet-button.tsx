"use client"

import { Button } from "@/components/ui/button"
import { Wallet, LogOut, ExternalLink, Droplets } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/avatar"
import { useEffect, useState } from "react"
import { useStarknet } from "@/components/starknet-wallet-provider"
import { FAUCET_URL, EXPLORER_BASE } from "@/lib/starkzap"
import { toast } from "sonner"

export function WalletButton() {
  const [mounted, setMounted] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const { connected, connecting, address, formattedAddress, strkBalance, disconnect, connect, walletType } = useStarknet()

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <Button size="sm" variant="outline" disabled>
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
        Loading...
      </Button>
    )
  }

  if (connecting) {
    return (
      <Button size="sm" variant="outline" disabled>
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
        Connecting...
      </Button>
    )
  }

  if (connected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <UserAvatar name={address} id={address} size={16} className="h-4 w-4 mr-2" />
            <span className="mr-1">{formattedAddress}</span>
            {strkBalance && <span className="text-xs opacity-75 ml-1">· {strkBalance}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem className="text-xs text-muted-foreground flex-col items-start gap-0.5" disabled>
            <span className="font-medium text-foreground">Starknet Sepolia</span>
            <span>
              {walletType === "braavos"
                ? "Braavos"
                : walletType === "cartridge"
                ? "Cartridge Controller (gasless)"
                : "Dev wallet"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={`${EXPLORER_BASE}/contract/${address}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              <Droplets className="h-4 w-4 mr-2" />
              Get Test STRK
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const handleConnect = async (mode: "auto" | "braavos" | "cartridge") => {
    setConnectModalOpen(false)
    try {
      await connect(mode)
    } catch (error) {
      const description = error instanceof Error ? error.message : "Please try again."
      toast.error("Wallet connection failed", { description })
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
        onClick={() => setConnectModalOpen(true)}
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>

      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Connect Starknet Wallet</DialogTitle>
            <DialogDescription>
              Pick how you want to connect for circles, predictions, and earning flows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <Button
              className="w-full justify-start gap-3"
              variant="default"
              onClick={() => handleConnect("braavos")}
            >
              <img
                src="/wallets/braavos-logo.svg"
                alt="Braavos"
                className="h-6 w-6 rounded-md"
              />
              <span className="text-left">Connect with Braavos</span>
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => handleConnect("cartridge")}
            >
              <img
                src="/wallets/cartridge-logo.svg"
                alt="Cartridge"
                className="h-6 w-6 rounded-md"
              />
              <span className="text-left">Connect with Cartridge</span>
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="ghost"
              onClick={() => handleConnect("auto")}
            >
              <Wallet className="h-4 w-4" />
              <span className="text-left">Auto (Braavos, then Cartridge)</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
