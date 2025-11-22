"use client"

import { useState } from "react"

interface Metric {
  label: string
  value: string
  subtitle?: string
}

export function MetricsDashboard() {
  const [metrics] = useState<Metric[]>([
    { label: "Privacy score", value: "99.3%" },
    { label: "Conversion ETA", value: "0.62s" },
    { label: "ZK proof status", value: "Active" },
    { label: "Soroban integrity", value: "Attested" },
    { label: "Pool depth", value: "$134M" },
    { label: "Privacy mode", value: "Full ZK" },
  ])

  return (
    <div className="p-6 border border-white/10 rounded-xl bg-card/50 backdrop-blur-sm dither-effect">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        <span className="text-xs font-mono uppercase tracking-wider text-accent">Soroban Privacy Pool</span>
        <span className="text-xs font-mono text-muted-foreground">•</span>
        <span className="text-xs font-mono text-accent">ZK verified</span>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/2">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">From</div>
            <div className="text-sm font-semibold">Public USDC</div>
            <div className="text-xs text-muted-foreground">Stellar Network</div>
            <div className="text-xs text-accent mt-1">Encrypting payload</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">To</div>
            <div className="text-sm font-semibold">Private USDC</div>
            <div className="text-xs text-muted-foreground">Encrypted Token</div>
            <div className="text-xs text-accent mt-1">Awaiting proof</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((metric, i) => (
          <div key={i} className="p-3 border border-white/5 rounded-lg bg-white/2 hover:border-accent/20 transition-colors">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
              {metric.label}
            </div>
            <div className="text-base font-semibold font-mono text-accent">{metric.value}</div>
            {metric.subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{metric.subtitle}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

