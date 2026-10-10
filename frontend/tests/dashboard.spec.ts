import { test, expect } from "@playwright/test";
import path from "node:path";
import { readFile } from "node:fs/promises";
test("dashboard is live, charts are real, navigation and date filters work", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Business overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await expect(page.locator(".metric-value").first()).toContainText("£");
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await page.getByRole("button", { name: "All data", exact: true }).click();
  await expect(page.getByLabel("From date")).toHaveValue("2010-12-01");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.getByLabel("From date").fill("2011-11-01");
  await page.getByLabel("To date").fill("2011-11-30");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".selection-caption")).toContainText("1 Nov 2011");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.getByLabel("Market", { exact: true }).selectOption("Germany");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".selection-caption")).toContainText("Germany");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  const api = await page.request.get(
    "http://127.0.0.1:8000/api/overview?start=2011-11-01&end=2011-11-30&country=Germany",
  );
  const metrics = (await api.json()).metrics;
  await expect(page.locator(".metric-value").first()).toHaveText(
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(metrics[0].value),
  );
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Main navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("link", { name: "Products", exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Products", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Best sellers by quantity" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search products" })
    .fill("no-such-product-xyz");
  await expect(
    page.getByText("No products match this selection."),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your customer segments" }),
  ).toBeVisible();
  const width = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    window: window.innerWidth,
  }));
  expect(width.page).toBeLessThanOrEqual(width.window);
  expect(errors).toEqual([]);
});
test("loading, API errors, retry and empty data are handled", async ({
  page,
}) => {
  await page.route("**/api/meta", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto("/overview");
  await expect(
    page.getByRole("status", { name: "Loading analytics" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.route("**/api/dashboard?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Test backend unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Last 30 days", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Test backend unavailable",
  );
  await page.unroute("**/api/dashboard?**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.getByLabel("From date").fill("2025-01-01");
  await page.getByLabel("To date").fill("2025-01-02");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByText("No transactions match these filters.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("No transactions in this selection.", { exact: false }),
  ).toBeVisible();
});
test("upload powers analytics and reports, SVG chart export works", async ({
  page,
}) => {
  await page.goto("/import");
  const csv =
    "InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice,CustomerID,Country\n1,A,Mug,2,2024-01-01,10,1,UK\n2,A,Mug,3,2024-01-02,10,1,UK\nC1,A,Mug,-1,2024-01-03,10,1,UK\n";
  await page.getByLabel("Choose transaction CSV").setInputFiles({
    name: "test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole("button", { name: "Validate & import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dataset imported", exact: true }),
  ).toBeVisible();
  await page.goto("/overview");
  // Reload clears the memory-only token; uploading and navigating by Link preserves it.
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.goto("/import");
  await page.getByLabel("Choose transaction CSV").setInputFiles({
    name: "test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole("button", { name: "Validate & import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dataset imported", exact: true }),
  ).toBeVisible();
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.locator(".metric-value").first()).toHaveText("£50.00");
  await expect(page.locator(".metric-value").nth(1)).toHaveText("£40.00");
  await expect(
    page.locator(".recharts-line-dots .recharts-dot").first(),
  ).toBeVisible();
  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export summary" }).click();
  const report = await reportDownload;
  expect(report.suggestedFilename()).toContain("insightflow-kpis");
  await expect(page.getByText(/KPI summary download prepared/)).toBeVisible();
  const chartDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download chart as SVG image" })
    .click();
  const chart = await chartDownload;
  expect(chart.suggestedFilename()).toContain(".svg");
  await expect(
    page.getByText("Chart download prepared. Check your browser downloads."),
  ).toBeVisible();
  const svg = await readFile((await chart.path())!, "utf-8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("2024-01-01");
  expect(svg).toContain("Gross sales");
  expect(svg).toContain("Net sales");
  const rendered = await page.evaluate(async (text) => {
    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  }, svg);
  expect(rendered).toBe(true);
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Delete session & use demo", exact: true })
    .click();
  if (test.info().project.name === "mobile")
    await page
      .getByRole("button", { name: "Close navigation", exact: true })
      .last()
      .click();
  await expect(page.locator(".data-notice")).toContainText("UCI ONLINE RETAIL");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
});

test("chart comparisons and returns use real values and product colors agree across rankings", async ({
  page,
}) => {
  await page.goto("/revenue");
  const chart = page.locator('.trend-panel[data-chart="revenue"]');
  await expect(
    chart.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await expect(chart.locator(".chart-line-comparison")).toHaveCount(1);
  const plot = chart.locator(".chart-area");
  await plot.scrollIntoViewIfNeeded();
  const bounds = (await plot.boundingBox())!;
  await plot.hover({
    position: { x: bounds.width * 0.6, y: bounds.height * 0.4 },
  });
  const tooltip = chart.getByRole("tooltip");
  await expect(tooltip.getByText("Net sales", { exact: true })).toBeVisible();
  await expect(tooltip.getByText("Gross sales", { exact: true })).toBeVisible();
  await expect(tooltip.locator(".data-tooltip-values > div")).toHaveCount(2);
  const start = await page.getByLabel("From date").inputValue();
  const end = await page.getByLabel("To date").inputValue();
  const response = await page.request.get(
    `http://127.0.0.1:8000/api/dashboard?start=${start}&end=${end}&interval=weekly`,
  );
  const dashboard = await response.json();
  await chart
    .getByRole("combobox", { name: "Measure", exact: true })
    .selectOption("returns");
  await expect(chart).toHaveAttribute("data-measure", "returns");
  await expect(chart.getByRole("list", { name: "Chart legend" })).toContainText(
    "Returns & cancellations",
  );
  await expect(
    chart.getByLabel("Compare gross & net", { exact: true }),
  ).toHaveCount(0);
  const returns = dashboard.revenue.series.reduce(
    (total: number, point: { returns: number }) => total + point.returns,
    0,
  );
  await expect(chart.locator(".chart-total")).toContainText(
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(returns),
  );
  await chart.getByText("View chart data", { exact: true }).click();
  await expect(
    chart.getByRole("columnheader", { name: "Returns", exact: true }),
  ).toBeVisible();
  await chart
    .getByRole("combobox", { name: "Measure", exact: true })
    .selectOption("net");
  await chart.getByLabel("Compare gross & net", { exact: true }).uncheck();
  await expect(chart.locator(".chart-line-comparison")).toHaveCount(0);
  await chart.getByLabel("Compare gross & net", { exact: true }).check();
  await expect(chart.locator(".chart-line-comparison")).toHaveCount(1);
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "Best sellers by quantity" }),
  ).toBeVisible();
  const comparisons = await page.evaluate(() => {
    const revenue = new Map(
      [
        ...document.querySelectorAll(
          '.product-ranking[data-ranking="revenue"] .ranked-product',
        ),
      ].map((row) => [
        row.getAttribute("data-product-code"),
        getComputedStyle(row.querySelector(".rank-track > span")!)
          .backgroundColor,
      ]),
    );
    return [
      ...document.querySelectorAll(
        '.product-ranking[data-ranking="quantity"] .ranked-product',
      ),
    ]
      .filter((row) => revenue.has(row.getAttribute("data-product-code")))
      .map(
        (row) =>
          revenue.get(row.getAttribute("data-product-code")) ===
          getComputedStyle(row.querySelector(".rank-track > span")!)
            .backgroundColor,
      );
  });
  expect(comparisons.length).toBeGreaterThan(0);
  expect(comparisons.every(Boolean)).toBe(true);
});

test("filters distinguish draft edits, reset the selection, and product search can recover", async ({
  page,
}) => {
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Last 90 days", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const explanation = page.getByLabel("How gross sales is calculated", {
    exact: true,
  });
  await explanation.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".metric-help[open] > p")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".metric-help[open]")).toHaveCount(0);
  await page.getByLabel("Market", { exact: true }).selectOption("Germany");
  await expect(
    page.getByText("Changes ready to apply", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".selection-caption")).toContainText("All markets");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".selection-caption")).toContainText("Germany");
  await expect(
    page.getByText("Changes ready to apply", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(page.getByLabel("Market", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("From date")).toHaveValue("2010-12-01");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Monthly", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search products" });
  await search.fill("no-such-product-xyz");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  const table = page.getByRole("region", {
    name: "Product performance table, scroll horizontally for all columns",
  });
  await table.focus();
  await expect(table).toBeFocused();
  await page.getByRole("button", { name: /^Units/ }).click();
  await expect(table.locator("th").nth(3)).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await search.fill("mug");
  await page.getByRole("button", { name: "Clear product search" }).click();
  await expect(search).toHaveValue("");
});

