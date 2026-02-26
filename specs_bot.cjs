const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const serviceAccount = require("./service-account.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ⚠️ וודא שהמפתח שלך כאן (אל תעלה לגיט!)
const genAI = new GoogleGenerativeAI("AIzaSyBDVKnGKj19klPskxLrep4tXvWHmjxd8go"); 

async function fetchProductSpecs() {
    console.log("🛠️ בוט המפרטים: מתחיל לאסוף מידות ונתונים טכניים (בשיטה הגמישה)...");
    
    const productsSnapshot = await db.collection("products").get();
    const products = [];
    productsSnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    const aiModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }]
        // הסרנו את ה-responseMimeType כי הוא לא נתמך עם כלי חיפוש
    });

    for (const product of products) {
        if (product.specs) {
            console.log(`⏭️ כבר יש מפרט ל-${product.name}, מדלג...`);
            continue;
        }

        console.log(`🔍 מחפש מפרט טכני עבור: ${product.name}...`);
        
        try {
            const prompt = `
            חפש באינטרנט את המפרט הטכני המדויק של המוצר: "${product.name}".
            החזר לי אובייקט JSON בלבד (ללא הסברים נוספים) עם הנתונים הבאים בעברית:
            1. dimensions: גובה x רוחב x עומק (למשל: 180x60x70 ס"מ).
            2. weight: משקל בק"ג.
            3. key_features: מערך של 3-4 תכונות טכניות בולטות.
            4. color: צבע המוצר.

            החזר רק את ה-JSON במבנה הזה:
            {
              "dimensions": "string",
              "weight": "string",
              "key_features": ["feature1", "feature2"],
              "color": "string"
            }
            `;

            const result = await aiModel.generateContent(prompt);
            let responseText = result.response.text();

            // ניקוי תגיות Markdown שג'מיני לפעמים מוסיף (כמו ```json)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const specs = JSON.parse(jsonMatch[0]);
                await db.collection("products").doc(product.id).update({ specs });
                console.log(`✅ עודכן מפרט עבור ${product.name}\n`);
            } else {
                throw new Error("לא נמצא JSON תקין בתשובה");
            }

            // השהייה קלה כדי לא לחרוג מהמכסה
            await new Promise(r => setTimeout(r, 2000));
            
        } catch (err) {
            console.error(`❌ שגיאה במוצר ${product.name}:`, err.message);
        }
    }
    console.log("🏁 המשימה הושלמה! כל המפרטים עודכנו.");
}

fetchProductSpecs();