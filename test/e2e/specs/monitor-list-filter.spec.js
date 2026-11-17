import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Monitor list filter menu", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
        await page.goto("./list");
        await login(page);
    });

    test("closes with Escape after a filter is picked", async ({ page }) => {
        const toggle = page.getByRole("button", { name: "Filter", exact: true });
        const menu = page.locator(".dropdown-menu.carbon-menu");

        await toggle.click();
        await menu.getByRole("button", { name: /Down/ }).click();
        await toggle.focus();
        await page.keyboard.press("Escape");

        await expect(menu).toBeHidden();
    });

    test("closes on an outside click after a filter is picked", async ({ page }) => {
        const toggle = page.getByRole("button", { name: "Filter", exact: true });
        const menu = page.locator(".dropdown-menu.carbon-menu");

        await toggle.click();
        await menu.getByRole("button", { name: /Down/ }).click();
        await page.mouse.click(5, 5);

        await expect(menu).toBeHidden();
    });
});
