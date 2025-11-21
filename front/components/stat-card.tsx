import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative p-6 border border-white/5 rounded-lg dither-effect hover:border-accent/20 hover:scale-[1.02] transition-all duration-300 group bg-card",
        className,
      )}
    >
      <div className="absolute inset-0 bg-linear-to-brfrom-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          {Icon && (
            <div className="w-10 h-10 border border-accent/30 rounded-lg flex items-center justify-center bg-accent/5">
              <Icon className="w-5 h-5 text-accent" />
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}
