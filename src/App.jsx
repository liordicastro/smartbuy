import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier, signOut } from "firebase/auth";

// --- הגדרות Firebase ---
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

// --- רכיב החלפת שפות (מתוקן ושקט) ---
const LanguageSwitcher = () => {
    const changeLanguage = (langCode) => {
        const selectBox = document.querySelector(".goog-te-combo");
        if (selectBox) {
            selectBox.value = langCode;
            selectBox.dispatchEvent(new Event('change'));
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

// --- מודאל מוצר מורחב (מתוקן) ---
const ProductModal = ({ product, onClose, onAddToCart }) => (
    <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 left-4 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-3xl font-bold z-20">&times;</button>
            
            <div className="grid grid-cols-1 md:grid-cols-5 min-h-[60vh]">
                {/* צד ימין: תמונה, קטגוריה וקנייה (2 עמודות) */}
                <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-200">
                    <div className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">{product.category}</div>
                    <img src={product.image} className="max-h-64 object-contain mb-8 hover:scale-110 transition-transform duration-500" alt={product.name} />
                    <h2 className="text-2xl font-extrabold text-[#1e3a8a] mb-6 text-center leading-tight">{product.name}</h2>
                    
                    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-auto">
                        <div className="text-sm text-gray-500 mb-1 text-center font-bold">מחיר SmartBuy:</div>
                        <div className="text-5xl font-black text-[#1e3a8a] mb-1 text-center">₪{product.sellingPrice}</div>
                        <div className="text-xs text-gray-400 line-through text-center mb-6">מחיר שוק: ₪{Math.round(product.sellingPrice * 1.15)}</div>
                        
                        <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#1e3a8a] font-extrabold py-4 rounded-xl transition-all text-lg shadow-md active:scale-95">
                            <i className="fa-solid fa-cart-plus ml-2 text-xl"></i> הוספה לסל
                        </button>
                    </div>
                </div>

                {/* צד שמאל: סקירת מומחה (AI) וביקורות גולשים (3 עמודות) */}
                <div className="md:col-span-3 p-8 bg-white overflow-y-auto">
                    {/* אזור מאמר המומחה */}
                    {product.expertArticleTitle ? (
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-4 py-2 rounded-lg font-black text-sm mb-6 border border-blue-100">
                                <i className="fa-solid fa-medal text-[#FFD814] text-lg"></i> סקירת המומחים של SmartBuy
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-6 leading-tight">{product.expertArticleTitle}</h3>
                            <div className="text-gray-600 leading-relaxed text-sm sm:text-base space-y-4">
                                {/* הבוט מחזיר ירידות שורה, אז אנחנו מפצלים אותן לפסקאות יפות */}
                                {product.expertArticleBody.split('\n').filter(p => p.trim() !== '').map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-10 text-gray-600 leading-relaxed text-sm sm:text-base">
                            {product.description}
                        </div>
                    )}
                    
                    {/* אזור ביקורות לקוחות */}
                    <div className="pt-8 border-t-2 border-dashed border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-[#1e3a8a] text-xl">ביקורות גולשים</h4>
                            <div className="text-[#FFD814] text-sm"><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i></div>
                        </div>
                        
                        <div className="bg-gray-50 p-8 rounded-2xl text-center border border-gray-100 shadow-inner">
                            <i className="fa-regular fa-comment-dots text-5xl text-gray-300 mb-4"></i>
                            <h5 className="font-bold text-gray-700 mb-2">אין עדיין ביקורות למוצר זה</h5>
                            <p className="text-sm text-gray-500 mb-6">קנית את המוצר? ספר לנו איך הוא ותעזור לאחרים להחליט!</p>
                            <button className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] px-8 py-3 rounded-xl font-bold hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm">
                                <i className="fa-solid fa-pen-to-square ml-2"></i> כתוב ביקורת
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// --- מודאל קופה (מתוקן) ---
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
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl border-4 border-[#D4AF37]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-2xl font-bold">&times;</button>
                <div className="md:w-1/2 p-4 border-l border-gray-100">
                    <h3 className="text-xl font-black mb-4 text-[#1e3a8a]">סיכום הזמנה</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                        {cart.map((item, i) => <div key={i} className="flex justify-between text-xs"><span>{item.name}</span><span className="font-bold">₪{item.sellingPrice}</span></div>)}
                    </div>
                    <div className="text-2xl font-black text-red-600 border-t pt-2">סה"כ לתשלום: ₪{total}</div>
                </div>
                <div className="md:w-1/2 p-4">
                    <h2 className="text-xl font-bold mb-4 text-[#1e3a8a]">פרטי משלוח</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input required placeholder="שם מלא" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" onChange={e=>setFormData({...formData, name: e.target.value})} />
                        <input required placeholder="טלפון" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                        <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-xl font-bold hover:bg-[#152a63] transition-colors shadow-lg">השלם הזמנה בווטסאפ</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- מודאל התחברות (מועדון) ---
const AuthModal = ({ onClose }) => {
    // ... (אותו קוד AuthModal שעובד תקין)
    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-sm w-full p-8 relative shadow-2xl text-center border-2 border-[#D4AF37]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-black text-2xl font-bold">&times;</button>
                <div className="text-4xl text-[#D4AF37] mb-4"><i className="fa-solid fa-crown"></i></div>
                <h2 className="text-2xl font-black text-[#1e3a8a] mb-2">מועדון SmartBuy</h2>
                <p className="text-gray-500 text-sm mb-6">התחבר כדי לשמור עגלה והטבות</p>
                <button onClick={onClose} className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl mt-4">חזור לאתר (הדגמה)</button>
            </div>
        </div>
    );
};

// --- סליידר Hero ---
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
            <img src={products[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-150 opacity-40 transition-all duration-1000" alt="Slider" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/80 to-transparent"></div>
            <div className="absolute z-20 text-center">
                <h2 className="text-[#FFD814] text-2xl md:text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{products[currentIndex].name}</h2>
                <p className="text-white font-bold text-sm md:text-lg drop-shadow-md mt-1">המבצעים החמים של היום</p>
            </div>
        </div>
    );
};

// ==========================================
// אפליקציה ראשית
// ==========================================
export default function App() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState("All");
    
    // חיפוש והשלמה אוטומטית
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    const [maxPrice, setMaxPrice] = useState(15000);
    const [cart, setCart] = useState([]);
    
    // מודאלים
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [showPromo, setShowPromo] = useState(true); 
    const [selectedProduct, setSelectedProduct] = useState(null); 
    const [activeReview, setActiveReview] = useState(null); 
    
    // קופון
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => unsub();
    }, []);

    // סינון מוצרים
    const filtered = products.filter(p => {
        const matchCat = filter === "All" || p.category === filter;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchPrice = p.sellingPrice <= maxPrice;
        return matchCat && matchSearch && matchPrice;
    });

    // מוצרים להשלמה אוטומטית
    const searchSuggestions = searchQuery.trim() === "" ? [] : products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

    const addToCart = (p) => { setCart([...cart, p]); setIsCartOpen(true); };
    const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
    
    const cartBaseTotal = cart.reduce((sum, i) => sum + i.sellingPrice, 0);
    const cartTotal = Math.round(cartBaseTotal * (1 - discount));

    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "SMART10") {
            setDiscount(0.1);
            alert("קופון SMART10 הופעל בהצלחה! (10% הנחה)");
        } else {
            setDiscount(0);
            alert("קוד קופון אינו חוקי");
        }
    };

    const recommendedIds = useMemo(() => {
        const map = {};
        products.forEach(p => { if (!map[p.category]) map[p.category] = []; if (map[p.category].length < 2) map[p.category].push(p.id); });
        return new Set(Object.values(map).flat());
    }, [products]);

    // מפת קטגוריות מלאה
    const categoryMap = { 
        "All": "הכל", "Fridges": "מקררים", "Freezers": "מקפיאים", "AC": "מזגנים", 
        "Washing": "כביסה", "Dryers": "מייבשים", "Dishwashers": "מדיחים",
        "Ovens": "תנורים", "Hobs": "כיריים", "TV": "טלוויזיות", "Blenders": "בלנדרים"
    };
    
    const getCategoryImage = (catKey) => {
        if(catKey === "All") return "https://cdn-icons-png.flaticon.com/512/3514/3514491.png";
        const p = products.find(prod => prod.category === catKey);
        return p ? p.image : "https://cdn-icons-png.flaticon.com/512/1174/1174463.png";
    };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant">
            {showPromo && <PromoPopup onClose={() => setShowPromo(false)} />}
            {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
            {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} />}
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
            
            {/* Header */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-2 border-[#D4AF37]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                        <div className="cursor-pointer text-center md:text-right" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814] drop-shadow-md">SMART<span className="text-white">BUY</span></div>
                            <div className="text-[11px] font-bold tracking-widest text-[#D4AF37] mt-1">קנייה חכמה מתחילה כאן</div>
                        </div>
                        <div className="hidden sm:block"><LanguageSwitcher /></div>
                    </div>
                    
                    {/* חיפוש עם השלמה אוטומטית */}
                    <div className="flex-grow max-w-xl w-full relative">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="חפש מקרר, מסך, תנור..." 
                                className="w-full p-3 pr-10 rounded-xl text-black focus:outline-none focus:ring-2 ring-[#FFD814]" 
                                value={searchQuery}
                                onChange={e=>setSearchQuery(e.target.value)} 
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-4 text-gray-400"></i>
                        </div>
                        
                        {/* תפריט השלמה אוטומטית */}
                        {isSearchFocused && searchSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                {searchSuggestions.map(s => (
                                    <div key={s.id} onClick={() => { setSelectedProduct(s); setIsSearchFocused(false); setSearchQuery(""); }} className="p-3 border-b hover:bg-gray-50 flex items-center gap-3 cursor-pointer text-black">
                                        <img src={s.image} className="w-8 h-8 object-contain" />
                                        <span className="text-sm font-bold">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* סקאלת תקציב */}
                        <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-[#D4AF37] bg-white/5 p-1 px-3 rounded-lg">
                            <span>תקציב: ₪{maxPrice}</span>
                            <input type="range" min="0" max="20000" step="100" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#FFD814]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                        <div className="sm:hidden"><LanguageSwitcher /></div>
                        
                        <button onClick={() => setIsAuthOpen(true)} className="text-center hover:text-[#FFD814] transition-colors">
                            <i className="fa-regular fa-user text-xl"></i>
                            <div className="text-[10px] font-bold">מועדון</div>
                        </button>
                        
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

            {/* קטגוריות מלאות */}
            <nav className="bg-white shadow-md sticky top-[158px] md:top-[92px] z-40 overflow-x-auto hide-scroll px-6 py-3 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max">
                    {Object.keys(categoryMap).map(cat => (
                        <button key={cat} onClick={() => { setFilter(cat); setMaxPrice(15000); }} className={`flex flex-col items-center min-w-[70px] p-2 rounded-2xl transition-all border-2 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 shadow-inner scale-105" : "border-transparent hover:bg-gray-100"}`}>
                            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm mb-1 p-1 overflow-hidden">
                                <img src={getCategoryImage(cat)} alt={categoryMap[cat]} className="w-full h-full object-contain" />
                            </div>
                            <span className={`text-[10px] font-bold ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <HeroSlider products={products} />

            {/* רשת מוצרים */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl shadow-md border border-gray-100 flex flex-col justify-between hover:shadow-2xl transition-all group relative">
                        {recommendedIds.has(p.id) && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-md">
                                <i className="fa-solid fa-thumbs-up"></i> מומלץ
                            </div>
                        )}

                        <div className="absolute top-4 left-4 z-20">
                            <button onClick={(e) => { e.stopPropagation(); setActiveReview(activeReview === p.id ? null : p.id); }} className="w-8 h-8 rounded-full shadow-md flex items-center justify-center bg-white text-[#1e3a8a] hover:bg-gray-100">
                                <i className="fa-regular fa-comment-dots"></i>
                            </button>
                            {activeReview === p.id && (
                                <div className="absolute top-10 left-0 bg-white p-3 rounded-xl shadow-2xl z-30 w-48 border-2 border-[#FFD814] text-right text-xs">
                                    <div className="text-[#FFD814] mb-1"><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i></div>
                                    <p className="text-gray-600">סורק ביקורות פעיל...</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative h-48 flex items-center justify-center mb-4 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                            <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm mb-2 h-10 line-clamp-2 text-gray-800 cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-2xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                <span className="text-xs text-gray-400 line-through">₪{Math.round(p.sellingPrice * 1.15)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button onClick={() => setSelectedProduct(p)} className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-gray-50 py-2 rounded-xl font-bold transition-all text-xs">כרטיס מוצר</button>
                            <button onClick={()=>addToCart(p)} className="bg-[#FFD814] text-[#1e3a8a] py-2 rounded-xl font-black hover:bg-[#F7CA00] transition-all text-xs shadow-sm">הוספה לסל</button>
                        </div>
                    </div>
                ))}
            </main>

            {/* פוטר */}
            <footer className="bg-[#FFD814] text-[#1e3a8a] py-16 px-8 border-t-[12px] border-[#1e3a8a] mt-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                    <div>
                        <div className="text-3xl font-black italic mb-4">SMARTBUY</div>
                        <p className="leading-relaxed font-bold">החנות המובילה למכשירי חשמל. איכות ללא פשרות ומחירים שוברי שוק.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">שירות לקוחות</h4>
                        <ul className="space-y-3 font-bold">
                            <li><i className="fa-solid fa-phone ml-2"></i> מוקד: <a href="tel:0544914204" className="dir-ltr inline-block">054-4914204</a></li>
                            <li><i className="fa-solid fa-envelope ml-2"></i> דוא"ל: info@smartbuy.co.il</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">מידע שימושי</h4>
                        <ul className="space-y-3 font-bold">
                            <li><a href="#">תקנון האתר</a></li>
                            <li><a href="#">מדיניות פרטיות והחזרות</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">קנייה מאובטחת</h4>
                        <div className="flex gap-3 text-4xl mb-4">
                            <i className="fa-brands fa-cc-visa"></i>
                            <i className="fa-brands fa-cc-mastercard"></i>
                        </div>
                    </div>
                </div>
            </footer>

            {/* מגירת סל עשירה (כולל קופון) */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[400] transition-transform duration-500 border-l-4 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center shadow-lg">
                    <span className="font-black text-xl text-[#FFD814]">הסל שלי</span>
                    <button onClick={()=>setIsCartOpen(false)} className="text-3xl">&times;</button>
                </div>
                
                <div className="p-4 overflow-y-auto h-[55vh] space-y-4">
                    {cart.map((item, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 relative">
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

                <div className="p-6 border-t bg-white absolute bottom-0 w-full shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    {/* אזור קופון */}
                    <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="קוד קופון" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border p-2 rounded-lg text-sm" />
                        <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-3 rounded-lg text-sm font-bold">הפעל</button>
                    </div>
                    
                    {discount > 0 && <div className="text-green-600 text-sm font-bold mb-2">הנחה פעילה: 10%</div>}
                    
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">סה"כ לתשלום:</span>
                        <span className="text-3xl font-black text-[#1e3a8a]">₪{cartTotal}</span>
                    </div>
                    <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl">המשך לקופה</button>
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/50 z-[350] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
}