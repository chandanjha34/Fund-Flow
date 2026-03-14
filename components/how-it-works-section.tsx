"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Plus, Share2, Wallet } from "lucide-react"
import { CreateCircleModal } from "@/components/create-group-modal"

const steps = [
  {
    icon: Plus,
    title: "Create Your Circle",
    description: "Set up a private betting market or shared treasury for your friend group. Connect your wallet to get started.",
  },
  {
    icon: Share2,
    title: "Share Code or QR",
    description: "Get a unique code or QR code to invite friends to your private prediction market or treasury.",
  },
  {
    icon: Wallet,
    title: "Bet & Govern Together",
    description: "Place bets, manage shared funds, and make group decisions. All settled on-chain with full transparency.",
  },
]

export function HowItWorksSection() {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const handleLearnMore = () => {
    const groupsSection = document.getElementById("groups")
    if (groupsSection) {
      groupsSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <>
      <section id="how-it-works" className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to start betting and managing funds with your circle
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={index} className="p-6 text-center border-border/50 hover:border-accent/50 transition-colors">
                  <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mx-auto">
                    <Icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </Card>
              )
            })}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-border/50">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Ready to start betting with friends?</h3>
                <p className="text-muted-foreground">
                  Create your circle in seconds and start funding, forecasting, and staking on Starknet Sepolia.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3 rounded-lg bg-[#00ab79] hover:bg-[#009368] text-white font-medium transition-colors"
                >
                  Create Circle
                </button>
                <button
                  onClick={handleLearnMore}
                  className="px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CreateCircleModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  )
}
