"use client"

import { useEffect, useRef, useState } from "react"

interface GlitchTextProps {
  children: string
  className?: string
  speed?: number
}

export function GlitchText({ children, className = "", speed = 3000 }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(children)
  const [isMounted, setIsMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const originalText = useRef(children)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const chars = "0123456789ABCDEFabcdef█▓▒░▄▀■□▲△●○◉◯◊◇◆"
    
    const glitch = () => {
      const text = originalText.current
      const glitched = text.split("").map((char, i) => {
        if (char === " ") return " "
        if (Math.random() < 0.15) {
          return chars[Math.floor(Math.random() * chars.length)]
        }
        return char
      }).join("")
      
      setDisplayText(glitched)
      
      setTimeout(() => {
        setDisplayText(originalText.current)
      }, 100)
    }

    intervalRef.current = setInterval(glitch, speed)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [speed, isMounted])

  // Don't render glitch effects until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <span className={`glitch-text ${className}`} style={{ fontVariantLigatures: "none" }}>
        {children}
      </span>
    )
  }

  return (
    <span 
      className={`glitch-text ${className}`} 
      style={{ fontVariantLigatures: "none" }}
    >
      {displayText.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block relative"
          style={{
            textShadow: `
              0 0 10px rgba(34, 211, 238, 0.3),
              0 0 20px rgba(34, 211, 238, 0.2),
              0 0 30px rgba(34, 211, 238, 0.1)
            `,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}

