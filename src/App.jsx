import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { Helmet } from 'react-helmet-async';




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

// --- 1. רכיב החלפת שפות ---
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
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner">
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} onClick={() => changeLanguage(l.c)} className="text-xl hover:scale-125 transition-transform">{l.f}</button>
            ))}
        </div>
    );
};

// --- 2. מודאל מוצר משודרג (הכל כלול) ---
const ProductModal = ({ product, onClose, onAddToCart, onAddReview, brandLogo }) => {
    const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
    const [isExpanded, setIsExpanded] = useState(false);

    // --- לוגיקת SEO ו-Schema Markup עבור Google ---
    const schemaMarkup = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": [product.image],
        "description": product.expertArticleTitle || `פרטים ומפרט טכני עבור ${product.name}`,
        "brand": {
            "@type": "Brand",
            "name": product.brand || "SmartBuy"
        },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "ILS",
            "price": product.sellingPrice,
            "itemCondition": "https://schema.org/NewCondition",
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

    const paragraphs = product.expertArticleBody?.split('\n').filter(p => p.trim() !== '') || [];

    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            
            {/* עדכון Meta Tags דינמי עבור SEO */}
            <Helmet>
                <title>{product.name} | SmartBuy - קנייה חכמה</title>
                <meta name="description" content={`קנו עכשיו את ${product.name} במחיר SmartBuy מנצח: ₪${product.sellingPrice}. סקירת מומחים, מפרט טכני מלא וחוות דעת גולשים.`} />
                <script type="application/ld+json">
                    {JSON.stringify(schemaMarkup)}
                </script>
            </Helmet>

            <div className="bg-white rounded-[40px] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-3xl font-bold z-50 transition-colors">&times;</button>
                
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden">
                    {/* צד ימין: תמונה ומחיר */}
                    <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-200 overflow-y-auto">
                        {brandLogo && <img src={brandLogo} className="h-12 mb-6 object-contain opacity-70" alt="brand" />}
                        <img src={product.image} className="max-h-64 object-contain mb-6 hover:scale-105 transition-transform duration-500" alt={product.name} />
                        <h2 className="text-2xl font-black text-[#1e3a8a] mb-6 text-center leading-tight px-4">{product.name}</h2>
                        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-auto">
                            <div className="text-sm text-gray-400 mb-1 text-center font-bold uppercase tracking-widest">SmartBuy Price</div>
                            <div className="text-5xl font-black text-[#1e3a8a] mb-6 text-center">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-5 rounded-2xl text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                                הוספה לסל <i className="fa-solid fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>

                    {/* צד שמאל: תוכן רציף (סקירה, מפרט וביקורות) */}
                    <div className="md:col-span-3 p-8 bg-white overflow-y-auto custom-scrollbar text-right" dir="rtl">
                        {/* סקירת מומחה */}
                        {product.expertArticleTitle && (
                            <section className="mb-10">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-3 py-1.5 rounded-lg font-black text-xs mb-4 border border-blue-100">
                                    <i className="fa-solid fa-medal text-[#FFD814]"></i> סקירת מומחי SmartBuy
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-6 leading-tight">{product.expertArticleTitle}</h3>
                                <div className={`relative transition-all duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px]' : 'max-h-40'}`}>
                                    <div className="text-gray-600 leading-relaxed text-sm space-y-4 font-medium">
                                        {paragraphs.map((p, idx) => <p key={idx}>{p}</p>)}
                                    </div>
                                    {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>}
                                </div>
                                <button onClick={() => setIsExpanded(!isExpanded)} className="mt-4 text-[#1e3a8a] font-black text-sm hover:underline flex items-center gap-1">
                                    {isExpanded ? 'סגור סקירה' : 'קרא עוד על המוצר...'}
                                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                </button>
                            </section>
                        )}

                        {/* מפרט טכני */}
                        {product.specs && (
                            <section className="mb-12 bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-inner">
                                <h4 className="font-black text-[#1e3a8a] mb-6 flex items-center gap-2 text-xl">
                                    <i className="fa-solid fa-microchip text-[#FFD814]"></i> מפרט טכני מלא
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">מידות</span>
                                        <span className="font-bold text-gray-800 text-sm">{product.specs.dimensions || 'לפי יצרן'}</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">צבע / גימור</span>
                                        <span className="font-bold text-gray-800 text-sm">{product.specs.color || 'סטנדרט'}</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 col-span-full">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-2">תכונות בולטות</span>
                                        <div className="flex flex-wrap gap-2">
                                            {product.specs.key_features?.map((f, i) => (
                                                <span key={i} className="bg-blue-50 text-[#1e3a8a] text-[10px] px-3 py-1.5 rounded-lg border border-blue-100 font-black flex items-center gap-1">
                                                    <i className="fa-solid fa-check text-green-500"></i> {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                        
                        {/* ביקורות */}
                        <section className="pt-8 border-t-2 border-dashed border-gray-100">
                            <h4 className="font-black text-[#1e3a8a] text-2xl mb-8">ביקורות לקוחות</h4>
                            <div className="space-y-6 mb-10">
                                {product.reviews && product.reviews.length > 0 ? (
                                    product.reviews.map((rev, i) => (
                                        <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative shadow-sm">
                                            <div className="flex justify-between font-bold text-xs text-[#1e3a8a] mb-2">
                                                <span>{rev.name}</span>
                                                <div className="text-[#FFD814]">
                                                    {[...Array(rev.rating)].map((_, star) => <i key={star} className="fa-solid fa-star"></i>)}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm italic leading-relaxed">"{rev.text}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 text-sm font-black">תהיה הראשון לכתוב ביקורת על המוצר!</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleReviewSubmit} className="bg-blue-50 p-8 rounded-[35px] border-2 border-dashed border-blue-200">
                                <h5 className="font-black text-[#1e3a8a] mb-6 text-lg">כתוב חוות דעת:</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <input required placeholder="שם מלא" className="p-4 rounded-2xl border-0 shadow-sm focus:ring-2 ring-[#FFD814] outline-none text-sm" value={reviewForm.name} onChange={e=>setReviewForm({...reviewForm, name: e.target.value})} />
                                    <select className="p-4 rounded-2xl border-0 shadow-sm focus:ring-2 ring-[#FFD814] outline-none text-sm font-bold" value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm, rating: Number(e.target.value)})}>
                                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} כוכבים</option>)}
                                    </select>
                                </div>
                                <textarea required placeholder="שתף אותנו בחוויית הקנייה שלך..." className="w-full p-4 rounded-2xl border-0 shadow-sm focus:ring-2 ring-[#FFD814] outline-none text-sm mb-6" rows="3" value={reviewForm.text} onChange={e=>setReviewForm({...reviewForm, text: e.target.value})}></textarea>
                                <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-2xl font-black text-sm shadow-md hover:bg-blue-800 transition-all">פרסם ביקורת עכשיו</button>
                            </form>
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
        let waText = `*הזמנה חדשה מ-SmartBuy!*%0A👤 שם: ${formData.name}%0A💰 סה"כ: ₪${total}`;
        onClearCart(); onClose();
        window.open(`https://wa.me/972544914204?text=${waText}`, '_blank');
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[40px] max-w-lg w-full p-10 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 text-3xl font-bold hover:text-red-500 transition-colors">&times;</button>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center leading-tight px-4 underline decoration-[#FFD814] decoration-8 underline-offset-4">השלמת הזמנה מהירה</h2>
                <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
                    <input required placeholder="שם מלא למשלוח" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] focus:bg-white outline-none transition-all font-bold" onChange={e=>setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="מספר טלפון ליצירת קשר" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FFD814] focus:bg-white outline-none transition-all font-bold" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                    <div className="bg-blue-50 p-6 rounded-[30px] text-center border-2 border-blue-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">סה"כ לתשלום סופי</div>
                        <div className="text-5xl font-black text-[#1e3a8a]">₪{total}</div>
                    </div>
                    <button type="submit" className="w-full bg-[#1e3a8a] text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">אישור הזמנה ב-WhatsApp</button>
                </form>
            </div>
        </div>
    );
};

// --- 4. סליידר Hero ---
const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    useEffect(() => {
        if (products.length === 0) return;
        const interval = setInterval(() => setCurrentIndex(prev => (prev + 1) % products.length), 4000);
        return () => clearInterval(interval);
    }, [products]);
    if (products.length === 0) return null;
    return (
        <div className="w-full h-40 md:h-64 bg-black relative overflow-hidden flex items-center justify-center border-b-8 border-[#FFD814] group">
            <img src={products[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-110 opacity-30 blur-[2px] group-hover:scale-100 transition-transform duration-[4000ms]" alt="Slider" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 to-transparent"></div>
            <div className="absolute z-20 text-center px-4 animate-fade-in">
                <div className="bg-[#FFD814] text-[#1e3a8a] px-4 py-1 rounded-full text-[10px] font-black uppercase inline-block mb-4">Deal of the Day</div>
                <h2 className="text-white text-3xl md:text-5xl font-black drop-shadow-2xl mb-2">{products[currentIndex].name}</h2>
                <div className="text-[#FFD814] text-xl font-black">₪{products[currentIndex].sellingPrice} בלבד</div>
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
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [maxPrice, setMaxPrice] = useState(25000);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeReviewBubble, setActiveReviewBubble] = useState(null);
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u));
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

    const filtered = products.filter(p => {
        const matchCat = filter === "All" || p.category === filter;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchPrice = p.sellingPrice <= maxPrice;
        return matchCat && matchSearch && matchPrice;
    });

    // קיבוץ מוצרים לפי קטגוריה (עבור דף הבית)
    const categorizedGroups = useMemo(() => {
        const groups = {};
        Object.keys(categoryMap).forEach(key => {
            if (key === "All") return;
            const items = products.filter(p => p.category === key);
            if (items.length > 0) groups[key] = items;
        });
        return groups;
    }, [products]);

    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));
    const handleAddReview = async (pid, rev) => { await updateDoc(doc(db, "products", pid), { reviews: arrayUnion({ ...rev, date: new Date().toISOString() }) }); alert("הביקורת התקבלה במערכת!"); };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden" dir="rtl">
            {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={handleAddReview} brandLogo={brandLogos[selectedProduct.brand]} />}
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}

            {/* Header */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814] py-4 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                        <div className="cursor-pointer" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814]">SMARTBUY</div>
                            <div className="text-[10px] font-bold text-white uppercase tracking-widest">Premium Electric Store</div>
                        </div>
                        <LanguageSwitcher />
                    </div>
                    <div className="flex-grow max-w-xl w-full relative">
                        <input type="text" placeholder="מה תרצו לקנות היום? חפשו דגם או מוצר..." className="w-full p-4 pr-12 rounded-2xl text-black focus:ring-4 ring-[#FFD814]/50 outline-none font-bold" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                        <i className="fa-solid fa-magnifying-glass absolute right-4 top-5 text-gray-400"></i>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-6 py-3 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:scale-105 transition-transform active:scale-95">
                            <i className="fa-solid fa-cart-shopping text-xl"></i>
                            <div className="text-right leading-none border-r-2 border-[#1e3a8a]/20 pr-3">
                                <div className="text-[10px] uppercase font-black">My Cart</div>
                                <div className="text-lg">₪{cartTotal}</div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b sticky top-[140px] md:top-[92px] z-40 overflow-x-auto py-6 px-6 shadow-sm scrollbar-hide">
                <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max px-4">
                    {Object.keys(categoryMap).map(cat => (
                        <button key={cat} onClick={() => setFilter(cat)} className={`flex flex-col items-center min-w-[130px] p-6 rounded-[35px] transition-all border-2 shadow-sm active:scale-90 ${filter === cat ? "border-[#1e3a8a] bg-blue-50 scale-110 shadow-lg z-10" : "border-transparent bg-white hover:bg-gray-50 opacity-70 hover:opacity-100"}`}>
                            <span className={`text-sm font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <HeroSlider products={products.slice(0,5)} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-24">
                {filter === "All" && !searchQuery ? (
                    /* דף הבית: שורות לפי קטגוריות */
                    Object.keys(categorizedGroups).map(catKey => (
                        <section key={catKey} className="relative group">
                            <div className="flex items-center gap-4 mb-8 border-b-4 border-gray-100 pb-6">
                                <div className="w-14 h-14 bg-[#1e3a8a] text-[#FFD814] rounded-2xl flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-0 transition-transform"><i className="fa-solid fa-bolt-lightning text-xl"></i></div>
                                <div>
                                    <h2 className="text-3xl font-black text-[#1e3a8a] leading-none mb-1">{categoryMap[catKey]}</h2>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Most Wanted Items</span>
                                </div>
                                <button onClick={()=>setFilter(catKey)} className="mr-auto text-sm font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-full hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm">לכל ה{categoryMap[catKey]} ←</button>
                            </div>
                            
                            <div className="flex overflow-x-auto gap-8 pb-10 hide-scroll snap-x scroll-smooth px-2">
                                {categorizedGroups[catKey].map(p => (
                                    <div key={p.id} className="min-w-[300px] md:min-w-[340px] snap-start bg-white p-8 rounded-[45px] shadow-md border border-gray-100 relative group/card hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                        <div className="absolute top-8 right-8 z-10 opacity-30 group-hover/card:opacity-100 transition-opacity">
                                            {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover/card:grayscale-0" alt="brand" />}
                                        </div>
                                        
                                        <div className="absolute top-8 left-8 z-20">
                                            <button onMouseEnter={() => setActiveReviewBubble(p.id)} onMouseLeave={() => setActiveReviewBubble(null)} className="w-11 h-11 rounded-full bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-md border border-blue-100 hover:scale-110 transition-transform"><i className="fa-solid fa-comment-dots"></i></button>
                                            {activeReviewBubble === p.id && (
                                                <div className="absolute top-14 left-0 w-60 bg-[#1e3a8a] text-white p-5 rounded-3xl shadow-2xl z-50 text-xs border-2 border-[#FFD814] animate-bounce-in">
                                                    <div className="text-[#FFD814] mb-2 font-black">5.0 ★ CUSTOMER REVIEW</div>
                                                    <p className="italic leading-relaxed">"{p.reviews?.[0]?.text || "פשוט מדהים! השירות של SmartBuy הוא הטוב ביותר שנתקלתי בו."}"</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-48 flex items-center justify-center mb-8 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                            <img src={p.image} className="max-h-full object-contain group-hover/card:scale-110 transition-transform duration-700" alt={p.name} />
                                        </div>
                                        
                                        <h3 className="font-black text-gray-800 text-base mb-4 h-12 line-clamp-2 hover:text-[#1e3a8a] cursor-pointer leading-tight" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                                <span className="text-[10px] text-gray-400 line-through font-bold">₪{Math.round(p.sellingPrice * 1.2)}</span>
                                            </div>
                                            <div className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-xl border border-green-200">זמין במלאי</div>
                                        </div>
                                        <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-5 rounded-[22px] font-black hover:bg-[#f3ce12] transition-all shadow-xl active:scale-95 text-lg">הוספה לסל המאובטח</button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                    /* דפי קטגוריה או חיפוש: GRID מלא */
                    <section>
                        <div className="flex items-center gap-4 mb-10">
                             <h2 className="text-4xl font-black text-[#1e3a8a]">{filter === "All" ? "תוצאות חיפוש" : categoryMap[filter]}</h2>
                             <div className="h-1 flex-grow bg-gray-100 rounded-full"></div>
                             <span className="text-gray-400 font-bold">{filtered.length} פריטים נמצאו</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                            {filtered.map(p => (
                                <div key={p.id} className="bg-white p-8 rounded-[50px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between">
                                    <div className="absolute top-8 right-8 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                        {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                    </div>
                                    <div className="h-52 flex items-center justify-center mb-6 mt-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                        <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                                    </div>
                                    <h3 className="font-black text-gray-800 text-sm mb-6 h-10 line-clamp-2 text-center" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                    <div className="text-4xl font-black text-[#1e3a8a] mb-8 text-center">₪{p.sellingPrice}</div>
                                    <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black hover:bg-[#f3ce12] transition-all shadow-lg active:scale-95">הוספה לסל</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1e3a8a] text-white py-24 px-10 border-t-[12px] border-[#FFD814]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-sm">
                    <div>
                        <div className="text-5xl font-black italic text-[#FFD814] mb-8">SMARTBUY</div>
                        <p className="font-bold opacity-80 leading-loose text-base">החנות המובילה למכשירי חשמל בישראל. אנחנו מחויבים לשירות VIP, מחירים ללא תחרות ואיכות ללא פשרות לכל לקוח.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-xl mb-8 border-b-4 border-[#FFD814] pb-3 inline-block">שירות לקוחות</h4>
                        <ul className="space-y-5 font-bold text-lg">
                            <li className="flex items-center gap-3"><i className="fa-solid fa-phone text-[#FFD814]"></i> 054-4914204</li>
                            <li className="flex items-center gap-3"><i className="fa-solid fa-clock text-[#FFD814]"></i> א-ה: 09:00-19:00</li>
                            <li className="flex items-center gap-3"><i className="fa-solid fa-envelope text-[#FFD814]"></i> info@smartbuy.co.il</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-xl mb-8 border-b-4 border-[#FFD814] pb-3 inline-block">מידע נוסף</h4>
                        <ul className="space-y-5 font-bold text-gray-300">
                            <li><a href="#" className="hover:text-[#FFD814] transition-colors">תקנון האתר ותנאי שימוש</a></li>
                            <li><a href="#" className="hover:text-[#FFD814] transition-colors">מדיניות משלוחים והחזרות</a></li>
                            <li><a href="#" className="hover:text-[#FFD814] transition-colors">הצהרת נגישות</a></li>
                        </ul>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="font-black text-xl mb-8 border-b-4 border-[#FFD814] pb-3 inline-block">תשלום בטוח</h4>
                        <div className="flex gap-4 justify-center md:justify-end text-6xl mb-8 text-white">
                            <i className="fa-brands fa-google-pay" title="Google Pay"></i>
                            <i className="fa-brands fa-apple-pay" title="Apple Pay"></i>
                            <i className="fa-brands fa-cc-visa"></i>
                            <i className="fa-brands fa-cc-mastercard"></i>
                        </div>
                        <p className="text-[11px] font-black opacity-60 uppercase tracking-[4px] text-left">SSL ENCRYPTED SECURE CHECKOUT</p>
                    </div>
                </div>
            </footer>

            {/* Shopping Cart Drawer */}
            <div className={`fixed top-0 right-0 h-full w-80 md:w-[450px] bg-white shadow-2xl z-[400] transition-transform duration-700 border-l-[10px] border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-8 bg-[#1e3a8a] text-white flex justify-between items-center shadow-xl">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-basket-shopping text-3xl text-[#FFD814]"></i>
                        <span className="font-black text-3xl text-[#FFD814] uppercase">הסל שלי</span>
                    </div>
                    <button onClick={()=>setIsCartOpen(false)} className="text-5xl hover:text-[#FFD814] transition-colors rotate-45">+</button>
                </div>
                
                <div className="p-6 overflow-y-auto h-[55vh] space-y-6 bg-gray-50 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="text-center py-32 text-gray-300">
                            <i className="fa-solid fa-cart-arrow-down text-8xl mb-6 opacity-20"></i>
                            <p className="text-xl font-black">הסל שלך מחכה להתמלא!</p>
                        </div>
                    ) : (
                        cart.map((item, i) => (
                            <div key={i} className="flex gap-5 bg-white p-5 rounded-[30px] border-2 border-gray-100 relative shadow-sm hover:border-[#1e3a8a] transition-all group">
                                <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute -top-3 -right-3 bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform z-10 font-bold">✕</button>
                                <img src={item.image} className="w-24 h-24 object-contain bg-gray-50 rounded-2xl p-2 group-hover:scale-105 transition-transform" alt={item.name} />
                                <div className="flex flex-col justify-center flex-1">
                                    <span className="text-sm font-black text-gray-800 line-clamp-2 mb-2 leading-tight">{item.name}</span>
                                    <b className="text-2xl font-black text-[#1e3a8a]">₪{item.sellingPrice}</b>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-8 border-t-4 border-gray-100 bg-white absolute bottom-0 w-full shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-3 mb-8">
                        <input type="text" placeholder="קוד קופון להנחה" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none focus:border-[#1e3a8a] transition-colors" />
                        <button onClick={() => { if(couponCode.toUpperCase()==="SMART10"){ setDiscount(0.1); alert("קופון הופעל!"); } else alert("קוד שגוי"); }} className="bg-[#1e3a8a] text-white px-8 rounded-2xl font-black hover:bg-blue-800 transition-colors">הפעל</button>
                    </div>
                    
                    {discount > 0 && <div className="bg-green-100 text-green-700 text-xs font-black p-3 rounded-xl mb-6 text-center">🎉 קופון SMART10 הופעל (10% הנחה!)</div>}
                    
                    <div className="flex justify-between items-center mb-8 px-2">
                        <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Total Amount</span>
                        <span className="text-5xl font-black text-[#1e3a8a] tracking-tighter">₪{cartTotal}</span>
                    </div>
                    
                    <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-6 rounded-3xl font-black text-2xl hover:scale-[1.03] transition-all shadow-2xl flex items-center justify-center gap-4">
                        המשך לקופה מאובטחת <i className="fa-solid fa-shield-check"></i>
                    </button>
                </div>
            </div>
            
            {isCartOpen && <div className="fixed inset-0 bg-black/60 z-[350] backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
}