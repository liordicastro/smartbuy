// חובה: השורה הזו חייבת להיות הראשונה בקובץ!
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { chromium } = require("playwright-chromium");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const genAI = new GoogleGenerativeAI("AIzaSyDIhh0lHc1fJvkDBe8rf3fuD_SA8iZDZXQ");

exports.runSmartBuyBot = onRequest({
  memory: "2GiB",
  timeoutSeconds: 540,
  cpu: 2,
  maxInstances: 1
}, async (req, res) => {
  console.log("🚀 בוט SmartBuy AI פועל עבור כל המושבים והיישובים...");
  const db = admin.firestore();
  let browser;

  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.goto('https://zabilo.com/he/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const searchName = 'GORENJE OPS84BG';
    await page.locator('input[name="s"]').fill(searchName);
    await page.click('button.tvheader-search-btn');
    await page.waitForTimeout(7000); 

    const firstProduct = page.locator('.product-container').first();
    const imageSrc = await firstProduct.locator('img').getAttribute('src');
    const priceText = await firstProduct.locator('.price').innerText();
    const costPrice = parseInt(priceText.replace(/[^0-9]/g, ''));

    // חישוב רווח 3%: 
    // $SellingPrice = CostPrice \times 1.03$
    const sellingPrice = Math.round(costPrice * 1.03);

    // AI שפונה לכל המושבים והיישובים הקטנים בסביבה
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `כתוב תיאור יוקרתי למוצר: ${searchName}. המחיר: ₪${sellingPrice}. 
    תדגיש שזה המבצע הכי משתלם לכל תושבי המושבים והיישובים הקטנים בסביבה. 
    אנחנו ב-SmartBuy מביאים איכות פרימיום ושירות אישי עד הבית.`;
    
    const result = await model.generateContent(prompt);
    const aiDescription = result.response.text();

    await db.collection("products").doc("gorenje_ops84bg").set({
      name: `SmartBuy: ${searchName}`,
      description: aiDescription,
      sellingPrice: sellingPrice,
      costPrice: costPrice,
      image: imageSrc,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).send({ success: true, price: sellingPrice, ai_text: aiDescription });

  } catch (error) {
    console.error("❌ תקלה:", error.message);
    res.status(500).send({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});