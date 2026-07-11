export type Role = "owner" | "staff" | "consultant";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  timezone: string;
  color: string;
  lng: number;
  lat: number;
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
};

export type ServiceSource = "salle" | "livraison" | "reservation";
export type Anomaly = "rush" | "creux" | "probleme" | null;

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
};

export type FlowLine = {
  label: string;
  amount: number;
  pct: number;
};

export type ConnectionType = "banque" | "pos" | "livraison" | "email";
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
};

export type AlertSeverity = "haute" | "moyenne" | "basse";

export type Alert = {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  date: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  restaurantIds: string[];
  status: "actif" | "invite";
};
