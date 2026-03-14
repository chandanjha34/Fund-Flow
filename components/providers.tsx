"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { StarknetWalletProvider } from "@/components/starknet-wallet-provider"
import { Toaster } from "@/components/ui/sonner"

// =============================================================================
// PROVIDERS — StarkNet + Theming
// =============================================================================

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <StarknetWalletProvider>
        {children}
        <Toaster />
      </StarknetWalletProvider>
    </ThemeProvider>
  )
}
