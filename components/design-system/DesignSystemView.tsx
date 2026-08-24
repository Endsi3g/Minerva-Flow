"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  ProgressBar,
  ProgressRing,
  Skeleton,
  SkeletonStatCard,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Textarea,
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
  Switch,
  Checkbox,
  Slider,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui";
import { colors, typography, shadows, radii } from "@/lib/design-system";
import {
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Package,
  Plus,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Layers,
  Palette,
  Type,
  LayoutGrid,
  MousePointerClick,
  FileText,
  ShieldAlert,
  Loader2,
  Search,
  Filter,
} from "lucide-react";

export function DesignSystemView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Playground state
  const [buttonLoading, setButtonLoading] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [sliderValue, setSliderValue] = useState(65);
  const [searchVal, setSearchVal] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("all");
  const [dismissedAlert, setDismissedAlert] = useState(false);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    toast.success(`Copié : ${label} (${text})`);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const colorPalettes = [
    {
      name: "Vert Minerva (Signature)",
      description: "Couleur principale de marque, croissance financière et sérénité",
      items: [
        { label: "--mv-green", hex: colors.green.DEFAULT, text: "white" },
        { label: "--mv-green-dark", hex: colors.green.dark, text: "white" },
        { label: "--mv-green-darker", hex: colors.green.darker, text: "white" },
        { label: "--mv-green-light", hex: colors.green.light, text: colors.green.darker },
        { label: "--mv-green-tint", hex: colors.green.tint, text: colors.green.dark },
      ],
    },
    {
      name: "Accent Lime (Dynamisme)",
      description: "Appels à l'action stratégiques, nouveautés et sélections clés",
      items: [
        { label: "--mv-lime", hex: colors.lime.DEFAULT, text: colors.green.darker },
        { label: "--mv-lime-dark", hex: colors.lime.dark, text: "white" },
        { label: "--mv-lime-tint", hex: colors.lime.tint, text: colors.lime.dark },
      ],
    },
    {
      name: "Surfaces Crème & Papier de Riz",
      description: "Texture éditoriale chaleureuse évitant le blanc clinique",
      items: [
        { label: "--mv-cream", hex: colors.cream.DEFAULT, text: colors.ink.DEFAULT },
        { label: "--mv-cream-soft", hex: colors.cream.soft, text: colors.ink.DEFAULT },
        { label: "--mv-surface", hex: colors.cream.surface, text: colors.ink.DEFAULT },
        { label: "--mv-border", hex: colors.border.DEFAULT, text: colors.ink.DEFAULT },
        { label: "--mv-border-soft", hex: colors.border.soft, text: colors.ink.DEFAULT },
      ],
    },
    {
      name: "Encre & Typographie (Ink)",
      description: "Niveaux de contraste pour la lecture et les métadonnées",
      items: [
        { label: "--mv-ink", hex: colors.ink.DEFAULT, text: "white" },
        { label: "--mv-ink-soft", hex: colors.ink.soft, text: "white" },
        { label: "--mv-ink-faint", hex: colors.ink.faint, text: "white" },
        { label: "--mv-ink-mute", hex: colors.ink.mute, text: "white" },
      ],
    },
    {
      name: "Statuts & Alertes Métier",
      description: "Codes couleurs contextuels pour les finances et alertes opérationnelles",
      items: [
        { label: "Succès (Green)", hex: colors.status.green.DEFAULT, text: "white" },
        { label: "Alerte (Amber)", hex: colors.status.amber.DEFAULT, text: "white" },
        { label: "Danger (Red)", hex: colors.status.red.DEFAULT, text: "white" },
        { label: "Info (Blue)", hex: colors.status.blue.DEFAULT, text: "white" },
        { label: "Accent (Purple)", hex: colors.status.purple.DEFAULT, text: "white" },
      ],
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* En-tête du Showcase */}
      <PageHeader
        eyebrow="Minerva Flow Design System"
        title="Système de Design & Composants Unifiés"
        description="Le catalogue officiel des jetons visuels, composants d'interface et spécifications éditoriales de Minerva Flow."
        badge={<Badge tone="lime" dot pulse>v1.0 Standardisé</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                toast.info("Documentation disponible dans docs/DESIGN_SYSTEM.md");
              }}
            >
              <FileText size={15} /> Guide Complet (.md)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                toast.success("Design System prêt pour la production !");
              }}
            >
              <Sparkles size={15} /> Découvrir les Primitives
            </Button>
          </div>
        }
      />

      {/* Navigation Principale du Showcase */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 no-scrollbar">
          <TabsList variant="line" className="border-b border-mv-border w-full justify-start gap-6">
            <TabsTrigger value="overview" className="gap-2 pb-3">
              <Palette size={16} /> Fondations & Couleurs
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2 pb-3">
              <Type size={16} /> Typographie
            </TabsTrigger>
            <TabsTrigger value="buttons" className="gap-2 pb-3">
              <MousePointerClick size={16} /> Boutons & Badges
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-2 pb-3">
              <TrendingUp size={16} /> KPI & Métriques
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2 pb-3">
              <LayoutGrid size={16} /> Cartes & Sections
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2 pb-3">
              <Sliders size={16} /> Formulaires
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2 pb-3">
              <Layers size={16} /> Tableaux & Filtres
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 pb-3">
              <ShieldAlert size={16} /> Alertes & États
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. ONGLET : FONDATIONS & COULEURS */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <AlertBanner tone="info" title="Architecture de Tokens Sémantiques">
            Toutes les couleurs et élévations sont définies dans <code className="font-mono text-xs font-bold">lib/design-system/tokens.ts</code> et mappées dans <code className="font-mono text-xs font-bold">app/globals.css</code> avec prise en charge intégrale du mode Clair et Sombre. Cliquez sur une nuance pour copier son jeton.
          </AlertBanner>

          {colorPalettes.map((palette) => (
            <Card key={palette.name} variant="default">
              <CardHeader>
                <CardTitle>{palette.name}</CardTitle>
                <CardDescription>{palette.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {palette.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => copyToClipboard(item.hex, item.label)}
                      className="group relative flex flex-col justify-between rounded-xl border border-mv-border/80 p-3.5 text-left transition-all hover:scale-[1.02] hover:shadow-mv-md cursor-pointer"
                      style={{ backgroundColor: item.hex }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="font-mono text-[11px] font-bold"
                          style={{ color: item.text }}
                        >
                          {item.label}
                        </span>
                        {copiedToken === item.label ? (
                          <Check size={14} style={{ color: item.text }} />
                        ) : (
                          <Copy
                            size={14}
                            className="opacity-0 group-hover:opacity-80 transition-opacity"
                            style={{ color: item.text }}
                          />
                        )}
                      </div>
                      <span
                        className="mt-6 font-mono text-[12px] uppercase opacity-90"
                        style={{ color: item.text }}
                      >
                        {item.hex}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Ombres & Élévations */}
          <Card>
            <CardHeader>
              <CardTitle>Élévations & Ombres Tactiles</CardTitle>
              <CardDescription>
                Ombres feutrées douces calibrées pour sublimer les cartes et panneaux.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm text-center">
                  <p className="font-semibold text-sm text-mv-ink">shadow-mv-sm</p>
                  <p className="mt-1 text-xs text-mv-ink-faint">Cartes standard & boutons</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-md text-center">
                  <p className="font-semibold text-sm text-mv-ink">shadow-mv-md</p>
                  <p className="mt-1 text-xs text-mv-ink-faint">Popovers & survol actif</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-lg text-center">
                  <p className="font-semibold text-sm text-mv-ink">shadow-mv-lg</p>
                  <p className="mt-1 text-xs text-mv-ink-faint">Modales & fenêtres volantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ONGLET : TYPOGRAPHIE */}
        <TabsContent value="typography" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hiérarchie Typographique Éditoriale</CardTitle>
              <CardDescription>
                Association de <strong>New York Serif</strong> pour les titres littéraires et de <strong>Plus Jakarta Sans</strong> pour les interfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 divide-y divide-mv-border-soft">
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-mv-green-dark mb-1">
                  font-display / New York Serif — 32px
                </p>
                <h1 className="font-display text-[32px] font-medium text-mv-ink leading-tight">
                  Pilotage & Intelligence Opérationnelle des Restaurants
                </h1>
              </div>

              <div className="pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-mv-green-dark mb-1">
                  font-display / Card Title — 20px
                </p>
                <h2 className="font-display text-[20px] font-medium text-mv-ink">
                  Seuil de Rentabilité & Analyse des Marges Brutes
                </h2>
              </div>

              <div className="pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-mv-green-dark mb-1">
                  font-sans / UI Body — 14px (Plus Jakarta Sans)
                </p>
                <p className="text-[14px] leading-relaxed text-mv-ink-soft max-w-2xl">
                  Minerva Flow automatise l'ingestion de vos tickets de caisse, analyse le coût des matières premières en temps réel et projette vos flux de trésorerie avec une précision chirurgicale.
                </p>
              </div>

              <div className="pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-mv-green-dark mb-1">
                  font-mono / Chiffres Tabulaires & Données — JetBrains Mono
                </p>
                <div className="flex flex-wrap gap-4 font-mono text-[14px] text-mv-ink font-semibold">
                  <span className="rounded-lg bg-mv-cream-soft border border-mv-border px-3 py-1.5">
                    14 850,00 €
                  </span>
                  <span className="rounded-lg bg-mv-green-tint text-mv-green-dark border border-mv-green/20 px-3 py-1.5">
                    +18.4%
                  </span>
                  <span className="rounded-lg bg-mv-red-bg text-mv-red border border-mv-red/20 px-3 py-1.5">
                    -4.2%
                  </span>
                  <span className="rounded-lg bg-mv-cream-soft border border-mv-border px-3 py-1.5">
                    INV-2026-0894
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ONGLET : BOUTONS & BADGES */}
        <TabsContent value="buttons" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Boutons & Actions (`Button`)</CardTitle>
              <CardDescription>
                Toutes les variantes du composant d'action avec support des icônes et de l'état de chargement.
              </CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setButtonLoading(!buttonLoading)}
                >
                  Basculer État de Chargement ({buttonLoading ? "Actif" : "Inactif"})
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase text-mv-ink-faint mb-3">
                  Variantes de Style
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="default" loading={buttonLoading}>
                    <Plus size={15} /> Bouton Primaire (Default)
                  </Button>
                  <Button variant="secondary" loading={buttonLoading}>
                    <Download size={15} /> Bouton Secondaire
                  </Button>
                  <Button variant="lime" loading={buttonLoading}>
                    <Sparkles size={15} /> Accent Lime
                  </Button>
                  <Button variant="outline" loading={buttonLoading}>
                    Contour (Outline)
                  </Button>
                  <Button variant="ghost" loading={buttonLoading}>
                    Fantôme (Ghost)
                  </Button>
                  <Button variant="destructive" loading={buttonLoading}>
                    <AlertCircle size={15} /> Destructif
                  </Button>
                  <Button variant="link">Lien Textuel</Button>
                </div>
              </div>

              <div className="pt-4 border-t border-mv-border-soft">
                <p className="text-xs font-semibold uppercase text-mv-ink-faint mb-3">
                  Échelle de Tailles
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Taille XS</Button>
                  <Button size="sm">Taille SM</Button>
                  <Button size="default">Taille MD (Défaut)</Button>
                  <Button size="lg">Taille LG</Button>
                  <Button size="icon" aria-label="Action">
                    <Eye size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges & Pastilles de Statut (`Badge`)</CardTitle>
              <CardDescription>
                Tons contextuels, puces lumineuses (`dot`) et animations de pulsation (`pulse`).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase text-mv-ink-faint mb-3">
                  Tons Sémantiques (Subtle)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="green" dot pulse>En direct (Green)</Badge>
                  <Badge tone="lime" dot>Actif (Lime)</Badge>
                  <Badge tone="amber" dot>En attente (Amber)</Badge>
                  <Badge tone="red" dot>Critique (Red)</Badge>
                  <Badge tone="blue" dot>Synchronisé (Blue)</Badge>
                  <Badge tone="purple" dot>Premium (Purple)</Badge>
                  <Badge tone="neutral">Neutre</Badge>
                  <Badge tone="ink">Encre Noire</Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-mv-border-soft">
                <p className="text-xs font-semibold uppercase text-mv-ink-faint mb-3">
                  Styles de Badges (Outline & Solid)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="green" variant="outline">Contour Vert</Badge>
                  <Badge tone="amber" variant="outline">Contour Ambre</Badge>
                  <Badge tone="red" variant="outline">Contour Rouge</Badge>
                  <Badge tone="green" variant="solid">Plein Vert</Badge>
                  <Badge tone="lime" variant="solid">Plein Lime</Badge>
                  <Badge tone="red" variant="solid">Plein Rouge</Badge>
                  <Badge tone="blue" variant="solid">Plein Bleu</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ONGLET : KPI & MÉTRIQUES */}
        <TabsContent value="kpis" className="mt-6 space-y-6">
          <SectionHeader
            title="Cartes d'Indicateurs de Performance (`StatCard` & `StatGrid`)"
            description="Composant standardisé pour afficher les volumes d'activité, chiffres d'affaires et tendances."
            action={
              <Badge tone="green" dot>
                Temps Réel
              </Badge>
            }
          />

          <StatGrid cols={4}>
            <StatCard
              label="Chiffre d'Affaires"
              value="24 680 €"
              delta={+14.2}
              icon={DollarSign}
              sublabel="vs mois précédent"
              accent="green"
              onClick={() => toast.info("Détail du CA sélectionné")}
            />
            <StatCard
              label="Commandes Servies"
              value="412"
              delta={+6.8}
              icon={ShoppingBag}
              sublabel="vs objectif quinzaine"
              accent="lime"
              onClick={() => toast.info("Détail des commandes")}
            />
            <StatCard
              label="Food Cost Estimé"
              value="27.8%"
              delta={-1.9}
              icon={UtensilsCrossed}
              sublabel="Marge brute 72.2%"
              accent="ink"
              onClick={() => toast.info("Détail Food Cost")}
            />
            <StatCard
              label="Clients Actifs"
              value="1 420"
              delta={+22.4}
              icon={Users}
              sublabel="Fidélité + parrainage"
              accent="blue"
              onClick={() => toast.info("Détail CRM")}
            />
          </StatGrid>
        </TabsContent>

        {/* 5. ONGLET : CARTES & SECTIONS */}
        <TabsContent value="cards" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Carte Standard */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>Carte Standard (`default`)</CardTitle>
                <CardDescription>
                  Surface blanche crème bordée de sable avec en-tête et pied de page.
                </CardDescription>
                <CardAction>
                  <Button variant="secondary" size="xs">Action</Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-mv-ink-soft">
                  Cette carte offre une surface feutrée idéale pour présenter des formulaires, graphiques ou résumés de données.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-xs text-mv-ink-faint">Dernière mise à jour: 12:45</span>
                <Button variant="link" size="xs">Détails →</Button>
              </CardFooter>
            </Card>

            {/* Carte Interactive */}
            <Card variant="interactive" onClick={() => toast.success("Carte cliquée !")}>
              <CardHeader>
                <CardTitle>Carte Interactive (`interactive`)</CardTitle>
                <CardDescription>
                  Élévation au survol avec transition fluide vers le haut.
                </CardDescription>
                <CardAction>
                  <Badge tone="lime">Interactif</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-mv-ink-soft">
                  Survolez ou cliquez sur cette carte pour ressentir le micro-mouvement et l'accentuation de bordure.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-xs text-mv-green-dark font-semibold">Cliquer pour ouvrir</span>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* 6. ONGLET : FORMULAIRES */}
        <TabsContent value="forms" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contrôles de Formulaire Standardisés</CardTitle>
              <CardDescription>
                Champs de saisie, sélecteurs, interrupteurs et cases à cocher aux teintes Minerva.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-mv-ink-soft mb-1.5">
                    Nom du plat ou de la formule
                  </label>
                  <Input placeholder="Ex: Menu Dégustation 5 Temps" />
                  <p className="mt-1 text-[11.5px] text-mv-ink-faint">Visible sur le menu client</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mv-ink-soft mb-1.5">
                    Catégorie de plat
                  </label>
                  <Select defaultValue="entree">
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entree">Entrées & Tapas</SelectItem>
                      <SelectItem value="plat">Plats Principaux</SelectItem>
                      <SelectItem value="dessert">Desserts & Douceurs</SelectItem>
                      <SelectItem value="boisson">Vins & Boissons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mv-ink-soft mb-1.5">
                  Description de la recette / Fiche technique
                </label>
                <Textarea placeholder="Indiquez les ingrédients principaux, allergènes et étapes clés..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-mv-border-soft">
                <div className="flex items-center justify-between p-3 rounded-xl border border-mv-border bg-mv-cream-soft/50">
                  <div>
                    <p className="text-xs font-semibold text-mv-ink">Disponible en ligne</p>
                    <p className="text-[11px] text-mv-ink-faint">Afficher sur le menu</p>
                  </div>
                  <Switch
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-mv-border bg-mv-cream-soft/50">
                  <Checkbox
                    checked={checkboxChecked}
                    onCheckedChange={(checked) => setCheckboxChecked(!!checked)}
                    id="tva-check"
                  />
                  <label htmlFor="tva-check" className="text-xs font-semibold text-mv-ink cursor-pointer">
                    TVA réduite (10%) applicable
                  </label>
                </div>

                <div className="p-3 rounded-xl border border-mv-border bg-mv-cream-soft/50">
                  <div className="flex justify-between text-xs font-semibold text-mv-ink mb-2">
                    <span>Niveau de Stock</span>
                    <span className="font-mono text-mv-green-dark">{sliderValue}%</span>
                  </div>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ONGLET : TABLEAUX & FILTRES */}
        <TabsContent value="tables" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Barre de Filtre & Tableau de Données (`DataTable`)</CardTitle>
              <CardDescription>
                Expérience de filtrage rapide avec raccourci clavier ⌘K et tableau élégant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchFilterBar
                searchValue={searchVal}
                onSearchChange={setSearchVal}
                placeholder="Rechercher une facture, fournisseur, plat..."
                categories={[
                  { id: "all", label: "Toutes les lignes", count: 12 },
                  { id: "food", label: "Alimentation", count: 6 },
                  { id: "beverage", label: "Boissons", count: 4 },
                  { id: "service", label: "Services & Frais", count: 2 },
                ]}
                selectedCategoryId={selectedFilterCategory}
                onSelectCategory={setSelectedFilterCategory}
                actions={
                  <Button variant="default" size="sm">
                    <Plus size={15} /> Ajouter
                  </Button>
                }
              />

              <div className="overflow-x-auto rounded-xl border border-mv-border bg-mv-surface">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-mv-cream-soft">
                      <TableHead>RÉFÉRENCE</TableHead>
                      <TableHead>FOURNISSEUR / ARTICLE</TableHead>
                      <TableHead>CATÉGORIE</TableHead>
                      <TableHead>STATUT</TableHead>
                      <TableHead className="text-right">MONTANT HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-mv-green-tint/40 cursor-pointer">
                      <TableCell className="font-mono text-xs font-semibold">#FAC-2026-081</TableCell>
                      <TableCell className="font-medium text-mv-ink">Boucherie Saint-Germain</TableCell>
                      <TableCell><Badge tone="neutral">Alimentation</Badge></TableCell>
                      <TableCell><Badge tone="green" dot>Payé</Badge></TableCell>
                      <TableCell className="text-right font-mono font-semibold">1 420,50 €</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-mv-green-tint/40 cursor-pointer">
                      <TableCell className="font-mono text-xs font-semibold">#FAC-2026-082</TableCell>
                      <TableCell className="font-medium text-mv-ink">Domaine de la Côte d'Or</TableCell>
                      <TableCell><Badge tone="neutral">Boissons</Badge></TableCell>
                      <TableCell><Badge tone="amber" dot>En attente</Badge></TableCell>
                      <TableCell className="text-right font-mono font-semibold">890,00 €</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-mv-green-tint/40 cursor-pointer">
                      <TableCell className="font-mono text-xs font-semibold">#FAC-2026-083</TableCell>
                      <TableCell className="font-medium text-mv-ink">Primeurs de Rungis</TableCell>
                      <TableCell><Badge tone="neutral">Alimentation</Badge></TableCell>
                      <TableCell><Badge tone="green" dot>Payé</Badge></TableCell>
                      <TableCell className="text-right font-mono font-semibold">540,20 €</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. ONGLET : ALERTES, ÉTATS VIDES & SKELETONS */}
        <TabsContent value="feedback" className="mt-6 space-y-6">
          {/* Bannières */}
          <div className="space-y-3">
            {!dismissedAlert && (
              <AlertBanner
                tone="warning"
                title="Alerte Marge Brute Seuil"
                action={<Button variant="secondary" size="xs">Consulter les écarts</Button>}
                onDismiss={() => setDismissedAlert(true)}
              >
                Le coût des viandes a augmenté de +4.8% cette semaine. Une réévaluation des fiches recettes est recommandée.
              </AlertBanner>
            )}

            <AlertBanner tone="success" title="Synchronisation Caisse Terminée">
              Toutes les transactions du service du midi (142 couverts) ont été rapprochées avec succès.
            </AlertBanner>

            <AlertBanner tone="error" title="Échec de Connexion Terminal Bancaire">
              Le terminal TPE n°2 n'a pas pu communiquer avec Stripe Connect. Vérifiez l'adresse IP.
            </AlertBanner>
          </div>

          {/* Barres de progression */}
          <Card>
            <CardHeader>
              <CardTitle>Barres de Progression (`ProgressBar` & `ProgressRing`)</CardTitle>
              <CardDescription>
                Indicateurs graphiques d'atteinte d'objectifs de vente ou de remplissage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <ProgressBar
                    value={78}
                    label="Objectif Chiffre d'Affaires du Mois"
                    showPercentage
                    tone="green"
                  />
                  <ProgressBar
                    value={92}
                    label="Capacité Réservations Samedi Soir"
                    showPercentage
                    tone="lime"
                  />
                  <ProgressBar
                    value={35}
                    label="Seuil de Stock Alerte"
                    showPercentage
                    tone="amber"
                  />
                </div>

                <div className="flex items-center justify-around p-4 rounded-xl border border-mv-border bg-mv-cream-soft/40">
                  <div className="flex flex-col items-center">
                    <ProgressRing value={84} tone="green" size={64} strokeWidth={5}>
                      <span className="font-mono text-xs font-bold text-mv-ink">84%</span>
                    </ProgressRing>
                    <span className="mt-2 text-xs font-semibold text-mv-ink-soft">Rentabilité</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <ProgressRing value={62} tone="lime" size={64} strokeWidth={5}>
                      <span className="font-mono text-xs font-bold text-mv-ink">62%</span>
                    </ProgressRing>
                    <span className="mt-2 text-xs font-semibold text-mv-ink-soft">Fidélité</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <ProgressRing value={25} tone="amber" size={64} strokeWidth={5}>
                      <span className="font-mono text-xs font-bold text-mv-ink">25%</span>
                    </ProgressRing>
                    <span className="mt-2 text-xs font-semibold text-mv-ink-soft">Charges</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skeletons & États Vides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Placeholders Squelettes (`Skeleton`)</CardTitle>
                <CardDescription>
                  Animation Shimmer fluide pour le chargement des données.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SkeletonStatCard />
                <SkeletonCard lines={2} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>État Sans Données (`EmptyState`)</CardTitle>
                <CardDescription>
                  Présentation valorisante pour guider l'utilisateur lors du premier usage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Package}
                  title="Aucun fournisseur enregistré"
                  description="Ajoutez vos partenaires réguliers pour automatiser le suivi des factures d'achats."
                  action={
                    <Button variant="default" size="sm">
                      <Plus size={15} /> Nouveau Fournisseur
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
