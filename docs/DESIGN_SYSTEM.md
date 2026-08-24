# Minerva Flow — Guide de Référence & Spécifications du Design System

> **Version 1.0.0** — Design System officiel de l'application **Minerva Flow**.  
> Ce document définit l'ensemble des règles de style, jetons de design (tokens), composants UI standardisés, hiérarchie typographique et bonnes pratiques d'implémentation pour garantir une cohérence visuelle absolue et un niveau de finition haut de gamme.

---

## Sommaire

1. [Philosophie & Identité de Marque](#1-philosophie--identité-de-marque)
2. [Palette de Couleurs & Tokens Sémantiques](#2-palette-de-couleurs--tokens-sémantiques)
3. [Système Typographique](#3-système-typographique)
4. [Élévations, Ombres & Rayons de Courbure](#4-élévations-ombres--rayons-de-courbure)
5. [Animations & Micro-Interactions](#5-animations--micro-interactions)
6. [Catalogue des Composants Standardisés](#6-catalogue-des-composants-standardisés)
   - [Boutons (`Button`)](#button)
   - [Badges & Statuts (`Badge`, `StatusBadge`)](#badge)
   - [Cartes & Conteneurs (`Card`, `PageCard`)](#card)
   - [Indicateurs KPI (`StatCard`, `StatGrid`)](#statcard--statgrid)
   - [En-têtes (`PageHeader`, `SectionHeader`)](#pageheader--sectionheader)
   - [Bannières & Retours (`AlertBanner`, `Callout`)](#alertbanner)
   - [États Vides (`EmptyState`)](#emptystate)
   - [Recherche & Filtres (`SearchFilterBar`)](#searchfilterbar)
   - [Tableaux de Données (`DataTable`, `Table`)](#datatable--table)
   - [Formulaires & Entrées (`FormField`, `Input`, `Select`, `Switch`)](#formulaires--entrées)
   - [Navigation & Onglets (`Tabs`, `Breadcrumb`, `Pagination`)](#navigation--onglets)
   - [Modales & Tiroirs (`Modal`, `Drawer`, `Dialog`, `Sheet`)](#modales--tiroirs)
   - [Progression & Squelettes (`ProgressBar`, `Skeleton`)](#progression--squelettes)
7. [Structure Type d'une Page Minerva](#7-structure-type-dune-page-minerva)
8. [Règles d'Import & Rétrocompatibilité](#8-règles-dimport--rétrocompatibilité)

---

## 1. Philosophie & Identité de Marque

Minerva Flow associe l'exigence opérationnelle de la restauration et du pilotage d'entreprise à une esthétique **éditoriale luxueuse, chaleureuse et feutrée** :

- **Surfaces Crème & Papier de Riz** : Éviter les fonds blancs froids (`#ffffff`). Privilégier les teintes crèmes naturelles (`--mv-cream: #f5f1e6`, `--mv-surface: #fffefa`) pour une sensation tactile de papeterie noble.
- **Vert Olive & Forêt Profond** : Couleur signature (`#167f5b`), symbole de prospérité financière, d'élégance et de sérénité opérationnelle.
- **Accent Lime Haute Énergie** : Touche moderne (`#dfff5f`), réservée aux appels à l'action stratégiques, badges clés et interactions dynamiques.
- **Typographie à Contraste Éditorial** : Mariage d'une police serif classique (*New York / Playfair Display*) pour les titres et d'une police sans-serif géométrique (*Plus Jakarta Sans*) pour l'interface logicielle.
- **Mode Sombre Chaleureux** : Palette sombre aux sous-tons ambrés/mousse de forêt (`#14170f`), évitant les noirs purs agressifs `#000000`.

---

## 2. Palette de Couleurs & Tokens Sémantiques

### 2.1 Couleurs Principales (Tokens CSS & Tailwind)

| Jeton CSS | Variable Tailwind | Code HEX | Rôle & Usage |
| :--- | :--- | :--- | :--- |
| `--mv-green` | `mv-green` | `#167f5b` | Accent de marque principal, boutons primaires, validation |
| `--mv-green-dark` | `mv-green-dark` | `#0e5a40` | Survol des boutons, texte sur fond crème clair |
| `--mv-green-darker` | `mv-green-darker` | `#0a4531` | Texte sur fond vert clair ou lime |
| `--mv-green-light` | `mv-green-light` | `#dcece3` | Arrière-plan secondaire doux, puces sélectionnées |
| `--mv-green-tint` | `mv-green-tint` | `#eef5f0` | Fonds de badges positifs, lignes actives de tableau |
| `--mv-lime` | `mv-lime` | `#dfff5f` | Accent à fort impact visuel, sélection, nouveauté |
| `--mv-lime-dark` | `mv-lime-dark` | `#6d7e1f` | Texte et bordures sur fond lime |
| `--mv-cream` | `mv-cream` | `#f5f1e6` | Arrière-plan global de l'application (Body) |
| `--mv-cream-soft` | `mv-cream-soft` | `#fbf9f3` | Arrière-plan des panneaux secondaires, en-têtes de table |
| `--mv-surface` | `mv-surface` | `#fffefa` | Cartes, modales, surfaces élevées |
| `--mv-ink` | `mv-ink` | `#1a1e16` | Titres, texte principal haute emphase |
| `--mv-ink-soft` | `mv-ink-soft` | `#565f52` | Paragraphes, labels, texte secondaire |
| `--mv-ink-faint` | `mv-ink-faint` | `#8d9488` | Métadonnées, sous-titres, placeholders |
| `--mv-border` | `mv-border` | `#e6e0d0` | Bordures principales de cartes et séparateurs |
| `--mv-border-soft` | `mv-border-soft` | `#eee9db` | Lignes de tableau douces, séparateurs discrets |

### 2.2 Palette d'Alertes & Statuts

| Statut | Jeton Texte / Bordure | Jeton Arrière-plan | Signification |
| :--- | :--- | :--- | :--- |
| **Succès / Positif** | `--mv-green` (`#167f5b`) | `--mv-green-tint` (`#eef5f0`) | Tendance haussière, action réussie, statut actif |
| **Alerte / Attention** | `--mv-amber` (`#ab7d1f`) | `--mv-amber-bg` (`#f6efd9`) | Attention requise, seuil proche, stock faible |
| **Erreur / Danger** | `--mv-red` (`#b5473a`) | `--mv-red-bg` (`#f8ece8`) | Perte financière, action destructive, erreur système |
| **Info / Neutre** | `--mv-ink-soft` (`#565f52`) | `--mv-ink/[0.06]` | Information contextuelle, brouillon, neutre |

---

## 3. Système Typographique

### 3.1 Familles de Polices

1. **Titres & Display (`font-display`, `font-heading`, `font-serif`)**  
   - Famille : `"New York", -apple-system-serif, "Playfair Display", Georgia, serif`
   - Usage : Titres de page `h1`, titres de cartes `CardTitle`, chiffres héroïques des `StatCard`.
   - Caractère : Élégant, littéraire, intemporel.

2. **Interface & Corps de Texte (`font-sans`)**  
   - Famille : `Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif`
   - Usage : Boutons, formulaires, tableaux, descriptions, menus.
   - Caractère : Moderne, géométrique, excellente lisibilité à petite taille.

3. **Chiffres & Code (`font-mono`)**  
   - Famille : `JetBrains Mono, SFMono-Regular, monospace`
   - Usage : Montants monétaires, identifiants, raccourcis clavier (`⌘K`), dates techniques.

### 3.2 Échelle Typographique Standardisée

| Niveau | Classe Tailwind | Taille & Interlignage | Police recommandée |
| :--- | :--- | :--- | :--- |
| **Grand Titre de Page** | `text-[26px] md:text-[30px] font-medium tracking-tight` | 26px / 32px | `font-display text-mv-ink` |
| **Titre de Carte / Section** | `text-[17px] md:text-[18px] font-medium` | 18px / 24px | `font-display text-mv-ink` |
| **Grand Chiffre KPI** | `text-[28px] md:text-[32px] font-medium leading-none` | 28px / 28px | `font-display text-mv-ink` |
| **Corps de Texte Standard** | `text-[13.5px] leading-relaxed` | 13.5px / 20px | `font-sans text-mv-ink-soft` |
| **Eyebrow / Sur-titre** | `text-[11px] md:text-[12px] font-semibold uppercase tracking-wider` | 12px / 16px | `font-sans text-mv-green-dark` |
| **Badges & Labels Courts** | `text-[11px] md:text-[12px] font-semibold` | 12px / 12px | `font-sans` |
| **Petite Légende / Aide** | `text-[11.5px] leading-tight` | 11.5px / 16px | `font-sans text-mv-ink-faint` |

---

## 4. Élévations, Ombres & Rayons de Courbure

### 4.1 Ombres Sémantiques

```css
--shadow-mv-sm: 0 1px 2px rgba(26, 30, 22, 0.05);
--shadow-mv-md: 0 2px 4px rgba(26, 30, 22, 0.04), 0 8px 20px rgba(26, 30, 22, 0.06);
--shadow-mv-lg: 0 8px 16px rgba(26, 30, 22, 0.06), 0 24px 48px rgba(26, 30, 22, 0.10);
```

- **`shadow-mv-sm`** : Cartes standard, boutons, barres de recherche.
- **`shadow-mv-md`** : Menus déroulants, popovers, cartes interactives au survol.
- **`shadow-mv-lg`** : Fenêtres modales (`Modal`), tiroirs latéraux (`Sheet`/`Drawer`).

### 4.2 Rayons de Courbure (`border-radius`)

- **`rounded-2xl` (`16px` à `20px`)** : Cartes, conteneurs principaux, modales.
- **`rounded-xl` (`12px`)** : Champs de formulaires, barres de filtres, alertes.
- **`rounded-lg` (`8px`)** : Boutons, cellules interactives, onglets.
- **`rounded-full` (`9999px`)** : Badges, pastilles de filtre, avatars circulaires, pastilles de statut.

---

## 5. Animations & Micro-Interactions

```css
/* Entrée en douceur avec décalage vertical */
.mv-animate-in {
  animation: mv-fade-up 0.35s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

/* Effet Shimmer de chargement */
.mv-skeleton {
  animation: mv-shimmer 1.8s infinite;
}

/* Pop de confirmation */
.mv-check-pop {
  animation: mv-check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

---

## 6. Catalogue des Composants Standardisés

Tous les composants sont importables directement depuis le point d'entrée unique `@/components/ui` :

```tsx
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  StatCard,
  StatGrid,
  PageHeader,
  SectionHeader,
  EmptyState,
  AlertBanner,
  SearchFilterBar,
  DataTable,
  Table,
  FormField,
  Input,
  Select,
  Switch,
  Tabs,
  Modal,
  ProgressBar,
  Skeleton,
} from "@/components/ui";
```

---

### Button

Composant d'action standard avec gestion des états polymorphiques (`next/link`), indicateur de chargement automatique (`loading`) et accessibilité intégrée.

```tsx
import { Button } from "@/components/ui";
import { Plus, Download } from "lucide-react";

// Primaire (Vert Minerva)
<Button variant="default">
  <Plus size={16} /> Créer une commande
</Button>

// Secondaire (Surface crème avec bordure)
<Button variant="secondary">
  <Download size={16} /> Exporter en CSV
</Button>

// Accent Lime
<Button variant="lime">Action Clé</Button>

// Destructif
<Button variant="destructive">Supprimer</Button>

// État de chargement automatique
<Button variant="default" loading={isSubmitting}>
  Enregistrer les modifications
</Button>
```

#### Variantes de `Button` :
- `variant` : `"default" | "secondary" | "outline" | "ghost" | "destructive" | "lime" | "link"`
- `size` : `"xs" | "sm" | "default" (md) | "lg" | "icon" | "icon-sm" | "icon-xs"`
- `loading` : `boolean`
- `href` : `string` (rendu automatique sous forme de lien Next.js fluide)

---

### Badge

Pastille de statut, catégorie ou métrique compacte avec support de puce lumineuse (`dot`) et animation de pulsation (`pulse`).

```tsx
import { Badge } from "@/components/ui";

<Badge tone="green" dot pulse>En direct</Badge>
<Badge tone="lime">Actif</Badge>
<Badge tone="amber" dot>En attente</Badge>
<Badge tone="red">Échoué</Badge>
<Badge tone="neutral">Brouillon</Badge>
<Badge tone="blue">Synchronisé</Badge>
```

#### Propriétés de `Badge` :
- `tone` : `"green" | "lime" | "red" | "amber" | "neutral" | "ink" | "blue" | "purple"`
- `variant` : `"subtle" | "outline" | "solid"`
- `size` : `"xs" | "sm" | "default" | "lg"`
- `dot` : `boolean`
- `pulse` : `boolean`

---

### Card & PageCard

Conteneur de surface blanc cassé (`#fffefa`) bordé de sable doux (`#e6e0d0`), avec support du survol interactif, mode verre (`glass`) et structure sémantique claire.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, Button } from "@/components/ui";

<Card variant="default">
  <CardHeader>
    <CardTitle>Réservations du Jour</CardTitle>
    <CardDescription>Vue en temps réel des tables confirmées</CardDescription>
    <CardAction>
      <Button variant="secondary" size="sm">Gérer</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Contenu de la carte...</p>
  </CardContent>
  <CardFooter className="justify-between">
    <span className="text-xs text-mv-ink-faint">Dernière synchro: 14:32</span>
    <Button variant="link" size="sm">Voir tout</Button>
  </CardFooter>
</Card>
```

#### Variantes de `Card` :
- `variant` : `"default" | "interactive" | "glass" | "flat" | "outline"`
- `size` : `"default" | "sm" | "lg"`
- `padded` : `boolean` (ajoute automatiquement le padding intérieur `p-5`)

---

### StatCard & StatGrid

Cartes d'indicateurs de performance clés (KPI) avec calcul automatique du sens de la flèche de tendance (`+` ou `-`), icône thématisée et grille responsive.

```tsx
import { StatCard, StatGrid } from "@/components/ui";
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";

<StatGrid cols={4}>
  <StatCard
    label="Chiffre d'Affaires"
    value="14 250 €"
    delta={+12.4}
    icon={DollarSign}
    sublabel="vs mois précédent"
    accent="green"
  />
  <StatCard
    label="Commandes Servies"
    value="342"
    delta={+5.8}
    icon={ShoppingBag}
    sublabel="vs objectif"
    accent="lime"
  />
  <StatCard
    label="Coût Matières"
    value="28.4%"
    delta={-2.1}
    icon={TrendingUp}
    sublabel="Optimisation food cost"
    accent="ink"
  />
  <StatCard
    label="Clients Fidélisés"
    value="1 280"
    delta={+18.9}
    icon={Users}
    sublabel="Programme actif"
    accent="blue"
  />
</StatGrid>
```

---

### PageHeader & SectionHeader

Établit la hiérarchie typographique stricte au sommet des pages et à l'intérieur des cartes complexes.

```tsx
import { PageHeader, SectionHeader, Button, Badge } from "@/components/ui";
import { Download, Plus } from "lucide-react";

// En-tête de page principal
<PageHeader
  eyebrow="Finances & Pilotage"
  title="Seuil de Rentabilité & Trésorerie"
  description="Analysez vos marges brutes, coûts fixes et modélisez vos scénarios de rentabilité en temps réel."
  badge={<Badge tone="green" dot>Mis à jour</Badge>}
  action={
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm">
        <Download size={15} /> Exporter
      </Button>
      <Button variant="default" size="sm">
        <Plus size={15} /> Nouvelle Simulation
      </Button>
    </div>
  }
/>

// En-tête de section interne
<SectionHeader
  title="Détail des Postes de Coûts"
  description="Répartition mensuelle par catégorie"
  action={<Button variant="ghost" size="xs">Tout déplier</Button>}
/>
```

---

### AlertBanner

Bannières informatives et d'alerte pour guider l'utilisateur avec style et clarté.

```tsx
import { AlertBanner, Button } from "@/components/ui";

<AlertBanner
  tone="warning"
  title="Seuil de rentabilité approché"
  action={<Button variant="secondary" size="xs">Ajuster les prévisions</Button>}
  onDismiss={() => console.log("Fermé")}
>
  Votre volume de ventes actuel est à 92% du point mort estimé pour la quinzaine en cours.
</AlertBanner>
```

---

### SearchFilterBar

Barre unifiée combinant champ de recherche avec raccourci clavier `⌘K`, pilules de catégories filtrantes et actions secondaires.

```tsx
import { SearchFilterBar } from "@/components/ui";
import { useState } from "react";

const categories = [
  { id: "all", label: "Toutes", count: 48 },
  { id: "food", label: "Cuisine & Plats", count: 32 },
  { id: "drinks", label: "Boissons & Vins", count: 12 },
  { id: "desserts", label: "Desserts", count: 4 },
];

export function FilterExample() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  return (
    <SearchFilterBar
      searchValue={search}
      onSearchChange={setSearch}
      placeholder="Rechercher un plat, ingrédient ou référence..."
      categories={categories}
      selectedCategoryId={selectedCat}
      onSelectCategory={setSelectedCat}
    />
  );
}
```

---

### EmptyState

Affichage de remplacement lors d'un état sans données, avec halo circulaire doux et boutons d'action.

```tsx
import { EmptyState, Button } from "@/components/ui";
import { UtensilsCrossed, Plus } from "lucide-react";

<EmptyState
  icon={UtensilsCrossed}
  title="Aucun plat dans ce menu"
  description="Commencez par ajouter votre première formule ou importez vos fiches techniques depuis votre caisse."
  action={
    <Button variant="default">
      <Plus size={16} /> Ajouter un plat
    </Button>
  }
/>
```

---

## 7. Structure Type d'une Page Minerva

Chaque vue applicative de Minerva Flow respecte cette anatomie visuelle :

```tsx
export default function StandardPage() {
  return (
    <div className="space-y-6">
      {/* 1. En-tête de page avec actions principales */}
      <PageHeader
        eyebrow="Nom de l'Établissement"
        title="Titre de la Vue"
        description="Description claire de l'objectif opérationnel de cette page."
        action={<Button variant="default">Action Principale</Button>}
      />

      {/* 2. Indicateurs Clés de Performance (StatGrid) */}
      <StatGrid cols={4}>
        <StatCard ... />
        <StatCard ... />
        <StatCard ... />
        <StatCard ... />
      </StatGrid>

      {/* 3. Barre de Recherche et Filtres */}
      <SearchFilterBar ... />

      {/* 4. Contenu Principal / Tableaux de Données */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Éléments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>...</Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 8. Règles d'Import & Rétrocompatibilité

Pour simplifier le code et éliminer la duplication :

1. **Import Unique Recommandé** :  
   Toujours importer depuis `@/components/ui` :
   ```tsx
   import { Button, Card, Badge, PageHeader, StatCard } from "@/components/ui";
   ```

2. **Rétrocompatibilité Garantie** :  
   Les anciens chemins d'importation (`@/components/minerva/PageCard`, `@/components/minerva/DataTable`, `@/components/minerva/FormField`) restent 100% compatibles et redirigent en interne vers les primitives unifiées du Design System sans casser le code existant.

3. **Showcase Interactif en Direct** :  
   Une page de démonstration complète et interactive est disponible dans l'application à l'adresse :  
   👉 **`/(locale)/design-system`** (ex : `/fr/design-system` ou `/en/design-system`).
