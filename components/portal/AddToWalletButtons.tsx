"use client";

import { useSyncExternalStore } from "react";
import { Wallet } from "lucide-react";
import { chooseWalletOffers, detectWalletPlatform, type WalletPlatform } from "@/lib/wallet/platform";

const currentPlatform = (): WalletPlatform =>
  typeof navigator === "undefined"
    ? "desktop"
    : detectWalletPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

const LABEL = { apple: "Ajouter à Apple Wallet", google: "Ajouter à Google Wallet" } as const;
const HREF = { apple: "/api/wallet/apple", google: "/api/wallet/google" } as const;

/**
 * One obvious action: the card goes into the phone's own wallet. The right
 * wallet for the device is shown alone; a wallet the platform has not
 * configured is simply absent, so there is never a button that does nothing.
 */
export function AddToWalletButtons({
  customerId,
  appleEnabled,
  googleEnabled,
}: {
  customerId: string;
  appleEnabled: boolean;
  googleEnabled: boolean;
}) {
  // "desktop" on the server and during hydration; the device's real answer afterwards.
  const platform = useSyncExternalStore(() => () => {}, currentPlatform, () => "desktop" as WalletPlatform);
  const { offers, suggestPhone } = chooseWalletOffers(platform, appleEnabled, googleEnabled);
  if (offers.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2">
        {offers.map((kind) => (
          <a
            key={kind}
            href={`${HREF[kind]}?customerId=${encodeURIComponent(customerId)}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Wallet size={17} aria-hidden="true" /> {LABEL[kind]}
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] opacity-80">
        {suggestPhone
          ? "Ouvrez cette page sur votre téléphone pour ajouter la carte à son portefeuille."
          : "Votre carte sera dans votre portefeuille, même sans réseau. Au comptoir, donnez votre numéro de téléphone."}
      </p>
    </div>
  );
}
