"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CipherWheelLoader } from "@/components/cipher-wheel-loader"
import { ArrowDown, Info, CheckCircle2, Send, RefreshCw, ArrowUpDown } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlitchText } from "@/components/glitch-text"

type ViewMode = "convert" | "transfer"

export default function AppPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("convert")
  
  // Convert state
  const [convertAmount, setConvertAmount] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [showConvertSuccess, setShowConvertSuccess] = useState(false)
  const [publicBalance] = useState("1,234.56")
  const [privateBalance] = useState("567.89")

  // Transfer state
  const [transferAmount, setTransferAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [showTransferSuccess, setShowTransferSuccess] = useState(false)

  // Metrics
  const [privacyScore] = useState("99.1")
  const [eta] = useState("0.58")
  const [route] = useState("Tier 1")

  const handleConvert = async () => {
    setIsConverting(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsConverting(false)
    setShowConvertSuccess(true)
    setConvertAmount("")
  }

  const handleTransfer = async () => {
    setIsTransferring(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsTransferring(false)
    setShowTransferSuccess(true)
    setTransferAmount("")
    setRecipient("")
  }

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background effects */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-0" />
      <div className="fixed inset-0 dither-effect pointer-events-none z-0" />

      <div className="relative z-10 container-padding max-w-6xl mx-auto py-8 pt-20">
        {/* Header with Glitch Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 text-xs font-mono text-accent mb-6">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            Private Token Converter
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <GlitchText speed={3000} className="glitch-text">
              Convert to Private Token
            </GlitchText>
          </h1>
        </div>

        {/* Main Bridge Interface */}
        <div className="max-w-2xl mx-auto">
          <div className="border border-white/10 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Header with Tabs */}
            <div className="flex border-b border-white/10 bg-white/2">
              <button
                onClick={() => setViewMode("convert")}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all duration-200 relative ${
                  viewMode === "convert"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Convert
                </div>
                {viewMode === "convert" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
              <button
                onClick={() => setViewMode("transfer")}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all duration-200 relative ${
                  viewMode === "transfer"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Transfer
                </div>
                {viewMode === "transfer" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {viewMode === "convert" ? (
                <>
                  {/* Convert View */}
                  <div className="space-y-4">
                    {/* From: Public USDC */}
                    <div className="p-5 border border-white/10 rounded-xl bg-white/3 hover:border-white/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">From</span>
                        <button
                          onClick={() => setConvertAmount(publicBalance.replace(/,/g, ""))}
                          className="text-xs text-accent hover:text-accent/80 font-semibold"
                        >
                          Balance: {publicBalance}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
                            <span className="text-sm font-mono font-bold text-accent">US</span>
                          </div>
                          <div>
                            <div className="font-semibold text-lg">USDC</div>
                            <div className="text-xs text-muted-foreground">USD Coin</div>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(e.target.value)}
                          placeholder="0.0"
                          className="flex-1 text-right text-3xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
                        />
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-3 relative z-10">
                      <button
                        className="w-10 h-10 rounded-full bg-card border-2 border-white/10 hover:border-accent/50 flex items-center justify-center transition-colors hover:scale-110"
                      >
                        <ArrowDown className="w-5 h-5 text-accent" />
                      </button>
                    </div>

                    {/* To: Private USDC */}
                    <div className="p-5 border border-accent/30 rounded-xl bg-accent/5 dither-effect hover:border-accent/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-accent">To (Private)</span>
                        <span className="text-xs text-accent/80">Balance: {privateBalance}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                            <span className="text-lg">🔒</span>
                          </div>
                          <div>
                            <div className="font-semibold text-lg text-accent">Private USDC</div>
                            <div className="text-xs text-accent/80">Encrypted</div>
                          </div>
                        </div>
                        <div className="flex-1 text-right text-3xl font-semibold text-accent">
                          {convertAmount || "0.0"}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 border border-accent/20 rounded-lg bg-accent/5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Your USDC will be converted to private tokens using zero-knowledge cryptography via Soroban smart contracts.
                      </p>
                    </div>

                    {/* Convert Button */}
                    <Button
                      onClick={handleConvert}
                      disabled={!convertAmount || parseFloat(convertAmount) <= 0 || isConverting}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl"
                    >
                      {isConverting ? (
                        <span className="flex items-center gap-2">
                          <CipherWheelLoader className="w-5 h-5" />
                          Converting...
                        </span>
                      ) : (
                        "Convert to Private"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Transfer View */}
                  <div className="space-y-4">
                    {/* From: Private USDC */}
                    <div className="p-5 border border-accent/30 rounded-xl bg-accent/5 dither-effect hover:border-accent/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-accent">From (Private)</span>
                        <span className="text-xs text-accent/80">Balance: {privateBalance}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                            <span className="text-lg">🔒</span>
                          </div>
                          <div>
                            <div className="font-semibold text-lg text-accent">Private USDC</div>
                            <div className="text-xs text-accent/80">Encrypted</div>
                          </div>
                        </div>
                        <div className="flex-1 text-right">
                          <input
                            type="number"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full text-3xl font-semibold text-accent bg-transparent border-none outline-none text-right placeholder:text-accent/30"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setTransferAmount(privateBalance.replace(/,/g, ""))}
                          className="px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-card border-2 border-white/10 flex items-center justify-center">
                        <ArrowDown className="w-5 h-5 text-accent" />
                      </div>
                    </div>

                    {/* To: Recipient */}
                    <div className="p-5 border border-white/10 rounded-xl bg-white/3 hover:border-white/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                            <span className="text-lg">👤</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg">Recipient</div>
                            <div className="text-xs text-muted-foreground">Stellar Address</div>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="G..."
                          className="w-full text-base font-mono bg-transparent border-none outline-none placeholder:text-muted-foreground/30 p-2 rounded-lg hover:bg-white/2 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 border border-accent/20 rounded-lg bg-accent/5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        This transfer is completely private and untraceable using zero-knowledge cryptography.
                      </p>
                    </div>

                    {/* Transfer Button */}
                    <Button
                      onClick={handleTransfer}
                      disabled={!transferAmount || !recipient || parseFloat(transferAmount) <= 0 || isTransferring}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl"
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
                </>
              )}
            </div>
          </div>

          {/* Metrics Footer */}
          <div className="mt-8 flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Privacy score</span>
              <span className="font-mono font-semibold text-accent">{privacyScore}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">ETA</span>
              <span className="font-mono font-semibold text-accent">{eta}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Route</span>
              <span className="font-mono font-semibold text-accent">{route}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modals */}
      <Dialog open={showConvertSuccess} onOpenChange={setShowConvertSuccess}>
        <DialogContent className="bg-card border-accent/30 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Conversion Successful</DialogTitle>
            <DialogDescription className="text-center">
              Your USDC has been successfully converted to private tokens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-2">PRIVATE BALANCE</p>
              <p className="text-2xl font-bold font-mono">{convertAmount} USDC</p>
            </div>
            <Button
              onClick={() => setShowConvertSuccess(false)}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferSuccess} onOpenChange={setShowTransferSuccess}>
        <DialogContent className="bg-card border-accent/30 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Transfer Complete</DialogTitle>
            <DialogDescription className="text-center">
              Your private transfer has been successfully sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/20 rounded border border-white/5">
              <p className="text-xs font-mono text-muted-foreground mb-2">TRANSFERRED</p>
              <p className="text-2xl font-bold font-mono">{transferAmount} USDC</p>
              <p className="text-xs text-accent font-mono mt-2">✓ Zero-Knowledge Transfer</p>
            </div>
            <Button
              onClick={() => setShowTransferSuccess(false)}
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
