"use client"

import { useEffect, useRef } from "react";
import { getStellarWalletsKit } from "@/lib/stellarWalletsKit";

export function ConnectWalletButton() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const kit = getStellarWalletsKit();
    if (!kit) return;
    kit.createButton(wrapperRef.current);
  }, []);

  return <div id="wallet-connect" ref={wrapperRef} />;
}