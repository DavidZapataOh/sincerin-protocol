"use client"

import { useEffect, useState } from "react"
import { CipherWheelLoader } from "./cipher-wheel-loader"

export function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleComplete = () => setIsLoading(false)

    // Listen for navigation events
    window.addEventListener("beforeunload", handleStart)

    return () => {
      window.removeEventListener("beforeunload", handleStart)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <CipherWheelLoader className="w-16 h-16" />
    </div>
  )
}
