import { test, expect } from "@playwright/test";

// Isolated API fixtures for behaviour tests; none are bundled into the app.
const destinations = [
  { providerId: "paris-fr", displayName: "Paris, France", city: "Paris", country: "France", latitude: 48.85, longitude: 2.35 },
  { providerId: "paris-us", displayName: "Paris, Texas, United States", city: "Paris", country: "United States", latitude: 33.66, longitude: -95.55 },
  { providerId: "tokyo-jp", displayName: "東京, Japan", city: "東京", country: "Japan", latitude: 35.68, longitude: 139.69 },
];
const property = { providerId: "test-property", name: "Provider property", type: "hotel", address: "Provider address", latitude: 33.66, longitude: -95.55, distanceMeters: 500 };

async function setup(page, mode = "success") {
  const calls = { destinations: [], searches: [], external: [] };
  const user = { username: "Test Traveller", token: "test-session", role: "Traveller", hasCompletedOnboarding: true };
  await page.addInitScript((u) => sessionStorage.setItem("travelwise_user", JSON.stringify(u)), user);
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const reply = (json, status = 200) => route.fulfill({ json, status });
    if (path === "/api/Auth/profile") return reply(user);
    if (path === "/api/Trips") return reply([]);
    if (path === "/api/Accommodations/destinations") {
      calls.destinations.push(url.searchParams.get("query"));
      if (mode === "autocomplete-error") return reply({ message: "Destination provider unavailable" }, 503);
      if (mode === "autocomplete-empty") return reply({ destinations: [] });
      if (mode === "race" && url.searchParams.get("query") === "Paris") {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return reply({ destinations: destinations.slice(0, 2) }).catch(() => {});
      }
      return reply({ destinations: mode === "race" ? [destinations[2]] : destinations });
    }
    if (path === "/api/Accommodations/search") {
      calls.searches.push({ body: req.postDataJSON(), auth: req.headers().authorization });
      if (mode === "network") return route.abort("failed");
      if (mode === "error") return reply({ message: "Accommodation discovery is temporarily unavailable. Please try again." }, 503);
      if (mode === "quota") return reply({}, 429);
      if (mode === "empty") return reply({ properties: [], nextOffset: null });
      if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 900));
      if (mode === "pages" && !req.postDataJSON().offset) return reply({ properties: [property], nextOffset: 20 });
      return reply({ properties: [property], nextOffset: null });
    }
    if (path.startsWith("/api/")) return reply({});
    if (!url.hostname.match(/^(127\.0\.0\.1|localhost)$/)) { calls.external.push(req.url()); return route.abort(); }
    return route.continue();
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Accommodation", exact: true }).click();
  return calls;
}

async function choose(page, name = "Paris, Texas, United States") {
  await page.getByRole("combobox", { name: "Destination" }).fill("Paris");
  await page.getByRole("option", { name, exact: true }).click();
}
async function dates(page) {
  await page.getByLabel("Check-in", { exact: true }).fill("2099-06-10");
  await page.getByLabel("Check-out", { exact: true }).fill("2099-06-12");
}

