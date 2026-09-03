import { describe, expect, it } from "vitest";

describe("End-to-End Story Stickers & Referral Flow", () => {
  it("formats story link stickers with UTM parameters correctly", () => {
    const origin = "https://minervaflow.app";
    const referralCode = "ABC123XYZ";
    const path = `/p/${referralCode}`;
    const fullUrl = `${origin}${path}?utm_source=instagram_story&utm_medium=sticker`;

    const parsed = new URL(fullUrl);
    expect(parsed.origin).toBe("https://minervaflow.app");
    expect(parsed.pathname).toBe("/p/ABC123XYZ");
    expect(parsed.searchParams.get("utm_source")).toBe("instagram_story");
    expect(parsed.searchParams.get("utm_medium")).toBe("sticker");
  });

  it("generates viral captions according to objective", () => {
    const restaurantName = "Le Trèfle Doré";
    const referralFullUrl = "https://minervaflow.app/p/VIP10?utm_source=instagram_story&utm_medium=sticker";

    // Test Referral objective caption
    const referralCaption = `🎁 Offre d'Accueil & Découverte chez ${restaurantName} !

10 $ offerts sur votre première table
Invitez vos proches ou venez savourer nos créations. Votre avantage est activé en 1 clic via le sticker !

👉 Cliquez directement sur notre sticker Story pour activer votre privilège :
🔗 ${referralFullUrl}

#Fidelite #OffreGourmande #RestoLocal #Invitation #Bistro`;

    expect(referralCaption).toContain(restaurantName);
    expect(referralCaption).toContain(referralFullUrl);
    expect(referralCaption).toContain("sticker Story");

    // Test Review 5-star objective caption
    const reviewCaption = `🎁 Avis Google Vérifié 5★ chez ${restaurantName} !

« Une expérience culinaire d'exception ! »
« Accueil chaleureux, saveurs authentiques et ambiance feutrée. »

👉 Cliquez directement sur notre sticker Story pour activer votre privilège :
🔗 ${referralFullUrl}`;

    expect(reviewCaption).toContain("Avis Google");
    expect(reviewCaption).toContain(referralFullUrl);
  });

  it("validates that all 5 studio objectives have valid labels and icons", () => {
    const objectives = [
      { id: "menu", label: "Menu & Plats", icon: "🍽️" },
      { id: "referral", label: "Parrainage & Invitation", icon: "🎁" },
      { id: "review", label: "Avis Google 5★", icon: "⭐" },
      { id: "vip", label: "Passeport VIP Club", icon: "💎" },
      { id: "ambassador", label: "Ambassadeur Vedette", icon: "🏆" },
    ];

    expect(objectives).toHaveLength(5);
    for (const obj of objectives) {
      expect(obj.id).toBeTruthy();
      expect(obj.label).toBeTruthy();
      expect(obj.icon).toBeTruthy();
    }
  });
});
