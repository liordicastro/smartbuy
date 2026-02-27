import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { Helmet, HelmetProvider } from 'react-helmet-async';

// --- Firebase Configuration ---
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
    <div className="fixed inset-0 bg-black/90 z-[700] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onClose}>
        <div className="bg-white rounded-[50px] max-w-6xl w-full p-10 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-[#1e3a8a]" onClick={e=>e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-8 left-8 text-4xl font-bold hover:rotate-90 transition-transform">&times;</button>
            <h2 className="text-4xl font-black text-[#1e3a8a] mb-12 text-center underline decoration-[#FFD814] decoration-8">השוואת דגמים מקצועית</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[65vh] px-4" dir="rtl">
                {list.map(p => (
                    <div key={p.id} className="border-2 border-gray-100 rounded-[40px] p-8 bg-gray-50 flex flex-col relative group">
                        <button onClick={()=>onRemove(p.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-10 h-10 rounded-full shadow-xl font-bold group-hover:scale-110 transition-transform">✕</button>
                        <img src={p.image} className="h-48 object-contain mb-8 bg-white rounded-3xl p-4 shadow-sm" alt={p.name} />
                        <h4 className="font-black text-[#1e3a8a] text-lg mb-6 h-14 line-clamp-2">{p.name}</h4>
                        <div className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between bg-white p-3 rounded-xl shadow-inner text-[#1e3a8a]"><span>מחיר SmartBuy:</span> <span>₪{p.sellingPrice}</span></div>
                            <div className="flex justify-between bg-white p-3 rounded-xl shadow-inner text-gray-600"><span>מותג:</span> <span>{p.brand}</span></div>
                            <div className="flex flex-col gap-2 bg-white p-4 rounded-xl shadow-inner">
                                <span className="text-gray-400 text-xs uppercase tracking-widest">מפרט טכני</span>
                                <div className="text-gray-700 text-xs leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                                    {p.specs?.dimensions && <p>• מידות: {p.specs.dimensions}</p>}
                                    {p.specs?.key_features?.map((f, i) => <p key={i}>• {f}</p>)}
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

// --- 2. מודאל מוצר מלא (SEO + סקירות + מפרט) ---
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

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        onAddReview(product.id, reviewForm);
        setReviewForm({ name: '', text: '', rating: 5 });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md" onClick={onClose}>
            <Helmet>
                <title>{product.name} | SmartBuy</title>
                <meta name="description" content={`קנו עכשיו את ${product.name} במחיר SmartBuy מנצח: ₪${product.sellingPrice}.`} />
                <script type="application/ld+json">{JSON.stringify(schemaMarkup)}</script>
            </Helmet>
            <div className="bg-white rounded-[50px] max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 bg-white rounded-full w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-4xl font-bold z-50 transition-all hover:rotate-90">&times;</button>
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden text-right" dir="rtl">
                    <div className="md:col-span-2 p-10 bg-gray-50 flex flex-col items-center justify-center border-l shadow-inner overflow-y-auto">
                        {brandLogo && <img src={brandLogo} className="h-14 mb-8 object-contain opacity-80" alt="brand" />}
                        <img src={product.image} className="max-h-72 object-contain mb-8 hover:scale-110 transition-transform duration-700" alt={product.name} />
                        <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center leading-tight">{product.name}</h2>
                        <div className="w-full bg-white p-8 rounded-[40px] shadow-sm text-center border">
                            <div className="text-xs font-black text-gray-300 uppercase mb-2">מחיר השוק: ₪{Math.round(product.sellingPrice * 1.25)}</div>
                            <div className="text-6xl font-black text-[#1e3a8a] mb-8">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-6 rounded-[25px] text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">הוספה לסל המאובטח</button>
                        </div>
                    </div>
                    <div className="md:col-span-3 p-10 bg-white overflow-y-auto custom-scrollbar">
                        <section className="mb-12">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-4 py-2 rounded-xl font-black text-xs mb-4 border border-blue-100 uppercase tracking-widest"><i className="fa-solid fa-award text-[#FFD814]"></i> סקירת מומחי SmartBuy</div>
                            <h3 className="text-3xl font-black text-gray-900 mb-6">{product.expertArticleTitle || 'פרטי מוצר מלאים'}</h3>
                            <div className={`relative overflow-hidden transition-all duration-700 ${isExpanded ? 'max-h-[3000px]' : 'max-h-48'}`}>
                                <p className="text-gray-600 leading-loose text-base font-medium whitespace-pre-wrap">{product.expertArticleBody}</p>
                                {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>}
                            </div>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-6 text-[#1e3a8a] font-black text-sm border-b-2 border-[#1e3a8a] pb-1 hover:text-blue-800">{isExpanded ? 'סגור סקירה' : 'להמשך קריאה...'}</button>
                        </section>
                        {product.specs && (
                            <section className="mb-12 bg-gray-50 rounded-[40px] p-8 border shadow-inner">
                                <h4 className="font-black text-[#1e3a8a] mb-6 flex items-center gap-2 text-xl underline decoration-[#FFD814]">מפרט טכני מלא</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-white p-4 rounded-2xl border font-bold text-sm shadow-sm flex flex-col"><span className="text-xs text-gray-400 mb-1">מידות:</span> {product.specs.dimensions || 'לפי יצרן'}</div>
                                    <div className="bg-white p-4 rounded-2xl border font-bold text-sm shadow-sm flex flex-col"><span className="text-xs text-gray-400 mb-1">צבע:</span> {product.specs.color || 'סטנדרט'}</div>
                                </div>
                            </section>
                        )}
                        <section className="pt-8 border-t-2 border-dashed">
                            <h4 className="font-black text-[#1e3a8a] text-2xl mb-8">מה הלקוחות אומרים?</h4>
                            <div className="space-y-6">
                                {product.reviews?.map((rev, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[30px] border shadow-sm relative group">
                                        <div className="flex justify-between text-xs mb-2 font-black text-[#1e3a8a]"><span>{rev.name}</span><div className="text-[#FFD814]">{[...Array(rev.rating)].map((_,s)=><i key={s} className="fa-solid fa-star"></i>)}</div></div>
                                        <p className="text-gray-600 text-sm italic">"{rev.text}"</p>
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
                <button onClick={onClose} className="absolute top-6 left-6 text-3xl font-bold hover:text-red-500 transition-colors">&times;</button>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center px-4">השלמת הזמנה מהירה</h2>
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

// --- 4. סליידר Hero ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const heroList = useMemo(() => products.slice(0, 5), [products]);
    
    useEffect(() => {
        if (heroList.length === 0) return;
        const itv = setInterval(() => setCurrentIndex(p => (p + 1) % heroList.length), 4500);
        return () => clearInterval(itv);
    }, [heroList]);

    if (heroList.length === 0) return null;
    
    return (
        <div className="w-full h-48 md:h-72 bg-black relative overflow-hidden flex items-center justify-center border-b-[12px] border-[#FFD814] shadow-2xl">
            <img src={heroList[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-110 opacity-30 blur-[2px] transition-all duration-1000" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a] to-transparent"></div>
            <div className="absolute z-20 text-center px-4 animate-fade-in">
                <div className="bg-[#FFD814] text-[#1e3a8a] px-4 py-1 rounded-full text-[10px] font-black uppercase mb-4 shadow-lg inline-block">Flash Deal</div>
                <h2 className="text-white text-3xl md:text-6xl font-black drop-shadow-2xl mb-2 tracking-tighter">{heroList[currentIndex].name}</h2>
                <div className="text-[#FFD814] text-2xl font-black italic">המחיר הטוב ביותר בישראל לחברי מועדון 👑</div>
            </div>
        </div>
    );
};

// --- 5. רכיב החלפת שפות ---
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
    const [compareList, setCompareList] = useState([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    
    // סטייטים חדשים עבור הקופון (שתוקנו!)
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

    const availableBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))], [products]);

    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchCat = filter === "All" || p.category === filter;
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchPrice = p.sellingPrice <= maxPrice;
            const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
            return matchCat && matchSearch && matchPrice && matchBrand;
        });
    }, [products, filter, searchQuery, maxPrice, selectedBrands]);

    const categorizedGroups = useMemo(() => {
        const groups = {};
        Object.keys(categoryMap).forEach(key => {
            if (key === "All") return;
            const items = products.filter(p => p.category === key);
            if (items.length > 0) groups[key] = items;
        });
        return groups;
    }, [products]);

    const addToCompare = (p) => {
        if (compareList.length >= 3) { alert("ניתן להשוות עד 3 דגמים בבת אחת."); return; }
        if (!compareList.find(i=>i.id===p.id)) setCompareList([...compareList, p]);
    };

    const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
    
    // חישוב הסל (כולל הנחה)
    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));

    // הפונקציה החסרה שהוחזרה!
    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "SMART10") {
            setDiscount(0.1);
            alert("קופון SMART10 הופעל בהצלחה (10% הנחה!)");
        } else {
            setDiscount(0);
            alert("קוד קופון לא חוקי");
        }
    };

    const handleAddReview = async (pid, rev) => {
        await updateDoc(doc(db, "products", pid), { reviews: arrayUnion({ ...rev, date: new Date().toISOString() }) });
        alert("תודה! הביקורת נוספה בהצלחה.");
    };

    return (
        <HelmetProvider>
            <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden" dir="rtl">
                
                {/* Modals */}
                {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={handleAddReview} brandLogo={brandLogos[selectedProduct.brand]} />}
                {isCompareOpen && <ComparisonModal list={compareList} onClose={()=>setIsCompareOpen(false)} onRemove={(id)=>setCompareList(compareList.filter(i=>i.id!==id))} />}
                {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}

                {/* Header */}
                <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814] py-5 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-8 w-full md:w-auto justify-between">
                            <div className="cursor-pointer group" onClick={()=>{setFilter("All"); setSearchQuery(""); setSelectedBrands([]); setMaxPrice(25000);}}>
                                <div className="text-4xl font-black italic text-[#FFD814] group-hover:scale-105 transition-transform">SMARTBUY</div>
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest opacity-80 mt-1">Professional Electric Store</div>
                            </div>
                            <LanguageSwitcher />
                        </div>
                        <div className="flex-grow max-w-xl w-full relative">
                            <input type="text" placeholder="מה תרצו לקנות היום? חפשו דגם או מוצר..." className="w-full p-4 pr-12 rounded-[25px] text-black focus:ring-8 ring-[#FFD814]/30 outline-none font-bold shadow-inner" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute right-4 top-5 text-gray-300"></i>
                        </div>
                        <div className="flex items-center gap-6">
                            {user ? <div className="text-xs font-bold text-center">שלום, <br/> {user.displayName?.split(' ')[0]}</div> : <button onClick={handleLogin} className="text-xs font-black bg-[#FFD814] text-[#1e3a8a] px-6 py-2.5 rounded-full shadow-lg hover:scale-105 transition-all uppercase">Club Join 👑</button>}
                            <button onClick={()=>setIsCartOpen(true)} className="bg-white/10 text-white px-6 py-3 rounded-full font-black flex items-center gap-3 border border-white/20 hover:bg-[#FFD814] hover:text-[#1e3a8a] transition-all shadow-xl">
                                <i className="fa-solid fa-cart-shopping text-xl"></i> ₪{cartTotal}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Navbar (Categories with Dynamic Images) */}
                <nav className="bg-white border-b sticky top-[152px] md:top-[98px] z-40 overflow-x-auto py-8 px-6 shadow-md scrollbar-hide">
                    <div className="max-w-7xl mx-auto flex gap-8 md:justify-center min-w-max px-4">
                        {Object.keys(categoryMap).map(cat => {
                            const sampleImg = products.find(p => p.category === cat)?.image;
                            return (
                                <button key={cat} onClick={() => {setFilter(cat); setSelectedBrands([]); setSearchQuery("");}} className={`flex flex-col items-center min-w-[120px] p-5 rounded-[40px] transition-all border-2 active:scale-90 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 scale-110 shadow-2xl z-10" : "border-transparent bg-white hover:bg-gray-50 opacity-80 shadow-sm"}`}>
                                    {sampleImg ? <img src={sampleImg} className="w-12 h-12 object-contain mb-3 rounded-full p-2 bg-gray-100 shadow-inner" alt={cat} /> : <i className="fa-solid fa-layer-group text-2xl mb-3 opacity-20"></i>}
                                    <span className={`text-sm font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-500"}`}>{categoryMap[cat]}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Compare Float Button */}
                {compareList.length > 0 && (
                    <button onClick={()=>setIsCompareOpen(true)} className="fixed bottom-32 right-8 bg-[#1e3a8a] text-white px-10 py-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[450] animate-bounce-in flex items-center gap-5 border-4 border-[#FFD814] font-black text-xl hover:scale-110 transition-all">
                        <i className="fa-solid fa-code-compare text-3xl"></i>
                        השווה דגמים ({compareList.length})
                    </button>
                )}

                <HeroSlider products={products} />

                {/* Main Content Layout */}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 p-4 md:p-10 mt-6">
                    
                    {/* Sidebar */}
                    <aside className={`lg:w-80 w-full space-y-10 lg:block ${isFilterMenuOpen ? 'block' : 'hidden'}`}>
                        <div className="bg-white p-10 rounded-[50px] shadow-2xl border sticky top-44 z-10">
                            <h3 className="text-2xl font-black text-[#1e3a8a] mb-10 border-b pb-4 flex items-center gap-3">
                                <i className="fa-solid fa-sliders text-[#FFD814]"></i> סינון מהיר
                            </h3>
                            <div className="mb-12">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">מחיר מקסימלי: ₪{maxPrice}</label>
                                <input type="range" min="0" max="25000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#1e3a8a] h-2 bg-gray-100 rounded-lg cursor-pointer" />
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-tighter"><span>₪0</span><span>₪25,000</span></div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">בחירת מותגים</label>
                                {availableBrands.map(b => (
                                    <label key={b} className="flex items-center gap-4 cursor-pointer group">
                                        <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} className="w-6 h-6 rounded-lg border-gray-300 text-[#1e3a8a] focus:ring-[#FFD814]" />
                                        <span className={`text-sm font-bold transition-all ${selectedBrands.includes(b) ? 'text-[#1e3a8a] scale-105' : 'text-gray-500 group-hover:text-black'}`}>{b}</span>
                                    </label>
                                ))}
                            </div>
                            <button onClick={() => {setSelectedBrands([]); setMaxPrice(25000); setSearchQuery("");}} className="w-full mt-12 text-xs font-black text-red-500 hover:underline text-center uppercase tracking-widest">Clear Filters</button>
                        </div>

                        {/* Expert Article Widget */}
                        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] p-10 rounded-[50px] text-white shadow-2xl border-b-[15px] border-[#FFD814] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                            <h4 className="text-2xl font-black text-[#FFD814] mb-6 leading-tight relative">המדריך המקצועי <br/> של SmartBuy</h4>
                            <p className="text-xs leading-loose font-bold opacity-80 mb-10 italic relative">"האם ידעתם? מקרר עם מדחס אינוורטר לא רק שקט יותר, אלא גם חוסך עד 30% בצריכת החשמל הביתית. המומחים שלנו ממליצים לבדוק את..."</p>
                            <button className="w-full bg-[#FFD814] text-[#1e3a8a] p-4 rounded-2xl text-xs font-black hover:bg-white transition-all uppercase tracking-widest shadow-xl relative z-10">למאמרי המומחים</button>
                        </div>
                    </aside>

                    <button onClick={()=>setIsFilterMenuOpen(!isFilterMenuOpen)} className="lg:hidden w-full bg-white p-4 rounded-3xl shadow-md font-black text-[#1e3a8a] mb-4 border border-blue-100 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-filter text-[#FFD814]"></i> {isFilterMenuOpen ? 'סגור תפריט סינון' : 'סינון ומותגים'}
                    </button>

                    {/* Main Products Area */}
                    <main className="flex-grow space-y-24">
                        {filter === "All" && !searchQuery && selectedBrands.length === 0 ? (
                            /* Home Page: Rows */
                            Object.keys(categorizedGroups).map(catKey => (
                                <section key={catKey} className="animate-fade-in">
                                    <div className="flex items-center gap-5 mb-10 border-b-4 border-gray-100 pb-8">
                                        <div className="w-14 h-14 bg-[#1e3a8a] text-[#FFD814] rounded-2xl flex items-center justify-center shadow-2xl rotate-3"><i className="fa-solid fa-crown text-2xl"></i></div>
                                        <div>
                                            <h2 className="text-4xl font-black text-[#1e3a8a] leading-none mb-2 uppercase tracking-tighter">{categoryMap[catKey]} מומלצים</h2>
                                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">SmartBuy Best Sellers</span>
                                        </div>
                                        <button onClick={()=>setFilter(catKey)} className="mr-auto text-sm font-black text-[#1e3a8a] bg-[#FFD814]/10 px-8 py-3 rounded-full hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm border border-[#1e3a8a]/10">צפה בהכל ←</button>
                                    </div>
                                    <div className="flex overflow-x-auto gap-10 pb-12 hide-scroll snap-x scroll-smooth px-2">
                                        {categorizedGroups[catKey].map(p => (
                                            <div key={p.id} className="min-w-[320px] md:min-w-[360px] snap-start bg-white p-10 rounded-[55px] shadow-lg border border-gray-100 relative group hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all duration-700 flex flex-col justify-between hover:-translate-y-3">
                                                <div className="absolute top-10 right-10 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                    {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-5 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                                </div>
                                                <button onClick={()=>addToCompare(p)} className={`absolute top-10 left-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all z-20 ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-gray-50 text-gray-400 hover:bg-[#1e3a8a] hover:text-white'}`}>
                                                    <i className="fa-solid fa-code-compare text-xl"></i>
                                                </button>
                                                <div className="h-56 flex items-center justify-center mb-10 mt-8 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                    <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
                                                </div>
                                                <h3 className="font-black text-gray-800 text-lg mb-6 h-12 line-clamp-2 leading-tight cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                                <div className="flex items-center justify-between mb-10">
                                                    <div className="flex flex-col"><span className="text-4xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span></div>
                                                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-4 py-2 rounded-xl border border-green-200 uppercase tracking-widest">In Stock</div>
                                                </div>
                                                <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-6 rounded-[25px] font-black hover:bg-[#f3ce12] transition-all shadow-xl active:scale-95 text-xl uppercase tracking-tighter">Add to Cart</button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        ) : (
                            /* Category / Filter / Search View: Grid */
                            <section className="animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 bg-white p-10 rounded-[50px] border-b-[10px] border-[#1e3a8a] shadow-xl">
                                     <div>
                                        <h2 className="text-4xl font-black text-[#1e3a8a] uppercase tracking-tighter">{filter === "All" ? "תוצאות חיפוש" : categoryMap[filter]}</h2>
                                        <p className="text-gray-400 text-xs font-bold mt-2 tracking-[4px] uppercase opacity-60">SmartBuy Premium Inventory</p>
                                     </div>
                                     <span className="bg-[#FFD814] text-[#1e3a8a] px-8 py-3 rounded-full text-sm font-black shadow-lg mt-4 md:mt-0">{filtered.length} פריטים נמצאו</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-12">
                                    {filtered.map(p => (
                                        <div key={p.id} className="bg-white p-10 rounded-[60px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-700 flex flex-col justify-between hover:-translate-y-4">
                                            <div className="absolute top-10 right-10 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-5 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                            </div>
                                            <button onClick={()=>addToCompare(p)} className={`absolute top-10 left-10 w-12 h-12 rounded-full flex items-center justify-center border shadow-sm transition-all z-20 ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-gray-50 text-gray-400 hover:bg-[#1e3a8a] hover:text-white'}`}>
                                                <i className="fa-solid fa-code-compare text-lg"></i>
                                            </button>
                                            <div className="h-64 flex items-center justify-center mb-8 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-1000 shadow-2xl rounded-2xl" alt={p.name} />
                                            </div>
                                            <h3 className="font-black text-gray-800 text-base mb-8 h-10 line-clamp-2 text-center cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                            <div className="text-5xl font-black text-[#1e3a8a] mb-12 text-center tracking-tighter">₪{p.sellingPrice}</div>
                                            <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#1e3a8a] text-white py-6 rounded-[25px] font-black hover:bg-blue-800 transition-all shadow-2xl active:scale-95 uppercase text-lg tracking-widest">Secure Order</button>
                                        </div>
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <div className="text-center py-48 bg-white rounded-[70px] border-4 border-dashed border-gray-100 flex flex-col items-center">
                                        <i className="fa-solid fa-magnifying-glass-chart text-[120px] text-gray-100 mb-10 animate-pulse"></i>
                                        <p className="text-gray-400 font-black text-3xl mb-10 tracking-tighter">לא מצאנו מוצרים שתואמים למסננים שלכם...</p>
                                        <button onClick={()=>{setFilter("All"); setSelectedBrands([]); setMaxPrice(25000); setSearchQuery("");}} className="bg-[#1e3a8a] text-white px-12 py-5 rounded-3xl font-black hover:scale-110 transition-all shadow-2xl text-xl">חזרה לכל המוצרים</button>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>

                {/* Footer */}
                <footer className="bg-[#1e3a8a] text-white py-32 px-10 border-t-[16px] border-[#FFD814] mt-32 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-24 relative z-10">
                        <div className="space-y-10">
                            <div className="text-7xl font-black italic text-[#FFD814] tracking-tighter">SMARTBUY</div>
                            <p className="font-bold opacity-80 leading-loose text-lg">חנות מוצרי החשמל המובילה בישראל. אנחנו מבטיחים לכם את המחיר הטוב ביותר עם שירות VIP מנצח.</p>
                        </div>
                        <div>
                            <h4 className="font-black text-2xl mb-12 border-b-8 border-[#FFD814] pb-4 inline-block tracking-tighter uppercase">שירות לקוחות</h4>
                            <ul className="space-y-8 font-bold text-xl">
                                <li className="flex items-center gap-5 hover:text-[#FFD814] transition-colors cursor-pointer"><i className="fa-solid fa-phone text-[#FFD814] text-3xl"></i> 054-4914204</li>
                                <li className="flex items-center gap-5"><i className="fa-solid fa-envelope text-[#FFD814] text-3xl"></i> info@smartbuy.co.il</li>
                            </ul>
                        </div>
                        <div className="md:col-span-2 text-center md:text-left">
                            <h4 className="font-black text-2xl mb-12 border-b-8 border-[#FFD814] pb-4 inline-block uppercase">Payment Methods</h4>
                            <div className="flex gap-8 justify-center md:justify-end text-7xl mb-12 text-white/90">
                                <i className="fa-brands fa-google-pay"></i>
                                <i className="fa-brands fa-apple-pay"></i>
                                <i className="fa-brands fa-cc-visa"></i>
                                <i className="fa-brands fa-cc-mastercard"></i>
                            </div>
                            <p className="text-[12px] font-black opacity-40 uppercase tracking-[8px]">SSL SECURE DATA ENCRYPTION</p>
                        </div>
                    </div>
                </footer>

                {/* Cart Drawer Pro */}
                <div className={`fixed top-0 right-0 h-full w-80 md:w-[500px] bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[500] transition-transform duration-1000 border-l-[15px] border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-12 bg-[#1e3a8a] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16"></div>
                        <div className="flex items-center gap-5 relative">
                            <i className="fa-solid fa-basket-shopping text-5xl text-[#FFD814]"></i>
                            <span className="font-black text-5xl uppercase tracking-tighter">הסל שלי</span>
                        </div>
                        <button onClick={()=>setIsCartOpen(false)} className="text-6xl hover:text-[#FFD814] font-bold transition-all hover:scale-125 rotate-45 relative">&times;</button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto h-[50vh] space-y-8 bg-gray-50 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="text-center py-40 opacity-20 flex flex-col items-center">
                                <i className="fa-solid fa-cart-arrow-down text-[150px] mb-10"></i>
                                <p className="font-black text-3xl uppercase tracking-[5px]">הסל מחכה לך...</p>
                            </div>
                        ) : (
                            cart.map((item, i) => (
                                <div key={i} className="flex gap-8 bg-white p-8 rounded-[45px] border-4 border-gray-50 relative shadow-md hover:border-[#1e3a8a] transition-all group overflow-hidden">
                                    <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute top-0 right-0 bg-red-500 text-white w-12 h-12 rounded-bl-[25px] flex items-center justify-center shadow-lg font-bold group-hover:scale-110 transition-transform">✕</button>
                                    <img src={item.image} className="w-28 h-28 object-contain bg-gray-50 rounded-3xl p-4 group-hover:rotate-12 transition-transform" alt={item.name} />
                                    <div className="flex flex-col justify-center flex-1 text-right">
                                        <span className="text-sm font-black line-clamp-2 mb-3 text-gray-800 leading-tight">{item.name}</span>
                                        <b className="text-3xl font-black text-[#1e3a8a] tracking-tighter">₪{item.sellingPrice}</b>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-12 border-t-[10px] border-gray-50 bg-white absolute bottom-0 w-full shadow-[0_-30px_60px_rgba(0,0,0,0.15)]">
                        <div className="flex gap-4 mb-10">
                            {/* Input קופון מחובר לסטייט! */}
                            <input type="text" placeholder="קוד קופון (נסה SMART10)" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border-4 p-5 rounded-[20px] outline-none focus:border-[#1e3a8a] font-black text-center uppercase tracking-[4px] bg-gray-50 text-xl" />
                            {/* כפתור שמפעיל את פונקציית applyCoupon */}
                            <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-10 rounded-[20px] font-black hover:bg-blue-800 transition-all uppercase shadow-lg">Apply</button>
                        </div>
                        
                        {discount > 0 && <div className="bg-green-100 text-green-700 text-xs font-black p-4 rounded-2xl mb-8 text-center border-2 border-green-200 animate-pulse">🎉 הנחת מועדון SmartBuy הופעלה (10% ירדו מהמחיר)!</div>}
                        
                        <div className="flex justify-between items-center mb-10 px-4">
                            <span className="font-black text-gray-400 uppercase text-sm tracking-[3px]">Total Amount</span>
                            <span className="text-6xl font-black text-[#1e3a8a] tracking-tighter">₪{cartTotal}</span>
                        </div>
                        
                        <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-8 rounded-[35px] font-black text-3xl shadow-[0_20px_50px_rgba(230,195,18,0.4)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-6 uppercase tracking-tighter border-b-[10px] border-[#e6c312]">
                            Secure Checkout <i className="fa-solid fa-lock text-xl"></i>
                        </button>
                    </div>
                </div>

                {isCartOpen && <div className="fixed inset-0 bg-black/70 z-[450] backdrop-blur-xl transition-opacity duration-500" onClick={() => setIsCartOpen(false)}></div>}
            </div>
        </HelmetProvider>
    );
}