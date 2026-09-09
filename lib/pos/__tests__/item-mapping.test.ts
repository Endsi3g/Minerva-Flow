import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeItemName,
  resolvePosItemMapping,
} from "@/lib/pos/item-mapping";
import { ingestPosTickets, type PosTicket } from "@/lib/pos/ticket-ingestion";
import { fetchToastDailyTickets } from "@/lib/pos/toast";

// Mock Supabase admin client
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "order-123" }, error: null }),
  }),
});

const mockSelect = vi.fn();

const mockFrom = vi.fn((table: string) => {
  return {
    select: mockSelect,
    insert: mockInsert,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

// Mock recordSale and decrementInventory
const mockRecordSale = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/data/menu", () => ({
  recordSale: (...args: any[]) => mockRecordSale(...args),
}));

const mockDecrementInventory = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/data/orders", () => ({
  decrementInventoryForOrderItems: (...args: any[]) => mockDecrementInventory(...args),
}));

const mockUpsertServiceDay = vi.fn().mockResolvedValue("synced");
vi.mock("@/lib/data/service-days", () => ({
  upsertSyncedServiceDayRevenue: (...args: any[]) => mockUpsertServiceDay(...args),
}));

describe("POS Item Mapping & Ticket Ingestion Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeItemName", () => {
    it("strips accents, punctuation, and collapses whitespace", () => {
      expect(normalizeItemName("Café Latte")).toBe("cafe latte");
      expect(normalizeItemName("Crème Brûlée")).toBe("creme brulee");
      expect(normalizeItemName("Burger BBQ (Double) - Grand Chef!")).toBe("burger bbq double grand chef");
      expect(normalizeItemName("   Poutine    Classique   ")).toBe("poutine classique");
      expect(normalizeItemName("Salade César & Croûtons")).toBe("salade cesar croutons");
    });
  });

  describe("resolvePosItemMapping", () => {
    it("returns existing mapping when found in database", async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { menu_item_id: "menu-item-999" },
              }),
            }),
          }),
        }),
      });

      const result = await resolvePosItemMapping(
        "resto-1",
        "square",
        "sq-123",
        "Latte Chaud"
      );

      expect(result).toBe("menu-item-999");
    });

    it("performs fuzzy normalized matching against cached menu items and stores match", async () => {
      // First select is for pos_item_mappings check -> none found
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      });

      const cachedMenuItems = [
        { id: "item-croissant", name: "Croissant au Beurre" },
        { id: "item-latte", name: "Café Latte" },
      ];

      const result = await resolvePosItemMapping(
        "resto-1",
        "clover",
        "clv-456",
        "Cafe   Latte!", // normalized: "cafe latte" -> matches item-latte
        cachedMenuItems
      );

      expect(result).toBe("item-latte");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant_id: "resto-1",
          provider: "clover",
          external_item_id: "clv-456",
          external_item_name: "Cafe   Latte!",
          menu_item_id: "item-latte",
          auto_matched: true,
        })
      );
    });

    it("saves unmapped item with menu_item_id null when no match is found", async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      });

      const cachedMenuItems = [
        { id: "item-burger", name: "Burger Classique" },
      ];

      const result = await resolvePosItemMapping(
        "resto-1",
        "toast",
        "toast-789",
        "Cocktail Éphémère Inconnu",
        cachedMenuItems
      );

      expect(result).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant_id: "resto-1",
          provider: "toast",
          external_item_id: "toast-789",
          external_item_name: "Cocktail Éphémère Inconnu",
          menu_item_id: null,
          auto_matched: false,
        })
      );
    });
  });

  describe("ingestPosTickets", () => {
    it("skips duplicate tickets idempotently", async () => {
      // Mock existing order check returning an existing order
      mockSelect.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-order-1" } }),
            }),
          }),
        }),
      }));

      const tickets: PosTicket[] = [
        {
          externalOrderId: "pos-dup-001",
          closedAt: "2026-09-09T12:00:00Z",
          subtotal: 45.5,
          total: 52.3,
          lineItems: [],
        },
      ];

      const result = await ingestPosTickets("resto-1", "square", tickets);

      expect(result.ingestedCount).toBe(0);
      expect(result.skippedDuplicateCount).toBe(1);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("ingests new ticket, updates dish popularity, recipe inventory, and service day revenue", async () => {
      // Mock: menu items preload, then existing order check (null), then order insert
      mockSelect.mockImplementation((fields?: string) => {
        return {
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            if (col === "restaurant_id" && fields?.includes("name")) {
              // Preload menu items
              return Promise.resolve({
                data: [{ id: "dish-poutine", name: "Poutine Traditionnelle" }],
              });
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No duplicate order, no existing mapping
                }),
              }),
            };
          }),
        };
      });

      mockInsert.mockImplementation((record: any) => {
        if (record.subtotal !== undefined) {
          // Orders insert
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "new-order-99" }, error: null }),
            }),
          };
        }
        return Promise.resolve({ error: null });
      });

      const tickets: PosTicket[] = [
        {
          externalOrderId: "ticket-001",
          closedAt: "2026-09-09T18:30:00Z",
          subtotal: 28.5,
          total: 32.77,
          guestName: "Table 4",
          lineItems: [
            {
              externalItemId: "item-poutine-pos",
              name: "Poutine Traditionnelle",
              quantity: 2,
              unitPrice: 14.25,
            },
          ],
        },
      ];

      const result = await ingestPosTickets("resto-1", "clover", tickets);

      expect(result.ingestedCount).toBe(1);
      expect(result.skippedDuplicateCount).toBe(0);
      expect(result.totalRevenue).toBe(32.77);
      expect(result.itemsProcessed).toBe(2);

      // Verify recordSale was triggered for the matched dish
      expect(mockRecordSale).toHaveBeenCalledWith("resto-1", "dish-poutine", 2);

      // Verify inventory drawdown was called
      expect(mockDecrementInventory).toHaveBeenCalledWith(
        "resto-1",
        "new-order-99",
        expect.arrayContaining([
          expect.objectContaining({
            menu_item_id: "dish-poutine",
            quantity: 2,
          }),
        ])
      );

      // Verify service day revenue was aggregated
      expect(mockUpsertServiceDay).toHaveBeenCalledWith(
        "resto-1",
        "2026-09-09",
        28.5,
        "clover"
      );
    });
  });

  describe("fetchToastDailyTickets", () => {
    it("extracts selections from checks with line item details", async () => {
      const mockToastOrders = [
        {
          guid: "toast-ord-1",
          closedDate: "2026-09-09T19:00:00Z",
          totalAmount: 42.0,
          taxAmount: 4.5,
          tipAmount: 5.0,
          checks: [
            {
              guid: "chk-1",
              selections: [
                {
                  guid: "sel-1",
                  displayName: "Burger Maison",
                  quantity: 1,
                  receiptLinePrice: 18.5,
                  item: { guid: "item-guid-1" },
                },
                {
                  guid: "sel-2",
                  displayName: "Bière IPA",
                  quantity: 2,
                  price: 7.0,
                  item: { guid: "item-guid-2" },
                },
              ],
            },
          ],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockToastOrders,
      });

      const tickets = await fetchToastDailyTickets("mock-token", "guid-resto-1", "2026-09-09");

      expect(tickets).toHaveLength(1);
      const ticket = tickets[0];
      expect(ticket.externalOrderId).toBe("toast-ord-1");
      expect(ticket.total).toBe(42.0);
      expect(ticket.subtotal).toBe(32.5); // 42.0 - 4.5 - 5.0
      expect(ticket.taxAmount).toBe(4.5);
      expect(ticket.tipAmount).toBe(5.0);
      expect(ticket.lineItems).toHaveLength(2);

      expect(ticket.lineItems[0]).toEqual({
        externalItemId: "item-guid-1",
        name: "Burger Maison",
        quantity: 1,
        unitPrice: 18.5,
      });

      expect(ticket.lineItems[1]).toEqual({
        externalItemId: "item-guid-2",
        name: "Bière IPA",
        quantity: 2,
        unitPrice: 7.0,
      });
    });
  });
});
