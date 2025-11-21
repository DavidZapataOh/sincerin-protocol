import { useEffect, useRef } from "react";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";

export function ConnectWalletButton() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    // El kit se encarga de crear el botón dentro del wrapper
    StellarWalletsKit.createButton(wrapperRef.current);
  }, []);

  return <div id="wallet-connect" ref={wrapperRef} />;
}