"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPublicGroups } from "@/lib/group-storage"
import type { GroupData } from "@/lib/group-data"
import { Users, TrendingUp, DollarSign } from "lucide-react"

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

export function GroupShowcaseSection() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const { getPublicGroupsFromFirebase } = await import("@/lib/firebase-group-storage")
        const firebaseGroups = await getPublicGroupsFromFirebase()
        const localGroups = getPublicGroups()

        const mergedById = new Map<string, GroupData>()
        for (const g of firebaseGroups) mergedById.set(g.id, g)
        for (const g of localGroups) {
          mergedById.set(g.id, g)
        }

        const merged = Array.from(mergedById.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )

        setGroups(merged.map(normalizeGroup).slice(0, 4))
      } catch {
        setGroups(getPublicGroups().map(normalizeGroup).slice(0, 4))
      } finally {
        setLoading(false)
      }
    }

    loadGroups()
  }, [])

  const cards = useMemo(() => {
    return groups.map((group) => {
      const goal = toNumber(group.fundingGoal, 0)
      const collected = toNumber(group.totalCollected, 0)
      const progress = goal > 0 ? (collected / goal) * 100 : 0
      return {
        id: group.id,
        name: group.name,
        members: Array.isArray(group.members) ? group.members.length : 0,
        collected: `${collected.toFixed(2)} STRK`,
        goal: `${goal.toLocaleString()} STRK`,
        progress: Math.max(0, Math.min(100, progress)),
        category: group.riskLevel.charAt(0).toUpperCase() + group.riskLevel.slice(1),
      }
    })
  }, [groups])

  return (
    <section id="groups" className="container py-16 md:py-24 bg-muted/30">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Active Fundraising Groups</h2>
          <p className="text-muted-foreground text-lg">
            Discover live circles on Starknet. New circles appear here as soon as they are created.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading circles...</div>
        ) : cards.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No public circles yet.</p>
            <Button asChild className="bg-[#00ab79] hover:bg-[#009368] text-white">
              <Link href="/circles">Explore Circles</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
          {cards.map((group) => (
            <Card key={group.id} className="p-6 hover:border-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{group.members} members</span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20">
                  {group.category}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{group.progress}%</span>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${group.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span className="font-semibold">{group.collected}</span>
                    <span className="text-sm text-muted-foreground">collected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Goal: {group.goal}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}

        <div className="mt-8 p-6 rounded-xl bg-accent/5 border border-accent/20 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-accent">Starknet Ready:</span> Circles support gasless onboarding,
            STRK treasury flows, and prediction markets in one place.
          </p>
        </div>
      </div>
    </section>
  )
}
