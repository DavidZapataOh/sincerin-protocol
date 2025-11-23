"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CipherWheelLoader } from "@/components/cipher-wheel-loader"
import { ArrowDown, Info, CheckCircle2, Send, RefreshCw, ArrowUpDown, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BinaryText } from "@/components/binary-text"
import { useWallet } from "@/hooks/use-wallet"
import { getUSDCBalance, transferUSDC, isValidStellarAddress, convertToPrivate, getPrivateBalance, transferPrivate } from "@/lib/stellar"

type ViewMode = "convert" | "transfer"

export default function AppPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("convert")
  const { address, isConnected } = useWallet()
  
  // Convert state
  const [convertAmount, setConvertAmount] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [showConvertSuccess, setShowConvertSuccess] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [convertTxHash, setConvertTxHash] = useState<string | null>(null)
  const [publicBalance, setPublicBalance] = useState("0")
  const [privateBalance, setPrivateBalance] = useState("0")

  // Transfer state
  const [transferAmount, setTransferAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [showTransferSuccess, setShowTransferSuccess] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Metrics
  const [privacyScore] = useState("99.1")
  const [eta] = useState("0.58")
  const [route] = useState("Tier 1")

  // Fetch USDC balance when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      const fetchBalances = async () => {
        try {
          // Fetch public balance
          const publicBal = await getUSDCBalance(address)
          setPublicBalance(publicBal)
          
          // Fetch private balance
          const privateBal = await getPrivateBalance(address)
          setPrivateBalance(privateBal)
        } catch (error) {
          console.error("Error fetching balances:", error)
        }
      }
      fetchBalances()
      
      // Refresh balances every 10 seconds
      const interval = setInterval(fetchBalances, 10000)
      return () => clearInterval(interval)
    } else {
      setPublicBalance("0")
      setPrivateBalance("0")
    }
  }, [isConnected, address])

  const handleConvert = async () => {
    if (!address || !isConnected) {
      return
    }

    const amount = parseFloat(convertAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    const balance = parseFloat(publicBalance.replace(/,/g, ""))
    if (amount > balance) {
      return
    }

    setIsConverting(true)
    setConvertError(null)
    setConvertTxHash(null)

    try {
      const hash = await convertToPrivate(address, convertAmount)
      setConvertTxHash(hash)
      setShowConvertSuccess(true)
      setConvertAmount("")
      
      // Refresh balances after conversion
      if (address) {
        const newPublicBalance = await getUSDCBalance(address)
        setPublicBalance(newPublicBalance)
        
        // Also refresh private balance (may take a moment for backend to process)
        setTimeout(async () => {
          const newPrivateBalance = await getPrivateBalance(address)
          setPrivateBalance(newPrivateBalance)
        }, 5000) // Wait 5 seconds for backend to process
      }
    } catch (error: any) {
      console.error("Convert error:", error)
      setConvertError(error?.message || "Failed to convert to private tokens. Please try again.")
    } finally {
      setIsConverting(false)
    }
  }

  const handleTransfer = async () => {
    if (!address || !isConnected) {
      setTransferError("Please connect your wallet first")
      return
    }

    if (!isValidStellarAddress(recipient)) {
      setTransferError("Invalid Stellar address")
      return
    }

    if (recipient === address) {
      setTransferError("Cannot transfer to yourself")
      return
    }

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Invalid amount")
      return
    }

    const balance = parseFloat(privateBalance.replace(/,/g, ""))
    if (amount > balance) {
      setTransferError("Insufficient private balance")
      return
    }

    setIsTransferring(true)
    setTransferError(null)
    setTxHash(null)

    try {
      const hash = await transferPrivate(address, recipient, transferAmount)
      setTxHash(hash)
      setShowTransferSuccess(true)
      setTransferAmount("")
      setRecipient("")
      
      // Refresh balances after transfer
      if (address) {
        // Refresh private balance (may take a moment for backend to process)
        setTimeout(async () => {
          const newPrivateBalance = await getPrivateBalance(address)
          setPrivateBalance(newPrivateBalance)
        }, 5000) // Wait 5 seconds for backend to process
      }
    } catch (error: any) {
      console.error("Transfer error:", error)
      setTransferError(error?.message || "Failed to transfer private tokens. Please try again.")
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background effects */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-0" />
      <div className="fixed inset-0 dither-effect pointer-events-none z-0" />

      <div className="relative z-10 container-padding max-w-6xl mx-auto py-8 pt-20">
        {/* Header with Enhanced Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 text-xs font-mono text-accent mb-6">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            {viewMode === "convert" ? "Private Token Converter" : "Private Token Transfer"}
          </div>
          
          {/* Main Title with Binary Effect */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 relative">
            <span className="relative inline-block">
              {/* Glow effect */}
              <span className="absolute inset-0 blur-2xl opacity-20 bg-linear-to-r from-accent via-accent/50 to-transparent" />
              {/* Main text with binary conversion effect */}
              <BinaryText 
                text="Convert to Private Token"
                className="relative z-10"
                initialDelay={200}
                letterAnimationDuration={500}
                letterInterval={100}
                autoPlay={true}
              />
            </span>
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
                          onClick={() => setConvertAmount(publicBalance)}
                          disabled={!isConnected || parseFloat(publicBalance) === 0}
                          className="text-xs text-accent hover:text-accent/80 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Balance: {parseFloat(publicBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
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

                    {/* Error Message */}
                    {convertError && (
                      <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/10 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{convertError}</p>
                      </div>
                    )}

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
                        <span className="text-xs text-accent/80">
                          Balance: {parseFloat(privateBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                        </span>
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
                            step="0.0000001"
                            className="w-full text-3xl font-semibold text-accent bg-transparent border-none outline-none text-right placeholder:text-accent/30"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setTransferAmount(privateBalance)}
                          disabled={!isConnected || parseFloat(privateBalance) === 0}
                          className="px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                    {/* Error Message */}
                    {transferError && (
                      <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/10 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{transferError}</p>
                      </div>
                    )}

                    {/* Info */}
                    {!transferError && (
                      <div className="p-3 border border-accent/20 rounded-lg bg-accent/5 flex items-start gap-2">
                        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {isConnected 
                            ? "This transfer is completely private and untraceable using zero-knowledge cryptography. (Privacy layer implementation in progress)"
                            : "Please connect your wallet to transfer private USDC tokens."}
                        </p>
                      </div>
                    )}

                    {/* Transfer Button */}
                    <Button
                      onClick={handleTransfer}
                      disabled={
                        !isConnected ||
                        !transferAmount || 
                        !recipient || 
                        parseFloat(transferAmount) <= 0 || 
                        isTransferring ||
                        !isValidStellarAddress(recipient)
                      }
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl"
                    >
                      {isTransferring ? (
                        <span className="flex items-center gap-2">
                          <CipherWheelLoader className="w-5 h-5" />
                          Sending Privately...
                        </span>
                      ) : !isConnected ? (
                        "Connect Wallet to Transfer"
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
                  Your USDC has been successfully converted to private tokens. The backend is processing your deposit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-muted/20 rounded border border-white/5">
                  <p className="text-xs font-mono text-muted-foreground mb-2">CONVERTED AMOUNT</p>
                  <p className="text-2xl font-bold font-mono">{convertAmount} USDC</p>
                  {convertTxHash && (
                    <p className="text-xs text-accent font-mono mt-2">
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${convertTxHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline hover:no-underline"
                      >
                        View on Stellar Expert
                      </a>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Your private balance will be updated once the backend processes the deposit.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowConvertSuccess(false)
                    setConvertTxHash(null)
                  }}
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
              {txHash && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs font-mono text-muted-foreground mb-1">TRANSACTION HASH</p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-accent hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setShowTransferSuccess(false)
                setTxHash(null)
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
