import * as React from "react";
import { Toggle } from "minerva-flow";
import { Star, Flame, Vegan } from "lucide-react";

export function Default() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle aria-label="Marquer comme favori">
        <Star />
        Favori
      </Toggle>
      <Toggle aria-label="Marquer comme favori (actif)" defaultPressed>
        <Star />
        Favori
      </Toggle>
    </div>
  );
}

export function Pressed() {
  return (
    <Toggle aria-label="Épicé" defaultPressed>
      <Flame />
      Épicé
    </Toggle>
  );
}

export function Outline() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle variant="outline" aria-label="Végétarien">
        <Vegan />
        Végé
      </Toggle>
      <Toggle variant="outline" aria-label="Coup de coeur" defaultPressed>
        <Star />
        Coup de cœur
      </Toggle>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle size="sm" aria-label="Petit format" defaultPressed>
        Sm
      </Toggle>
      <Toggle size="default" aria-label="Format par défaut" defaultPressed>
        Défaut
      </Toggle>
      <Toggle size="lg" aria-label="Grand format" defaultPressed>
        Lg
      </Toggle>
    </div>
  );
}

export function Disabled() {
  return (
    <Toggle variant="outline" aria-label="Rupture de stock" disabled>
      Épuisé
    </Toggle>
  );
}
