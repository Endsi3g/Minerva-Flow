import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { notifyUser, notifyRestaurantManagement } from "@/lib/data/notifications";

const LATE_GRACE_MINUTES = 10;
// Detection window matches the cron interval (*/15 in vercel.json) so each
// late shift is caught in exactly one run instead of re-notifying on every
// subsequent run until the employee clocks in — no extra "already
// notified" column needed.
const WINDOW_END_MINUTES = 25;

/**
 * Runs every 15 minutes (see vercel.json). Protected by CRON_SECRET, same
 * pattern as every other /api/cron/* route. Uses the admin client
 * throughout — a cron invocation has no user session, so RLS-scoped writes
 * (and even some reads across employees not owned by the caller) aren't
 * possible.
 *
 * Note: compares against the server's own clock (effectively UTC on
 * Vercel), not each restaurant's own timezone — same simplification level
 * as the other cron jobs in this codebase (weekly-report's "Monday 8am"
 * doesn't account for restaurant timezone either). Good enough while every
 * pilot restaurant is in the same Quebec timezone; worth revisiting if
 * that changes.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const restaurantIds = await getAllActiveRestaurantIds();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const { data: schedules } = await admin
        .from("shift_schedules")
        .select("id, employee_id, start_time")
        .eq("restaurant_id", restaurantId)
        .eq("shift_date", today)
        .neq("status", "annule");

      const late = (schedules ?? []).filter((s) => {
        const [h, m] = (s.start_time as string).split(":").map(Number);
        const scheduledStart = new Date(now);
        scheduledStart.setHours(h, m, 0, 0);
        const minutesLate = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);
        return minutesLate >= LATE_GRACE_MINUTES && minutesLate < WINDOW_END_MINUTES;
      });

      if (late.length === 0) return { restaurantId, lateCount: 0 };

      const employeeIds = late.map((s) => s.employee_id);
      const [{ data: clockedIn }, { data: employees }] = await Promise.all([
        admin
          .from("employee_shifts")
          .select("employee_id")
          .eq("shift_date", today)
          .not("clock_in", "is", null)
          .in("employee_id", employeeIds),
        admin.from("employees").select("id, full_name, linked_user_id").in("id", employeeIds),
      ]);

      const clockedInIds = new Set((clockedIn ?? []).map((r) => r.employee_id as string));
      const employeeById = new Map((employees ?? []).map((e) => [e.id as string, e]));

      const noShows = late.filter((s) => !clockedInIds.has(s.employee_id as string));
      if (noShows.length === 0) return { restaurantId, lateCount: 0 };

      await Promise.all(
        noShows.map(async (s) => {
          const employee = employeeById.get(s.employee_id as string);
          if (!employee) return;

          const startTime = (s.start_time as string).slice(0, 5);

          if (employee.linked_user_id) {
            await notifyUser({
              restaurantId,
              userId: employee.linked_user_id as string,
              type: "shift.no_show_self",
              title: "Vous êtes en retard",
              body: `Vous deviez commencer votre quart à ${startTime}.`,
              link: "/mon-espace",
            });
          }

          await notifyRestaurantManagement({
            restaurantId,
            type: "shift.no_show",
            title: "Employé en retard",
            body: `${employee.full_name} n'a pas encore pointé pour son quart de ${startTime}.`,
            link: "/employees",
          });
        })
      );

      return { restaurantId, lateCount: noShows.length };
    })
  );

  return NextResponse.json({ checkedAt: now.toISOString(), results: results.filter((r) => r.lateCount > 0) });
}
