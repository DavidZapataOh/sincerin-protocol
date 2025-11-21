"use client"

export function CipherWheelLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-12 h-12 ${className}`}>
      <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
      <div
        className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin"
        style={{ animationDuration: "1.5s" }}
      />
      <div
        className="absolute inset-2 border border-accent/40 rounded-full animate-spin"
        style={{ animationDuration: "2s", animationDirection: "reverse" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
      </div>
      {/* Bit pattern overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-accent/60 animate-pulse">
        <span className="sr-only">Loading</span>
      </div>
    </div>
  )
}
