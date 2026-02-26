import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier, signOut } from "firebase/auth";

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

// --- רכיב החלפת שפות ---
const LanguageSwitcher = () => {
    const changeLanguage = (langCode) => {
        const selectBox = document.querySelector(".goog-te-combo");
        if (selectBox) {
            selectBox.value = langCode;
            selectBox.dispatchEvent(new Event('change'));
        } else {
            alert("מערכת התרגום נטענת ברקע, אנא המתן שניה ונסה שוב (ודא שאין חוסם פרסומות).");
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

// --- פופ-אפ חגיגת מחירים ---
const PromoPopup = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/70 z-[600] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] rounded-3xl max-w-md w-full p-8 relative shadow-[0_0_40px_rgba(255,216,20,0.4)] text-center border-4 border-[#FFD814]" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 left-4 text-white hover:text-[#FFD814] text-3xl font-bold">&times;</button>
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-4xl font-black text-[#FFD814] mb-3 drop-shadow-lg">חגיגת מחירים!</h2>
            <p className="text-white text-lg mb-8 font-bold">מגוון מוצרים במחירי רצפה.<br/>המשלוח לכל הארץ עלינו!</p>
            <button onClick={onClose} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-lg">מעולה, בואו נתחיל</button>
        </div>
    </div>
);

// --- מודאל התחברות (מועדון) ---
const AuthModal = ({ onClose }) => {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!window.recaptchaVerifier) window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }, []);

    const handleGoogleLogin = async () => {
        try { await signInWithPopup(auth, new GoogleAuthProvider()); onClose(); } catch (err) { setError("שגיאה בהתחברות."); }
    };

    const sendSms = async () => {
        setLoading(true); setError("");
        try {
            const phoneE164 = phone.startsWith("0") ? "+972" + phone.slice(1) : phone;
            window.confirmationResult = await signInWithPhoneNumber(auth, phoneE164, window.recaptchaVerifier);
            setStep(2);
        } catch (err) { setError("שגיאה בשליחת הסמס."); }
        setLoading(false);
    };

    const verifyCode = async () => {
        setLoading(true); setError("");
        try { await window.confirmationResult.confirm(code); onClose(); } catch (err) { setError("קוד שגוי."); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-sm w-full p-8 relative shadow-2xl text-center border-2 border-[#D4AF37]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-black text-2xl font-bold">&times;</button>
                <div className="text-4xl text-[#D4AF37] mb-4"><i className="fa-solid fa-crown"></i></div>
                <h2 className="text-2xl font-black text-[#1e3a8a] mb-2">מועדון SmartBuy</h2>
                {error && <div className="bg-red-100 text-red-600 p-2 rounded-lg text-xs mb-4 font-bold">{error}</div>}
                {step === 1 ? (
                    <div>
                        <button onClick={handleGoogleLogin} className="w-full bg-white border-2 border-gray-200 text-[#1e3a8a] font-bold py-3 rounded-xl flex items-center justify-center gap-3 mb-4">
                            <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" className="w-5 h-5" /> המשך עם Google
                        </button>
                        <input type="tel" dir="ltr" placeholder="050-0000000" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-center font-bold" value={phone} onChange={e => setPhone(e.target.value)} />
                        <button onClick={sendSms} disabled={loading || phone.length < 9} className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl">{loading ? "שולח..." : "שלח קוד ב-SMS"}</button>
                    </div>
                ) : (
                    <div>
                        <input type="text" dir="ltr" placeholder="123456" maxLength="6" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-center tracking-[1em]" value={code} onChange={e => setCode(e.target.value)} />
                        <button onClick={verifyCode} disabled={loading || code.length < 6} className="w-full bg-[#FFD814] text-[#1e3a8a] font-extrabold py-3 rounded-xl">{loading ? "בודק..." : "אמת והתחבר"}</button>
                    </div>
                )}
                <div id="recaptcha-container"></div>
            </div>
        </div>
    );
};

// --- סליידר Hero (זום מיקרו) ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    useEffect(() => {
        if (products.length === 0) return;
        const interval = setInterval(() => setCurrentIndex(prev => (prev + 1) % products.length), 3500);
        return () => clearInterval(interval);
    }, [products]);

    if (products.length === 0) return null;

    return (
        <div className="w-full h-32 md:h-48 bg-black relative overflow-hidden flex items-center justify-center border-b-4 border-[#FFD814]">
            {/* תמונה עם זום מיקרו שמכסה את כל הרוחב */}
            <img src={products[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-150 opacity-40 transition-all duration-1000" alt="Slider" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/80 to-transparent"></div>
            <div className="absolute z-20 text-center">
                <h2 className="text-[#FFD814] text-2xl md:text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{products[currentIndex].name}</h2>
                <p className="text-white font-bold text-sm md:text-lg drop-shadow-md mt-1">המבצעים החמים של היום</p>
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
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [showPromo, setShowPromo] = useState(true); // פופ-אפ ראשי
    const [activeReview, setActiveReview] = useState(null); // בועת ביקורות
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u ? { name: u.displayName || u.phoneNumber } : null));
        return () => unsub();
    }, []);

    const addToCart = (p) => { setCart([...cart, p]); setIsCartOpen(true); };
    const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
    const cartTotal = cart.reduce((sum, i) => sum + i.sellingPrice, 0);
    
    const filtered = products.filter(p => (filter === "All" || p.category === filter) && p.name.includes(searchQuery) && p.sellingPrice <= maxPrice);

    // מוצרים מומלצים
    const recommendedIds = useMemo(() => {
        const map = {};
        products.forEach(p => { if (!map[p.category]) map[p.category] = []; if (map[p.category].length < 2) map[p.category].push(p.id); });
        return new Set(Object.values(map).flat());
    }, [products]);

    const categoryMap = { "All": "הכל", "Fridges": "מקררים", "AC": "מזגנים", "Washing": "כביסה", "Ovens": "תנורים", "TV": "טלוויזיות" };
    const getCategoryImage = (catKey) => {
        if(catKey === "All") return "https://cdn-icons-png.flaticon.com/512/3514/3514491.png";
        const p = products.find(prod => prod.category === catKey);
        return p ? p.image : "https://cdn-icons-png.flaticon.com/512/1174/1174463.png";
    };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant">
            {showPromo && <PromoPopup onClose={() => setShowPromo(false)} />}
            {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
            
            {/* Header */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-2 border-[#D4AF37]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                        <div className="cursor-pointer" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814] drop-shadow-md">SMART<span className="text-white">BUY</span></div>
                            <div className="text-[11px] font-bold tracking-widest text-[#D4AF37] mt-1">קנייה חכמה מתחילה כאן</div>
                        </div>
                        <div className="hidden sm:block"><LanguageSwitcher /></div>
                    </div>
                    
                    <div className="flex-grow max-w-xl w-full">
                        <div className="relative">
                            <input type="text" placeholder="חפש מוצר..." className="w-full p-3 pr-10 rounded-xl text-black focus:outline-none focus:ring-2 ring-[#FFD814]" onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-4 text-gray-400"></i>
                        </div>
                        {/* סקאלת תקציב שחזרה */}
                        <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-[#D4AF37] bg-white/5 p-1 px-3 rounded-lg">
                            <span>תקציב: ₪{maxPrice}</span>
                            <input type="range" min="0" max="20000" step="100" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#FFD814]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                        <div className="sm:hidden"><LanguageSwitcher /></div>
                        
                        {/* התחברות חברי מועדון */}
                        {user ? (
                            <div className="text-center group cursor-pointer relative" onClick={() => auth.signOut()}>
                                <i className="fa-solid fa-user-check text-[#FFD814] text-xl"></i>
                                <div className="text-[10px] font-bold">{user.name}</div>
                                <div className="absolute top-10 bg-white text-black text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">התנתק</div>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthOpen(true)} className="text-center hover:text-[#FFD814] transition-colors">
                                <i className="fa-regular fa-user text-xl"></i>
                                <div className="text-[10px] font-bold">מועדון / התחברות</div>
                            </button>
                        )}
                        
                        <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-4 py-2 rounded-xl font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-md">
                            <i className="fa-solid fa-cart-shopping text-xl"></i>
                            <div className="text-right leading-none">
                                <div className="text-[10px]">סל שלי</div>
                                <div>₪{cartTotal}</div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* קטגוריות מתמונות אמיתיות */}
            <nav className="bg-white shadow-md sticky top-[158px] md:top-[92px] z-40 overflow-x-auto hide-scroll px-6 py-3">
                <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max">
                    {Object.keys(categoryMap).map(cat => (
                        <button key={cat} onClick={() => { setFilter(cat); setMaxPrice(15000); }} className={`flex flex-col items-center min-w-[80px] p-2 rounded-2xl transition-all border-2 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 shadow-inner scale-105" : "border-transparent hover:bg-gray-100"}`}>
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm mb-1 p-1 overflow-hidden">
                                <img src={getCategoryImage(cat)} alt={categoryMap[cat]} className="w-full h-full object-contain" />
                            </div>
                            <span className={`text-[11px] font-bold ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <HeroSlider products={products} />

            {/* רשת מוצרים */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl shadow-md border border-gray-100 flex flex-col justify-between hover:shadow-2xl transition-all group relative">
                        
                        {/* תג מוצר מומלץ */}
                        {recommendedIds.has(p.id) && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-md">
                                <i className="fa-solid fa-thumbs-up"></i> מוצר מומלץ
                            </div>
                        )}

                        {/* בועת המלצות לקוחות (הכנה ל-AI) */}
                        <div className="absolute top-4 left-4 z-20">
                            <button onClick={(e) => { e.stopPropagation(); setActiveReview(activeReview === p.id ? null : p.id); }} className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors ${activeReview === p.id ? 'bg-[#1e3a8a] text-white' : 'bg-white text-[#1e3a8a] hover:bg-gray-100'}`}>
                                <i className="fa-regular fa-comment-dots"></i>
                            </button>
                            {activeReview === p.id && (
                                <div className="absolute top-10 left-0 bg-white p-3 rounded-xl shadow-2xl z-30 w-48 border-2 border-[#FFD814] text-right text-xs transform origin-top-left animate-fade-in">
                                    <div className="text-[#FFD814] mb-1"><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i></div>
                                    <p className="text-gray-600 mb-2">"סורק הביקורות החכם שלנו אוסף כרגע המלצות מלקוחות אמיתיים ברחבי הרשת..."</p>
                                    <b className="text-[#1e3a8a]">מערכת AI</b>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative h-48 flex items-center justify-center mb-4 mt-6">
                            <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm mb-2 h-10 line-clamp-2 text-gray-800">{p.name}</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-2xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                <span className="text-xs text-gray-400 line-through">₪{Math.round(p.sellingPrice * 1.15)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-gray-50 py-2 rounded-xl font-bold transition-all text-xs">כרטיס מוצר</button>
                            <button onClick={()=>addToCart(p)} className="bg-[#FFD814] text-[#1e3a8a] py-2 rounded-xl font-black hover:bg-[#F7CA00] transition-all text-xs shadow-sm">הוספה לסל</button>
                        </div>
                    </div>
                ))}
            </main>

            {/* אזור המלצות כללי */}
            <section className="bg-white py-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-[#1e3a8a] mb-2">לקוחות ממליצים</h2>
                        <p className="text-gray-500">בקרוב: שילוב אוטומטי של ביקורות מאומתות מרחבי הרשת (AI)</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="text-[#FFD814] mb-3"><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* פוטר */}
            <footer className="bg-[#FFD814] text-[#1e3a8a] py-16 px-8 border-t-[12px] border-[#1e3a8a]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                    <div>
                        <div className="text-3xl font-black italic mb-4">SMARTBUY</div>
                        <p className="font-bold mb-4">קנייה חכמה מתחילה כאן.</p>
                        <p className="leading-relaxed">החנות המובילה למכשירי חשמל. איכות ללא פשרות ומחירים שוברי שוק.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">שירות לקוחות</h4>
                        <ul className="space-y-3 font-bold">
                            <li><i className="fa-solid fa-phone ml-2"></i> מוקד: <a href="tel:0544914204" className="hover:underline dir-ltr inline-block">054-4914204</a></li>
                            <li><i className="fa-solid fa-envelope ml-2"></i> דוא"ל: <a href="mailto:info@smartbuy.co.il" className="hover:underline">info@smartbuy.co.il</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">מידע שימושי</h4>
                        <ul className="space-y-3 font-bold">
                            <li><a href="#" className="hover:underline">תקנון האתר</a></li>
                            <li><a href="#" className="hover:underline">מדיניות פרטיות והחזרות</a></li>
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
                    </div>
                </div>
            </footer>

            {/* כפתור ווטסאפ צף שחזר! */}
            <a href="https://wa.me/972544914204?text=שלום SmartBuy, אשמח לעזרה..." target="_blank" className="fixed bottom-6 left-6 bg-[#25D366] text-white w-14 h-14 rounded-full shadow-[0_10px_20px_rgba(37,211,102,0.4)] z-[150] hover:scale-110 transition-transform flex items-center justify-center border-2 border-white text-3xl">
                <i className="fa-brands fa-whatsapp"></i>
            </a>

            {/* מגירת סל עם כפתור מחיקה */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[400] transition-transform duration-500 border-l-4 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center shadow-lg">
                    <span className="font-black text-xl text-[#FFD814]">הסל שלי</span>
                    <button onClick={()=>setIsCartOpen(false)} className="text-3xl">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto h-[70vh] space-y-4">
                    {cart.map((item, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 relative">
                            {/* פח אשפה */}
                            <button onClick={() => removeFromCart(i)} className="absolute top-1 right-1 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10">
                                <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                            <img src={item.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1 shadow-sm mr-4" />
                            <div className="flex flex-col justify-center">
                                <span className="text-[11px] font-bold line-clamp-2 leading-tight pr-2">{item.name}</span>
                                <b className="text-[#1e3a8a] pr-2">₪{item.sellingPrice}</b>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t bg-gray-50 absolute bottom-0 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">סה"כ:</span>
                        <span className="text-3xl font-black text-[#1e3a8a]">₪{cartTotal}</span>
                    </div>
                    <button onClick={()=>{setIsCartOpen(false); /* setIsCheckoutOpen(true); פה יבוא הקוד של הקופה */}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl">מעבר לקופה</button>
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/50 z-[350] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
}