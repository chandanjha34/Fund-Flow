"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FlowBackground } from "@/components/flow-background"
import { ArrowRight, Users, QrCode } from "lucide-react"
import { CreateCircleModal } from "@/components/create-group-modal"
import { JoinCircleModal } from "@/components/join-group-modal"

export function HeroSection() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)

  return (
    <>
      <section className="relative py-24 md:py-32 overflow-hidden">
        <FlowBackground height="clamp(360px, 52vw, 720px)" top="clamp(8px, 2vw, 48px)" />
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
            Create a circle, <span className="text-accent">Bet with Friends</span>
          </h1>

          <p className="mb-10 text-lg md:text-xl text-muted-foreground text-balance leading-relaxed">
            Create private prediction markets within your friend circles. Manage shared treasuries powered by Starknet, gasless onboarding, and STRK-native DeFi.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base"
              onClick={() => setCreateModalOpen(true)}
            >
              Create Your Circle
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base bg-transparent"
              onClick={() => setJoinModalOpen(true)}
            >
              Join with Code
            </Button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-accent" />
              <span>Share via QR</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <span>Invite unlimited members</span>
            </div>
          </div>


        </div>
      </section>

      <CreateCircleModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <JoinCircleModal open={joinModalOpen} onOpenChange={setJoinModalOpen} />
    </>
  )
}
