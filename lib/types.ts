export type Role = "owner" | "manager" | "staff" | "consultant";

/** "HH:MM", 24h, local to the restaurant's own timezone. */
export type DayHours = { open: string; close: string };
/** Keyed 0 (Sunday) – 6 (Saturday), matching operating_days' convention. Missing key = closed that day. */
export type OpeningHours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DayHours>>;

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
  website: string | null;
  description: string | null;
  phone: string | null;
  openingHours: OpeningHours | null;
  googlePlaceId: string | null;
  workspaceId?: string | null;
  loyaltyPointsPerDollar: number;
  taxRate: number;
  acceptsTips: boolean;
};

export type Employee = {
  id: string;
  restaurantId: string;
  linkedUserId: string | null;
  fullName: string;
  roleTitle: string;
  hourlyWage: number | null;
  active: boolean;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: string;
};

export type EmployeeShift = {
  id: string;
  employeeId: string;
  shiftDate: string;
  hoursWorked: number;
  wasLate: boolean;
  notes: string | null;
  clockIn: string | null;
  clockOut: string | null;
  createdAt: string;
};

export type EmployeeReview = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  rating: number;
  strengths: string | null;
  improvements: string | null;
  attributedRevenue: number | null;
  raiseRecommended: boolean;
  reviewerName: string;
  createdAt: string;
};

export type EmployeeTaskStatus = "a_faire" | "fait";

export type EmployeeTask = {
  id: string;
  employeeId: string;
  title: string;
  description: string | null;
  status: EmployeeTaskStatus;
  completedAt: string | null;
  createdAt: string;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  label: string;
  capacity: number;
  createdAt: string;
};

export type ReservationStatus = "confirmee" | "annulee" | "honoree" | "no_show" | "demandee";

export type Reservation = {
  id: string;
  restaurantId: string;
  tableId: string | null;
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  reservationTime: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
  referralLinkId: string | null;
  isPublicRequest: boolean;
};

export type ReferralConversionType = "reservation" | "achat";

export type ReferralProgram = {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  goalCount: number;
  rewardId: string | null;
  rewardDescription: string | null;
  active: boolean;
  createdAt: string;
};

export type CustomerReferralLink = {
  id: string;
  referralProgramId: string;
  customerId: string;
  code: string;
  clicks: number;
  convertedCount: number;
  rewardClaimedAt: string | null;
  createdAt: string;
};

export type CustomerReferralConversion = {
  id: string;
  referralLinkId: string;
  conversionType: ReferralConversionType;
  reservationId: string | null;
  creditedAt: string | null;
  createdAt: string;
};

export type ShiftScheduleStatus = "planifie" | "confirme" | "annule";

export type ShiftSchedule = {
  id: string;
  restaurantId: string;
  employeeId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  positionLabel: string | null;
  status: ShiftScheduleStatus;
  createdAt: string;
};

export type Supplier = {
  id: string;
  restaurantId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  address: string | null;
  lng: number | null;
  lat: number | null;
  createdAt: string;
};

export type PurchaseOrderStatus = "brouillon" | "envoyee" | "recue" | "annulee";

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  restaurantId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  createdAt: string;
  items: PurchaseOrderItem[];
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  status: "actif" | "invite";
  createdAt: string;
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

export type CampaignAsset = {
  id: string;
  campaignId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
  createdAt: string;
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
  sidebarPermissions: string[] | null;
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
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
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

export type ArtifactType = "table" | "chart" | "summary" | "comparison";

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

export type AdProvider = "meta" | "google";
export type AdConnectionStatus = "connecte" | "erreur" | "attente";
export type AdChannel = "organic" | "meta" | "google";

export type AdPlatformConnection = {
  id: string;
  restaurantId: string;
  provider: AdProvider;
  externalAccountId: string | null;
  expiresAt: string | null;
  status: AdConnectionStatus;
  createdAt: string;
};

export type AdConversion = {
  id: string;
  restaurantId: string;
  adPlatformConnectionId: string | null;
  channel: AdChannel;
  city: string | null;
  lng: number | null;
  lat: number | null;
  convertedOnline: boolean;
  revenue: number | null;
  occurredAt: string;
};

export type LoyaltyTransactionType = "visite" | "ajustement" | "echange";

export type LoyaltyTransaction = {
  id: string;
  restaurantId: string;
  customerId: string;
  type: LoyaltyTransactionType;
  amountSpent: number | null;
  pointsDelta: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type Customer = {
  id: string;
  restaurantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  visitCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastVisitAt: string | null;
  createdAt: string;
  transactions: LoyaltyTransaction[];
  userId: string | null;
};

export type LoyaltyReward = {
  id: string;
  restaurantId: string;
  name: string;
  pointsCost: number;
  active: boolean;
  createdAt: string;
};

export type MenuQuadrant = "etoile" | "cheval_bataille" | "enigme" | "poids_mort";

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  category: string | null;
  price: number;
  foodCost: number;
  unitsSold: number;
  active: boolean;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type OrderStatus = "soumise" | "confirmee" | "en_preparation" | "prete" | "servie" | "annulee";

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes: string | null;
};

export type Order = {
  id: string;
  restaurantId: string;
  status: OrderStatus;
  guestName: string;
  guestPhone: string | null;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
  paymentMethod: string | null;
  notes: string | null;
  customerId: string | null;
  referralLinkId: string | null;
  isPublicRequest: boolean;
  createdAt: string;
  items: OrderItem[];
};

export type MenuShare = {
  id: string;
  restaurantId: string;
  token: string;
  itemIds: string[] | null;
  title: string;
  createdAt: string;
};

export type LoyaltyShare = {
  id: string;
  restaurantId: string;
  token: string;
  title: string;
  createdAt: string;
};

export type Offer = {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type InventoryMovementType = "reception" | "utilisation" | "gaspillage" | "ajustement";

export type InventoryMovement = {
  id: string;
  inventoryItemId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  restaurantId: string;
  name: string;
  category: string | null;
  unit: string;
  quantityOnHand: number;
  parLevel: number | null;
  unitCost: number;
  supplierId: string | null;
  createdAt: string;
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
