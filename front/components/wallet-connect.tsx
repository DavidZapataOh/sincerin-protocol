"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, Copy, CheckCircle2, LogOut } from "lucide-react"

export function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [copied, setCopied] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    setIsConnecting(true)

    // Simulate wallet connection - in production, integrate with Freighter or other Stellar wallet
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock Stellar address (G... format)
    const mockAddress = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"
    setAddress(mockAddress)
    setIsConnected(true)
    setIsConnecting(false)
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress("")
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const truncateAddress = (addr: string) => {
    if (!addr) return ""
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className="border border-white/10 rounded-lg p-3 bg-white/2 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono text-green-400">WALLET CONNECTED</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-black/40 rounded px-3 py-2 font-mono text-sm">{truncateAddress(address)}</div>
          <button
            onClick={copyAddress}
            className="p-2 hover:bg-white/5 rounded transition-all duration-200 hover:scale-105"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <Button
          onClick={disconnectWallet}
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <LogOut className="w-3 h-3 mr-2" />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="w-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover:border-accent/50 transition-all duration-200"
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 mr-2 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}
