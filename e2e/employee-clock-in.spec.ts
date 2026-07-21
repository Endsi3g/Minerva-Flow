import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, supabaseAdmin, type TestUser } from "./fixtures";

test.describe("Employee clock-in", () => {
  let owner: TestUser;
  let employeeUser: TestUser;
  let restaurantId: string;
  let employeeId: string;

  test.beforeEach(async () => {
    owner = await createTestUser("clockin-owner");
    employeeUser = await createTestUser("clockin-employee");

    const { data: membership } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", owner.id)
      .eq("role", "owner")
      .maybeSingle();
    restaurantId = membership!.restaurant_id as string;

    await supabaseAdmin.from("restaurant_members").delete().eq("user_id", employeeUser.id);
    await supabaseAdmin.from("restaurant_members").insert({
      restaurant_id: restaurantId,
      user_id: employeeUser.id,
      role: "staff",
      status: "active",
    });

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .insert({
        restaurant_id: restaurantId,
        linked_user_id: employeeUser.id,
        full_name: "E2E Clockin Employee",
        role_title: "Employé",
        contact_email: employeeUser.email,
        hourly_wage: 20,
      })
      .select("id")
      .single();
    employeeId = employee!.id;
  });

  test.afterEach(async () => {
    await cleanupTestUser(employeeUser.id);
    await cleanupTestUser(owner.id);
    await cleanupOrphanRestaurants();
  });

  test("an employee can clock in and out from /mon-espace, and the owner is notified", async ({ page }) => {
    await loginAs(page, employeeUser);
    await page.goto("/mon-espace");

    await expect(page.getByText("Aucun quart en cours")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /pointer/i }).click();

    await expect(page.getByText(/en quart depuis/i)).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const { data } = await supabaseAdmin
        .from("employee_shifts")
        .select("clock_in, clock_out")
        .eq("employee_id", employeeId)
        .maybeSingle();
      expect(data?.clock_in).toBeTruthy();
      expect(data?.clock_out).toBeNull();
    }).toPass({ timeout: 10000 });

    const { data: notif } = await supabaseAdmin
      .from("notifications")
      .select("type")
      .eq("user_id", owner.id)
      .eq("type", "employee.clocked_in")
      .maybeSingle();
    expect(notif).toBeTruthy();

    await page.getByRole("button", { name: /terminer mon quart/i }).click();
    await expect(page.getByText("Aucun quart en cours")).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const { data } = await supabaseAdmin
        .from("employee_shifts")
        .select("clock_in, clock_out")
        .eq("employee_id", employeeId)
        .maybeSingle();
      expect(data?.clock_out).toBeTruthy();
    }).toPass({ timeout: 10000 });
  });
});
