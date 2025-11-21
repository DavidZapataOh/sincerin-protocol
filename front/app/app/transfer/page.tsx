"use client"

import { useState } from "react"
import { TokenSelector } from "@/components/token-selector"
import { CryptoInput } from "@/components/crypto-input"
import { Button } from "@/components/ui/button"
import { CipherWheelLoader } from "@/components/cipher-wheel-loader"
import { Shield, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

export default function TransferPage() {
  const [selectedToken, setSelectedToken] = useState({ symbol: "XLM", name: "Stellar Lumens", balance: "12.45" })
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [hideDetails, setHideDetails] = useState(true)

  const handleTransfer = () => {
    setShowConfirmation(true)
  }

  const confirmTransfer = async () => {
    setShowConfirmation(false)
    setIsTransferring(true)
    // Simulate transfer process
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsTransferring(false)
    setShowSuccess(true)
  }

  return (
    <div className="content-container py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Private Transfer</h1>
        <p className="text-muted-foreground">Send private Stellar tokens with complete anonymity and zero trace</p>
      </div>

      {/* Transfer Interface */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Transfer Form */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card space-y-6">
            {/* Token Selection */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 block">
                Select Token
              </label>
              <TokenSelector value={selectedToken} onChange={(token) => setSelectedToken({
                symbol: token.symbol,
                name: token.name,
                balance: token.balance || "0"
              })} />
            </div>

            {/* Recipient Address */}
            <CryptoInput
              label="Recipient Address"
              value={recipient}
              onChange={setRecipient}
              placeholder="G..."
              helperText="The recipient's Stellar wallet address (fully encrypted)"
            />

            {/* Amount */}
            <CryptoInput
              label="Amount"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              type="number"
              helperText={`Private Balance: ${selectedToken.balance} ${selectedToken.symbol}`}
            />

            {/* Optional Memo */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block">
                Memo (Optional - Encrypted)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Add a private note..."
                rows={3}
                className="w-full px-3 py-2 bg-white/2 border border-white/10 rounded-md focus:border-accent/50 focus:ring-accent/20 transition-all font-mono text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">This memo will be encrypted and only visible to you</p>
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center space-x-2 p-4 bg-accent/5 border border-accent/20 rounded-lg">
              <Checkbox
                id="hide-details"
                checked={hideDetails}
                onCheckedChange={(checked: boolean) => setHideDetails(checked)}
              />
              <label
                htmlFor="hide-details"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                {hideDetails ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4 text-accent" />}
                Hide transaction details from blockchain explorers
              </label>
            </div>

            {/* Transfer Button */}
            <Button
              onClick={handleTransfer}
              disabled={!recipient || !amount || isTransferring}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
            >
              {isTransferring ? (
                <span className="flex items-center gap-2">
                  <CipherWheelLoader className="w-5 h-5" />
                  Sending Privately...
                </span>
              ) : (
                "Send Privately"
              )}
            </Button>
          </div>
        </div>

        {/* Right: Privacy Features */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card mb-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Privacy Features
            </h3>

            <div className="space-y-4">
              {[
                {
                  title: "Zero-Knowledge Transfer",
                  description: "Transaction details remain completely private using zk-SNARK proofs.",
                },
                {
                  title: "Anonymous Sender",
                  description: "Your Stellar wallet address is never publicly linked to this transaction.",
                },
                {
                  title: "Hidden Amount",
                  description: "The transfer amount is cryptographically concealed on-chain.",
                },
                {
                  title: "Encrypted Recipient",
                  description: "Recipient address is protected and cannot be traced.",
                },
              ].map((feature, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 mt-1">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Hash Visualization */}
          <div className="p-6 border border-accent/20 rounded-lg bg-accent/5 relative overflow-hidden">
            <div className="absolute inset-0 crypto-grid opacity-10 pointer-events-none" />
            <div className="relative">
              <p className="text-xs font-mono text-accent mb-3">TRANSACTION ENCRYPTION</p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sender:</span>
                  <span className="text-accent">████████████</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="text-accent">████████████</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-accent">████████</span>
                </div>
                <div className="mt-4 pt-4 border-t border-accent/20">
                  <p className="text-accent">✓ Fully Encrypted On-Chain</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-card border-accent/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Private Transfer</DialogTitle>
            <DialogDescription>Please review the transaction details before confirming</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5 space-y-3">
              <div>
                <p className="text-xs font-mono text-muted-foreground">TOKEN</p>
                <p className="font-mono font-semibold">{selectedToken.symbol}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground">AMOUNT</p>
                <p className="font-mono font-semibold text-xl">{amount}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground">RECIPIENT</p>
                <p className="font-mono text-sm break-all">{recipient}</p>
              </div>
              {memo && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground">MEMO</p>
                  <p className="text-sm">{memo}</p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/20 rounded text-xs">
              <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                This transaction will be completely private and untraceable using zero-knowledge cryptography.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmTransfer} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                Confirm Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-card border-accent/30 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Transfer Complete</DialogTitle>
            <DialogDescription className="text-center">
              Your private transfer has been successfully sent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-2">TRANSFERRED</p>
              <p className="text-2xl font-bold font-mono">
                {amount} {selectedToken.symbol}
              </p>
              <p className="text-xs text-accent font-mono mt-2">✓ Zero-Knowledge Transfer</p>
            </div>
            <Button
              onClick={() => {
                setShowSuccess(false)
                setRecipient("")
                setAmount("")
                setMemo("")
              }}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}