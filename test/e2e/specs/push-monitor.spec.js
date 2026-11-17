import { expect, test } from "../fixtures";
import { login, restoreSqliteSnapshot } from "../util-test";

test.beforeEach(async ({ page }) => {
    await restoreSqliteSnapshot(page);
});

/**
 * Create a push monitor through the add form
 * @param {import("@playwright/test").Page} page Page
 * @param {string} name Monitor name
 * @returns {Promise<string>} Push endpoint path
 */
async function createPushMonitor(page, name) {
    await page.goto("./add");
    await login(page);
    await page.getByTestId("monitor-type-select").selectOption("push");
    await page.getByTestId("friendly-name-input").fill(name);
    await page.getByTestId("save-button").click();
    await page.waitForURL("/dashboard/*");

    const href = await page.getByLabel("Push URL").inputValue();
    return new URL(href, page.url()).pathname;
}

/**
 * Open the dashboard and return the row of a monitor
 * @param {import("@playwright/test").Page} page Page
 * @param {string} name Monitor name
 * @returns {Promise<import("@playwright/test").Locator>} Monitor row
 */
async function openMonitorRow(page, name) {
    await page.goto("./list");
    await page.waitForSelector('[data-testid="monitor-list"] .draggable-item');
    return page.locator('[data-testid="monitor-list"] .draggable-item', { hasText: name });
}

/**
 * The 24h uptime figure of a monitor row
 * @param {import("@playwright/test").Locator} row Monitor row
 * @returns {import("@playwright/test").Locator} Uptime cell
 */
function uptimeCell(row) {
    return row.locator(".num").first();
}

/**
 * The status dot of a monitor row
 * @param {import("@playwright/test").Locator} row Monitor row
 * @returns {import("@playwright/test").Locator} Status dot
 */
function statusDot(row) {
    return row.locator(".carbon-dot").first();
}

test.describe("Push monitor", () => {
    test("updates the 24h uptime live after each push", async ({ page }) => {
        const pushPath = await createPushMonitor(page, "Push Live Uptime");
        const row = await openMonitorRow(page, "Push Live Uptime");
        const uptime = uptimeCell(row);

        // No pushes yet: no uptime to show
        await expect(uptime).toHaveText("—");

        // The dashboard must reflect each push without a reload
        await page.request.get(`${pushPath}?status=up&msg=OK&ping=5`);
        await expect(uptime).toHaveText("100%");

        await page.request.get(`${pushPath}?status=down&msg=boom&ping=`);
        await expect(uptime).toHaveText("50.00%");
    });

    test("creates a monitor with a push endpoint", async ({ page }) => {
        const pushPath = await createPushMonitor(page, "Push Endpoint");

        expect(pushPath).toMatch(/^\/api\/push\/[A-Za-z0-9]+$/);
        await expect(page.getByLabel("Push URL")).toBeVisible();
    });

    test("shows the up state after an up push", async ({ page }) => {
        const pushPath = await createPushMonitor(page, "Push Up");
        const row = await openMonitorRow(page, "Push Up");

        await page.request.get(`${pushPath}?status=up&msg=OK&ping=5`);

        await expect(statusDot(row)).toHaveClass(/\bup\b/);
    });

    test("shows the down state after a down push", async ({ page }) => {
        const pushPath = await createPushMonitor(page, "Push Down");
        const row = await openMonitorRow(page, "Push Down");

        await page.request.get(`${pushPath}?status=up&msg=OK&ping=5`);
        await expect(statusDot(row)).toHaveClass(/\bup\b/);

        await page.request.get(`${pushPath}?status=down&msg=boom&ping=`);
        await expect(statusDot(row)).toHaveClass(/\bdown\b/);
    });

    test("rejects an unknown push token", async ({ page }) => {
        const response = await page.request.get("/api/push/not-a-real-token?status=up");

        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ ok: false, msg: "Monitor not found or not active." });
    });

    test("rejects a ping outside the allowed range", async ({ page }) => {
        const pushPath = await createPushMonitor(page, "Push Bad Ping");
        const response = await page.request.get(`${pushPath}?status=up&ping=999999999999`);

        expect(response.status()).toBe(404);
        expect((await response.json()).msg).toMatch(/Invalid ping value/);
    });
});
