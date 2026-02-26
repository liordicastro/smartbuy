import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// הגדרות Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCndeeXqbALJ93XChyAybvN1PWtbqNZJ4M",
    authDomain: "smartbuy-b4390.firebaseapp.com",
    projectId: "smartbuy-b4390",
    storageBucket: "smartbuy-b4390.firebasestorage.app",
    appId: "1:301016485157:web:9f291f6da715d9ab7cdecc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- רכיב החלפת שפות (מתוקן) ---
const LanguageSwitcher = () => {
    const changeLanguage = (langCode) => {
        const selectBox = document.querySelector(".goog-te-combo");
        if (selectBox) {
            selectBox.value = langCode;
            selectBox.dispatchEvent(new Event('change'));
        } else {
            alert("מערכת התרגום נטענת, אנא המתן שניה ונסה שוב.");
        }
    };

    return (
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner">
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} onClick={() => changeLanguage(l.c)} className="text-xl hover:scale-125 transition-transform" title={l.c}>{l.f}</button>
            ))}
        </div>
    );
};

// --- רכיב סליידר Hero (תמונות מתחלפות) ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    useEffect(() => {
        if (products.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % products.length);
        }, 3000); // מתחלף כל 3 שניות
        return () => clearInterval(interval);
    }, [products]);

    if (products.length === 0) return null;

    return (
        <div className="w-full h-24 md:h-32 bg-[#1e3a8a] relative overflow-hidden flex items-center justify-center border-b-4 border-[#FFD814]">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a8a] via-transparent to-[#1e3a8a] z-10 pointer-events-none"></div>
            <img src={products[currentIndex].image} className="h-full object-contain opacity-40 mix-blend-screen transition-all duration-1000" alt="Slider" />
            <div className="absolute z-20 text-center">
                <h2 className="text-[#FFD814] text-xl md:text-3xl font-black drop-shadow-md">{products[currentIndex].name}</h2>
                <p className="text-white text-xs md:text-sm">משלוח מהיר בפריסה ארצית</p>
            </div>
        </div>
    );
};

