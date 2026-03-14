import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

// FundFlow - Group Fundraising and Prediction Markets on Starknet
// Built with Next.js, StarkZap, and modern web technologies

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans"
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
})

export const metadata: Metadata = {
  title: "FundFlow - Group Fundraising & Prediction Markets on Starknet",
  description:
    "Create fundraising circles, share codes, and predict together. Built on Starknet with StarkZap for gasless transactions, STRK staking, and DeFi.",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
