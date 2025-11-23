"use client"

import { useEffect, useRef } from "react"

const ENCRYPTION_CHARS = "0123456789ABCDEFabcdef█▓▒░▄▀■□▲△●○◉◯◊◇◆"
const ANIMATION_DURATION = 30 // ms per character
const MAX_ITERATIONS = 10

interface EncryptionState {
  textNode: Text
  originalText: string
  startOffset: number
  endOffset: number
  iteration: number
  animationId: number | null
}

export function EncryptionHighlight({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const encryptionStateRef = useRef<EncryptionState | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let selectionTimeout: NodeJS.Timeout

    const stopEncryption = () => {
      if (encryptionStateRef.current) {
        const state = encryptionStateRef.current
        if (state.animationId !== null) {
          cancelAnimationFrame(state.animationId)
        }
        // Restore original text
        if (state.textNode.textContent !== null) {
          state.textNode.textContent = state.originalText
        }
        encryptionStateRef.current = null
      }
    }

    const encryptText = (state: EncryptionState) => {
      if (state.iteration >= MAX_ITERATIONS) {
        // Restore original text
        if (state.textNode.textContent !== null) {
          state.textNode.textContent = state.originalText
        }
        encryptionStateRef.current = null
        return
      }

      const selectedLength = state.endOffset - state.startOffset
      const encryptedChars = Array.from({ length: selectedLength }, () => {
        return ENCRYPTION_CHARS[Math.floor(Math.random() * ENCRYPTION_CHARS.length)]
      })

      const newText =
        state.originalText.slice(0, state.startOffset) +
        encryptedChars.join("") +
        state.originalText.slice(state.endOffset)

      if (state.textNode.textContent !== null) {
        state.textNode.textContent = newText
      }

      state.iteration++
      state.animationId = requestAnimationFrame(() => {
        setTimeout(() => encryptText(state), ANIMATION_DURATION)
      })
    }

    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        stopEncryption()
        return
      }

      const range = selection.getRangeAt(0)
      const selectedText = selection.toString().trim()
      
      if (!selectedText) {
        stopEncryption()
        return
      }

      // Check if selection is within container
      if (!container.contains(range.commonAncestorContainer)) {
        stopEncryption()
        return
      }

      // Get the selected text node
      const node = range.startContainer
      if (node.nodeType !== Node.TEXT_NODE) {
        stopEncryption()
        return
      }

      // Stop any existing encryption
      stopEncryption()

      const textNode = node as Text
      const originalText = textNode.textContent || ""
      const startOffset = range.startOffset
      const endOffset = range.endOffset

      // Create new encryption state
      const state: EncryptionState = {
        textNode,
        originalText,
        startOffset,
        endOffset,
        iteration: 0,
        animationId: null,
      }

      encryptionStateRef.current = state

      // Start encryption animation
      encryptText(state)

      // Restore after a delay
      clearTimeout(selectionTimeout)
      selectionTimeout = setTimeout(() => {
        stopEncryption()
      }, 1500)
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.toString().trim() === "") {
        stopEncryption()
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("selectionchange", handleSelectionChange)
      clearTimeout(selectionTimeout)
      stopEncryption()
    }
  }, [])

  return (
    <div ref={containerRef} className="encryption-highlight-container">
      {children}
    </div>
  )
}

