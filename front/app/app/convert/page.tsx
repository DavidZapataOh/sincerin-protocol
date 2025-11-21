"use client"

import { useState } from "react"
import { TokenSelector } from "@/components/token-selector"
import { CryptoInput } from "@/components/crypto-input"
import { Button } from "@/components/ui/button"
import { CipherWheelLoader } from "@/components/cipher-wheel-loader"
import { ArrowDown, Info, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ConvertPage() {
  const [selectedToken, setSelectedToken] = useState({ symbol: "XLM", name: "Stellar Lumens", balance: "2.45" })
  const [amount, setAmount] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleConvert = async () => {
    setIsConverting(true)
    // Simulate conversion process
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsConverting(false)
    setShowSuccess(true)
  }

  return (
    <div className="content-container py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Convert to Private</h1>
        <p className="text-muted-foreground">Convert your public Stellar tokens into private, untraceable tokens</p>
      </div>

      {/* Conversion Interface */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Conversion Form */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card space-y-6">
            {/* Token Input */}
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

            {/* Amount Input */}
            <CryptoInput
              label="Amount"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              type="number"
              helperText={`Available: ${selectedToken.balance} ${selectedToken.symbol}`}
            />

            {/* Visual Pipeline */}
            <div className="py-6 relative">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 border border-muted rounded-lg flex items-center justify-center bg-muted/20">
                    <span className="text-xl font-mono">🔓</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">PUBLIC</p>
                </div>

                <ArrowDown className="w-6 h-6 text-accent animate-pulse" />

                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 border border-accent/50 rounded-lg flex items-center justify-center bg-accent/10 dither-effect">
                    <span className="text-xl font-mono">🔒</span>
                  </div>
                  <p className="text-xs font-mono text-accent">PRIVATE</p>
                </div>
              </div>

              {/* Crypto pattern decoration */}
              <div className="absolute inset-0 crypto-grid opacity-20 pointer-events-none rounded-lg" />
            </div>

            {/* Convert Button */}
            <Button
              onClick={handleConvert}
              disabled={!amount || isConverting}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
            >
              {isConverting ? (
                <span className="flex items-center gap-2">
                  <CipherWheelLoader className="w-5 h-5" />
                  Converting...
                </span>
              ) : (
                "Convert to Private Token"
              )}
            </Button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 border border-accent/20 rounded-lg bg-accent/5 flex items-start gap-3">
            <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-1">
                <span className="font-semibold text-foreground">Zero-Knowledge Privacy:</span> Your tokens will be
                deposited into a privacy pool via Soroban smart contracts and converted using zk-SNARK cryptography.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Process Visualization */}
        <div>
          <div className="p-8 border border-white/5 rounded-lg dither-effect bg-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Conversion Process
            </h3>

            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Deposit Verification",
                  description:
                    "Your Stellar tokens are verified and locked in the privacy pool Soroban smart contract.",
                  active: isConverting,
                },
                {
                  step: "02",
                  title: "Zero-Knowledge Proof",
                  description: "A cryptographic proof is generated without revealing transaction details.",
                  active: false,
                },
                {
                  step: "03",
                  title: "Private Token Minted",
                  description: "Equivalent private tokens are minted to your account with full anonymity.",
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

            {/* Hash Display */}
            <div className="mt-8 p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-1">TRANSACTION HASH</p>
              <p className="text-xs font-mono text-foreground break-all">0x0000000000000000000000000000000000000000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-card border-accent/30 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Conversion Successful</DialogTitle>
            <DialogDescription className="text-center">
              Your tokens have been successfully converted to private tokens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-2">PRIVATE BALANCE</p>
              <p className="text-2xl font-bold font-mono">
                {amount} {selectedToken.symbol}
              </p>
            </div>
            <Button
              onClick={() => {
                setShowSuccess(false)
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