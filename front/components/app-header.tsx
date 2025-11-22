"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { WalletConnect } from "@/components/wallet-connect"

export function AppHeader() {
  return (
    <header className="relative z-30 border-b border-white/5 bg-[#050505]/80 backdrop-blur-sm">
      <nav className="container-padding max-w-7xl mx-auto py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 border border-accent/50 rounded flex items-center justify-center">
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <span className="text-xl font-bold tracking-tight">Sincerin</span>
        </Link>

        <div className="flex items-center gap-4">
          <WalletConnect />
        </div>
      </nav>
    </header>
  )
}

