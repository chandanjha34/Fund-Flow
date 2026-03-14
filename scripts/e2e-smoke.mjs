import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const circleName = `Smoke Circle ${Date.now()}`;
const circleId = `SMK${Date.now().toString().slice(-6)}`;

async function waitForAnyVisible(page, selectors, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        return selector;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`None of selectors became visible: ${selectors.join(", ")}`);
}

async function waitForEnabled(locator, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) {
      return;
    }
    await locator.page().waitForTimeout(250);
  }

  throw new Error("Locator did not become enabled in time");
}

async function ensureWalletConnected(page) {
  await waitForAnyVisible(
    page,
    [
      'button:has-text("Connect Wallet")',
      'button:has-text("0x")',
      'button:has-text("...")',
    ],
    30000,
  );

  const alreadyConnected =
    (await page.locator('button:has-text("0x")').first().isVisible().catch(() => false)) ||
    (await page.locator('button:has-text("...")').first().isVisible().catch(() => false));

  if (alreadyConnected) {
    return;
  }

  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await page.getByRole("button", { name: /Auto \(Braavos, then Cartridge\)/ }).click();

  await waitForAnyVisible(page, ['button:has-text("0x")', 'button:has-text("...")'], 45000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[E2E] Opening ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    console.log("[E2E] Connecting wallet via Auto mode");
    await ensureWalletConnected(page);

    console.log("[E2E] Creating circle test fixture");
    await page.evaluate(({ circleId: id, circleName: name }) => {
      const key = "fundflow_groups";
      const raw = window.localStorage.getItem(key);
      const groups = raw ? JSON.parse(raw) : {};
      groups[id] = {
        id,
        name,
        creator: "0x1111",
        recurringPeriod: "monthly",
        amountPerRecurrence: 10,
        riskLevel: "low",
        totalDuration: "6 Months",
        fundingGoal: 100,
        isPublic: true,
        createdAt: new Date().toISOString(),
        members: [],
        totalCollected: 0,
        status: "active",
        circleId: id,
      };
      window.localStorage.setItem(key, JSON.stringify(groups));
    }, { circleId, circleName });

    const circleUrl = `${baseUrl}/circle/${circleId}`;
    await page.goto(circleUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    console.log(`[E2E] Circle created: ${circleId}`);
    await ensureWalletConnected(page);

    const pageState = await waitForAnyVisible(
      page,
      [
        'button[role="tab"]:has-text("Predictions")',
        'button:has-text("Predictions")',
        'text=Circle Not Found',
      ],
      30000,
    );

    if (pageState.includes("Circle Not Found")) {
      throw new Error(`Seeded circle ${circleId} was not loaded on /circle/${circleId}`);
    }

    const predictionsTab = page.locator('button[role="tab"]:has-text("Predictions"), button:has-text("Predictions")').first();
    await predictionsTab.click();

    await page.getByRole("button", { name: /Create Market/i }).click();

    console.log("[E2E] Creating prediction market");
    await page.waitForSelector("input#kalshi-search", { timeout: 30000 });
    await page.locator("input#kalshi-search").fill("bitcoin");
    await page.locator("input#kalshi-search").press("Enter");

    await page.waitForTimeout(8000);

    const marketCards = page.locator("[class*='cursor-pointer']").filter({ hasText: "Ticker:" });
    const marketCount = await marketCards.count();
    if (marketCount === 0) {
      console.log("[E2E] Kalshi search returned no results, using custom market flow");
      await page.getByRole("button", { name: /^Create Custom Market$/ }).click();
      await page.locator("input#custom-title").fill(`Will ${circleName} hit its goal?`);
      await page.locator("input#custom-description").fill("Smoke test custom prediction market");
      const createCustomProposalButton = page.getByRole("button", { name: /Create Custom Proposal/i });
      await waitForEnabled(createCustomProposalButton, 15000);
      await createCustomProposalButton.click();
    } else {
      await marketCards.first().click();
      await page.getByRole("button", { name: /^Continue$/ }).click();
      await page.getByRole("button", { name: /^Create Proposal$/ }).click();
    }

    await waitForAnyVisible(page, [
      "text=This circle has an active prediction market",
      "text=Time Left",
      "text=Place Your Bet",
    ], 30000);

    console.log("[E2E] Checking circles listing");
    await page.goto(`${baseUrl}/circles`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`text=${circleName}`, { timeout: 30000 });

    console.log("[E2E] SUCCESS");
    console.log(JSON.stringify({ success: true, circleId, circleName, circleUrl }, null, 2));
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error("[E2E] FAILED", error);
    await page.screenshot({ path: "scripts/e2e-smoke-failure.png", fullPage: true }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
})();
