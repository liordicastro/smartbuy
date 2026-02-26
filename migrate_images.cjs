const admin = require("firebase-admin");

// 1. התחברות ל-Firebase עם ה-Bucket המדויק שלך
const serviceAccount = require("./service-account.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // הכתובת המדויקת כפי שמופיעה ב-Console שלך (ללא ://gs)
        storageBucket: "smartbuy-b4390.firebasestorage.app" 
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function migrateImages() {
    console.log("🚀 בוט SmartBuy: מתחיל בהורדת התמונות והעברתן לשרת הפרטי שלנו...");
    
    try {
        // 2. שליפת כל המוצרים מה-Firestore
        const productsSnapshot = await db.collection("products").get();
        const products = [];
        productsSnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

        console.log(`📦 נמצאו ${products.length} מוצרים. בודק אילו תמונות דורשות הגירה...`);

        for (const product of products) {
            const imageUrl = product.image;
            
            // בדיקה: אם אין תמונה או שהיא כבר יושבת בשרת שלנו (Firebase), נדלג עליה
            if (!imageUrl || imageUrl.includes("firebasestorage.googleapis.com")) {
                console.log(`⏭️ מדלג על ${product.name} (התמונה כבר מאוחסנת אצלנו).`);
                continue;
            }

            console.log(`⬇️ מעבד תמונה עבור: ${product.name}...`);
            
            try {
                // 3. הורדת התמונה מהכתובת החיצונית (למשל Zabilo)
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`נכשל בהורדה: ${response.statusText}`);
                
                const buffer = await response.arrayBuffer();
                const imageBuffer = Buffer.from(buffer);

                // 4. יצירת שם קובץ חכם בתוך תיקיית products
                const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
                const fileName = `products/${product.id}.${extension}`;
                const file = bucket.file(fileName);

                // 5. שמירת הקובץ ב-Firebase Storage
                await file.save(imageBuffer, {
                    metadata: { 
                        contentType: response.headers.get('content-type') || 'image/jpeg',
                        cacheControl: 'public, max-age=31536000'
                    }
                });

                // 6. יצירת הקישור הפומבי החדש
                const newImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

                // 7. עדכון המוצר במסד הנתונים עם הקישור החדש
                await db.collection("products").doc(product.id).update({
                    image: newImageUrl
                });

                console.log(`✅ הצלחה! התמונה של ${product.name} הועברה לשרת הפרטי.\n`);
                
                // השהייה קטנה למניעת עומס
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`❌ שגיאה במוצר ${product.name}:`, err.message);
            }
        }

        console.log("🏁 המשימה הושלמה! כל התמונות כעת מאוחסנות ב-SmartBuy Storage.");

    } catch (globalErr) {
        console.error("❌ שגיאה קריטית בהרצת הבוט:", globalErr.message);
    }
}

migrateImages();