test("explicit worldwide selection preserves metadata, guests and truthful cards", async ({ page }) => {
  const calls = await setup(page);
  await dates(page);
  await page.getByRole("combobox").fill("Paris");
  await expect(page.getByRole("option")).toHaveCount(3);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Select a destination");
  expect(calls.searches).toHaveLength(0);
  await page.getByRole("combobox").focus();
  await page.getByRole("option", { name: destinations[1].displayName, exact: true }).click();
  await page.locator(".tw-stay-guests summary").click();
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Children", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(calls.searches[0].body.destination).toEqual(destinations[1]);
  expect(calls.searches[0].body).toMatchObject({ adults: 2, children: 1, rooms: 1 });
  expect(calls.searches[0].auth).toBe("Bearer test-session");
  await expect(page.getByRole("article")).toContainText("Availability and live pricing not checked");
  await expect(page.getByRole("article")).toContainText("0.5 km (straight-line)");
  await expect(page.getByRole("article")).not.toContainText(/LKR|discount|reviews|confirmed/i);
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(calls.external.some((url) => /geoapify|nominatim/i.test(url))).toBe(false);
  await page.getByRole("combobox").fill("Tokyo");
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("validates dates and integer guests before searching", async ({ page }) => {
  const calls = await setup(page); await choose(page); await dates(page);
  const submit = () => page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Check-in", { exact: true }).fill("2000-01-01"); await submit();
  await expect(page.getByRole("alert")).toContainText("today or later");
  await page.getByLabel("Check-in", { exact: true }).fill("2099-06-12"); await submit();
  await expect(page.getByRole("alert")).toContainText("after check-in");
  await dates(page); await page.locator(".tw-stay-guests summary").click();
  for (const [label, bad, good] of [["Adults", "0", "1"], ["Children", "-1", "0"], ["Rooms", "1.5", "1"]]) {
    await page.getByLabel(label, { exact: true }).fill(bad); await submit();
    await expect(page.getByRole("alert")).toContainText(label);
    await page.getByLabel(label, { exact: true }).fill(good);
  }
  expect(calls.searches).toHaveLength(0);
});

test("debounces typing and prevents late autocomplete responses replacing current choices", async ({ page }) => {
  const calls = await setup(page, "race");
  const input = page.getByRole("combobox");
  await input.fill("P"); await input.fill("Pa"); await input.fill("Paris");
  await expect.poll(() => calls.destinations.length).toBe(1);
  await input.fill("Tokyo");
  await expect(page.getByRole("option", { name: "東京, Japan" })).toBeVisible();
  await page.waitForTimeout(1000); // Wait beyond the intentionally delayed stale response.
  await expect(page.getByRole("option")).toHaveCount(1);
  await input.press("ArrowDown"); await input.press("Enter");
  await expect(input).toHaveValue("東京, Japan");
  expect(calls.destinations).toEqual(["Paris", "Tokyo"]);
});

for (const [mode, message] of [["error", "temporarily unavailable"], ["network", "could not connect"], ["quota", "Search is busy"], ["empty", "No accommodations found"]]) {
  test(`search handles ${mode} without fallback inventory`, async ({ page }) => {
    await setup(page, mode); await choose(page); await dates(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".tw-stays")).toContainText(message);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeEnabled();
  });
}

for (const [mode, message] of [["autocomplete-error", "Destination provider unavailable"], ["autocomplete-empty", "No matching destinations"]]) {
  test(`autocomplete handles ${mode}`, async ({ page }) => {
    await setup(page, mode); await page.getByRole("combobox").fill("Paris");
    await expect(page.getByRole("status")).toContainText(message);
    await expect(page.getByRole("option")).toHaveCount(0);
  });
}

test("pagination uses the submitted destination and deduplicates properties", async ({ page }) => {
  const calls = await setup(page, "pages"); await choose(page); await dates(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Load more properties" }).click();
  await expect(page.getByRole("button", { name: "Load more properties" })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(calls.searches.map((call) => call.body.offset)).toEqual([0, 20]);
});

test("editing search cancels stale results and mobile layout stays within viewport", async ({ page }) => {
  const calls = await setup(page, "slow"); await choose(page); await dates(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect.poll(() => calls.searches.length).toBe(1);
  await page.getByRole("combobox").fill("Tokyo");
  await page.waitForTimeout(1100);
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("property details view and back to results navigation preserve search context", async ({ page }) => {
  await setup(page);
  await choose(page);
  await dates(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: /View Details/i }).click();
  await expect(page.getByRole("heading", { name: "Provider property" })).toBeVisible();
  await expect(page.getByText("Live Booking & Pricing Disclosure")).toBeVisible();
  await expect(page.getByText("Nearby Recommendations & POIs")).toBeVisible();
  await page.getByRole("button", { name: /Back to Results/i }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
});


for (const city of [destinations[0], destinations[2], { providerId: "colombo-lk", displayName: "Colombo, Sri Lanka", city: "Colombo", country: "Sri Lanka", latitude: 6.93, longitude: 79.86 }]) {
  test(`Phase 3 maps and nearby for ${city.city} (fixtures, not live inventory)`, async ({ page }) => {
    const calls = await setup(page);
    await page.route("**/api/Accommodations/destinations?*", route => route.fulfill({ json: { destinations: [city] } }));
    const stay = { ...property, latitude: city.latitude, longitude: city.longitude };
    await page.route("**/api/Accommodations/search", route => {
      calls.searches.push({ body: route.request().postDataJSON() });
      return route.fulfill({ json: { properties: [stay], nextOffset: null } });
    });
    await page.route("**/api/Accommodations/details?*", route => route.fulfill({ json: { ...stay, amenities: ["Internet access"] } }));
    await page.route("**/api/Accommodations/nearby?*", route => {
      const category = new URL(route.request().url()).searchParams.get("category");
      return route.fulfill({ json: { places: [{ providerId: category + "-poi", name: "Provider " + category, category, latitude: city.latitude + .001, longitude: city.longitude, distanceMeters: 120 }] } });
    });
    await page.getByRole("combobox", { name: "Destination" }).fill(city.city);
    await page.getByRole("option", { name: city.displayName, exact: true }).click(); await dates(page);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.locator('.leaflet-marker-icon[title="Destination"]')).toHaveCount(1);
    await page.getByRole("article").hover();
    await expect(page.locator(".tw-map-pin-hovered")).toHaveCount(1);
    await page.locator('.leaflet-marker-icon[title="Provider property"]').click();
    await expect(page.getByRole("article")).toHaveClass(/tw-stay-card-selected/);
    await page.getByRole("button", { name: "Fit visible results" }).click();
    if (city.providerId === "paris-fr") await page.screenshot({ path: "test-results/phase3-current-desktop.png", fullPage: true });
    await page.getByRole("button", { name: /View Details/i }).click();
    await expect(page.locator(".tw-property-details-view")).toContainText("Internet access");
    await expect(page.locator(".tw-property-details-view")).not.toContainText("Provider Verified");
    for (const category of ["Restaurants", "Cafés", "Attractions", "Public Transport", "Healthcare", "Shopping"]) {
      await page.getByRole("tab", { name: category }).click();
      await expect(page.locator(".tw-nearby-card")).toHaveCount(1);
      await page.locator(".tw-nearby-card").click();
      await expect(page.locator(".tw-poi-pin-selected")).toHaveCount(1);
    }
    await page.getByRole("button", { name: /Back to Results/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(calls.searches[0].body.destination).toEqual(city);
  });
}

test("details reports errors and zero coordinates still request nearby places", async ({ page }) => {
  await setup(page); await choose(page); await dates(page);
  await page.route("**/api/Accommodations/search", route => route.fulfill({ json: { properties: [{ ...property, latitude: 0, longitude: 0 }], nextOffset: null } }));
  await page.route("**/api/Accommodations/details?*", route => route.fulfill({ status: 503, json: { message: "Details unavailable" } }));
  await page.route("**/api/Accommodations/nearby?*", route => route.fulfill({ status: 503, json: { message: "Nearby unavailable" } }));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /View Details/i }).click();
  await expect(page.locator(".tw-property-details-view")).toContainText("Details unavailable");
  await expect(page.locator(".tw-property-details-view")).toContainText("Nearby unavailable");
  await expect(page.locator(".tw-poi-pin")).toHaveCount(0);
});

test("search this area sends map coordinates and keeps them for pagination", async ({ page }) => {
  const calls = await setup(page, "pages"); await choose(page); await dates(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator('.leaflet-control-zoom-out').click();
  await page.getByRole("button", { name: /Search this area/ }).click();
  await expect.poll(() => calls.searches.length).toBe(2);
  await page.getByRole("button", { name: "Load more properties" }).click();
  await expect.poll(() => calls.searches.length).toBe(3);
  expect(calls.searches[1].body.centerLatitude).toEqual(expect.any(Number));
  expect(calls.searches[2].body.centerLatitude).toBe(calls.searches[1].body.centerLatitude);
  expect(calls.searches[2].body.centerLongitude).toBe(calls.searches[1].body.centerLongitude);
});
