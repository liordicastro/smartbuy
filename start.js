const { firefox } = require('playwright');

(async () => {
  console.log("🚀 בוט זבילו: מתחיל תהליך מלא מחיפוש ועד קופה...");

  const orderData = {
    customer: {
      firstName: 'ליאור',
      lastName: 'די-קסטרו',
      email: 'lior@salsela.co.il',
      phone: '0502226535'
    },
    shipping: {
      address: 'הערבה 5',
      city: 'שריגים',
      postcode: '99835'
    }
  };

  const browser = await firefox.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // פונקציית ניקוי כדי למנוע מה-Skeleton לחסום את הבוט
  const cleanSite = async () => {
    await page.evaluate(() => {
      ['#cookieNotice', '#skeleton-overlay', '.product-skeleton-item', '.modal-backdrop'].forEach(s => document.querySelector(s)?.remove());
      document.querySelectorAll('[class*="skeleton"]').forEach(el => el.remove());
    });
  };

  try {
    // 1. כניסה לדף הבית
    console.log("🌐 נכנס לדף הבית של Zabilo...");
    await page.goto('https://zabilo.com/he/', { waitUntil: 'domcontentloaded' });
    await cleanSite();

    // 2. חיפוש המוצר המדויק מהתמונה (GORENJE OPS84BG)
    console.log("🔍 מחפש את התנור: GORENJE OPS84BG...");
    const searchInput = page.locator('input[name="s"]');
    await searchInput.fill('GORENJE OPS84BG');
    await page.click('button.tvheader-search-btn');

    // 3. כניסה לכרטיס המוצר
    console.log("🖱️ לוחץ על המוצר בתוצאות החיפוש...");
    await page.waitForTimeout(4000);
    await cleanSite();
    const productLink = page.locator('.tvproduct-name a, .product-description a').first();
    await productLink.click({ force: true });

    // 4. הוספה לסל (מתוך כרטיס המוצר)
    console.log("➕ מוסיף לסל...");
    await page.waitForLoadState('domcontentloaded');
    await cleanSite();
    const addToCartBtn = page.locator('button.main_addcartt.add-to-cart');
    await addToCartBtn.waitFor({ state: 'visible' });
    await addToCartBtn.click({ force: true });

    // 5. מעבר לרכישה מהפופ-אפ
    console.log("⏳ מחכה לכפתור 'מעבר לרכישה'...");
    const checkoutBtn = page.locator('a.tvprocess-to-checkout');
    await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 });
    await checkoutBtn.click();

    // 6. שלב ה-Email Checker (הזנת האימייל שלך להמשך)
    console.log("📧 מזין אימייל בשלב האימות...");
    const emailCheckInput = page.locator('#email-check');
    await emailCheckInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailCheckInput.fill(orderData.customer.email);
    await page.click('#check-email-btn');

    // 7. מילוי פרטים אישיים (שם ומשפחה)
    console.log("📝 ממלא פרטים אישיים עבור ליאור...");
    await page.waitForSelector('input[name="firstname"]', { timeout: 15000 });
    await page.fill('input[name="firstname"]', orderData.customer.firstName);
    await page.fill('input[name="lastname"]', orderData.customer.lastName);
    
    // אישור תיבות חובה
    const checkboxes = page.locator('input[type="checkbox"][name*="privacy"], input[type="checkbox"][name*="gdpr"]');
    const boxCount = await checkboxes.count();
    for (let i = 0; i < boxCount; i++) {
        await checkboxes.nth(i).check();
    }
    await page.click('button.continue');

    // 8. מילוי כתובת למשלוח (שריגים)
    console.log("🏠 מזין כתובת למשלוח...");
    await page.waitForSelector('input[name="address1"]');
    await page.fill('input[name="address1"]', orderData.shipping.address);
    await page.fill('input[name="city"]', orderData.shipping.city);
    await page.fill('input[name="phone"]', orderData.customer.phone);

    console.log("🏁 הגענו לשלב בחירת המשלוח והתשלום! בדוק את הדף.");

  } catch (error) {
    console.error("❌ תקלה:", error.message);
    if (!page.isClosed()) await page.screenshot({ path: 'full_flow_error.png' });
  }

  await page.waitForTimeout(300000);
  await browser.close();
})();