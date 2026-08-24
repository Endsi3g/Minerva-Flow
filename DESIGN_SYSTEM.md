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

---

## 5. Catalogue des Composants Standardisés

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

### Bouton (`Button`)
```tsx
<Button variant="default">Créer un produit</Button>
<Button variant="secondary">Exporter</Button>
<Button variant="lime">Action Clé</Button>
<Button variant="default" loading={isLoading}>Enregistrer</Button>
```

### Badges (`Badge`)
```tsx
<Badge tone="green" dot pulse>Actif</Badge>
<Badge tone="amber" dot>Informations requises</Badge>
<Badge tone="red">Archivé</Badge>
<Badge tone="neutral">SaaS</Badge>
```

### Cartes KPI (`StatCard` & `StatGrid`)
```tsx
<StatGrid cols={3}>
  <StatCard label="Tout" value="27" icon={Package} accent="ink" />
  <StatCard label="Actifs" value="25" icon={CheckCircle2} accent="green" delta={+8.5} />
  <StatCard label="Archivés" value="2" icon={Archive} accent="neutral" />
</StatGrid>
```

---

## 6. Showcase Interactif en Direct dans l'App

Le catalogue vivant et interactif est accessible dans l'application sur la route :  
👉 **`/[locale]/design-system`** (ex : `/fr/design-system`).
