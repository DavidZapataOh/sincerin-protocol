import type React from "react"
import { CryptoBackground } from "@/components/crypto-background"
import { AppHeader } from "@/components/app-header"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-[#050505]">
      <CryptoBackground />

      {/* Grain and dither overlay */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-10" />
      <div className="fixed inset-0 dither-effect pointer-events-none z-10" />

      <AppHeader />

      <main className="relative z-20 min-h-screen">{children}</main>
    </div>
  )
}