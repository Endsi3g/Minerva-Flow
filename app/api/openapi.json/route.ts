import { NextResponse, type NextRequest } from "next/server";
import { MCP_TOOLS_CATALOG } from "@/lib/mcp/tools-registry";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || "https://minerva-flow.vercel.app";

  const paths: Record<string, unknown> = {};

  // Construct dynamic paths from the 25 live tools in the registry
  for (const tool of MCP_TOOLS_CATALOG) {
    const endpointPath = `/api/v1/tools/${tool.id}`;

    const paramProperties: Record<string, unknown> = {};
    const requiredProps: string[] = [];

    for (const [pName, pDef] of Object.entries(tool.parameters)) {
      paramProperties[pName] = {
        type: pDef.type === "number" ? "number" : pDef.type === "boolean" ? "boolean" : pDef.type === "array" ? "array" : "string",
        description: pDef.description,
        ...(pDef.enum ? { enum: pDef.enum } : {}),
      };
      if (pDef.required) {
        requiredProps.push(pName);
      }
    }

    paths[endpointPath] = {
      post: {
        tags: [tool.categoryLabel],
        summary: tool.name,
        description: tool.description,
        operationId: tool.id,
        requestBody: Object.keys(paramProperties).length > 0 ? {
          required: requiredProps.length > 0,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: paramProperties,
                ...(requiredProps.length > 0 ? { required: requiredProps } : {}),
              },
            },
          },
        } : undefined,
        responses: {
          "200": {
            description: "Résultat d'exécution en direct (Supabase Live)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { type: "object" },
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Clé API manquante ou non autorisée",
          },
        },
      },
    };
  }

  // Also include standard convenient aliases (summary, menu, referral-roi, prospects, system/health)
  paths["/api/v1/restaurant/summary"] = {
    get: {
      tags: ["Vue d'ensemble"],
      summary: "Synthèse flash du restaurant",
      description: "Retourne les KPIs vitaux du jour (commandes, CA, réservations, alertes stock).",
      operationId: "getRestaurantSummaryAlias",
      responses: { "200": { description: "Synthèse opérationnelle" } },
    },
  };
  paths["/api/v1/restaurant/menu"] = {
    get: {
      tags: ["Menu & Recettes"],
      summary: "Catalogue du Menu",
      description: "Liste des plats, prix, marges et statuts actifs.",
      operationId: "getMenuItemsAlias",
      responses: { "200": { description: "Liste des plats" } },
    },
  };
  paths["/api/v1/loyalty/referral-roi"] = {
    get: {
      tags: ["Fidélisation & Bouche-à-oreille"],
      summary: "ROI Parrainage & Meilleurs Ambassadeurs",
      description: "Analyse financière du bouche-à-oreille & classement des ambassadeurs.",
      operationId: "getReferralRoiAlias",
      responses: { "200": { description: "Métriques ROI" } },
    },
  };
  paths["/api/v1/prospects/list"] = {
    get: {
      tags: ["Prospection Minerva Reach"],
      summary: "Pipeline de Prospection",
      description: "Liste des restaurants cibles et commissions récupérables.",
      operationId: "getProspectsAlias",
      responses: { "200": { description: "Liste des prospects" } },
    },
  };
  paths["/api/v1/system/health"] = {
    get: {
      tags: ["Diagnostic & Santé Système"],
      summary: "Santé du Système & Diagnostic Base de Données (Zéro Mock)",
      description: "Vérifie la connexion active en temps réel à Supabase et compte les enregistrements réels.",
      operationId: "getSystemHealthAlias",
      responses: { "200": { description: "Diagnostic Supabase Live" } },
    },
  };

  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Minerva Flow REST & MCP API",
      version: "1.2.0",
      description:
        "API complète et token-efficient pour la gestion de restaurants, fidélisation, parrainage viral et prospection autonome (25 outils connectés en direct à Supabase).",
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
    },
    paths,
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
