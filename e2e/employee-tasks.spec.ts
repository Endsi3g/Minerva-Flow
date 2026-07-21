import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, supabaseAdmin, type TestUser } from "./fixtures";

test.describe("Employee tasks", () => {
  let owner: TestUser;
  let employeeUser: TestUser;
  let restaurantId: string;
  let employeeId: string;

  test.beforeEach(async () => {
    owner = await createTestUser("tasks-owner");
    employeeUser = await createTestUser("tasks-employee");

    const { data: membership } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", owner.id)
      .eq("role", "owner")
      .maybeSingle();
    restaurantId = membership!.restaurant_id as string;

    // Delete the employee's own default restaurant so they're only ever a
    // member of the owner's — avoids ambiguity over which restaurant
    // getCurrentMembership() resolves to.
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
        full_name: "E2E Task Employee",
        role_title: "Employé",
        contact_email: employeeUser.email,
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

  test("a task assigned by the owner is visible and completable from /mon-espace", async ({ page, context }) => {
    // Assign as the owner.
    await loginAs(page, owner);
    await page.goto(`/employees/${employeeId}`);
    const taskTitle = `Tâche E2E ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.getByRole("button", { name: /assigner la tâche/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });
    await context.clearCookies();

    // Complete as the employee.
    await loginAs(page, employeeUser);
    await page.goto("/mon-espace");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });

    const taskRow = page.locator("label", { hasText: taskTitle });
    await taskRow.locator('button[role="checkbox"], [data-slot="checkbox"]').click();

    await expect(async () => {
      const { data } = await supabaseAdmin.from("employee_tasks").select("status").eq("employee_id", employeeId).single();
      expect(data?.status).toBe("fait");
    }).toPass({ timeout: 10000 });
  });
});
