"use client"

import { useEffect, useRef } from "react"

export function CryptoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const hashFragments: Array<{
      x: number
      y: number
      text: string
      opacity: number
      speed: number
    }> = []

    // Generate hash-like strings
    const generateHash = () => {
      const chars = "0123456789abcdef"
      let hash = "0x"
      for (let i = 0; i < 12; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)]
      }
      return hash
    }

    // Create hash fragments - significantly fewer for subtlety
    for (let i = 0; i < 6; i++) {
      hashFragments.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        text: generateHash(),
        opacity: Math.random() * 0.05 + 0.03,
        speed: 0.05 + Math.random() * 0.1,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.filter = "blur(1px)"

      hashFragments.forEach((fragment) => {
        ctx.font = "11px JetBrains Mono, monospace"
        ctx.fillStyle = `rgba(84, 241, 241, ${fragment.opacity})`
        ctx.fillText(fragment.text, fragment.x, fragment.y)

        fragment.y += fragment.speed
        fragment.opacity = Math.sin(Date.now() / 3000 + fragment.x) * 0.03 + 0.05

        if (fragment.y > canvas.height) {
          fragment.y = -20
          fragment.x = Math.random() * canvas.width
          fragment.text = generateHash()
        }
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
}
