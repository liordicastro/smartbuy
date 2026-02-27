import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { Helmet, HelmetProvider } from 'react-helmet-async';

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

// --- 1. רכיב החלפת שפות (Google Translate) ---
const LanguageSwitcher = () => {
    useEffect(() => {
        if (!document.getElementById('google-translate-styles')) {
            const style = document.createElement('style');
            style.id = 'google-translate-styles';
            style.innerHTML = `.goog-te-banner-frame.skiptranslate { display: none !important; } body { top: 0px !important; } #google_translate_element { display: none !important; }`;
            document.head.appendChild(style);
        }
    }, []);

    const changeLanguage = (langCode) => {
        const selectField = document.querySelector(".goog-te-combo");
        if (selectField) {
            selectField.value = langCode;
            selectField.dispatchEvent(new Event("change"));
        }
    };

    return (
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner relative z-[60]">
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} onClick={() => changeLanguage(l.c)} className="text-xl hover:scale-125 transition-transform" title={l.c}>{l.f}</button>
            ))}
        </div>
    );
};

// --- 2. מודאל מוצר (SEO + Schema + Specs + Reviews) ---
const ProductModal = ({ product, onClose, onAddToCart, onAddReview, brandLogo }) => {
    const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
    const [isExpanded, setIsExpanded] = useState(false);

    const schemaMarkup = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": [product.image],
        "description": product.expertArticleTitle || product.name,
        "brand": { "@type": "Brand", "name": product.brand || "SmartBuy" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "ILS",
            "price": product.sellingPrice,
            "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": product.reviews?.length || "1"
        }
    };

    const paragraphs = product.expertArticleBody?.split('\n').filter(p => p.trim() !== '') || [];

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        onAddReview(product.id, reviewForm);
        setReviewForm({ name: '', text: '', rating: 5 });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <Helmet>
                <title>{product.name} | SmartBuy - קנייה חכמה</title>
                <meta name="description" content={`קנו עכשיו את ${product.name} במחיר SmartBuy מנצח: ₪${product.sellingPrice}.`} />
                <script type="application/ld+json">{JSON.stringify(schemaMarkup)}</script>
            </Helmet>

            <div className="bg-white rounded-[40px] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-3xl font-bold z-50 transition-colors">&times;</button>
                
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden text-right" dir="rtl">
                    <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-200 overflow-y-auto">
                        {brandLogo && <img src={brandLogo} className="h-12 mb-6 object-contain opacity-70" alt="brand" />}
                        <img src={product.image} className="max-h-64 object-contain mb-6 hover:scale-105 transition-transform duration-500" alt={product.name} />
                        <h2 className="text-2xl font-black text-[#1e3a8a] mb-6 text-center leading-tight">{product.name}</h2>
                        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-auto text-center">
                            <div className="text-5xl font-black text-[#1e3a8a] mb-6">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-5 rounded-2xl text-xl shadow-lg active:scale-95 transition-all">הוספה לסל המאובטח</button>
                        </div>
                    </div>

                    <div className="md:col-span-3 p-8 bg-white overflow-y-auto custom-scrollbar">
                        {product.expertArticleTitle && (
                            <section className="mb-10 text-right">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-3 py-1.5 rounded-lg font-black text-xs mb-3 border border-blue-100"><i className="fa-solid fa-medal text-[#FFD814]"></i> סקירת מומחי SmartBuy</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight">{product.expertArticleTitle}</h3>
                                <div className={`relative overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[3000px]' : 'max-h-40'}`}>
                                    <div className="text-gray-600 leading-relaxed text-sm space-y-4">
                                        {paragraphs.map((p, idx) => <p key={idx}>{p}</p>)}
                                    </div>
                                    {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>}
                                </div>
                                <button onClick={() => setIsExpanded(!isExpanded)} className="mt-4 text-[#1e3a8a] font-black text-sm hover:underline">{isExpanded ? 'סגור סקירה' : 'קרא עוד על המוצר...'}</button>
                            </section>
                        )}

                        {product.specs && (
                            <section className="mb-10 bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner text-right">
                                <h4 className="font-black text-[#1e3a8a] mb-4 flex items-center gap-2"><i className="fa-solid fa-list-check"></i> מפרט טכני</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border text-xs font-bold text-gray-700">מידות: {product.specs.dimensions || 'לפי יצרן'}</div>
                                    <div className="bg-white p-3 rounded-xl border text-xs font-bold text-gray-700">צבע: {product.specs.color || 'סטנדרט'}</div>
                                </div>
                                {product.specs.key_features && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {product.specs.key_features.map((f, i) => (
                                            <span key={i} className="bg-blue-50 text-[#1e3a8a] text-[10px] px-2 py-1 rounded-md border border-blue-100 font-black tracking-tight">{f}</span>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                        
                        <section className="pt-8 border-t-2 border-dashed border-gray-100 text-right">
                            <h4 className="font-black text-[#1e3a8a] text-xl mb-6">ביקורות גולשים</h4>
                            <div className="space-y-4 mb-8">
                                {product.reviews && product.reviews.length > 0 ? (
                                    product.reviews.map((rev, i) => (
                                        <div key={i} className="bg-gray-50 p-4 rounded-xl border">
                                            <div className="flex justify-between text-xs mb-1 font-black text-[#1e3a8a]"><span>{rev.name}</span><span className="text-[#FFD814]">★ {rev.rating}</span></div>
                                            <p className="text-gray-600 text-sm italic">"{rev.text}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-sm font-bold text-center py-4 italic">תהיה הראשון לכתוב ביקורת על המוצר!</p>
                                )}
                            </div>
                            <form onSubmit={handleReviewSubmit} className="bg-blue-50 p-6 rounded-[30px] border-2 border-dashed border-blue-200">
                                <h5 className="font-bold text-[#1e3a8a] mb-4">כתוב חוות דעת:</h5>
                                <input required placeholder="שם מלא" className="w-full p-3 rounded-xl border mb-3 text-sm outline-none focus:ring-2 ring-[#FFD814]" value={reviewForm.name} onChange={e=>setReviewForm({...reviewForm, name: e.target.value})} />
                                <div className="flex gap-4 mb-3">
                                    <select className="flex-1 p-3 rounded-xl border text-sm outline-none" value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm, rating: Number(e.target.value)})}>
                                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} כוכבים</option>)}
                                    </select>
                                </div>
                                <textarea required placeholder="איך היה המוצר והשירות?" className="w-full p-3 rounded-xl border mb-4 text-sm outline-none focus:ring-2 ring-[#FFD814]" rows="2" value={reviewForm.text} onChange={e=>setReviewForm({...reviewForm, text: e.target.value})}></textarea>
                                <button type="submit" className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-800 transition-colors">פרסם ביקורת</button>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. מודאל קופה (WhatsApp + Firebase Orders) ---
const CheckoutModal = ({ cart, total, onClose, onClearCart }) => {
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "orders"), { customer: formData, items: cart, totalAmount: total, status: 'חדש', createdAt: serverTimestamp() });
        let waText = `*הזמנה חדשה מ-SmartBuy!*%0A👤 שם: ${formData.name}%0A💰 סה"כ: ₪${total}`;
        window.open(`https://wa.me/972544914204?text=${waText}`, '_blank');
        onClearCart(); onClose();
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[40px] max-w-lg w-full p-10 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 text-3xl font-bold hover:text-red-500 transition-colors">&times;</button>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center underline decoration-[#FFD814] decoration-8 underline-offset-4">השלמת הזמנה מהירה</h2>
                <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase">שם מלא למשלוח</label>
                        <input required placeholder="הכנס שם מלא" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] outline-none font-bold" onChange={e=>setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase">טלפון ליצירת קשר</label>
                        <input required placeholder="מספר נייד" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] outline-none font-bold" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="bg-blue-50 p-6 rounded-[30px] text-center border-2 border-blue-100">
                        <div className="text-xs font-black text-gray-400 mb-1">סה"כ לתשלום סופי</div>
                        <div className="text-5xl font-black text-[#1e3a8a]">₪{total}</div>
                    </div>
                    <button type="submit" className="w-full bg-[#1e3a8a] text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">אישור הזמנה ב-WhatsApp</button>
                </form>
            </div>
        </div>
    );
};