test("failed report downloads show an actionable message and can be retried", async ({
  page,
}) => {
  await page.goto("/reports");
  await expect(
    page.getByRole("heading", { name: "Reports for your selected period" }),
  ).toBeVisible();
  await page.route("**/api/export?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Report service temporarily unavailable",
      }),
    }),
  );
  await page.getByRole("button", { name: "Export summary" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Report service temporarily unavailable",
  );
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.unroute("**/api/export?**");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export summary" }).click();
  expect((await download).suggestedFilename()).toContain("insightflow-kpis");
  await expect(page.getByText(/KPI summary download prepared/)).toBeVisible();
});

test("invalid files show useful validation errors without changing the dataset", async ({
  page,
}) => {
  await page.goto("/import");
  await page.getByLabel("Choose transaction CSV").setInputFiles({
    name: "bad.xlsx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose a CSV file",
  );
  await page.getByLabel("Choose transaction CSV").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("wrong,columns\n1,2\n"),
  });
  await page
    .getByRole("button", { name: "Validate & import", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Missing required columns",
  );
  await expect(page.locator(".data-notice")).toContainText("UCI ONLINE RETAIL");
});
test("capture demo and verify trust pages and insights", async ({
  page,
}, info) => {
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Revenue trend" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.resolve(
      "..",
      "docs",
      "screenshots",
      `${info.project.name}-overview.png`,
    ),
    fullPage: true,
  });
  for (const [url, heading] of [
    ["/insights", "Business insights"],
    ["/reports", "Reports for your selected period"],
    ["/privacy", "Data we process"],
    ["/terms", "Purpose and permitted use"],
    ["/about", "Data quality"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});
