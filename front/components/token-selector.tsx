"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

interface Token {
  symbol: string
  name: string
  balance?: string
}

const tokens: Token[] = [
  { symbol: "ETH", name: "Ethereum", balance: "2.45" },
  { symbol: "USDC", name: "USD Coin", balance: "1,234.56" },
  { symbol: "USDT", name: "Tether", balance: "890.12" },
  { symbol: "DAI", name: "Dai", balance: "567.89" },
]

interface TokenSelectorProps {
  value: Token
  onChange: (token: Token) => void
}

export function TokenSelector({ value, onChange }: TokenSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white/2border-white/10 hover:bg-white/5 hover:border-accent/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-accent">{value.symbol.slice(0, 2)}</span>
            </div>
            <div className="text-left">
              <div className="font-medium">{value.symbol}</div>
              <div className="text-xs text-muted-foreground">{value.name}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-popover border-white/10">
        {tokens.map((token) => (
          <DropdownMenuItem
            key={token.symbol}
            onClick={() => onChange(token)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-accent">{token.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <div className="font-medium">{token.symbol}</div>
                <div className="text-xs text-muted-foreground">{token.name}</div>
              </div>
            </div>
            {token.balance && <div className="text-sm font-mono text-muted-foreground">{token.balance}</div>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
