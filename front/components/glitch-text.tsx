"use client"

import { useEffect, useRef, useState } from "react"

interface GlitchTextProps {
  children: string
  className?: string
  speed?: number
}

export function GlitchText({ children, className = "", speed = 3000 }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(children)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const originalText = useRef(children)

  useEffect(() => {
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
  }, [speed])

  return (
    <span className={`glitch-text ${className}`} style={{ fontVariantLigatures: "none" }}>
      {displayText.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            animation: char !== " " && Math.random() < 0.1 ? "glitch-char 0.1s infinite" : "none",
          }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}

