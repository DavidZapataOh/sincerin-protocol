"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LetterState {
  char: string
  isMatrix: boolean
  isSpace: boolean
}

interface BinaryTextProps {
  text: string
  className?: string
  initialDelay?: number
  letterAnimationDuration?: number
  letterInterval?: number
  autoPlay?: boolean
}

export function BinaryText({
  text,
  className,
  initialDelay = 200,
  letterAnimationDuration = 500,
  letterInterval = 100,
  autoPlay = true,
}: BinaryTextProps) {
  const [letters, setLetters] = useState<LetterState[]>(() =>
    text.split("").map((char) => ({
      char,
      isMatrix: false,
      isSpace: char === " ",
    }))
  )
  const [isAnimating, setIsAnimating] = useState(false)

  const getRandomChar = useCallback(
    () => (Math.random() > 0.5 ? "1" : "0"),
    []
  )

  const animateLetter = useCallback(
    (index: number) => {
      if (index >= text.length) return

      requestAnimationFrame(() => {
        setLetters((prev) => {
          const newLetters = [...prev]
          if (!newLetters[index].isSpace) {
            newLetters[index] = {
              ...newLetters[index],
              char: getRandomChar(),
              isMatrix: true,
            }
          }
          return newLetters
        })

        setTimeout(() => {
          setLetters((prev) => {
            const newLetters = [...prev]
            newLetters[index] = {
              ...newLetters[index],
              char: text[index],
              isMatrix: false,
            }
            return newLetters
          })
        }, letterAnimationDuration)
      })
    },
    [getRandomChar, text, letterAnimationDuration]
  )

  const startAnimation = useCallback(() => {
    if (isAnimating) return

    setIsAnimating(true)
    let currentIndex = 0

    const animate = () => {
      if (currentIndex >= text.length) {
        setIsAnimating(false)
        return
      }

      animateLetter(currentIndex)
      currentIndex++
      setTimeout(animate, letterInterval)
    }

    animate()
  }, [animateLetter, text, isAnimating, letterInterval])

  useEffect(() => {
    if (!autoPlay) return
    const timer = setTimeout(startAnimation, initialDelay)
    return () => clearTimeout(timer)
  }, [autoPlay, initialDelay, startAnimation])

  const motionVariants = useMemo(
    () => ({
      matrix: {
        color: "oklch(0.8 0.15 195)", // accent color directly (cyan #54F1F1)
        textShadow: "0 2px 4px oklch(0.8 0.15 195 / 0.5)",
      },
      normal: {
        color: "inherit",
        textShadow: "none",
      },
    }),
    []
  )

  return (
    <span className={cn("inline-flex", className)}>
      {letters.map((letter, index) => (
        <motion.span
          key={`${index}-${letter.char}`}
          className="font-mono inline-block"
          initial="normal"
          animate={letter.isMatrix ? "matrix" : "normal"}
          variants={motionVariants}
          transition={{
            duration: 0.1,
            ease: "easeInOut",
          }}
          style={{
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.05em",
          }}
        >
          {letter.isSpace ? "\u00A0" : letter.char}
        </motion.span>
      ))}
    </span>
  )
}
