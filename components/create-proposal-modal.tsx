"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useStarknet } from "@/components/starknet-wallet-provider"
import { createProposal } from "@/lib/prediction-market"
import { searchKalshiMarkets, type KalshiMarket } from "@/lib/kalshi-integration"
import { toast } from "sonner"
import { Loader2, Search, TrendingUp } from "lucide-react"

interface CreateProposalModalProps {
  isOpen: boolean
  onClose: () => void
  circleId: string
}

export function CreateProposalModal({ isOpen, onClose, circleId }: CreateProposalModalProps) {
  const { address, connected } = useStarknet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Kalshi market search
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [kalshiMarkets, setKalshiMarkets] = useState<KalshiMarket[]>([])
  const [selectedMarket, setSelectedMarket] = useState<KalshiMarket | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false) // New state for confirmation step
  
  // Proposal fields (populated from selected market)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("24")
  const [options, setOptions] = useState<string[]>(["Yes", "No"])

  const handleSearchKalshi = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term")
      return
    }

    setIsSearching(true)
    try {
      const markets = await searchKalshiMarkets(searchQuery)
      setKalshiMarkets(markets)
      
      if (markets.length === 0) {
        toast.info("No markets found", {
          description: "Try different keywords or create a custom proposal"
        })
      } else {
        toast.success(`Found ${markets.length} market${markets.length > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Search failed", {
        description: "Could not search Kalshi markets"
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectMarket = (market: KalshiMarket) => {
    setSelectedMarket(market)
    setTitle(market.title)
    setDescription(market.subtitle || market.title)
    // Extract options from market if binary
    setOptions(["Yes", "No"])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected || !address) {
      toast.error("Connect your Starknet wallet first")
      return
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    if (options.length < 2) {
      toast.error("Please add at least 2 options")
      return
    }

    setIsSubmitting(true)

    try {
      const proposalId = await createProposal(
        circleId,
        address,
        title.trim(),
        description.trim(),
        options,
        parseInt(duration),
        selectedMarket?.ticker // Pass Kalshi ticker if market selected
      )

      toast.success("Prediction proposal created!", {
        description: selectedMarket 
          ? `Linked to Kalshi market: ${selectedMarket.ticker}` 
          : "Circle members can now place their bets"
      })

      // Reset form
      resetForm()
      onClose()
    } catch (error) {
      console.error("Error creating proposal:", error)
      toast.error("Failed to create proposal", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const resetForm = () => {
    setSearchQuery("")
    setKalshiMarkets([])
    setSelectedMarket(null)
    setShowConfirmation(false)
    setTitle("")
    setDescription("")
    setDuration("24")
    setOptions(["Yes", "No"])
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose() } }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prediction Proposal</DialogTitle>
          <DialogDescription>
            Search a Kalshi market and launch a STRK prediction inside your circle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            {/* Search Bar */}
            {!showConfirmation && (
              <div className="space-y-2">
                <Label htmlFor="kalshi-search">Search Kalshi Markets</Label>
                <div className="flex gap-2">
                  <Input
                    id="kalshi-search"
                    placeholder="e.g., Bitcoin, Election, Stock market..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSearchKalshi()
                      }
                    }}
                    disabled={isSearching}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchKalshi}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Search active Kalshi markets to prefill your question and outcomes.
                </p>
              </div>
            )}

            {/* Search Results */}
            {kalshiMarkets.length > 0 && !showConfirmation && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <Label>Found {kalshiMarkets.length} Market{kalshiMarkets.length > 1 ? 's' : ''}</Label>
                {kalshiMarkets.map((market) => (
                  <Card
                    key={market.ticker}
                    className={`p-4 transition-all ${
                      selectedMarket?.ticker === market.ticker
                        ? 'border-[#00ab79] bg-[#00ab79]/5'
                        : 'hover:border-accent/50 cursor-pointer'
                    }`}
                    onClick={() => selectedMarket?.ticker !== market.ticker && handleSelectMarket(market)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold line-clamp-2">{market.title}</h4>
                          {market.subtitle && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {market.subtitle}
                            </p>
                          )}
                        </div>
                        {selectedMarket?.ticker === market.ticker && (
                          <Badge className="bg-[#00ab79] text-white">Selected</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Ticker: {market.ticker}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {market.status}
                        </Badge>
                      </div>

                      {market.last_price && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-green-600">Yes: {market.last_price}¢</span>
                          <span className="text-red-600">No: {100 - market.last_price}¢</span>
                        </div>
                      )}

                      {/* Show Continue button on selected card */}
                      {selectedMarket?.ticker === market.ticker && !showConfirmation && (
                        <div className="flex gap-2 pt-2 border-t border-[#00ab79]/20">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMarket(null)
                              setShowConfirmation(false)
                            }}
                            className="flex-1"
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowConfirmation(true)
                            }}
                            className="flex-1 bg-[#00ab79] hover:bg-[#009368] text-white"
                          >
                            Continue
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Confirmation Card - Duration and Submit */}
            {selectedMarket && showConfirmation && (
              <Card className="p-6 space-y-4 border-accent/50 mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Finalize Prediction</h3>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{selectedMarket.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ticker: {selectedMarket.ticker}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Betting Duration</Label>
                    <Select value={duration} onValueChange={setDuration} disabled={isSubmitting}>
                      <SelectTrigger id="duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">2 days</SelectItem>
                        <SelectItem value="72">3 days</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How long circle members can place STRK bets on this prediction
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowConfirmation(false)}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !connected}
                      className="flex-1 bg-[#00ab79] hover:bg-[#009368] text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Proposal"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* No results message */}
            {!isSearching && kalshiMarkets.length === 0 && searchQuery && !showConfirmation && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No markets found for "{searchQuery}"</p>
                <p className="text-sm">Try different keywords</p>
              </div>
            )}
          </div>
      </DialogContent>
    </Dialog>
  )
}

