import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";

// Initialize the kit only in browser environment
let isInitialized = false;

export function getStellarWalletsKit() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!isInitialized) {
    StellarWalletsKit.init({
      modules: defaultModules(),
    });
    isInitialized = true;
  }

  return StellarWalletsKit;
}