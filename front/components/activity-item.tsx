import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"

interface ActivityItemProps {
  type: "convert" | "transfer" | "withdraw"
  amount: string
  token: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export function ActivityItem({ type, amount, token, timestamp, status }: ActivityItemProps) {
  const icons = {
    convert: RefreshCw,
    transfer: ArrowUpRight,
    withdraw: ArrowDownRight,
  }

  const Icon = icons[type]

  return (
    <div className="flex items-center justify-between p-4 border border-white/5 rounded-lg hover:border-accent/30 transition-colors group">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center border",
            status === "completed" && "bg-accent/10 border-accent/30",
            status === "pending" && "bg-muted/50 border-muted",
            status === "failed" && "bg-destructive/10 border-destructive/30",
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5",
              status === "completed" && "text-accent",
              status === "pending" && "text-muted-foreground animate-pulse",
              status === "failed" && "text-destructive",
            )}
          />
        </div>
        <div>
          <p className="font-medium capitalize">{type}</p>
          <p className="text-xs text-muted-foreground font-mono">{timestamp}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-medium">
          {amount} {token}
        </p>
        <p
          className={cn(
            "text-xs font-mono",
            status === "completed" && "text-accent",
            status === "pending" && "text-muted-foreground",
            status === "failed" && "text-destructive",
          )}
        >
          {status}
        </p>
      </div>
    </div>
  )
}
