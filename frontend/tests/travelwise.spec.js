import { test, expect } from "@playwright/test";

// Test-only API fixtures. The shipped application has no demo-data path.
const user = {
  username: "Test Traveller",
  role: "Traveller",
  hasCompletedOnboarding: true,
  token: "test-session",
  interests: "Museums",
};
const trip = {
  id: 41,
  userId: 7,
  startingPlace: "Lyon",
  destination: "Paris",
  startDate: "2027-10-10T00:00:00Z",
  returnDate: "2027-10-13T00:00:00Z",
  travellerCount: 2,
  tripType: "Culture",
  status: "PLANNING",
  budgetAmount: 80000,
  foodBudget: 5000,
  returnBudgetReserve: 10000,
};
function snapshot(t = trip) {
  return {
    trip: t,
    capturedAt: "2026-09-17T10:00:00Z",
    budget: {
      allocated: t.budgetAmount,
      spent: 12500,
      remainingFood: 5000,
      returnReserve: 10000,
      safeToSpend: 52500,
      health: "HEALTHY",
      expenseCount: 1,
    },
    activities: [],
    readiness: { total: 0, completed: 0 },
    weather: null,
    risk: null,
    workflow: null,
  };
}
async function setup(
  page,
  { trips = [trip], role = "Traveller", adminError = false } = {},
) {
  const state = {
    trips: structuredClone(trips),
    activities: [],
    expenses: [],
    writes: [],
    searches: [],
    reserve: 10000,
  };
  await page.addInitScript(
    (u) => sessionStorage.setItem("travelwise_user", JSON.stringify(u)),
    { ...user, role },
  );
  await page.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    if (path.startsWith("/api/")) {
      const reply = (json, status = 200) => route.fulfill({ status, json });
      if (method !== "GET")
        state.writes.push({
          path,
          method,
          data: req.postDataJSON(),
          auth: req.headers().authorization,
        });
      if (path === "/api/Auth/profile") return reply({ ...user, role });
      if (path === "/api/Trips") {
        if (method === "POST") {
          const saved = { ...req.postDataJSON(), id: 91 };
          state.trips.push(saved);
          return reply(saved, 201);
        }
        return reply(state.trips);
      }
      if (path.startsWith("/api/Dashboard/trip/"))
        return reply(
          snapshot(
            state.trips.find((t) => t.id === Number(path.split("/").at(-1))),
          ),
        );
      if (path === "/api/Destinations/photo") return reply({ photo: null });
      if (path === "/api/Destinations/search") {
        state.searches.push(url.searchParams.get("query"));
        return reply({
          destinations: [
            {
              id: 101,
              name: url.searchParams.get("query"),
              region: "Île-de-France",
              country: "France",
              latitude: 48.85,
              longitude: 2.35,
            },
          ],
        });
      }
      if (path === "/api/Activities" && method === "POST") {
        const a = { ...req.postDataJSON(), id: 71 };
        state.activities.push(a);
        return reply(a, 201);
      }
      if (path.startsWith("/api/Activities/trip/"))
        return reply(state.activities);
      if (path === "/api/Activities/71" && method === "PUT") {
        state.activities[0] = { ...req.postDataJSON(), id: 71 };
        return reply(state.activities[0]);
      }
      if (path === "/api/Activities/71" && method === "DELETE") {
        state.activities = [];
        return route.fulfill({ status: 204 });
      }
      if (path === "/api/Expenses" && method === "POST") {
        const e = { ...req.postDataJSON(), id: 81 };
        state.expenses.push(e);
        return reply(e, 201);
      }
      if (path.startsWith("/api/Expenses/trip/")) return reply(state.expenses);
      if (path.endsWith("/return-reserve") && method === "PUT")
        state.reserve = req.postDataJSON().returnReserve;
      if (path.startsWith("/api/Budgets/trip/"))
        return reply({
          totalBudget: 80000,
          totalSpent: state.expenses.reduce((n, e) => n + e.amount, 0),
          remainingFunds: 80000,
          safeToSpend: 65000,
          budgetHealth: "HEALTHY",
          returnReserve: state.reserve,
          remainingFoodBudget: 5000,
          foodBudget: 5000,
          categoryAllocations: [
            {
              id: 42,
              name: "Food",
              allocatedAmount: 5000,
              spentAmount: 0,
              remainingAmount: 5000,
            },
          ],
          estimatedNights: 3,
          categoryBreakdown: [],
        });
      if (path === "/api/Admin/stats")
        return adminError
          ? reply({ message: "Unavailable" }, 503)
          : reply({
              totalUsers: 5,
              activeUsers: 4,
              travellerUsers: 3,
              totalTrips: 7,
              activeTrips: 2,
              pendingTravellerDecisions: 1,
              pendingApprovals: 2,
              totalWorkflows: 4,
              workflowStatuses: [{ status: "AWAITING_APPROVAL", count: 2 }],
              latestAudit: [],
              capturedAt: "2026-09-17T10:00:00Z",
              databaseReachable: true,
            });
      return reply({ message: "No assessment available" }, 503);
    }
    if (url.origin !== "http://127.0.0.1:5173") return route.abort();
    return route.continue();
  });
  return state;
}

