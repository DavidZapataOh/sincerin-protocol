"use client"

import { useState } from "react"
import { TokenSelector } from "@/components/token-selector"
import { CryptoInput } from "@/components/crypto-input"
import { Button } from "@/components/ui/button"
import { CipherWheelLoader } from "@/components/cipher-wheel-loader"
import { ArrowUp, Info, CheckCircle2, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function WithdrawPage() {
  const [selectedToken, setSelectedToken] = useState({ symbol: "XLM", name: "Stellar Lumens", balance: "12.45" })
  const [targetAddress, setTargetAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleWithdraw = () => {
    setShowWarning(true)
  }

  const confirmWithdraw = async () => {
    setShowWarning(false)
    setIsWithdrawing(true)
    // Simulate withdrawal process
    await new Promise((resolve) => setTimeout(resolve, 3500))
    setIsWithdrawing(false)
    setShowSuccess(true)
  }

  return (
    <div className="content-container py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Withdraw</h1>
        <p className="text-muted-foreground">Convert private tokens back to public Stellar tokens</p>
      </div>

      {/* Withdraw Interface */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Withdraw Form */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card space-y-6">
            {/* Token Selection */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 block">
                Select Private Token
              </label>
              <TokenSelector value={selectedToken} onChange={(token) => setSelectedToken({
                symbol: token.symbol,
                name: token.name,
                balance: token.balance || "0"
              })} />
            </div>

            {/* Target Address */}
            <CryptoInput
              label="Destination Address"
              value={targetAddress}
              onChange={setTargetAddress}
              placeholder="G..."
              helperText="Any Stellar wallet address (no link to source)"
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

            {/* Visual Pipeline */}
            <div className="py-6 relative">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 border border-accent/50 rounded-lg flex items-center justify-center bg-accent/10 dither-effect">
                    <span className="text-xl font-mono">🔒</span>
                  </div>
                  <p className="text-xs font-mono text-accent">PRIVATE</p>
                </div>

                <ArrowUp className="w-6 h-6 text-muted-foreground animate-pulse" />

                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 border border-muted rounded-lg flex items-center justify-center bg-muted/20">
                    <span className="text-xl font-mono">🔓</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">PUBLIC</p>
                </div>
              </div>

              {/* Crypto pattern decoration */}
              <div className="absolute inset-0 crypto-grid opacity-20 pointer-events-none rounded-lg" />
            </div>

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdraw}
              disabled={!targetAddress || !amount || isWithdrawing}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
            >
              {isWithdrawing ? (
                <span className="flex items-center gap-2">
                  <CipherWheelLoader className="w-5 h-5" />
                  Withdrawing...
                </span>
              ) : (
                "Withdraw to Public"
              )}
            </Button>
          </div>

          {/* Warning Box */}
          <div className="mt-6 p-4 border border-amber-500/20 rounded-lg bg-amber-500/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground mb-1">Privacy Notice</p>
              <p className="text-muted-foreground">
                Withdrawing converts tokens back to public form on Stellar. The destination address will have no
                cryptographic link to the original source address thanks to Soroban zk-proofs.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Process Visualization */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Withdrawal Process
            </h3>

            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Private Token Burn",
                  description:
                    "Your private tokens are burned from the privacy pool Soroban contract with cryptographic verification.",
                  active: isWithdrawing,
                },
                {
                  step: "02",
                  title: "Zero-Knowledge Proof",
                  description: "A proof is generated to verify ownership without revealing transaction history.",
                  active: false,
                },
                {
                  step: "03",
                  title: "Public Token Release",
                  description: "Clean public tokens are sent to your destination address with no traceable link.",
                  active: false,
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0">
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center font-mono text-sm ${
                        item.active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-white/10 bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {item.active ? <CipherWheelLoader className="w-5 h-5" /> : item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Privacy Guarantee */}
            <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold mb-1">Complete Privacy Guaranteed</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The withdrawal process uses zero-knowledge proofs via Soroban to ensure there is no on-chain
                    connection between your original deposit and this withdrawal on the Stellar network.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Anonymity Set Display */}
          <div className="mt-6 p-6 border border-white/5 rounded-lg bg-card dither-effect">
            <p className="text-xs font-mono text-muted-foreground mb-3">ANONYMITY SET</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold font-mono text-accent">2,847</span>
              <span className="text-sm text-muted-foreground">participants</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your transaction is pooled with thousands of others, making it computationally impossible to trace.
            </p>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="bg-card border-amber-500/30 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Confirm Withdrawal</DialogTitle>
            <DialogDescription className="text-center">
              Please review before converting back to public tokens
            </DialogDescription>
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
                <p className="text-xs font-mono text-muted-foreground">DESTINATION</p>
                <p className="font-mono text-sm break-all">{targetAddress}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded text-xs space-y-2">
              <p className="font-semibold text-foreground">Important:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Tokens will be converted to public form on Stellar</li>
                <li>No link to original source maintained</li>
                <li>Transaction is final and cannot be reversed</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowWarning(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmWithdraw} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                Confirm Withdrawal
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
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Withdrawal Complete</DialogTitle>
            <DialogDescription className="text-center">
              Your public tokens have been sent successfully
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-2">WITHDRAWN</p>
              <p className="text-2xl font-bold font-mono mb-3">
                {amount} {selectedToken.symbol}
              </p>
              <p className="text-xs text-accent font-mono">✓ No Traceable Link to Source</p>
            </div>

            <div className="p-3 bg-accent/5 border border-accent/20 rounded">
              <p className="text-xs text-muted-foreground">
                Your tokens have been successfully withdrawn with complete privacy. The destination Stellar address has
                no cryptographic connection to your original deposits.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowSuccess(false)
                setTargetAddress("")
                setAmount("")
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