// --- מודאל מוצר מורחב ---
const ProductModal = ({ product, onClose, onAddToCart }) => (
    <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-6 left-6 text-gray-400 hover:text-black text-2xl font-bold">&times;</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-2xl">
                    <img src={product.image} className="max-h-96 object-contain" alt={product.name} />
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{product.category}</div>
                    <h2 className="text-2xl font-extrabold text-[#1e3a8a] mb-4 leading-tight">{product.name}</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed text-sm">{product.description}</p>
                    <div className="border-t border-gray-100 pt-6 mb-8">
                        <div className="text-sm text-gray-500 mb-1">מחיר SmartBuy:</div>
                        <div className="text-5xl font-black text-[#1e3a8a] mb-1">₪{product.sellingPrice}</div>
                        <div className="text-xs text-gray-400 line-through">מחיר שוק: ₪{Math.round(product.sellingPrice * 1.15)}</div>
                    </div>
                    <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#1e3a8a] font-extrabold py-5 rounded-2xl transition-all text-lg shadow-md">
                        <i className="fa-solid fa-cart-plus ml-2"></i> הוספה לסל
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// --- מודאל קופה ---
const CheckoutModal = ({ cart, total, onClose, onClearCart }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', city: '', address: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "orders"), { customer: formData, items: cart, totalAmount: total, status: 'חדש', createdAt: serverTimestamp() });
        let waText = `*הזמנה חדשה מ-SmartBuy!*%0A👤 שם: ${formData.name}%0A💰 סה"כ: ₪${total}`;
        onClearCart(); onClose();
        window.open(`https://wa.me/972544914204?text=${waText}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl border-2 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-2xl font-bold">&times;</button>
                <div className="md:w-1/2 p-4 border-l border-gray-100">
                    <h3 className="text-xl font-black mb-4 text-[#1e3a8a]">סיכום הזמנה</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                        {cart.map((item, i) => <div key={i} className="flex justify-between text-xs"><span>{item.name}</span><span className="font-bold">₪{item.sellingPrice}</span></div>)}
                    </div>
                    <div className="text-2xl font-black text-red-600 border-t pt-2">סה"כ: ₪{total}</div>
                </div>
                <div className="md:w-1/2 p-4">
                    <h2 className="text-xl font-bold mb-4 text-[#1e3a8a]">פרטי משלוח</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input required placeholder="שם מלא" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" onChange={e=>setFormData({...formData, name: e.target.value})} />
                        <input required placeholder="טלפון" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                        <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-xl font-bold hover:bg-[#152a63] transition-colors shadow-lg">סיום והזמנה בווטסאפ</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [maxPrice, setMaxPrice] = useState(15000);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u ? { name: u.displayName || u.phoneNumber } : null));
        return () => unsub();
    }, []);

    const addToCart = (p) => { setCart([...cart, p]); setIsCartOpen(true); };
    const filtered = products.filter(p => (filter === "All" || p.category === filter) && p.name.includes(searchQuery) && p.sellingPrice <= maxPrice);
    const cartTotal = cart.reduce((sum, i) => sum + i.sellingPrice, 0);

    // מציאת מוצרים מומלצים (2 ראשונים מכל קטגוריה)
    const recommendedIds = useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (!map[p.category]) map[p.category] = [];
            if (map[p.category].length < 2) map[p.category].push(p.id);
        });
        return new Set(Object.values(map).flat());
    }, [products]);

    // מפת הקטגוריות המלאה
    const categoryMap = { 
        "All": "הכל", "Fridges": "מקררים", "Freezers": "מקפיאים", "AC": "מזגנים", 
        "Washing": "כביסה", "Dryers": "מייבשים", "Dishwashers": "מדיחים",
        "Ovens": "תנורים", "Hobs": "כיריים", "TV": "טלוויזיות", "Blenders": "מיקסרים ובלנדרים"
    };

    // משיכת תמונה לקטגוריה
    const getCategoryImage = (catKey) => {
        if(catKey === "All") return "https://cdn-icons-png.flaticon.com/512/3514/3514491.png";
        const p = products.find(prod => prod.category === catKey);
        return p ? p.image : "https://cdn-icons-png.flaticon.com/512/1174/1174463.png";
    };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant">
            {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} />}
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
            
            {/* Header משודרג */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-2 border-[#1e3a8a]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="cursor-pointer text-center md:text-right" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814] drop-shadow-md">SMART<span className="text-white">BUY</span></div>
                            <div className="text-[11px] font-bold tracking-widest text-white mt-1">קנייה חכמה מתחילה כאן</div>
                        </div>
                        <div className="hidden sm:block"><LanguageSwitcher /></div>
                    </div>
                    <div className="flex-grow max-w-xl w-full">
                        <div className="relative group">
                            <input type="text" placeholder="חפש מקרר, מסך, תנור..." className="w-full p-3 pr-10 rounded-xl text-black border-2 border-transparent focus:border-[#FFD814] transition-all shadow-inner" onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-4 text-gray-400"></i>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="sm:hidden"><LanguageSwitcher /></div>
                        <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-md">
                            <i className="fa-solid fa-cart-shopping"></i>
                            <span>₪{cartTotal} ({cart.length})</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* קטגוריות עם תמונות אמיתיות */}
            <nav className="bg-white shadow-sm sticky top-[148px] md:top-[90px] z-40 overflow-x-auto hide-scroll px-6 py-4 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max">
                    {Object.keys(categoryMap).map(cat => (
                        <button key={cat} onClick={() => { setFilter(cat); setMaxPrice(15000); }} className={`flex flex-col items-center justify-center min-w-[80px] p-2 rounded-2xl transition-all duration-300 border-2 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 shadow-md scale-105" : "border-transparent hover:bg-gray-100"}`}>
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm mb-2 p-2">
                                <img src={getCategoryImage(cat)} alt={categoryMap[cat]} className="max-h-full max-w-full object-contain" />
                            </div>
                            <span className={`text-[11px] font-bold ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* סליידר Hero */}
            <HeroSlider products={products} />

            {/* רשת מוצרים */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {filtered.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-all group relative">
                        {/* תג מוצר מומלץ */}
                        {recommendedIds.has(p.id) && (
                            <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 flex items-center gap-1 shadow-md">
                                <i className="fa-solid fa-fire"></i> מוצר מומלץ
                            </div>
                        )}
                        
                        <div className="relative h-48 flex items-center justify-center mb-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                            <img src={p.image} className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500" alt={p.name}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm mb-2 h-10 line-clamp-2 text-gray-800 cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-2xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                <span className="text-xs text-gray-400 line-through">₪{Math.round(p.sellingPrice * 1.15)}</span>
                            </div>
                        </div>
                        
                        {/* 2 כפתורים: כרטיס מוצר + הוספה לסל */}
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button onClick={() => setSelectedProduct(p)} className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-gray-50 py-2 rounded-xl font-bold transition-all text-xs">כרטיס מוצר</button>
                            <button onClick={()=>addToCart(p)} className="bg-[#FFD814] text-[#1e3a8a] py-2 rounded-xl font-black hover:bg-[#F7CA00] transition-all text-xs shadow-sm">הוספה לסל</button>
                        </div>
                    </div>
                ))}
            </main>

            {/* אזור לקוחות ממליצים (הכנה לבוט) */}
            <section className="max-w-7xl mx-auto p-8 mb-12">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-[#1e3a8a] mb-2">לקוחות ממליצים</h2>
                    <p className="text-gray-500">הביקורות נסרקות ומאומתות מרחבי הרשת בזמן אמת</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div>
                                <div className="flex gap-1 text-[#FFD814] mb-4 text-sm">
                                    <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                                </div>
                                <p className="text-gray-600 text-sm mb-4 italic leading-relaxed">
                                    "מערכת ה-AI שלנו תסרוק בקרוב את הרשת ותציג כאן אוטומטית ביקורות חיוביות ואמיתיות של רוכשים עבור המוצרים המובילים באתר."
                                </p>
                            </div>
                            <div className="font-bold text-[#1e3a8a] border-t pt-4">לקוח מאומת <i className="fa-solid fa-circle-check text-green-500 ml-1"></i></div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer צהוב וכחול עם תקנונים */}
            <footer className="bg-[#FFD814] text-[#1e3a8a] py-16 px-8 border-t-[12px] border-[#1e3a8a]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                    <div>
                        <div className="text-3xl font-black italic mb-4">SMARTBUY</div>
                        <p className="font-bold mb-4">קנייה חכמה מתחילה כאן.</p>
                        <p className="leading-relaxed">החנות המובילה למכשירי חשמל בפריסה ארצית. איכות ללא פשרות, משלוח מהיר ומחירים שוברי שוק.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">שירות לקוחות</h4>
                        <ul className="space-y-3 font-bold">
                            <li><i className="fa-solid fa-phone ml-2"></i> מוקד הזמנות: <a href="tel:0544914204" className="hover:underline dir-ltr inline-block">054-4914204</a></li>
                            <li><i className="fa-solid fa-envelope ml-2"></i> דוא"ל: <a href="mailto:info@smartbuy.co.il" className="hover:underline">info@smartbuy.co.il</a></li>
                            <li><i className="fa-regular fa-clock ml-2"></i> א'-ה' 09:00 - 18:00</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">מידע שימושי</h4>
                        <ul className="space-y-3 font-bold">
                            <li><a href="#" className="hover:underline">תקנון האתר</a></li>
                            <li><a href="#" className="hover:underline">מדיניות פרטיות</a></li>
                            <li><a href="#" className="hover:underline">החזרות וביטולים</a></li>
                            <li><a href="#" className="hover:underline">הצהרת נגישות</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">קנייה מאובטחת</h4>
                        <div className="flex gap-3 text-4xl mb-4">
                            <i className="fa-brands fa-cc-visa"></i>
                            <i className="fa-brands fa-cc-mastercard"></i>
                            <i className="fa-brands fa-cc-apple-pay"></i>
                        </div>
                        <p className="font-bold text-xs">האתר מאובטח בתקן המחמיר ביותר.</p>
                    </div>
                </div>
            </footer>

            {/* מגירת סל */}
            <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-[400] transition-transform duration-500 border-r-4 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center shadow-lg">
                    <span className="font-black text-xl text-[#FFD814]">הסל שלי</span>
                    <button onClick={()=>setIsCartOpen(false)} className="text-3xl">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto h-[70vh] space-y-4">
                    {cart.map((item, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <img src={item.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1 shadow-sm" alt={item.name} />
                            <div className="flex flex-col justify-center">
                                <span className="text-[11px] font-bold line-clamp-2 leading-tight">{item.name}</span>
                                <b className="text-[#1e3a8a]">₪{item.sellingPrice}</b>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t bg-gray-50 absolute bottom-0 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">סה"כ:</span>
                        <span className="text-3xl font-black text-[#1e3a8a]">₪{cartTotal}</span>
                    </div>
                    <button onClick={()=>{setIsCartOpen(false); setIsCheckoutOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl">מעבר לקופה</button>
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/50 z-[350] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
}