test("empty dashboard has no fabricated metrics and works on mobile", async ({
  page,
}) => {
  await setup(page, { trips: [] });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Where will you go next?" }),
  ).toBeVisible();
  await expect(page.locator(".tw-stat-card")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Plan Your First Trip" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByTitle("Toggle navigation").click();
  await page
    .getByRole("button", { name: "Explore destinations", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "A world of possibility" }),
  ).toBeVisible();
});

test("destination search creates a trip without requiring map availability", async ({
  page,
}) => {
  const state = await setup(page, { trips: [] });
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Explore Destinations", exact: true })
    .last()
    .click();
  await page.getByRole("searchbox").fill("Paris");
  await page
    .getByRole("button", { name: "Explore destinations", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Plan a trip here" }).click();
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(
    "Paris, France",
  );
  await page.getByLabel("Starting Place", { exact: true }).fill("Lyon");
  await page.getByLabel("Start Date", { exact: true }).fill("2027-10-10");
  await page.getByLabel("Return Date", { exact: true }).fill("2027-10-13");
  await page.getByLabel("Total Budget (LKR)", { exact: true }).fill("80000");
  await page.getByRole("button", { name: "Save & Plan Trip" }).click();
  await expect(page.getByLabel("Selected trip")).toContainText("Paris, France");
  expect(state.searches).toEqual(["Paris"]);
  const write = state.writes.find((w) => w.path === "/api/Trips");
  expect(write.auth).toBe("Bearer test-session");
  expect(write.data.destination).toBe("Paris, France");
  expect(write.data.startLatitude).toBeNull();
  expect(write.data.destinationLatitude).toBe(48.85);
  await page.reload();
  await expect(page.locator(".tw-trip-hero h2")).toHaveText("Paris, France");
});

test("trip selection clears previous metrics and missing assessments remain unavailable", async ({
  page,
}) => {
  await setup(page, {
    trips: [trip, { ...trip, id: 55, destination: "Kyoto" }],
  });
  await page.goto("/dashboard");
  await expect(page.locator(".tw-trip-hero h2")).toHaveText("Paris");
  await expect(page.locator(".tw-trip-facts")).toContainText("Oct 10, 2027");
  await expect(page.getByText("Not assessed", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Checklist not set", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Selected trip").selectOption("55");
  await expect(page.locator(".tw-trip-hero h2")).toHaveText("Kyoto");
  await expect(page.locator(".tw-stat-card").first()).toContainText("healthy");
  await expect(page.locator(".tw-dashboard")).not.toContainText("Ella");
});

test("activities can be created, edited, and deleted for the selected trip", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  await page.getByRole("button", { name: "Add Custom Activity" }).click();
  await page.locator("#act-name").fill("Museum visit");
  await page.locator("#act-location").fill("City museum");
  await page.locator("#act-cost").fill("1500");
  await page.locator("#act-start").fill("2027-10-10T10:00");
  await page
    .getByRole("button", { name: "Add to Itinerary", exact: true })
    .click();
  await expect(page.getByText("Museum visit", { exact: true })).toBeVisible();
  expect(state.activities[0].tripId).toBe(41);
  await page.getByRole("button", { name: /Edit/ }).first().click();
  await page.locator("#act-name").fill("Museum and gallery");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Museum and gallery", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: /Delete/ })
    .first()
    .click();
  await expect(
    page.getByText("Museum and gallery", { exact: true }),
  ).toHaveCount(0);
  expect(state.writes.every((w) => w.auth === "Bearer test-session")).toBe(
    true,
  );
});

test("expense uses a category returned for this trip, and records the selected trip id", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Budget & Expenses", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record Expense", exact: false })
    .first()
    .click();
  await page.getByLabel("Amount (LKR)", { exact: true }).fill("1250");
  await page.getByLabel("Description", { exact: true }).fill("Lunch receipt");
  await page
    .locator("form")
    .last()
    .getByRole("button", {
      name: /Record Expense|Save Expense|Save Transaction/,
    })
    .click();
  await expect.poll(() => state.expenses.length).toBe(1);
  expect(state.expenses[0].budgetCategoryId).toBe(42);
  expect(state.expenses[0].tripId).toBe(41);
  expect(state.writes.find((w) => w.path === "/api/Expenses").auth).toBe(
    "Bearer test-session",
  );
  await expect(page.getByText("Lunch receipt", { exact: true })).toBeVisible();
  await page
    .getByLabel("Return Transit Reserve (LKR):", { exact: true })
    .fill("12000");
  await page.getByRole("button", { name: "Update Return Reserve" }).click();
  await expect.poll(() => state.reserve).toBe(12000);
  await expect(
    page.getByText("Protected return reserve updated.", { exact: false }),
  ).toBeVisible();
});

test("admin shows recorded operations; errors never claim operational health", async ({
  page,
}) => {
  await setup(page, { role: "Admin", adminError: true });
  await page.goto("/dashboard");
  await expect(
    page.getByText("Admin records are unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("OPERATIONAL", { exact: true })).toHaveCount(0);
  await expect(page.locator(".tw-admin .tw-stat-card")).toHaveCount(0);
});

test("admin metrics and all major pages retain dark surfaces", async ({
  page,
}) => {
  await setup(page, { role: "Admin" });
  await page.goto("/dashboard");
  await expect(
    page.getByText("Pending admin verifications", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Database reachable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No audit events recorded yet.", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".app-header")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).not.toBe("rgb(255, 255, 255)");
});

test("authentication stays within a narrow viewport", async ({ page }) => {
  await setup(page, { trips: [] });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign In to TravelWise" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/register");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
