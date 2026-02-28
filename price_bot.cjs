const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// התחברות לפיירבייס
const serviceAccount = require("./service-account.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// מפתח ה-API של ג'מיני שלך
const genAI = new GoogleGenerativeAI("AIzaSyAmMtZZ5UQUtklRcbOHnsoOZdxacofhrK8");

async function fetchCompetitorPrices() {
    console.log("🤖 בוט המחירים: מתחיל לסרוק מחירי מתחרים (מחסני חשמל, א.ל.מ, ליאור)...");
    
    // משיכת כל המוצרים מהאתר שלך
    const productsSnapshot = await db.collection("products").get();
    const products = [];
    productsSnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    // הגדרת המודל עם גישה חיה לחיפוש בגוגל!
    const aiModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }] 
    });

    for (const product of products) {
        console.log(`🔍 בודק מחירים עבור: ${product.name}...`);

        try {
            // הפרומפט שמנחה את ה-AI לחפש באתרי המתחרים
            const prompt = `
            חפש ברשת את המחיר העדכני בשקלים של המוצר: "${product.name}".
            בדוק ספציפית באתרי האינטרנט של הרשתות הבאות בישראל: "מחסני חשמל", "א.ל.מ" (ALM), ו-"ליאור מוצרי חשמל".
            
            החזר לי אך ורק אובייקט JSON המכיל את המחירים (במספרים שלמים בלבד, ללא סמל השקל). 
            אם לא מצאת מחיר ברשת מסוימת, רשום null.
            חובה להחזיר רק את ה-JSON במבנה הבא:
            {
              "machsanei_chashmal": number או null,
              "alm": number או null,
              "lior_electric": number או null
            }
            `;

            const result = await aiModel.generateContent(prompt);
            let responseText = result.response.text();

            // חילוץ הנתונים (JSON) מתשובת ה-AI
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const competitorPrices = JSON.parse(jsonMatch[0]);
                
                // עדכון מסד הנתונים בפיירבייס עם מחירי המתחרים
                await db.collection("products").doc(product.id).update({ 
                    competitorPrices: competitorPrices 
                });
                console.log(`✅ עודכנו מחירים! מחסני חשמל: ${competitorPrices.machsanei_chashmal}, א.ל.מ: ${competitorPrices.alm}, ליאור: ${competitorPrices.lior_electric}\n`);
            } else {
                console.log(`⚠️ לא מצאתי מחירים ברורים למוצר זה.\n`);
            }

            // השהייה של 3 שניות כדי לא להעמיס על גוגל ולקבל חסימה
            await new Promise(r => setTimeout(r, 3000));

        } catch (err) {
            console.error(`❌ שגיאה בסריקת ${product.name}:`, err.message);
        }
    }
    console.log("🏁 המשימה הושלמה! כל מחירי המתחרים מעודכנים במסד הנתונים.");
}

fetchCompetitorPrices();