import type React from "react"
import { AppNav } from "@/components/app-nav"
import { CryptoBackground } from "@/components/crypto-background"

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

      <AppNav />

      <main className="ml-64 relative z-20 min-h-screen">{children}</main>
    </div>
  )
}