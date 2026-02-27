import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { Helmet, HelmetProvider } from 'react-helmet-async';

// --- Firebase Config (SmartBuy) ---
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

// --- 1. מודאל השוואת מוצרים ---
const ComparisonModal = ({ list, onClose, onRemove }) => (
    <div className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
        <div className="bg-white rounded-[40px] max-w-6xl w-full p-8 relative overflow-hidden flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-6 left-6 text-3xl font-bold hover:text-red-500 transition-colors">&times;</button>
            <h2 className="text-3xl font-black text-[#1e3a8a] mb-10 text-center uppercase tracking-tighter">השוואת דגמים חכמה</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto pb-10" dir="rtl">
                {list.map(p => (
                    <div key={p.id} className="border-2 border-gray-100 rounded-3xl p-6 relative bg-gray-50 flex flex-col shadow-sm">
                        <button onClick={()=>onRemove(p.id)} className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg hover:scale-110 transition-transform font-bold">✕</button>
                        <img src={p.image} className="h-40 object-contain mb-6 bg-white rounded-2xl p-2" alt={p.name} />
                        <h4 className="font-black text-[#1e3a8a] mb-6 h-12 line-clamp-2 leading-tight">{p.name}</h4>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b pb-2"><b>מחיר:</b> <span className="text-[#1e3a8a] font-black">₪{p.sellingPrice}</span></div>
                            <div className="flex justify-between border-b pb-2"><b>מותג:</b> <span>{p.brand}</span></div>
                            <div className="flex justify-between border-b pb-2"><b>מידות:</b> <span>{p.specs?.dimensions || 'לפי יצרן'}</span></div>
                            <div className="flex flex-col gap-2">
                                <b>תכונות עיקריות:</b>
                                <div className="text-xs text-gray-600 bg-white p-3 rounded-xl border leading-relaxed h-24 overflow-y-auto">
                                    {p.specs?.key_features?.join(', ') || 'נתונים בבדיקה'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {list.length === 0 && <div className="text-center py-20 font-bold text-gray-400">אין מוצרים להשוואה</div>}
        </div>
    </div>
);

// --- 2. מודאל מוצר (המקטע המתוקן) ---
const ProductModal = ({ product, onClose, onAddToCart, onAddReview, brandLogo }) => {
    const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
    const [isExpanded, setIsExpanded] = useState(false);

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        onAddReview(product.id, reviewForm);
        setReviewForm({ name: '', text: '', rating: 5 });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm shadow-inner" onClick={onClose}>
            <Helmet>
                <title>{product.name} | SmartBuy</title>
                <meta name="description" content={`קנו עכשיו את ${product.name} ב-₪${product.sellingPrice}. סקירה מלאה ומפרט טכני.`} />
            </Helmet>
            <div className="bg-white rounded-[45px] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-3xl font-bold z-50 transition-all hover:rotate-90">&times;</button>
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden text-right" dir="rtl">
                    <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l">
                        {brandLogo && <img src={brandLogo} className="h-12 mb-6 object-contain opacity-70" alt="brand" />}
                        <img src={product.image} className="max-h-64 object-contain mb-6 hover:scale-105 transition-transform duration-500" alt={product.name} />
                        <h2 className="text-2xl font-black text-[#1e3a8a] mb-6 text-center leading-tight px-4">{product.name}</h2>
                        <div className="w-full bg-white p-6 rounded-3xl shadow-sm text-center">
                            <div className="text-5xl font-black text-[#1e3a8a] mb-6">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-5 rounded-2xl text-xl shadow-lg active:scale-95 transition-all">הוספה לסל המאובטח</button>
                        </div>
                    </div>
                    <div className="md:col-span-3 p-8 bg-white overflow-y-auto custom-scrollbar">
                        <section className="mb-8">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-3 py-1.5 rounded-lg font-black text-xs mb-4 border border-blue-100">סקירת מומחי SmartBuy</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4">{product.expertArticleTitle || 'תיאור מוצר'}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{product.expertArticleBody}</p>
                        </section>
                        {product.specs && (
                            <section className="mb-8 bg-gray-50 rounded-2xl p-6 border shadow-inner">
                                <h4 className="font-black text-[#1e3a8a] mb-4 uppercase tracking-tighter">מפרט טכני מלא</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                    <div className="bg-white p-3 rounded-xl border">מידות: {product.specs.dimensions || 'לפי יצרן'}</div>
                                    <div className="bg-white p-3 rounded-xl border">צבע: {product.specs.color || 'סטנדרט'}</div>
                                </div>
                            </section>
                        )}
                        <section className="pt-6 border-t">
                            <h4 className="font-black text-[#1e3a8a] text-xl mb-4">ביקורות גולשים</h4>
                            <div className="space-y-4 mb-8">
                                {product.reviews?.map((rev, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-2xl mb-3 border shadow-sm flex flex-col">
                                        <div className="flex justify-between text-xs mb-1 font-black"><span>{rev.name}</span><span className="text-[#FFD814]">★ {rev.rating}</span></div>
                                        <p className="text-gray-600 text-xs italic">"{rev.text}"</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. מודאל קופה ---
const CheckoutModal = ({ cart, total, onClose, onClearCart }) => {
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "orders"), { customer: formData, items: cart, totalAmount: total, status: 'חדש', createdAt: serverTimestamp() });
        window.open(`https://wa.me/972544914204?text=*הזמנה חדשה*:%0Aשם: ${formData.name}%0Aסה"כ: ₪${total}`, '_blank');
        onClearCart(); onClose();
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[40px] max-w-lg w-full p-10 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center">השלמת הזמנה מהירה</h2>
                <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
                    <input required placeholder="שם מלא" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] outline-none font-bold" onChange={e=>setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="מספר טלפון" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] outline-none font-bold" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                    <div className="bg-blue-50 p-6 rounded-[30px] text-center border-2 border-blue-100 text-5xl font-black text-[#1e3a8a]">₪{total}</div>
                    <button type="submit" className="w-full bg-[#1e3a8a] text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] transition-all">אישור ב-WhatsApp</button>
                </form>
            </div>
        </div>
    );
};

// --- רכיב החלפת שפות ---
const LanguageSwitcher = () => (
    <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner relative z-[60]">
        {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
            <button key={l.c} className="text-xl hover:scale-125 transition-transform" onClick={() => {
                const select = document.querySelector(".goog-te-combo");
                if (select) { select.value = l.c; select.dispatchEvent(new Event("change")); }
            }}>{l.f}</button>
        ))}
    </div>
);

// --- Hero Slider ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const heroList = useMemo(() => products.slice(0, 5), [products]);
    useEffect(() => {
        if (heroList.length === 0) return;
        const itv = setInterval(() => setCurrentIndex(p => (p + 1) % heroList.length), 4000);
        return () => clearInterval(itv);
    }, [heroList]);
    if (heroList.length === 0) return null;
    return (
        <div className="w-full h-48 md:h-64 bg-black relative overflow-hidden flex items-center justify-center border-b-8 border-[#FFD814]">
            <img src={heroList[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-110 opacity-30 blur-[1px] transition-opacity" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 to-transparent"></div>
            <div className="absolute z-20 text-center px-4 animate-fade-in">
                <h2 className="text-white text-3xl md:text-5xl font-black drop-shadow-2xl mb-2">{heroList[currentIndex].name}</h2>
                <div className="text-[#FFD814] text-xl font-black italic underline underline-offset-4 decoration-white">הטבת השבוע לחברי מועדון 👑</div>
            </div>
        </div>
    );
};

// ==========================================
// פונקציית האפליקציה המרכזית
// ==========================================
export default function App() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState("All");
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [maxPrice, setMaxPrice] = useState(25000);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [compareList, setCompareList] = useState([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    // טעינת נתונים
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u));
        return () => unsub();
    }, []);

    const brandLogos = {
        "אלקטרה": "https://upload.wikimedia.org/wikipedia/he/thumb/4/4d/Electra_logo.svg/1200px-Electra_logo.svg.png",
        "סאוטר": "https://www.sauter-appliances.co.il/wp-content/themes/sauter/images/logo.png",
        "AEG": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/AEG_logo.svg/2560px-AEG_logo.svg.png",
        "סמסונג": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/2560px-Samsung_Logo.svg.png",
        "LG": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/LG_logo_%282015%29.svg/2560px-LG_logo_%282015%29.svg.png",
        "בוש": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/2560px-Bosch-logo.svg.png",
        "תדיראן": "https://upload.wikimedia.org/wikipedia/he/1/1e/Tadiran_Group_Logo.png"
    };

    const categoryMap = { 
        "All": "דף הבית", "Fridges": "מקררים", "Freezers": "מקפיאים", "AC": "מזגנים", 
        "Washing": "כביסה", "Dryers": "מייבשים", "Ovens": "תנורים", "TV": "טלוויזיות", "Surplus": "עודפים🏷️"
    };

    // לוגיקת סינון
    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchCat = filter === "All" || p.category === filter;
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchPrice = p.sellingPrice <= maxPrice;
            const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
            return matchCat && matchSearch && matchPrice && matchBrand;
        });
    }, [products, filter, searchQuery, maxPrice, selectedBrands]);

    // קבוצות מומלצים לבית (2 מכל קטגוריה)
    const categorizedGroups = useMemo(() => {
        const groups = {};
        Object.keys(categoryMap).forEach(key => {
            if (key === "All") return;
            groups[key] = products.filter(p => p.category === key).slice(0, 5); // מציגים עד 5 בשורה
        });
        return groups;
    }, [products]);

    const addToCompare = (p) => {
        if (compareList.length >= 3) { alert("ניתן להשוות עד 3 דגמים בבת אחת."); return; }
        if (!compareList.find(i=>i.id===p.id)) setCompareList([...compareList, p]);
    };

    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));

    return (
        <HelmetProvider>
            <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden" dir="rtl">
                
                {/* מודאלים פעילים */}
                {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={(pid, rev) => updateDoc(doc(db, "products", pid), { reviews: arrayUnion({ ...rev, date: new Date().toISOString() }) })} brandLogo={brandLogos[selectedProduct.brand]} />}
                {isCompareOpen && <ComparisonModal list={compareList} onClose={()=>setIsCompareOpen(false)} onRemove={(id)=>setCompareList(compareList.filter(i=>i.id!==id))} />}
                {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}

                {/* Header משובח */}
                <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814] py-4 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                            <div className="cursor-pointer" onClick={()=>{setFilter("All"); setSearchQuery(""); setMaxPrice(25000);}}>
                                <div className="text-3xl font-black italic text-[#FFD814]">SMARTBUY</div>
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest mt-1 opacity-80">Premium Tech Hub</div>
                            </div>
                            <LanguageSwitcher />
                        </div>
                        <div className="flex-grow max-w-xl w-full relative">
                            <input type="text" placeholder="מה אתם מחפשים היום? מקרר, מסך, תנור..." className="w-full p-4 pr-12 rounded-2xl text-black focus:ring-4 ring-[#FFD814]/50 outline-none font-bold" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute right-4 top-5 text-gray-400"></i>
                        </div>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <div className="text-xs font-bold text-center">שלום, <br/> {user.displayName?.split(' ')[0]}</div>
                            ) : (
                                <button onClick={()=>signInWithPopup(auth, new GoogleAuthProvider())} className="text-xs font-black bg-[#FFD814]/20 border border-[#FFD814]/40 px-4 py-2 rounded-xl hover:bg-[#FFD814]/40 transition-all">חברי מועדון 👑</button>
                            )}
                            <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-6 py-2 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
                                <i className="fa-solid fa-cart-shopping"></i> ₪{cartTotal}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Navbar עם תמונות קטגוריה דינמיות */}
                <nav className="bg-white border-b sticky top-[140px] md:top-[88px] z-40 overflow-x-auto py-6 px-6 shadow-sm scrollbar-hide">
                    <div className="max-w-7xl mx-auto flex gap-6 md:justify-center min-w-max">
                        {Object.keys(categoryMap).map(cat => {
                            const sampleImg = products.find(p => p.category === cat)?.image;
                            return (
                                <button key={cat} onClick={() => {setFilter(cat); setSelectedBrands([]);}} className={`flex flex-col items-center min-w-[100px] p-4 rounded-[30px] transition-all border-2 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 scale-110 shadow-md z-10" : "border-transparent bg-white hover:bg-gray-50 opacity-70"}`}>
                                    {sampleImg ? <img src={sampleImg} className="w-10 h-10 object-contain mb-2 rounded-full p-1 bg-gray-50 shadow-sm" /> : <i className="fa-solid fa-layer-group mb-2"></i>}
                                    <span className={`text-xs font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* כפתור השוואה צף */}
                {compareList.length > 0 && (
                    <button onClick={()=>setIsCompareOpen(true)} className="fixed bottom-32 right-8 bg-[#1e3a8a] text-white px-8 py-5 rounded-full shadow-2xl z-[450] animate-bounce-in flex items-center gap-4 border-4 border-[#FFD814] font-black text-lg">
                        <i className="fa-solid fa-code-compare text-2xl"></i>
                        השווה דגמים ({compareList.length})
                    </button>
                )}

                <HeroSlider products={products} />

                {/* Main Content Layout */}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 p-4 md:p-8 mt-4">
                    
                    {/* סרגל צד: סינון + מאמרים */}
                    <aside className="lg:w-72 w-full space-y-8">
                        {/* סרגל סינון מחירים ומותגים */}
                        <div className="bg-white p-8 rounded-[40px] shadow-xl border sticky top-40 z-10">
                            <h3 className="text-xl font-black text-[#1e3a8a] mb-8 border-b pb-4 flex items-center gap-2">
                                <i className="fa-solid fa-filter text-[#FFD814]"></i> סינון מהיר
                            </h3>
                            <div className="mb-10">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">מחיר מקסימלי: ₪{maxPrice}</label>
                                <input type="range" min="0" max="25000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#1e3a8a] h-2 bg-gray-100 rounded-lg cursor-pointer" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-400 mb-4 uppercase">בחירת מותגים</label>
                                {availableBrands.map(b => (
                                    <label key={b} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} className="w-5 h-5 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#FFD814]" />
                                        <span className={`text-sm font-bold ${selectedBrands.includes(b) ? 'text-[#1e3a8a]' : 'text-gray-500 group-hover:text-black'}`}>{b}</span>
                                    </label>
                                ))}
                            </div>
                            <button onClick={() => {setSelectedBrands([]); setMaxPrice(25000); setSearchQuery("");}} className="w-full mt-10 text-xs font-black text-red-500 hover:underline">נקה הכל</button>
                        </div>

                        {/* פינת המומחים (מאמרים) */}
                        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl border-b-8 border-[#FFD814]">
                            <div className="w-12 h-12 bg-[#FFD814] text-[#1e3a8a] rounded-2xl flex items-center justify-center mb-6 shadow-xl"><i className="fa-solid fa-book-open"></i></div>
                            <h4 className="text-xl font-black text-[#FFD814] mb-4 leading-tight">מדריך הקנייה החכם שלנו</h4>
                            <p className="text-xs leading-loose font-bold opacity-80 mb-8 italic">"איך לחסוך 20% בחשמל על ידי בחירת דרוג אנרגטי נכון? המומחים של SmartBuy מסבירים..."</p>
                            <button className="w-full bg-white/10 p-4 rounded-2xl text-xs font-black border border-white/20 hover:bg-white/20 transition-all uppercase tracking-widest">למאמר המלא</button>
                        </div>
                    </aside>

                    {/* אזור הצגת מוצרים */}
                    <main className="flex-grow space-y-24">
                        {filter === "All" && !searchQuery && selectedBrands.length === 0 ? (
                            /* דף הבית: שורות לפי קטגוריה */
                            Object.keys(categorizedGroups).map(catKey => (
                                <section key={catKey} className="animate-fade-in">
                                    <div className="flex items-center gap-4 mb-8 border-b-4 border-gray-100 pb-6">
                                        <div className="w-12 h-12 bg-white text-[#1e3a8a] rounded-2xl flex items-center justify-center shadow-md font-black border tracking-tighter">VIP</div>
                                        <div>
                                            <h2 className="text-3xl font-black text-[#1e3a8a] leading-none mb-1">{categoryMap[catKey]} מומלצים</h2>
                                            <span className="text-xs font-bold text-gray-400">הדגמים הנמכרים ביותר החודש</span>
                                        </div>
                                        <button onClick={()=>setFilter(catKey)} className="mr-auto text-sm font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-full hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm">צפה בהכל ←</button>
                                    </div>
                                    <div className="flex overflow-x-auto gap-8 pb-10 hide-scroll snap-x scroll-smooth px-2">
                                        {categorizedGroups[catKey].map(p => (
                                            <div key={p.id} className="min-w-[300px] md:min-w-[340px] snap-start bg-white p-8 rounded-[45px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between hover:-translate-y-2">
                                                <div className="absolute top-8 right-8 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                    {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                                </div>
                                                <button onClick={()=>addToCompare(p)} className={`absolute top-8 left-8 w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-blue-50 text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white'}`} title="הוסף להשוואה">
                                                    <i className="fa-solid fa-code-compare"></i>
                                                </button>
                                                <div className="h-48 flex items-center justify-center mb-8 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                    <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                                </div>
                                                <h3 className="font-black text-gray-800 text-base mb-4 h-12 line-clamp-2 leading-tight cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                                <div className="flex items-center justify-between mb-8">
                                                    <span className="text-3xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-xl border border-green-200 uppercase tracking-widest">In Stock</div>
                                                </div>
                                                <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-5 rounded-[22px] font-black hover:bg-[#f3ce12] transition-all shadow-xl active:scale-95 text-lg flex items-center justify-center gap-3">הוספה לסל <i className="fa-solid fa-cart-arrow-down text-sm"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        ) : (
                            /* דפי קטגוריה / תוצאות חיפוש: GRID מלא */
                            <section className="animate-fade-in">
                                <div className="flex items-center justify-between mb-12 bg-white p-8 rounded-[40px] border shadow-md">
                                     <div>
                                        <h2 className="text-3xl font-black text-[#1e3a8a]">{filter === "All" ? "תוצאות חיפוש" : categoryMap[filter]}</h2>
                                        <p className="text-gray-400 text-xs font-bold mt-1 tracking-widest uppercase">SmartBuy Professional Inventory</p>
                                     </div>
                                     <span className="bg-[#1e3a8a] text-white px-6 py-2 rounded-full text-sm font-black shadow-lg shadow-blue-200">{filtered.length} פריטים נמצאו</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                                    {filtered.map(p => (
                                        <div key={p.id} className="bg-white p-8 rounded-[50px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between hover:-translate-y-2">
                                            <div className="absolute top-8 right-8 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                            </div>
                                            <button onClick={()=>addToCompare(p)} className={`absolute top-8 left-8 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-gray-50 text-gray-400 hover:bg-[#1e3a8a] hover:text-white'}`}>
                                                <i className="fa-solid fa-code-compare text-xs"></i>
                                            </button>
                                            <div className="h-52 flex items-center justify-center mb-6 mt-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                            </div>
                                            <h3 className="font-black text-gray-800 text-sm mb-6 h-10 line-clamp-2 text-center cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                            <div className="text-4xl font-black text-[#1e3a8a] mb-10 text-center tracking-tighter">₪{p.sellingPrice}</div>
                                            <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-5 rounded-2xl font-black hover:bg-[#f3ce12] transition-all shadow-xl active:scale-95 uppercase tracking-tighter">Add To Cart</button>
                                        </div>
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <div className="text-center py-40 bg-white rounded-[60px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                                        <i className="fa-solid fa-magnifying-glass text-8xl text-gray-200 mb-8 opacity-50 animate-pulse"></i>
                                        <p className="text-gray-400 font-black text-2xl mb-8">לא מצאנו בדיוק את מה שחיפשת...</p>
                                        <button onClick={()=>{setFilter("All"); setSelectedBrands([]); setMaxPrice(25000); setSearchQuery("");}} className="bg-[#1e3a8a] text-white px-10 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl">אפס הכל וחזור להתחלה</button>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>

                {/* Footer המקצועי של SmartBuy */}
                <footer className="bg-[#1e3a8a] text-white py-24 px-10 border-t-[14px] border-[#FFD814] mt-24">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
                        <div className="space-y-8">
                            <div className="text-6xl font-black italic text-[#FFD814]">SMARTBUY</div>
                            <p className="font-bold opacity-80 leading-loose text-base">חנות מוצרי החשמל המובילה בישראל. איכות ללא פשרות, שירות VIP ומחירים ללא תחרות. בואו לקנות חכם.</p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FFD814] hover:text-[#1e3a8a] transition-all"><i className="fa-brands fa-facebook-f"></i></a>
                                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FFD814] hover:text-[#1e3a8a] transition-all"><i className="fa-brands fa-instagram"></i></a>
                                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FFD814] hover:text-[#1e3a8a] transition-all"><i className="fa-brands fa-tiktok"></i></a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-black text-xl mb-10 border-b-4 border-[#FFD814] pb-3 inline-block uppercase tracking-widest">שירות לקוחות</h4>
                            <ul className="space-y-6 font-bold text-lg">
                                <li className="flex items-center gap-4"><i className="fa-solid fa-phone text-[#FFD814]"></i> 054-4914204</li>
                                <li className="flex items-center gap-4"><i className="fa-solid fa-envelope text-[#FFD814]"></i> info@smartbuy.co.il</li>
                                <li className="flex items-center gap-4"><i className="fa-solid fa-clock text-[#FFD814]"></i> א-ה: 09:00-19:00</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-xl mb-10 border-b-4 border-[#FFD814] pb-3 inline-block uppercase tracking-widest">מידע נוסף</h4>
                            <ul className="space-y-5 font-bold text-gray-300">
                                <li><a href="#" className="hover:text-[#FFD814] transition-colors">תקנון האתר ותנאי שימוש</a></li>
                                <li><a href="#" className="hover:text-[#FFD814] transition-colors">מדיניות משלוחים VIP</a></li>
                                <li><a href="#" className="hover:text-[#FFD814] transition-colors">החזרות וביטולים</a></li>
                                <li><a href="#" className="hover:text-[#FFD814] transition-colors font-black text-[#FFD814]">הצטרפות למועדון הלקוחות</a></li>
                            </ul>
                        </div>
                        <div className="text-center md:text-left">
                            <h4 className="font-black text-xl mb-10 border-b-4 border-[#FFD814] pb-3 inline-block">Secure Payment</h4>
                            <div className="flex gap-6 justify-center md:justify-end text-6xl mb-10 text-white opacity-80">
                                <i className="fa-brands fa-google-pay"></i>
                                <i className="fa-brands fa-apple-pay"></i>
                                <i className="fa-brands fa-cc-visa"></i>
                                <i className="fa-brands fa-cc-mastercard"></i>
                            </div>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-[5px]">SSL ENCRYPTED SECURE CHANNEL</p>
                        </div>
                    </div>
                </footer>

                {/* מגירת סל קניות (Shopping Cart Drawer) */}
                <div className={`fixed top-0 right-0 h-full w-80 md:w-[450px] bg-white shadow-2xl z-[500] transition-transform duration-700 border-l-[12px] border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-10 bg-[#1e3a8a] text-white flex justify-between items-center shadow-xl">
                        <div className="flex items-center gap-4">
                            <i className="fa-solid fa-basket-shopping text-3xl text-[#FFD814]"></i>
                            <span className="font-black text-3xl uppercase tracking-tighter">הסל שלי</span>
                        </div>
                        <button onClick={()=>setIsCartOpen(false)} className="text-5xl hover:text-[#FFD814] font-bold transition-all hover:scale-125 rotate-45">+</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto h-[52vh] space-y-6 bg-gray-50 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="text-center py-32 opacity-20 flex flex-col items-center">
                                <i className="fa-solid fa-cart-arrow-down text-[120px] mb-8"></i>
                                <p className="font-black text-2xl uppercase">הסל שלך ריק...</p>
                            </div>
                        ) : (
                            cart.map((item, i) => (
                                <div key={i} className="flex gap-6 bg-white p-6 rounded-[35px] border-2 border-gray-100 relative shadow-sm hover:border-[#1e3a8a] transition-all group overflow-hidden">
                                    <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute -top-1 -right-1 bg-red-500 text-white w-9 h-9 rounded-bl-3xl flex items-center justify-center shadow-lg font-bold group-hover:scale-110 transition-transform">✕</button>
                                    <img src={item.image} className="w-24 h-24 object-contain bg-gray-50 rounded-2xl p-2 group-hover:rotate-6 transition-transform" alt={item.name} />
                                    <div className="flex flex-col justify-center flex-1 text-right">
                                        <span className="text-sm font-black line-clamp-2 mb-2 text-gray-800 leading-tight">{item.name}</span>
                                        <b className="text-2xl font-black text-[#1e3a8a] tracking-tighter">₪{item.sellingPrice}</b>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-10 border-t-4 bg-white absolute bottom-0 w-full shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-3 mb-8">
                            <input type="text" placeholder="קוד קופון VIP" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border-2 p-4 rounded-2xl outline-none focus:border-[#1e3a8a] font-bold text-center uppercase tracking-widest bg-gray-50" />
                            <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-8 rounded-2xl font-black hover:bg-blue-800 transition-colors uppercase">הפעל</button>
                        </div>
                        
                        {discount > 0 && <div className="bg-green-100 text-green-700 text-xs font-black p-3 rounded-xl mb-6 text-center border border-green-200">🎉 הטבת מועדון הופעלה בהצלחה!</div>}
                        
                        <div className="flex justify-between items-center mb-8 px-2">
                            <span className="font-black text-gray-400 uppercase text-xs tracking-[2px]">Total Payment</span>
                            <span className="text-5xl font-black text-[#1e3a8a] tracking-tighter">₪{cartTotal}</span>
                        </div>
                        
                        <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-6 rounded-3xl font-black text-2xl shadow-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-tighter border-b-8 border-[#e6c312]">
                            מעבר לקופה מאובטחת <i className="fa-solid fa-shield-check text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* רקע כהה לסל */}
                {isCartOpen && <div className="fixed inset-0 bg-black/70 z-[450] backdrop-blur-md transition-opacity" onClick={() => setIsCartOpen(false)}></div>}
            </div>
        </HelmetProvider>
    );
}