"use client"

import { useEffect, useState } from "react"
import { getPublicGroups } from "@/lib/group-storage"
import type { GroupData } from "@/lib/group-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, Globe, DollarSign } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GroupAvatar } from "@/components/avatar"

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeGroup(group: GroupData): GroupData {
  return {
    ...group,
    fundingGoal: toNumber(group.fundingGoal, 0),
    totalCollected: toNumber(group.totalCollected, 0),
    members: Array.isArray(group.members) ? group.members : [],
    createdAt: group.createdAt || new Date().toISOString(),
  }
}

export default function CirclesPage() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
            const loadGroups = async () => {
              try {
                // Merge Firebase and local groups so locally created circles appear immediately.
                const { getPublicGroupsFromFirebase } = await import("@/lib/firebase-group-storage")
                const firebaseGroups = await getPublicGroupsFromFirebase()
                const localGroups = getPublicGroups()

                const mergedById = new Map<string, GroupData>()
                for (const g of firebaseGroups) mergedById.set(g.id, g)
                for (const g of localGroups) {
                  // Prefer local record for immediate consistency after create/join/contribute.
                  mergedById.set(g.id, g)
                }

                const mergedGroups = Array.from(mergedById.values())
                  .map(normalizeGroup)
                  .sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  )

                console.log("[FundFlow] Loaded public circles (merged):", mergedGroups.length)
                setGroups(mergedGroups)
              } catch (error) {
                console.warn("[FundFlow] Firebase Realtime Database failed, using localStorage:", error)
                const publicGroups = getPublicGroups().map(normalizeGroup)
                setGroups(publicGroups)
              }
              setIsLoading(false)
            }

    loadGroups()
  }, [])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-500"
      case "medium":
        return "text-yellow-500"
      case "high":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading public circles...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">Public Circles</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Discover Betting Circles</h1>
              <p className="text-lg text-muted-foreground text-balance">
                Join public circles and start contributing to collective goals
              </p>
            </div>

            {groups.length === 0 ? (
              <Card className="p-12 text-center border-border/50">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Public Circles Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a public circle and invite others to join
                </p>
                <Button asChild className="bg-[#00ab79] hover:bg-[#009368] text-white">
                  <Link href="/">Create Circle</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6">
                {groups.map((group) => {
                  const goal = toNumber(group.fundingGoal, 0)
                  const collected = toNumber(group.totalCollected, 0)
                  const progress = goal > 0 ? (collected / goal) * 100 : 0

                  return (
                    <Card
                      key={group.id}
                      className="p-6 border-border/50 hover:border-accent/50 transition-all hover:shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <GroupAvatar 
                              name={group.name} 
                              id={group.id}
                              size={48}
                              className="h-12 w-12"
                            />
                            <div>
                              <h3 className="text-2xl font-semibold mb-2">{group.name}</h3>
                            </div>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                <span>{Array.isArray(group.members) ? group.members.length : 0} members</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4" />
                                <span>{goal.toLocaleString()} STRK goal</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className={`h-4 w-4 ${getRiskColor(group.riskLevel)}`} />
                                <span className="capitalize">{group.riskLevel} risk</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {collected.toFixed(2)} / {goal.toLocaleString()} STRK
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                      {progress.toFixed(1)}% funded
                                    </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 md:w-40">
                          <Button asChild className="w-full bg-[#00ab79] hover:bg-[#009368] text-white">
                            <Link href={`/circle/${group.id}`}>View Circle</Link>
                          </Button>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Join with</p>
                            <p className="text-sm font-semibold flex items-center gap-1 justify-center">
                              <DollarSign className="h-4 w-4" />
                              10 STRK tip
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
