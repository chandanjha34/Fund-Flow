"use client"
import Image from "next/image"
import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { WalletButton } from "@/components/wallet-button"

export function Header() {
  const pathname = usePathname()

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()

    if (pathname !== "/") {
      window.location.href = `/#${sectionId}`
      return
    }

    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image 
            src="/fundflow-logo.png" 
            alt="FundFlow" 
            width={32} 
            height={32} 
            className="h-8 w-8"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-logo.svg';
            }}
          />
          <span className="text-lg font-semibold">FundFlow</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/circles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Circles
          </Link>
          <a
            href="/#how-it-works"
            onClick={(e) => handleScrollToSection(e, "how-it-works")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </a>
        </nav>

        <WalletButton />
      </div>
    </header>
  )
}
