import { StatCard } from "@/components/stat-card"
import { ActivityItem } from "@/components/activity-item"
import { Wallet, Lock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AppDashboard() {
  return (
    <div className="page-container py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Manage your private Stellar tokens and transactions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Private Balance" value="12.45 XLM" subtitle="≈ $23,456.78 USD" icon={Lock} />
        <StatCard title="Public Balance" value="8.92 XLM" subtitle="≈ $16,789.23 USD" icon={Wallet} />
        <StatCard title="Total Volume" value="245.8 XLM" subtitle="Last 30 days" icon={TrendingUp} />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            asChild
            variant="outline"
            className="h-auto py-6 border-accent/30 hover:bg-accent/5 hover:border-accent/40 hover:scale-[1.02] justify-start bg-transparent transition-all duration-300"
          >
            <Link href="/app/convert">
              <div className="text-left">
                <div className="font-bold mb-1">Convert to Private</div>
                <div className="text-xs text-muted-foreground">Make your tokens untraceable</div>
              </div>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto py-6 border-accent/30 hover:bg-accent/5 hover:border-accent/40 hover:scale-[1.02] justify-start bg-transparent transition-all duration-300"
          >
            <Link href="/app/transfer">
              <div className="text-left">
                <div className="font-bold mb-1">Private Transfer</div>
                <div className="text-xs text-muted-foreground">Send tokens anonymously</div>
              </div>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto py-6 border-accent/30 hover:bg-accent/5 hover:border-accent/40 hover:scale-[1.02] justify-start bg-transparent transition-all duration-300"
          >
            <Link href="/app/withdraw">
              <div className="text-left">
                <div className="font-bold mb-1">Withdraw</div>
                <div className="text-xs text-muted-foreground">Convert back to public tokens</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Private Activity</h2>
          <Button variant="ghost" className="text-accent hover:text-accent/80 hover:bg-accent/10">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          <ActivityItem type="convert" amount="2.5" token="XLM" timestamp="2 hours ago" status="completed" />
          <ActivityItem type="transfer" amount="1.2" token="XLM" timestamp="5 hours ago" status="completed" />
          <ActivityItem type="withdraw" amount="0.8" token="XLM" timestamp="1 day ago" status="completed" />
          <ActivityItem type="convert" amount="500" token="USDC" timestamp="2 days ago" status="completed" />
          <ActivityItem type="transfer" amount="3.5" token="XLM" timestamp="3 days ago" status="completed" />
        </div>
      </div>

      {/* Privacy Status Banner */}
      <div className="mt-8 p-6 border border-accent/20 rounded-lg dither-effect bg-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 scanline pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 border border-accent/50 rounded-lg flex items-center justify-center bg-accent/10 shrink-0">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">Privacy Layer Active</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All transactions are protected by zero-knowledge cryptography via Soroban smart contracts. Your financial
              activity remains completely private and untraceable on the Stellar blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

