"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Lock, RefreshCw } from "lucide-react"
import { WalletConnect } from "@/components/wallet-connect"

const navItems = [
  { href: "/app", label: "Swap", icon: RefreshCw },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#050505] z-30">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 border border-accent/50 rounded flex items-center justify-center">
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <span className="text-xl font-bold tracking-tight">Sincerin</span>
        </Link>

        <div className="mb-8">
          <WalletConnect />
        </div>

        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative",
                  isActive
                    ? "bg-accent/10 text-foreground border border-accent/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/3 hover:scale-[1.02]",
                )}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r" />}
                <Icon
                  className={cn(
                    "w-4 h-4 transition-all duration-300",
                    isActive ? "text-accent" : "group-hover:text-accent",
                  )}
                />
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />}
              </Link>
            )
          })}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 border border-white/5 rounded-lg dither-effect bg-white/2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-xs font-mono text-accent">STELLAR NETWORK</span>
            </div>
            <p className="text-xs text-muted-foreground">Connected to Local</p>
          </div>
        </div>
      </div>
    </nav>
  )
}