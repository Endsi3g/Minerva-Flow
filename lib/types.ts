export type Role = "owner" | "manager" | "staff" | "consultant";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string | null;
  timezone: string;
  currency: string;
  serviceModel: string;
  operatingDays: number[];
  color: string;
  lng: number | null;
  lat: number | null;
};

export type ActivityLogEntry = {
  id: string;
  restaurantId: string;
  actorId: string;
  actorName: string;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  createdAt: string;
};

export type ProgramType = "brunch" | "soiree" | "saison" | "evenement";
export type ProgramStatus = "actif" | "planifie" | "termine";

export type Program = {
  id: string;
  name: string;
  type: ProgramType;
  restaurantId: string;
  startDate: string;
  endDate: string;
  revenue: number;
  cost: number;
  status: ProgramStatus;
  dailyRevenue: { date: string; revenue: number }[];
  campaignIds: string[];
  consultantNotes: { author: string; date: string; text: string }[];
  description?: string | null;
  objective?: string | null;
  revenueGoal?: number | null;
  expectedCost?: number | null;
  createdBy?: string | null;
};

export type ServiceSource = "salle" | "livraison" | "reservation";
export type Anomaly = "rush" | "creux" | "probleme" | null;

export type RushLevel = "calme" | "normal" | "rush" | "debordement";

export type ServiceDay = {
  id: string;
  date: string;
  restaurantId: string;
  revenue: number;
  mainSource: ServiceSource;
  events: string[];
  notes: string;
  anomaly: Anomaly;
  author: string;
  // Extra fields available from the real service_days table, optional so
  // existing mock-backed callers keep compiling.
  expenses?: number;
  reservationCount?: number;
  rushLevel?: RushLevel;
  promoActive?: boolean;
  menuChange?: boolean;
  reviewed?: boolean;
  createdBy?: string | null;
};

export type FlowLine = {
  label: string;
  amount: number;
  pct: number;
};

export type ConnectionType = "banque" | "pos" | "reservation" | "livraison" | "email";
export type ConnectionStatus = "connecte" | "erreur" | "attente";

export type Connection = {
  id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  lastSync: string;
  detail?: string;
};

export type CampaignType = "post" | "email" | "promo";
export type CampaignChannel = "Instagram" | "Email" | "En salle" | "Facebook";
export type CampaignStatus = "active" | "planifiee" | "terminee";

export type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  channel: CampaignChannel;
  restaurantId: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  description: string;
  estimatedRevenue: number;
  impact: "fort" | "moyen" | "faible";
  visites: number;
  timeline: { date: string; label: string }[];
  notes: { author: string; date: string; text: string }[];
  // Raw confidence value from the real campaigns table — includes
  // "insuffisant" (no useful signal yet), which `impact` clamps to "faible"
  // for callers that only know the 3-value scale.
  confidence?: "fort" | "moyen" | "faible" | "insuffisant";
  programId?: string | null;
};

export type AlertSeverity = "critique" | "important" | "info";

export type Alert = {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  date: string;
  // Present on alerts fetched from the real `alerts` table; absent on
  // alerts computed on the fly by the rule engine (lib/engine/alerts.ts).
  restaurantId?: string;
  type?: string;
  status?: "nouvelle" | "revue" | "assignee";
  assignedTo?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  restaurantIds: string[];
  status: "actif" | "invite";
  avatarUrl?: string | null;
  membershipId?: string;
};

export type TransactionDirection = "in" | "out";

export type FinancialTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  category: string;
  sourceAccount: string;
  programId: string | null;
  reviewed: boolean;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  isDefault: boolean;
  transactionCount: number;
};

export type AlertRuleType =
  | "revenue_drop"
  | "expense_spike"
  | "missing_day_input"
  | "broken_sync"
  | "reservation_anomaly";

export type RecommendationStatus =
  | "nouvelle"
  | "planifiee"
  | "en_cours"
  | "ignoree"
  | "terminee";

export type Recommendation = {
  id: string;
  diagnosis: string;
  suggestedAction: string;
  relatedMetric?: string;
  relatedProgramId?: string | null;
  relatedCampaignId?: string | null;
  status: RecommendationStatus;
  source: "regles" | "ia";
};

export type AlertRule = {
  id: string;
  type: AlertRuleType;
  label: string;
  description: string;
  threshold: number;
  unit: "%" | "jours" | "count";
  enabled: boolean;
  notify: boolean;
};

export type ChatConversation = {
  id: string;
  restaurantId: string;
  createdBy: string;
  title: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  restaurantId: string;
  authorId: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
};

export type ChatAttachment = {
  id: string;
  messageId: string;
  restaurantId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ArtifactType = "table" | "chart" | "summary";

export type ChatArtifact = {
  id: string;
  conversationId: string;
  restaurantId: string;
  messageId: string | null;
  type: ArtifactType;
  title: string;
  data: unknown;
  createdAt: string;
};

export type ReferralCode = {
  id: string;
  restaurantId: string;
  code: string;
  createdBy: string;
  createdAt: string;
};

export type ReferralStatus = "pending" | "active" | "rewarded" | "expired";

export type Referral = {
  id: string;
  referralCodeId: string;
  referredEmail: string;
  referredRestaurantId: string | null;
  status: ReferralStatus;
  createdAt: string;
  activatedAt: string | null;
  rewardedAt: string | null;
};

export type ReferralReward = {
  id: string;
  restaurantId: string;
  referralId: string;
  rewardType: "percent_discount" | "free_months";
  amount: number;
  applied: boolean;
  appliedAt: string | null;
  createdAt: string;
};
