import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"

const leaderboardData = [
  { rank: 1, pseudonym: "CryptoPhantom", badge: "Legend", icon: Trophy },
  { rank: 2, pseudonym: "AnonymousAngel", badge: "Hero", icon: Medal },
  { rank: 3, pseudonym: "PrivacyPioneer", badge: "Champion", icon: Award },
  { rank: 4, pseudonym: "ZKWarrior", badge: "Supporter", icon: null },
  { rank: 5, pseudonym: "SilentSupporter", badge: "Supporter", icon: null },
  { rank: 6, pseudonym: "MysteryMaven", badge: "Supporter", icon: null },
]

export function LeaderboardSection() {
  return (
    <section id="leaderboard" className="container py-16 md:py-24 bg-muted/30">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Privacy-Preserving Leaderboard</h2>
          <p className="text-muted-foreground text-lg">
            Celebrating our anonymous supporters. No amounts, no wallets—just pseudonyms.
          </p>
        </div>

        <Card className="p-6 md:p-8">
          <div className="space-y-4">
            {leaderboardData.map((entry) => {
              const Icon = entry.icon
              return (
                <div
                  key={entry.rank}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background font-semibold">
                      {Icon ? (
                        <Icon className="h-5 w-5 text-accent" />
                      ) : (
                        <span className="text-muted-foreground">#{entry.rank}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{entry.pseudonym}</p>
                      <p className="text-sm text-muted-foreground">Rank #{entry.rank}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20">
                    {entry.badge}
                  </Badge>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="mt-8 p-6 rounded-xl bg-accent/5 border border-accent/20">
          <p className="text-sm text-center text-muted-foreground">
            <span className="font-semibold text-accent">AI Message:</span> "Thanks to our latest supporter! Another kind
            soul joined the privacy revolution. Next tip predicted in ~2 hours ⏳"
          </p>
        </div>
      </div>
    </section>
  )
}
