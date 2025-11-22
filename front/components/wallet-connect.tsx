"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, Copy, CheckCircle2, LogOut } from "lucide-react"
import { getStellarWalletsKit } from "@/lib/stellarWalletsKit"
import { KitEventType } from "@creit-tech/stellar-wallets-kit/types"

export function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [copied, setCopied] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only runs on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    const kit = getStellarWalletsKit()
    if (!kit) {
      return
    }

    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const { address: currentAddress } = await kit.getAddress()
        if (currentAddress) {
          setAddress(currentAddress)
          setIsConnected(true)
        }
      } catch (error) {
        // No wallet connected yet
      }
    }

    checkConnection()

    // Listen to kit state updates
    const sub1 = kit.on(KitEventType.STATE_UPDATED, (event) => {
      if (event.payload.address) {
        setAddress(event.payload.address)
        setIsConnected(true)
        setIsConnecting(false)
      }
    })

    // Listen to disconnect events
    const sub2 = kit.on(KitEventType.DISCONNECT, () => {
      setIsConnected(false)
      setAddress("")
    })

    return () => {
      sub1()
      sub2()
    }
  }, [isMounted])

  const connectWallet = async () => {
    if (!isMounted) {
      return
    }

    setIsConnecting(true)
    try {
      const kit = getStellarWalletsKit()
      if (!kit) {
        return
      }

      const { address: walletAddress } = await kit.authModal()
      if (walletAddress) {
        setAddress(walletAddress)
        setIsConnected(true)
      }
    } catch (error) {
      // User might have cancelled the modal
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    const kit = getStellarWalletsKit()
    if (!kit) {
      return
    }

    try {
      await kit.disconnect()
      setIsConnected(false)
      setAddress("")
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-lg bg-white/2 backdrop-blur-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-green-400">{truncateAddress(address)}</span>
          <button
            onClick={copyAddress}
            className="p-1 hover:bg-white/5 rounded transition-all duration-200"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        </div>
        <Button
          onClick={disconnectWallet}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <LogOut className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      size="sm"
      className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover:border-accent/50 transition-all duration-200"
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
