"use client"

import { EncryptionHighlight } from "./encryption-highlight"

export function LandingWrapper({ children }: { children: React.ReactNode }) {
  return <EncryptionHighlight>{children}</EncryptionHighlight>
}