// --- 4. סליידר Hero (מבצעים) ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const heroProducts = useMemo(() => products.slice(0, 5), [products]);
    
    useEffect(() => {
        if (heroProducts.length === 0) return;
        const interval = setInterval(() => setCurrentIndex(prev => (prev + 1) % heroProducts.length), 4500);
        return () => clearInterval(interval);
    }, [heroProducts]);

    if (heroProducts.length === 0) return null;
    
    return (
        <div className="w-full h-40 md:h-64 bg-black relative overflow-hidden flex items-center justify-center border-b-8 border-[#FFD814]">
            <img src={heroProducts[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-110 opacity-30 blur-[1px] transition-opacity duration-1000" alt="Slider" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 to-transparent"></div>
            <div className="absolute z-20 text-center px-4 animate-pulse">
                <h2 className="text-white text-3xl md:text-5xl font-black drop-shadow-2xl mb-2">{heroProducts[currentIndex].name}</h2>
                <div className="text-[#FFD814] text-xl font-black">מבצעי השבוע ב-SmartBuy | ₪{heroProducts[currentIndex].sellingPrice} בלבד</div>
            </div>
        </div>
    );
};

// ==========================================
// אפליקציה ראשית - SmartBuy
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
    const [activeReviewBubble, setActiveReviewBubble] = useState(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    // טעינת נתונים מ-Firebase
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => unsub();
    }, []);

    const brandLogos = {
        "אלקטרה": "https://upload.wikimedia.org/wikipedia/he/thumb/4/4d/Electra_logo.svg/1200px-Electra_logo.svg.png",
        "סאוטר": "https://www.sauter-appliances.co.il/wp-content/themes/sauter/images/logo.png",
        "AEG": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/AEG_logo.svg/2560px-AEG_logo.svg.png",
        "פוגיקום": "https://fujicom.co.il/wp-content/uploads/2018/10/logo.png",
        "סמסונג": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/2560px-Samsung_Logo.svg.png",
        "LG": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/LG_logo_%282015%29.svg/2560px-LG_logo_%282015%29.svg.png",
        "בוש": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/2560px-Bosch-logo.svg.png",
        "תדיראן": "https://upload.wikimedia.org/wikipedia/he/1/1e/Tadiran_Group_Logo.png"
    };

    const categoryMap = { 
        "All": "דף הבית", "Fridges": "מקררים", "Freezers": "מקפיאים", "AC": "מזגנים", 
        "Washing": "כביסה", "Dryers": "מייבשים", "Ovens": "תנורים", "TV": "טלוויזיות", "Surplus": "עודפים🏷️"
    };

    // רשימת מותגים קיימת במלאי
    const availableBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))], [products]);

    // לוגיקת סינון משולבת (חיפוש + מחיר + מותג + קטגוריה)
    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchCat = filter === "All" || p.category === filter;
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchPrice = p.sellingPrice <= maxPrice;
            const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
            return matchCat && matchSearch && matchPrice && matchBrand;
        });
    }, [products, filter, searchQuery, maxPrice, selectedBrands]);

    // קיבוץ לפי קטגוריות עבור דף הבית (רק אם לא מופעל סינון)
    const categorizedGroups = useMemo(() => {
        const groups = {};
        Object.keys(categoryMap).forEach(key => {
            if (key === "All") return;
            const items = products.filter(p => p.category === key);
            if (items.length > 0) groups[key] = items;
        });
        return groups;
    }, [products]);

    const toggleBrand = (brand) => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
    
    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));
    
    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "SMART10") { setDiscount(0.1); alert("קופון SMART10 הופעל (10% הנחה!)"); }
        else { setDiscount(0); alert("קוד קופון לא חוקי"); }
    };

    const handleAddReview = async (pid, rev) => {
        const productRef = doc(db, "products", pid);
        await updateDoc(productRef, { reviews: arrayUnion({ ...rev, date: new Date().toISOString() }) });
        alert("תודה! הביקורת נוספה בהצלחה.");
    };

    return (
        <HelmetProvider>
            <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden" dir="rtl">
                
                {/* מודאלים */}
                {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={handleAddReview} brandLogo={brandLogos[selectedProduct.brand]} />}
                {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}

                {/* Header הראשי */}
                <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814] py-4 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                            <div className="cursor-pointer group" onClick={()=>{setFilter("All"); setSelectedBrands([]); setSearchQuery(""); setMaxPrice(25000);}}>
                                <div className="text-3xl font-black italic text-[#FFD814] group-hover:scale-105 transition-transform">SMARTBUY</div>
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest leading-none mt-1 opacity-80">Premium Electric Store</div>
                            </div>
                            <LanguageSwitcher />
                        </div>
                        
                        <div className="flex-grow max-w-xl w-full relative">
                            <input type="text" placeholder="חפשו דגם או מוצר (מקרר, מכונה...)" className="w-full p-4 pr-12 rounded-2xl text-black focus:ring-4 ring-[#FFD814]/50 outline-none font-bold" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute right-4 top-5 text-gray-400"></i>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-6 py-2 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:scale-105 transition-all">
                                <i className="fa-solid fa-cart-shopping"></i>
                                <span className="border-r border-[#1e3a8a]/20 pr-3">₪{cartTotal}</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* ניווט קטגוריות */}
                <nav className="bg-white border-b sticky top-[140px] md:top-[88px] z-40 overflow-x-auto py-5 px-6 shadow-sm scrollbar-hide">
                    <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max px-4">
                        {Object.keys(categoryMap).map(cat => (
                            <button key={cat} onClick={() => {setFilter(cat); setSelectedBrands([]); setSearchQuery("");}} className={`flex flex-col items-center min-w-[110px] p-4 rounded-[25px] transition-all border-2 active:scale-95 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 scale-105 shadow-md" : "border-transparent bg-white hover:bg-gray-50 opacity-70"}`}>
                                <span className={`text-sm font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <HeroSlider products={products} />

                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 p-4 md:p-8 mt-4">
                    
                    {/* Sidebar: מערכת סינון */}
                    <aside className={`lg:w-72 w-full space-y-8 lg:block ${isFilterMenuOpen ? 'block' : 'hidden'}`}>
                        <div className="bg-white p-8 rounded-[40px] shadow-xl border sticky top-40">
                            <h3 className="text-xl font-black text-[#1e3a8a] mb-8 border-b pb-4 flex items-center gap-2">
                                <i className="fa-solid fa-sliders text-[#FFD814]"></i> סינון מתקדם
                            </h3>
                            
                            <div className="mb-10">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">מחיר עד ₪{maxPrice}</label>
                                <input type="range" min="0" max="25000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#1e3a8a] h-2 bg-gray-100 rounded-lg cursor-pointer" />
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2"><span>₪0</span><span>₪25,000</span></div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">סינון לפי מותג</label>
                                <div className="space-y-3">
                                    {availableBrands.map(brand => (
                                        <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className="w-5 h-5 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#FFD814]" />
                                            <span className={`text-sm font-bold transition-colors ${selectedBrands.includes(brand) ? 'text-[#1e3a8a]' : 'text-gray-500 group-hover:text-black'}`}>{brand}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button onClick={() => {setSelectedBrands([]); setMaxPrice(25000); setSearchQuery("");}} className="w-full mt-10 text-xs font-black text-red-500 hover:underline text-center">נקה את כל המסננים</button>
                        </div>
                    </aside>

                    {/* כפתור סינון למובייל */}
                    <button onClick={()=>setIsFilterMenuOpen(!isFilterMenuOpen)} className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-md font-black text-[#1e3a8a] mb-4 border border-blue-100 flex items-center justify-center gap-2 active:bg-gray-50">
                        <i className="fa-solid fa-filter text-[#FFD814]"></i> {isFilterMenuOpen ? 'סגור תפריט סינון' : 'סינון ומותגים'}
                    </button>

                    {/* אזור המוצרים המרכזי */}
                    <main className="flex-grow space-y-20">
                        
                        {/* תצוגת דף בית: שורות נגללות (רק אם אין סינון פעיל) */}
                        {filter === "All" && !searchQuery && selectedBrands.length === 0 ? (
                            Object.keys(categorizedGroups).map(catKey => (
                                <section key={catKey} className="animate-fade-in">
                                    <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-4">
                                        <div className="w-10 h-10 bg-[#1e3a8a] text-white rounded-xl flex items-center justify-center shadow-lg rotate-3"><i className="fa-solid fa-bolt-lightning text-xs"></i></div>
                                        <h2 className="text-3xl font-black text-[#1e3a8a]">{categoryMap[catKey]} נבחרים</h2>
                                        <button onClick={()=>setFilter(catKey)} className="mr-auto text-xs font-black text-blue-500 hover:underline px-4 py-2 bg-blue-50 rounded-full">צפה בהכל ←</button>
                                    </div>
                                    <div className="flex overflow-x-auto gap-6 pb-10 hide-scroll snap-x scroll-smooth">
                                        {categorizedGroups[catKey].map(p => (
                                            <div key={p.id} className="min-w-[280px] md:min-w-[320px] snap-start bg-white p-8 rounded-[45px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                                <div className="absolute top-8 right-8 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                    {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                                </div>
                                                
                                                <div className="absolute top-8 left-8 z-20">
                                                    <button onMouseEnter={() => setActiveReviewBubble(p.id)} onMouseLeave={() => setActiveReviewBubble(null)} className="w-10 h-10 rounded-full bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-md border border-blue-100 hover:scale-110 transition-transform"><i className="fa-solid fa-star"></i></button>
                                                    {activeReviewBubble === p.id && (
                                                        <div className="absolute top-12 left-0 w-56 bg-[#1e3a8a] text-white p-4 rounded-2xl shadow-2xl z-50 text-[10px] border-2 border-[#FFD814] animate-bounce-in">
                                                            <div className="text-[#FFD814] mb-1 font-black">5.0 ★ מומלץ</div>
                                                            <p className="italic leading-relaxed">"{p.reviews?.[0]?.text || "מוצר מעולה! שירות מדהים של צוות SmartBuy."}"</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="h-44 flex items-center justify-center mb-8 mt-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                    <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                                </div>
                                                
                                                <h3 className="font-black text-gray-800 text-sm mb-4 h-10 line-clamp-2 leading-tight hover:text-[#1e3a8a] cursor-pointer" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-3xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                                        <span className="text-[10px] text-gray-400 line-through font-bold">₪{Math.round(p.sellingPrice * 1.15)}</span>
                                                    </div>
                                                    <div className="bg-green-50 text-green-600 text-[10px] font-black px-2 py-1 rounded-md border border-green-100">במלאי</div>
                                                </div>
                                                <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-[20px] font-black hover:bg-[#f3ce12] transition-all shadow-lg text-lg active:scale-95">הוספה לסל המאובטח</button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        ) : (
                            /* תצוגת קטגוריה / חיפוש / סינון: פריסת GRID רחבה */
                            <section className="animate-fade-in">
                                <div className="flex items-center justify-between mb-10 bg-white p-6 rounded-3xl border shadow-sm">
                                     <h2 className="text-2xl font-black text-[#1e3a8a]">{filter === "All" ? "תוצאות חיפוש" : categoryMap[filter]}</h2>
                                     <span className="bg-[#1e3a8a] text-white px-4 py-1 rounded-full text-xs font-black">{filtered.length} פריטים נמצאו</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {filtered.map(p => (
                                        <div key={p.id} className="bg-white p-8 rounded-[45px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between hover:-translate-y-2">
                                            <div className="absolute top-8 right-8 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                            </div>
                                            <div className="h-52 flex items-center justify-center mb-6 mt-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                            </div>
                                            <h3 className="font-black text-gray-800 text-sm mb-6 h-10 line-clamp-2 text-center leading-tight hover:text-[#1e3a8a] cursor-pointer" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                            <div className="text-4xl font-black text-[#1e3a8a] mb-8 text-center tracking-tighter">₪{p.sellingPrice}</div>
                                            <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-5 rounded-[22px] font-black hover:bg-[#f3ce12] transition-all shadow-xl active:scale-95">הוספה לסל</button>
                                        </div>
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <div className="text-center py-40 bg-white rounded-[50px] border-2 border-dashed border-gray-200">
                                        <i className="fa-solid fa-magnifying-glass text-6xl text-gray-200 mb-4"></i>
                                        <p className="text-gray-400 font-black text-xl">לא מצאנו מוצרים שתואמים בדיוק לסינון שלך...</p>
                                        <button onClick={()=>{setFilter("All"); setSelectedBrands([]); setMaxPrice(25000);}} className="mt-6 text-[#1e3a8a] font-black underline">אפס הכל וחזור להתחלה</button>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>

                {/* Footer המקצועי */}
                <footer className="bg-[#1e3a8a] text-white py-24 px-10 border-t-[12px] border-[#FFD814] mt-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
                        <div>
                            <div className="text-5xl font-black italic text-[#FFD814] mb-8 uppercase leading-none">SMARTBUY</div>
                            <p className="font-bold opacity-80 leading-loose">חנות מוצרי החשמל המובילה בישראל. שירות VIP ומחירים ללא תחרות לכל לקוח.</p>
                        </div>
                        <div>
                            <h4 className="font-black text-xl mb-8 border-b-4 border-[#FFD814] pb-3 inline-block">שירות לקוחות</h4>
                            <ul className="space-y-4 font-bold text-lg">
                                <li className="hover:text-[#FFD814] cursor-pointer"><i className="fa-solid fa-phone text-[#FFD814] ml-2"></i> 054-4914204</li>
                                <li><i className="fa-solid fa-clock text-[#FFD814] ml-2"></i> א-ה: 09:00-19:00</li>
                                <li className="text-sm opacity-60">info@smartbuy.co.il</li>
                            </ul>
                        </div>
                        <div className="md:col-span-2 text-left">
                            <h4 className="font-black text-xl mb-8 border-b-4 border-[#FFD814] pb-3 inline-block text-right">קנייה מאובטחת SSL</h4>
                            <div className="flex gap-6 justify-end text-6xl mb-8 text-white">
                                <i className="fa-brands fa-google-pay"></i>
                                <i className="fa-brands fa-apple-pay"></i>
                                <i className="fa-brands fa-cc-visa"></i>
                                <i className="fa-brands fa-cc-mastercard"></i>
                            </div>
                            <p className="text-[10px] font-black opacity-60 uppercase tracking-[4px]">SECURE 256-BIT ENCRYPTED CHECKOUT</p>
                        </div>
                    </div>
                </footer>

                {/* מגירת סל הקניות (Drawer) */}
                <div className={`fixed top-0 right-0 h-full w-80 md:w-[450px] bg-white shadow-2xl z-[500] transition-transform duration-700 border-l-[10px] border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-8 bg-[#1e3a8a] text-white flex justify-between items-center shadow-xl">
                        <div className="flex items-center gap-3"><i className="fa-solid fa-cart-shopping text-2xl text-[#FFD814]"></i><span className="font-black text-3xl uppercase">הסל שלי</span></div>
                        <button onClick={()=>setIsCartOpen(false)} className="text-4xl hover:text-[#FFD814] font-bold transition-colors">&times;</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto h-[55vh] space-y-6 bg-gray-50">
                        {cart.length === 0 ? (
                            <div className="text-center py-32 opacity-20">
                                <i className="fa-solid fa-cart-plus text-8xl mb-4"></i>
                                <p className="font-black text-xl">הסל מחכה להתמלא...</p>
                            </div>
                        ) : (
                            cart.map((item, i) => (
                                <div key={i} className="flex gap-5 bg-white p-5 rounded-[30px] border-2 border-gray-100 relative shadow-sm hover:border-[#1e3a8a] transition-all group">
                                    <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg font-bold group-hover:scale-110 transition-transform">✕</button>
                                    <img src={item.image} className="w-20 h-20 object-contain bg-gray-50 rounded-xl p-2" alt={item.name} />
                                    <div className="flex flex-col justify-center flex-1 text-right">
                                        <span className="text-xs font-black line-clamp-2 mb-1 text-gray-700">{item.name}</span>
                                        <b className="text-xl font-black text-[#1e3a8a]">₪{item.sellingPrice}</b>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-8 border-t-4 bg-white absolute bottom-0 w-full shadow-[0_-15px_30px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-2 mb-6">
                            <input type="text" placeholder="קוד קופון (SMART10)" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-[#1e3a8a] font-bold text-sm" />
                            <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-5 rounded-xl font-black hover:bg-blue-800 transition-colors">הפעל</button>
                        </div>
                        
                        {discount > 0 && <div className="bg-green-100 text-green-700 text-xs font-black p-2 rounded-lg mb-4 text-center">🎉 קופון הופעל בהצלחה!</div>}
                        
                        <div className="flex justify-between items-center mb-8 px-2">
                            <span className="font-black text-gray-500 uppercase text-xs tracking-widest">Total Amount</span>
                            <span className="text-5xl font-black text-[#1e3a8a] tracking-tighter">₪{cartTotal}</span>
                        </div>
                        
                        <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-6 rounded-[25px] font-black text-2xl shadow-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3">
                            מעבר לקופה מאובטחת <i className="fa-solid fa-lock text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* רקע כהה כשהסל פתוח */}
                {isCartOpen && <div className="fixed inset-0 bg-black/60 z-[450] backdrop-blur-md transition-opacity" onClick={() => setIsCartOpen(false)}></div>}
            </div>
        </HelmetProvider>
    );
}