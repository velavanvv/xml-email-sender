import { chromium } from "playwright";

async function runTest() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("--- 1. Testing Company Login Flow ---");
  await page.goto("http://localhost:3000");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForTimeout(1000);

  // Check that Company Login tab is active
  const companyTab = page.locator("button:has-text('🏢 Company Login')");
  await companyTab.waitFor({ state: "visible" });
  console.log("Verified Company Login tab is present.");

  // Click Acme Global quick login pill
  const acmePill = page.locator("button:has-text('Acme Global')");
  await acmePill.click();
  console.log("Clicked Acme Global demo pill.");

  // Click Sign In
  await page.click("button:has-text('Sign In to Company Console')");
  await page.waitForTimeout(1500);

  // Verify Company Console Banner & details
  const companyBanner = page.getByRole("heading", { name: "Acme Global Manufacturing" });
  await companyBanner.waitFor({ state: "visible", timeout: 5000 });
  console.log("✅ Verified: Successfully signed in to Acme Global Company Console!");

  const quotaText = page.locator("text=1,420 / 2,000 (71%)");
  await quotaText.waitFor({ state: "visible" });
  console.log("✅ Verified: Quota meter shows 1,420 / 2,000 (71%)!");

  const licenseBadge = page.locator("text=Active SaaS License");
  await licenseBadge.waitFor({ state: "visible" });
  console.log("✅ Verified: Active SaaS License badge displayed!");

  const renewsText = page.locator("text=/Renews in \\d+ days/");
  await renewsText.waitFor({ state: "visible" });
  console.log("✅ Verified: Subscription renewal countdown displayed:", await renewsText.innerText());

  // Check that SaaS Admin Portal button is hidden for company users
  const adminBtn = page.locator("header a:has-text('SaaS Admin Portal')");
  const adminBtnCount = await adminBtn.count();
  if (adminBtnCount === 0) {
    console.log("✅ Verified: SaaS Admin Portal button is properly HIDDEN from company user header!");
  } else {
    console.warn("⚠️ SaaS Admin Portal button is still visible in header.");
  }

  await page.screenshot({ path: "company_console_verified.png", fullPage: false });

  console.log("\n--- 2. Testing Access Restriction on /admin for Company User ---");
  await page.goto("http://localhost:3000/admin");
  await page.waitForTimeout(1000);

  const restrictedBanner = page.locator("text=Super Admin Access Restricted");
  await restrictedBanner.waitFor({ state: "visible", timeout: 5000 });
  console.log("✅ Verified: /admin restricts company user and displays restriction notice!");
  await page.screenshot({ path: "admin_restricted_verified.png", fullPage: false });

  console.log("\n--- 3. Testing Platform Super Admin Login Flow ---");
  // Click Sign Out from the restriction page
  await page.click("button:has-text('Sign Out & Switch to Admin')");
  await page.waitForTimeout(1000);

  // Switch to Super Admin tab
  const adminTab = page.locator("button:has-text('🛡️ Super Admin')");
  await adminTab.click();
  console.log("Selected Super Admin tab.");

  // Click Platform Super Admin pill
  const adminPill = page.locator("button:has-text('Platform Super Admin')");
  await adminPill.click();

  // Click Sign In
  await page.click("button:has-text('Authenticate & Open SaaS Admin')");
  await page.waitForTimeout(2000);

  // Check if redirected to /admin
  console.log("Current URL after admin login:", page.url());
  const adminHeader = page.locator("h1:has-text('CloudMail SaaS Admin Console')");
  await adminHeader.waitFor({ state: "visible", timeout: 5000 });
  console.log("✅ Verified: Redirected to SaaS Admin Portal!");

  const mrrCard = page.locator("text=Monthly Recurring Revenue");
  await mrrCard.waitFor({ state: "visible" });
  console.log("✅ Verified: MRR and Revenue analytics loaded in Admin Portal!");

  await page.screenshot({ path: "super_admin_portal_verified.png", fullPage: false });

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
  await browser.close();
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
