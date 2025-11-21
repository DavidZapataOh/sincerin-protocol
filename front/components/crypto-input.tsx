"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface CryptoInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  className?: string
  helperText?: string
}

export function CryptoInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  helperText,
}: CryptoInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white/2 border-white/10 focus:border-accent/50 focus:ring-accent/20 transition-all font-mono"
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent opacity-0 focus-within:opacity-100 transition-opacity" />
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
