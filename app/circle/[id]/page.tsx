"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { GroupAvatar } from "@/components/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useStarknet } from "@/components/starknet-wallet-provider"
import { fetchGroupData, type GroupData } from "@/lib/group-data"
import { contributeToStarknetGroup, joinStarknetGroup } from "@/lib/starknet-group-storage"
import { toast } from "sonner"
import { generateGroupQRCode } from "@/lib/qr-code"
import { CreateProposalModal } from "@/components/create-proposal-modal"
import { PredictionPolls } from "@/components/prediction-polls"
import { StarknetDefiPanel } from "@/components/starknet-defi-panel"
import { CIRCLE_TOKEN, CIRCLE_JOIN_AMOUNT_STR } from "@/lib/starkzap"
import { Amount } from "starkzap"
import {
  Users,
  Calendar,
  TrendingUp,
  Share2,
  QrCode,
  Copy,
  Shield,
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
} from "lucide-react"

export default function CircleDashboard() {
  const params = useParams()
  const router = useRouter()
  const { address, connected, wallet } = useStarknet()

  // State
  const [group, setGroup] = useState<GroupData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [copied, setCopied] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeImage, setQrCodeImage] = useState<string>("")
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmountInput, setPayAmountInput] = useState("")
  const [activeTab, setActiveTab] = useState("predictions")
  const [showCreateProposal, setShowCreateProposal] = useState(false)
  const [hasActiveProposal, setHasActiveProposal] = useState(false)

  const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  // Check if user is a member
  const walletAddress = address || ""
  const isMember = group?.members.includes(walletAddress) || false

  // Calculate progress
  const progress = group && group.fundingGoal > 0
    ? (toNumber(group.totalCollected, 0) / toNumber(group.fundingGoal, 1)) * 100
    : 0

  // Load group data
  useEffect(() => {
    const loadGroupData = async () => {
      setIsLoading(true)
      try {
        const groupData = await fetchGroupData(params.id as string)
        if (groupData) {
          setGroup(groupData)
          setWalletBalance(toNumber(groupData.totalCollected, 0))
        } else {
          toast.error("Circle not found")
        }
      } catch (error) {
        console.error("Failed to load circle:", error)
        toast.error("Failed to load circle data")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadGroupData()
    }
  }, [params.id])

  // Handlers
  const handleCopyCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.id)
      setCopied(true)
      toast.success("Circle code copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShowQR = async () => {
    if (!group) return
    setIsGeneratingQR(true)
    setShowQRModal(true)
    try {
      const qrCode = await generateGroupQRCode(group.id, group.name)
      setQrCodeImage(qrCode)
    } catch (error) {
      toast.error("Failed to generate QR code")
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const processPay = async (amount: number) => {
    if (!connected || !address || !group || !wallet) {
      toast.error("Please connect your Starknet wallet first")
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid contribution amount")
      return
    }

    setIsPaying(true)
    try {
      const tx = await wallet.transfer(
        CIRCLE_TOKEN,
        [{ to: group.creator as any, amount: Amount.parse(String(amount), CIRCLE_TOKEN) }],
        { feeMode: "sponsored" },
      )
      await tx.wait()
      await contributeToStarknetGroup(group.id, amount, wallet)

      const txHash = (tx as any).hash || ""

      toast.success(`Payment of ${amount} STRK successful!`, {
        description: txHash ? `TX: ${txHash.slice(0, 8)}...${txHash.slice(-8)}` : "Transaction confirmed",
      })

      // Refresh group data
      const updatedGroup = await fetchGroupData(group.id)
      if (updatedGroup) {
        setGroup(updatedGroup)
        setWalletBalance(toNumber(updatedGroup.totalCollected, 0))
      }
    } catch (error) {
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    } finally {
      setIsPaying(false)
    }
  }

  const handlePayNowClick = () => {
    if (!group) return
    setPayAmountInput(String(toNumber(group.amountPerRecurrence, 0)))
    setShowPayModal(true)
  }

  const handleConfirmPay = async () => {
    const amount = Number(payAmountInput)
    await processPay(amount)
    if (Number.isFinite(amount) && amount > 0) {
      setShowPayModal(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
        <Footer />
      </div>
    )
  }

  // Circle not found
  if (!group) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Circle Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The circle you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              type="button"
              onClick={() => router.push("/")} 
              className="bg-accent hover:bg-accent/90"
            >
              Return Home
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "medium": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Circle Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <GroupAvatar 
              name={group.name} 
              id={group.id}
              size={64}
              className="h-16 w-16"
            />
            <div>
              <h1 className="text-3xl font-bold mb-1">{group.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <button onClick={handleCopyCode} className="flex items-center gap-1 hover:text-foreground">
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : group.id}
                </button>
                <span>•</span>
                <span>{group.members.length} members</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getRiskBadgeColor(group.riskLevel)}>
              {group.riskLevel.charAt(0).toUpperCase() + group.riskLevel.slice(1)} Risk
            </Badge>
            <Badge variant="outline">{group.totalDuration}</Badge>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Total Collected Card */}
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Collected</p>
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-4xl font-bold">{walletBalance.toFixed(2)}</h2>
                <span className="text-lg text-muted-foreground">STRK</span>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Funding Goal</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{group.fundingGoal.toLocaleString()} STRK</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">{progress.toFixed(1)}% Complete</span>
                  <span className="text-muted-foreground">{(group.fundingGoal - walletBalance).toFixed(2)} STRK remaining</span>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Members</span>
                </div>
                <p className="text-2xl font-bold">{group.members.length}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Frequency</span>
                </div>
                <p className="text-2xl font-bold capitalize">{group.recurringPeriod}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-xs">Per Period</span>
                </div>
                <p className="text-2xl font-bold">{group.amountPerRecurrence} STRK</p>
              </Card>
            </div>

            {/* Tabs */}
            <Card className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="predictions">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Predictions
                  </TabsTrigger>
                  <TabsTrigger value="defi">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    DeFi
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    <Users className="h-4 w-4 mr-2" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="share">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="predictions" className="space-y-4">
                  {/* Create Proposal CTA removed; use + button in empty state within PredictionPolls */}

                  {/* Info message if proposal exists */}
                  {isMember && hasActiveProposal && (
                    <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-sm text-center text-muted-foreground">
                        <Sparkles className="inline h-4 w-4 mr-1 mb-0.5" />
                        This circle has an active prediction market
                      </p>
                    </div>
                  )}

                  {/* Prediction Polls */}
                  <PredictionPolls 
                    circleId={group.id} 
                    circleCreator={group.creator}
                    onProposalsChange={setHasActiveProposal}
                  />
                </TabsContent>

                <TabsContent value="members" className="space-y-3">
                  {group.members.map((member, index) => (
                    <div key={member} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-mono text-sm">{member.slice(0, 6)}...{member.slice(-4)}</p>
                          {member === group.creator && (
                            <Badge variant="secondary" className="text-xs mt-1">Creator</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">0.1 STRK</p>
                        <p className="text-xs text-muted-foreground">Contribution</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="defi" className="space-y-4">
                  <StarknetDefiPanel />
                </TabsContent>

                <TabsContent value="activity" className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                </TabsContent>

                <TabsContent value="share" className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleCopyCode}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? "Copied!" : "Copy Code"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleShowQR}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Your Contribution */}
            {isMember && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Contribution</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next Due Date</p>
                    <p className="text-xl font-bold">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{group.amountPerRecurrence} STRK</p>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    className="w-full bg-accent hover:bg-accent/90" 
                    size="lg"
                    onClick={handlePayNowClick}
                    disabled={isPaying || !connected}
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Pay Now"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Choose any amount and pay onchain
                  </p>
                </div>
              </Card>
            )}

            {/* Join Circle (if not member) */}
            {!isMember && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Join This Circle</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start contributing {group.amountPerRecurrence} STRK {group.recurringPeriod}
                </p>
                <Button 
                  type="button"
                  className="w-full bg-accent hover:bg-accent/90" 
                  size="lg"
                  onClick={async () => {
                    if (!wallet || !address) {
                      toast.error("Connect your Starknet wallet first")
                      return
                    }

                    try {
                      const joinAmount = Number(CIRCLE_JOIN_AMOUNT_STR)
                      const tx = await wallet.transfer(
                        CIRCLE_TOKEN,
                        [{ to: group.creator as any, amount: Amount.parse(CIRCLE_JOIN_AMOUNT_STR, CIRCLE_TOKEN) }],
                        { feeMode: "sponsored" },
                      )
                      await tx.wait()
                      await joinStarknetGroup(group.id, address, wallet)

                      const updatedGroup = await fetchGroupData(group.id)
                      if (updatedGroup) {
                        setGroup(updatedGroup)
                        setWalletBalance(toNumber(updatedGroup.totalCollected, 0))
                      }

                      toast.success(`Joined with ${joinAmount} STRK`)
                    } catch (error) {
                      toast.error("Failed to join circle", {
                        description: error instanceof Error ? error.message : "Please try again",
                      })
                    }
                  }}
                  disabled={!connected}
                >
                  Join Circle
                </Button>
              </Card>
            )}

            {/* Privacy Protected */}
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Shield className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Privacy Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    Gasless interactions via Starknet account abstraction and StarkZap paymaster support.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Create Proposal Modal */}
      <CreateProposalModal
        isOpen={showCreateProposal}
        onClose={() => setShowCreateProposal(false)}
        circleId={group.id}
      />

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Enter how much STRK you want to contribute to this circle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contribution Amount (STRK)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payAmountInput}
                onChange={(e) => setPayAmountInput(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. 10"
                disabled={isPaying}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 25].map((quick) => (
                <Button
                  key={quick}
                  type="button"
                  variant="outline"
                  onClick={() => setPayAmountInput(String(quick))}
                  disabled={isPaying}
                >
                  {quick} STRK
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowPayModal(false)}
                disabled={isPaying}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-accent hover:bg-accent/90"
                onClick={handleConfirmPay}
                disabled={isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Circle QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to join {group.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            {isGeneratingQR ? (
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
            ) : qrCodeImage ? (
              <>
                <img src={qrCodeImage} alt="Circle QR Code" className="w-64 h-64" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = qrCodeImage
                    link.download = `${group.name}-qr.png`
                    link.click()
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Failed to generate QR code</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
