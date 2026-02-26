const admin = require("firebase-admin");
const { firefox } = require("playwright");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const serviceAccount = require("./service-account.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI("AIzaSyDIhh0lHc1fJvkDBe8rf3fuD_SA8iZDZXQ");

// רשימת משימות מעמיקה לפי התפריט והקטגוריות ששלחת
const searchJobs = [
    { query: "מקרר", tag: "Fridges" },
    { query: "מקפיא", tag: "Freezers" },
    { query: "מזגן עילי", tag: "AC" },
    { query: "מכונת כביסה", tag: "Washing" },
    { query: "מייבש כביסה", tag: "Dryers" },
    { query: "מדיח כלים", tag: "Dishwashers" },
    { query: "תנור בילד אין", tag: "Ovens" },
    { query: "כיריים", tag: "Hobs" },
    { query: "בלנדר מיקסר", tag: "Blenders" },
    // העמקה במסכים לפי הגדלים שביקשת
    { query: "טלוויזיה 55-59", tag: "TV" },
    { query: "טלוויזיה 65-75", tag: "TV" },
    { query: "טלוויזיה 83", tag: "TV" }
];

async function runDeepScraper() {
    console.log("🚀 בוט SmartBuy: מתחיל סריקה עמוקה ומקצועית...");
    const browser = await firefox.launch({ headless: false });
    const page = await browser.newPage();

    for (const job of searchJobs) {
        try {
            console.log(`🔎 סורק לעומק: "${job.query}"...`);
            await page.goto('https://zabilo.com/he/', { waitUntil: 'domcontentloaded' });
            await page.locator('input[name="s"]').fill(job.query);
            await page.press('input[name="s"]', 'Enter');

            await page.waitForSelector('article.product-miniature', { timeout: 15000 });
            
            // גלילה כדי לוודא שנטענו מוצרים אמיתיים ולא רק אביזרים
            await page.evaluate(() => window.scrollBy(0, 800));

            const products = await page.locator('article.product-miniature').all();
            
            // ניקח את ה-8 הראשונים מכל קטגוריה למראה עשיר
            for (let i = 0; i < Math.min(products.length, 8); i++) {
                try {
                    const el = products[i];
                    const name = await el.locator('.h3categ').innerText();
                    
                    // סינון אביזרים בטלוויזיות: אם השם מכיל "זרוע" או "מתקן", נדלג
                    if (job.tag === "TV" && (name.includes("זרוע") || name.includes("מתקן") || name.includes("כבל"))) continue;

                    let model = await el.locator('[itemprop="sku"]').innerText();
                    model = model.trim().replace(/[^a-zA-Z0-9]/g, '_');
                    
                    const image = await el.locator('.product-thumbnail img').getAttribute('src');
                    const priceText = await el.locator('.price').innerText();
                    const costPrice = parseInt(priceText.replace(/[^0-9]/g, ''));
                    
                    if (isNaN(costPrice)) continue;

                    const sellingPrice = Math.round(costPrice * 1.03); // עלות + 3%

                    console.log(`🤖 AI יוצר תוכן פרימיום ל-${model}...`);
                    const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `כתוב תיאור יוקרתי קצר (עד 12 מילים) למוצר: ${name}. 
                    מחיר SmartBuy: ₪${sellingPrice}. תדגיש שזה שירות VIP למושבים וליישובים.`;
                    
                    const result = await aiModel.generateContent(prompt);
                    const aiDescription = result.response.text();

                    await db.collection("products").doc(`${job.tag}_${model}`).set({
                        name: name,
                        model: model,
                        description: aiDescription,
                        sellingPrice: sellingPrice,
                        image: image,
                        category: job.tag,
                        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`✅ עודכן: ${model} (בקטגוריית ${job.tag})`);
                } catch (e) { }
            }
        } catch (catE) {
            console.error(`❌ שגיאה בחיפוש ${job.query}`);
        }
    }
    console.log("🏁 המשימה הושלמה! כל הקטגוריות והמסכים המעמיקים עודכנו.");
    await browser.close();
}

runDeepScraper();