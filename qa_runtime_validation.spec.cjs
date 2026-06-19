const { test } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "qa-artifacts");
fs.mkdirSync(outDir, { recursive: true });

test.use({
  channel: "msedge",
  headless: true,
  viewport: { width: 1600, height: 1200 },
});

test("capture runtime validation evidence", async ({ page }) => {
  const network = [];

  const shortBody = (text) => {
    if (!text) return "";
    return text.length > 4000 ? `${text.slice(0, 4000)}...<truncated>` : text;
  };

  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/")) return;
    network.push({
      type: "request",
      method: request.method(),
      url,
      postData: shortBody(request.postData() || ""),
    });
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/api/")) return;
    let body = "";
    try {
      body = shortBody(await response.text());
    } catch {
      body = "<unavailable>";
    }
    network.push({
      type: "response",
      status: response.status(),
      url,
      body,
    });
  });

  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "01-home.png"), fullPage: true });

  await page.getByRole("button", { name: /select user/i }).click();
  await page.getByRole("option", { name: /Tanai/i }).click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(outDir, "02-tanai-home.png"), fullPage: true });

  await page.getByRole("button", { name: /Created Adapters/i }).click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(outDir, "03-created-adapters.png"), fullPage: true });

  await page.getByPlaceholder(/Search all columns/i).fill("CBS_001");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "04-cbs001-row.png"), fullPage: true });

  await page.getByRole("button", { name: /Manage Function/i }).first().click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(outDir, "05-manage-functions.png"), fullPage: true });

  await page.getByRole("button", { name: /Link Adapters/i }).click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(outDir, "06-link-adapters.png"), fullPage: true });

  fs.writeFileSync(path.join(outDir, "network-log.json"), JSON.stringify(network, null, 2));
});
