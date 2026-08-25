import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || "https://minerva-flow.vercel.app";

  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Minerva Flow REST & MCP API",
      version: "1.0.0",
      description:
        "API complète et token-efficient pour la gestion de restaurants, fidélisation, parrainage viral et prospection autonome (compatible Composio, OpenAI GPTs, LangChain et MCP).",
      contact: {
        name: "Minerva Flow Support",
        url: "https://minerva-flow.vercel.app",
      },
    },
    servers: [
      {
        url: origin,
        description: "Serveur actif Minerva Flow",
      },
      {
        url: "https://minerva-flow.vercel.app",
        description: "Production Vercel",
      },
    ],
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Jeton Bearer API (ex: Authorization: Bearer mcp_live_...)",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Header direct API Key (ex: x-api-key: mcp_live_...)",
        },
      },
      schemas: {
        CompactResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            data: { type: "object" },
          },
        },
      },
    },
    paths: {
      "/api/v1/restaurant/summary": {
        get: {
          summary: "Synthèse flash du restaurant",
          description: "Retourne les KPIs vitaux du jour (commandes, CA, réservations, alertes stock).",
          operationId: "getRestaurantSummary",
          responses: {
            "200": {
              description: "Synthèse opérationnelle condensée",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
        post: {
          summary: "Synthèse flash du restaurant (POST)",
          description: "Retourne les KPIs vitaux du jour.",
          operationId: "postRestaurantSummary",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    restaurantId: { type: "string", format: "uuid" },
                    format: { type: "string", enum: ["compact", "full"], default: "compact" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Synthèse opérationnelle",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/restaurant/menu": {
        get: {
          summary: "Catalogue du Menu",
          description: "Liste des plats, prix, marges et statuts actifs.",
          operationId: "getMenuItems",
          responses: {
            "200": {
              description: "Liste des plats du menu",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
        post: {
          summary: "Catalogue du Menu (Filtré)",
          description: "Liste des plats avec filtres catégorie et statut actif.",
          operationId: "queryMenuItems",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    restaurantId: { type: "string", format: "uuid" },
                    category: { type: "string" },
                    activeOnly: { type: "boolean", default: true },
                    format: { type: "string", enum: ["compact", "full"], default: "compact" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Liste filtrée des plats",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/loyalty/referral-roi": {
        get: {
          summary: "ROI Parrainage & Meilleurs Ambassadeurs",
          description: "Analyse financière du bouche-à-oreille (clics, conversions, CA généré, multiplicateur ROI, top ambassadeurs).",
          operationId: "getReferralRoiAndAmbassadors",
          responses: {
            "200": {
              description: "Métriques ROI et classement des ambassadeurs",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
        post: {
          summary: "ROI Parrainage (POST)",
          operationId: "postReferralRoi",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    restaurantId: { type: "string", format: "uuid" },
                    format: { type: "string", enum: ["compact", "full"], default: "compact" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Métriques ROI",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/prospects/list": {
        get: {
          summary: "Pipeline de Prospection",
          description: "Liste des restaurants cibles et opportunités de commissions récupérables.",
          operationId: "getProspects",
          responses: {
            "200": {
              description: "Liste des prospects",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
        post: {
          summary: "Filtrer les prospects",
          operationId: "filterProspects",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    limit: { type: "number", default: 20 },
                    format: { type: "string", enum: ["compact", "full"], default: "compact" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Prospects filtrés",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/prospects/audit": {
        post: {
          summary: "Générer un audit IA de commissions",
          description: "Analyse les pertes de marges sur plateformes de livraison (Uber Eats / DoorDash) et rédige un pitch d'audit.",
          operationId: "runProspectAudit",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prospectId"],
                  properties: {
                    prospectId: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Rapport d'audit IA généré",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/prospects/relance": {
        post: {
          summary: "Déclencher une relance de prospect",
          description: "Envoie un email de relance automatisé J+2 ou J+5.",
          operationId: "triggerProspectRelance",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prospectId", "step"],
                  properties: {
                    prospectId: { type: "string", format: "uuid" },
                    step: { type: "string", enum: ["relance_1", "relance_2"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Relance exécutée",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CompactResponse" } } },
            },
          },
        },
      },
      "/api/v1/restaurant/orders": {
        get: {
          summary: "Commandes récentes",
          operationId: "getOrders",
          responses: { "200": { description: "Liste des commandes" } },
        },
      },
      "/api/v1/restaurant/reservations": {
        get: {
          summary: "Réservations",
          operationId: "getReservations",
          responses: { "200": { description: "Liste des réservations" } },
        },
      },
      "/api/v1/restaurant/inventory": {
        get: {
          summary: "Inventaire et stocks",
          operationId: "getInventory",
          responses: { "200": { description: "État des stocks" } },
        },
      },
      "/api/v1/restaurant/alerts": {
        get: {
          summary: "Alertes et anomalies",
          operationId: "getAlerts",
          responses: { "200": { description: "Liste des alertes actives" } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
