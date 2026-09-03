/**
 * Minerva Flow — Registre des Compétences Agentiques (Skills)
 * Capacités activables et testables pour Flow AI.
 */

export type FlowAiSkill = {
  id: string;
  name: string;
  category: "menu" | "finance" | "loyalty" | "operations" | "rag";
  categoryLabel: string;
  icon: string;
  badge: string;
  description: string;
  inputs: { name: string; type: string; placeholder: string; required: boolean }[];
  outputType: "action" | "data" | "document" | "metric";
  sampleOutput: string;
};

export const FLOW_AI_SKILLS: FlowAiSkill[] = [
  {
    id: "update_menu_item",
    name: "Ajustement Prix & Disponibilité Menu",
    category: "menu",
    categoryLabel: "Menu & Recettes",
    icon: "UtensilsCrossed",
    badge: "Action 1-Clic",
    description: "Met à jour immédiatement le prix de vente ou active/désactive un plat en cas de rupture.",
    inputs: [
      { name: "plat", type: "string", placeholder: "Ex: Burger Signature", required: true },
      { name: "nouveau_prix", type: "number", placeholder: "Ex: 18.50", required: false },
      { name: "actif", type: "boolean", placeholder: "true / false", required: false },
    ],
    outputType: "action",
    sampleOutput: "Plat « Burger Signature » mis à jour : Prix = 18,50 $ · Statut = Disponible.",
  },
  {
    id: "analyze_menu_engineering",
    name: "Audit Ingénierie du Menu (BCG)",
    category: "menu",
    categoryLabel: "Menu & Recettes",
    icon: "PieChart",
    badge: "Analyse",
    description: "Segmente l'ensemble de la carte en Étoiles, Chevaux de bataille, Énigmes et Poids morts.",
    inputs: [
      { name: "seuil_marge", type: "number", placeholder: "Marge cible (ex: 68%)", required: false },
    ],
    outputType: "data",
    sampleOutput: "24 plats analysés : 8 Étoiles (marge > 70%), 5 Chevaux de bataille, 6 Énigmes, 5 Poids morts.",
  },
  {
    id: "trigger_loyalty_campaign",
    name: "Lancement Campagne Fidélisation Ciblée",
    category: "loyalty",
    categoryLabel: "Fidélisation & Cohortes",
    icon: "Send",
    badge: "Action 1-Clic",
    description: "Crée et planifie une campagne de relance pour une cohorte (ex: Habitués inactifs 14j+).",
    inputs: [
      { name: "nom_campagne", type: "string", placeholder: "Ex: Relance Habitués Automne", required: true },
      { name: "segment", type: "string", placeholder: "Ex: inactifs_14j", required: true },
      { name: "canal", type: "string", placeholder: "email / sms", required: true },
    ],
    outputType: "action",
    sampleOutput: "Campagne planifiée pour 42 clients Habitués avec une projection de 850 $ de CA incrémental.",
  },
  {
    id: "audit_prime_cost",
    name: "Calcul & Audit du Prime Cost",
    category: "finance",
    categoryLabel: "Finances & Marges",
    icon: "DollarSign",
    badge: "Contrôle Clé",
    description: "Vérifie le seuil critique (< 60 %) en agrégeant coûts matières (Food Cost) et masse salariale (Labor Cost).",
    inputs: [
      { name: "periode_jours", type: "number", placeholder: "Ex: 30", required: true },
    ],
    outputType: "metric",
    sampleOutput: "Prime Cost actuel : 57,4 % (Food Cost 28,8 % + Labor Cost 28,6 %) · Conforme au seuil cible.",
  },
  {
    id: "create_staff_task",
    name: "Attribution de Tâche d'Équipe",
    category: "operations",
    categoryLabel: "Opérations & Équipe",
    icon: "CheckSquare",
    badge: "Action 1-Clic",
    description: "Assigne directement une tâche opérationnelle avec priorité à un collaborateur.",
    inputs: [
      { name: "collaborateur", type: "string", placeholder: "Nom du collaborateur", required: true },
      { name: "titre_tache", type: "string", placeholder: "Ex: Vérification températures frigos", required: true },
    ],
    outputType: "action",
    sampleOutput: "Tâche « Vérification températures frigos » assignée à Alexandre Tremblay.",
  },
  {
    id: "export_closing_report",
    name: "Export Rapport d'Exploitation & Clôture",
    category: "finance",
    categoryLabel: "Finances & Marges",
    icon: "FileSpreadsheet",
    badge: "Document",
    description: "Formate un rapport complet de service ou de rentabilité pour impression ou export CSV.",
    inputs: [
      { name: "type_rapport", type: "string", placeholder: "cloture / menu_engineering / prime_cost", required: true },
    ],
    outputType: "document",
    sampleOutput: "Rapport prêt : Ventes 4 820 $, 142 couverts, Ticket moyen 33,94 $, 0 anomalie signalée.",
  },
  {
    id: "rag_dossier_search",
    name: "Recherche Contextuelle Multi-Dossiers",
    category: "rag",
    categoryLabel: "Intelligence & SOPs",
    icon: "FolderSearch",
    badge: "RAG Temps Réel",
    description: "Parcourt les fiches recettes, SOPs et historiques du restaurant pour répondre avec précision chirurgicale.",
    inputs: [
      { name: "requete", type: "string", placeholder: "Ex: Quel est le protocole de nettoyage de la trancheuse ?", required: true },
    ],
    outputType: "data",
    sampleOutput: "3 extraits pertinents trouvés dans le dossier « Opérations & SOPs ».",
  },
];

export function getSkillById(id: string): FlowAiSkill | undefined {
  return FLOW_AI_SKILLS.find((s) => s.id === id);
}
