"use client"

import { useState, useEffect } from "react"
import { getStellarWalletsKit } from "@/lib/stellarWalletsKit"
import { KitEventType } from "@creit-tech/stellar-wallets-kit/types"

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return
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
      }
    })

    // Listen to disconnect events
    const sub2 = kit.on(KitEventType.DISCONNECT, () => {
      setIsConnected(false)
      setAddress(null)
    })

    return () => {
      sub1()
      sub2()
    }
  }, [isMounted])

  return { address, isConnected, isMounted }
}

