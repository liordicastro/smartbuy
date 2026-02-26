import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

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

// --- רכיב החלפת שפות (מתוקן) ---
const LanguageSwitcher = () => {
    useEffect(() => {
        if (!document.getElementById('google-translate-styles')) {
            const style = document.createElement('style');
            style.id = 'google-translate-styles';
            style.innerHTML = `
                .goog-te-banner-frame.skiptranslate { display: none !important; }
                body { top: 0px !important; }
                #google_translate_element { display: none !important; }
            `;
            document.head.appendChild(style);
        }
        if (!document.getElementById('google-translate-script')) {
            window.googleTranslateElementInit = () => {
                new window.google.translate.TranslateElement(
                    { pageLanguage: 'he', includedLanguages: 'he,en,fr,ru', autoDisplay: false },
                    'google_translate_element'
                );
            };
            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
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
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner relative">
            <div id="google_translate_element"></div>
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} onClick={() => changeLanguage(l.c)} className="text-xl hover:scale-125 transition-transform" title={l.c}>{l.f}</button>
            ))}
        </div>
    );
};

// --- פופאפ מבצעים ---
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

// --- מודאל מוצר (עם גלילה פנימית לסקירה) ---
const ProductModal = ({ product, onClose, onAddToCart, onAddReview }) => {
    const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
    // סטייט חדש לשליטה בטקסט המקופל
    const [isExpanded, setIsExpanded] = useState(false);

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        onAddReview(product.id, reviewForm);
        setReviewForm({ name: '', text: '', rating: 5 });
    };

    // פיצול המאמר לפסקאות
    const paragraphs = product.expertArticleBody?.split('\n').filter(p => p.trim() !== '') || [];

    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black shadow-md text-3xl font-bold z-50">&times;</button>
                
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden">
                    {/* צד ימין: תמונה ומחיר (נשאר קבוע) */}
                    <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-200 overflow-y-auto">
                        <div className="text-xs font-bold text-gray-400 mb-4 uppercase bg-white px-3 py-1 rounded-full shadow-sm">{product.category}</div>
                        <img src={product.image} className="max-h-64 object-contain mb-6 transition-transform duration-500 hover:scale-105" alt={product.name} />
                        <h2 className="text-2xl font-black text-[#1e3a8a] mb-6 text-center leading-tight">{product.name}</h2>
                        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-auto">
                            <div className="text-5xl font-black text-[#1e3a8a] mb-2 text-center">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-4 rounded-xl text-lg shadow-md active:scale-95 transition-all">
                                הוספה לסל <i className="fa-solid fa-cart-plus mr-2"></i>
                            </button>
                        </div>
                    </div>

                    {/* צד שמאל: אזור גלילה הכולל סקירה מתקפלת, מפרט וביקורות */}
                    <div className="md:col-span-3 p-8 bg-white overflow-y-auto custom-scrollbar">
                        
                        {/* 1. סקירת מומחה עם "קרא עוד" */}
                        {product.expertArticleTitle && (
                            <section className="mb-10">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-3 py-1.5 rounded-lg font-black text-xs mb-3 border border-blue-100">
                                    <i className="fa-solid fa-medal text-[#FFD814]"></i> סקירת מומחי SmartBuy
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4">{product.expertArticleTitle}</h3>
                                
                                <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px]' : 'max-h-32'}`}>
                                    <div className="text-gray-600 leading-relaxed text-sm space-y-4">
                                        {paragraphs.map((p, idx) => <p key={idx}>{p}</p>)}
                                    </div>
                                    {/* אפקט טשטוש (Fade) כשהטקסט סגור */}
                                    {!isExpanded && (
                                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)} 
                                    className="mt-2 text-[#1e3a8a] font-black text-sm hover:underline flex items-center gap-1"
                                >
                                    {isExpanded ? 'הצג פחות' : 'להמשך קריאה...'}
                                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                </button>
                            </section>
                        )}

                        {/* 2. מפרט טכני בעיצוב נקי */}
                        {product.specs && (
                            <section className="mb-10 bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner">
                                <h4 className="font-black text-[#1e3a8a] mb-6 flex items-center gap-2 text-lg">
                                    <i className="fa-solid fa-microchip text-[#FFD814]"></i> מפרט טכני מלא
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">מידות (גxרxע)</span>
                                        <span className="font-bold text-gray-800 text-xs">{product.specs.dimensions || 'לפי יצרן'}</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">צבע / גימור</span>
                                        <span className="font-bold text-gray-800 text-xs">{product.specs.color || 'סטנדרט'}</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 col-span-full">
                                        <span className="text-gray-400 block text-[10px] font-bold uppercase mb-2">תכונות בולטות</span>
                                        <div className="flex flex-wrap gap-2">
                                            {product.specs.key_features?.map((f, i) => (
                                                <span key={i} className="bg-blue-50 text-[#1e3a8a] text-[10px] px-2 py-1 rounded-md border border-blue-100 font-bold flex items-center gap-1">
                                                    <i className="fa-solid fa-check text-green-500"></i> {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                        
                        {/* 3. אזור ביקורות לקוחות */}
                        <section className="pt-8 border-t-2 border-dashed border-gray-100">
                            <h4 className="font-black text-[#1e3a8a] text-xl mb-6">מה הלקוחות אומרים?</h4>
                            
                            <div className="space-y-4 mb-8">
                                {product.reviews && product.reviews.length > 0 ? (
                                    product.reviews.map((rev, i) => (
                                        <div key={i} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 relative">
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
                                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 text-sm font-bold">עוד לא נכתבו ביקורות. תהיה הראשון?</p>
                                    </div>
                                )}
                            </div>

                            {/* טופס כתיבת ביקורת */}
                            <form onSubmit={handleReviewSubmit} className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-100">
                                <h5 className="font-bold text-[#1e3a8a] mb-4">הוסף חוות דעת:</h5>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input required placeholder="שם מלא" className="p-3 rounded-xl border text-sm outline-none" value={reviewForm.name} onChange={e=>setReviewForm({...reviewForm, name: e.target.value})} />
                                    <select className="p-3 rounded-xl border text-sm outline-none" value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm, rating: Number(e.target.value)})}>
                                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} כוכבים</option>)}
                                    </select>
                                </div>
                                <textarea required placeholder="איך המוצר? (איכות, מהירות משלוח...)" className="w-full p-3 rounded-xl border text-sm mb-3 outline-none" rows="3" value={reviewForm.text} onChange={e=>setReviewForm({...reviewForm, text: e.target.value})}></textarea>
                                <button type="submit" className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl font-black text-sm shadow-md hover:bg-[#152a63] transition-all">פרסם ביקורת</button>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
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
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-2xl font-bold">&times;</button>
                <h2 className="text-2xl font-black text-[#1e3a8a] mb-6 text-center">השלמת הזמנה</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input required placeholder="שם מלא" className="w-full p-4 bg-gray-50 rounded-xl border" onChange={e=>setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="מספר טלפון" className="w-full p-4 bg-gray-50 rounded-xl border" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-gray-500 mb-1">סה"כ לתשלום:</div>
                        <div className="text-3xl font-black text-[#1e3a8a]">₪{total}</div>
                    </div>
                    <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-xl font-bold text-lg shadow-lg">מעבר לאישור ב-WhatsApp</button>
                </form>
            </div>
        </div>
    );
};

// --- מודאל התחברות (מועדון) ---
const AuthModal = ({ onClose, onUserLogged }) => {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            onUserLogged(result.user);
            onClose();
        } catch (error) { console.error(error); }
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-sm w-full p-8 relative shadow-2xl text-center border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-2xl font-bold">&times;</button>
                <div className="text-5xl text-[#FFD814] mb-4"><i className="fa-solid fa-crown"></i></div>
                <h2 className="text-2xl font-black text-[#1e3a8a] mb-2">מועדון SmartBuy</h2>
                <p className="text-gray-500 text-sm mb-8 font-bold">התחבר וקבל הטבות VIP בלעדיות</p>
                <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 border-2 border-gray-100 p-4 rounded-xl font-bold hover:bg-gray-50 transition-all">
                    <i className="fa-brands fa-google text-red-500 text-xl"></i> התחבר עם Google
                </button>
                <button onClick={() => alert("אפשרות זו תופעל בקרוב.")} className="w-full bg-black text-white p-4 rounded-xl font-bold mt-3">התחבר עם Apple</button>
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
                <h2 className="text-[#FFD814] text-2xl md:text-4xl font-black drop-shadow-lg">{products[currentIndex].name}</h2>
                <p className="text-white font-bold text-sm md:text-lg mt-1">המבצעים החמים של היום</p>
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
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [maxPrice, setMaxPrice] = useState(20000);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [showPromo, setShowPromo] = useState(true); 
    const [selectedProduct, setSelectedProduct] = useState(null); 
    const [activeReviewBubble, setActiveReviewBubble] = useState(null); 
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u));
        return () => unsub();
    }, []);

    const handleAddReview = async (productId, reviewData) => {
        const productRef = doc(db, "products", productId);
        try {
            await updateDoc(productRef, { reviews: arrayUnion({ ...reviewData, date: new Date().toISOString() }) });
            alert("תודה! הביקורת שלך נוספה.");
        } catch (e) { console.error(e); }
    };

    const filtered = products.filter(p => {
        const matchCat = filter === "All" || p.category === filter;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchPrice = p.sellingPrice <= maxPrice;
        return matchCat && matchSearch && matchPrice;
    });


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


    const groups = {};
    filtered.forEach(p => {
        const brand = p.brand || "מותגים נבחרים";
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push(p);
    });
    return groups;
}, [filtered]);


    const categoryMap = { 
        "All": "הכל", "Fridges": "מקררים", "Freezers": "מקפיאים", "AC": "מזגנים", 
        "Washing": "כביסה", "Dryers": "מייבשים", "Ovens": "תנורים", "TV": "טלוויזיות", "Surplus": "מחלקת עודפים 🏷️"
    };

    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));
    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "SMART10") { setDiscount(0.1); alert("קופון SMART10 הופעל!"); }
        else { setDiscount(0); alert("קוד לא חוקי"); }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden">
            {showPromo && <PromoPopup onClose={() => setShowPromo(false)} />}
            {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} onUserLogged={setUser} />}
            {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={handleAddReview} />}
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
            
            {/* Header */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                        <div className="cursor-pointer" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814]">SMARTBUY</div>
                            <div className="text-[10px] font-bold tracking-widest text-white mt-1 uppercase">Smart Shopping Starts Here</div>
                        </div>
                        <LanguageSwitcher />
                    </div>
                    
                    <div className="flex-grow max-w-xl w-full relative">
                        <input type="text" placeholder="חפש מקרר, מסך, תנור..." className="w-full p-3 pr-10 rounded-xl text-black focus:ring-2 ring-[#FFD814] outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-4 text-gray-400"></i>
                        <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-white/70">
                            <span>תקציב: ₪{maxPrice}</span>
                            <input type="range" min="0" max="25000" step="100" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#FFD814]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        {user ? (
                            <div className="text-center"><div className="text-[10px] font-bold opacity-70">שלום,</div><div className="text-xs font-black">{user.displayName.split(' ')[0]}</div></div>
                        ) : (
                            <button onClick={() => setIsAuthOpen(true)} className="text-center hover:text-[#FFD814]"><i className="fa-regular fa-user text-xl"></i><div className="text-[10px] font-bold uppercase">Club</div></button>
                        )}
                        <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-5 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
                            <i className="fa-solid fa-cart-shopping text-xl"></i>
                            <div className="text-right leading-none">
                                <div className="text-[10px]">הסל שלי</div>
                                <div className="text-lg font-black">₪{cartTotal}</div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* קטגוריות משודרגות */}
            <nav className="bg-white border-b sticky top-[158px] md:top-[92px] z-40 overflow-x-auto py-5 px-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex gap-5 md:justify-center min-w-max">
                    {Object.keys(categoryMap).map(cat => (
                        <button key={cat} onClick={() => setFilter(cat)} className={`flex flex-col items-center min-w-[125px] p-6 rounded-[30px] transition-all border-2 shadow-sm ${filter === cat ? "border-[#1e3a8a] bg-blue-50 scale-110 shadow-lg" : "border-transparent bg-white hover:bg-gray-100"}`}>
                            <span className={`text-sm font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-700"}`}>{categoryMap[cat]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <HeroSlider products={products} />

            {/* רשת מוצרים */}
            <main> הקיימת בקוד הבא:
JavaScript

<main className="max-w-7xl mx-auto p-4 md:p-8 space-y-20">
    {Object.keys(productsByBrand).length > 0 ? (
        Object.keys(productsByBrand).map(brandName => (
            <section key={brandName} className="relative animate-fade-in">
                {/* כותרת המותג עם לוגו רשמי */}
                <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-50 flex items-center justify-center min-w-[60px] h-12">
                        {brandLogos[brandName] ? (
                            <img src={brandLogos[brandName]} alt={brandName} className="max-h-full max-w-full object-contain" />
                        ) : (
                            <i className="fa-solid fa-tag text-[#1e3a8a] text-xl"></i>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[#1e3a8a] leading-none">{brandName}</h2>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Premium Collection</span>
                    </div>
                    <div className="mr-auto text-xs font-bold text-gray-300">
                        {productsByBrand[brandName].length} דגמים זמינים
                    </div>
                </div>

                {/* שורת מוצרים אופקית (Snap Scroll) */}
                <div className="flex overflow-x-auto gap-6 pb-8 hide-scroll snap-x scroll-smooth">
                    {productsByBrand[brandName].map(p => (
                        <div key={p.id} className="min-w-[280px] md:min-w-[320px] snap-start bg-white p-6 rounded-[35px] shadow-md border border-gray-100 relative group hover:shadow-2xl transition-all duration-500">
                            
                            {/* לוגו מותג קטן ויוקרתי בתוך הכרטיס */}
                            <div className="absolute top-6 right-6 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                {brandLogos[brandName] && (
                                    <img src={brandLogos[brandName]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />
                                )}
                            </div>

                            {/* בועת ביקורת חכמה */}
                            <div className="absolute top-6 left-6 z-20">
                                <button 
                                    onMouseEnter={() => setActiveReviewBubble(p.id)} 
                                    onMouseLeave={() => setActiveReviewBubble(null)} 
                                    className="w-10 h-10 rounded-full bg-blue-50/80 text-[#1e3a8a] flex items-center justify-center shadow-sm border border-blue-100 hover:scale-110 transition-transform"
                                >
                                    <i className="fa-solid fa-comment-dots text-lg"></i>
                                </button>
                                {activeReviewBubble === p.id && (
                                    <div className="absolute top-12 left-0 w-56 bg-[#1e3a8a] text-white p-4 rounded-2xl shadow-2xl z-50 text-xs border-2 border-[#FFD814] animate-bounce-in">
                                        <div className="text-[#FFD814] mb-2">★★★★★</div>
                                        <p className="italic leading-tight">
                                            {p.reviews?.[0]?.text || "מוצר מצוין! מומלץ מאוד על ידי צוות SmartBuy."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* תמונת מוצר */}
                            <div className="h-48 flex items-center justify-center mb-6 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                            </div>
                            
                            {/* פרטי מוצר ומחיר */}
                            <h3 className="font-bold text-gray-800 text-sm mb-4 h-10 line-clamp-2 hover:text-[#1e3a8a] cursor-pointer" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                    <span className="text-[10px] text-gray-400 line-through font-bold">₪{Math.round(p.sellingPrice * 1.15)}</span>
                                </div>
                                <div className="bg-green-50 text-green-600 text-[10px] font-black px-2 py-1 rounded-md">במלאי</div>
                            </div>

                            <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-2xl font-black hover:bg-[#f3ce12] transition-all shadow-lg active:scale-95">
                                הוספה לסל המאובטח
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        ))
    ) : (
        <div className="text-center py-40">
            <i className="fa-solid fa-magnifying-glass text-6xl text-gray-200 mb-4"></i>
            <p className="text-gray-400 font-bold">לא נמצאו מוצרים תחת החיפוש או המותג הזה.</p>
        </div>
    )}
</main>

            {/* פוטר כחול מקצועי */}
            <footer className="bg-[#1e3a8a] text-white py-20 px-10 mt-20 border-t-8 border-[#FFD814]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                    <div>
                        <div className="text-4xl font-black italic text-[#FFD814] mb-6">SMARTBUY</div>
                        <p className="leading-relaxed font-bold opacity-80">החנות המובילה למכשירי חשמל. איכות ללא פשרות, שירות VIP ומחירים שוברי שוק לכל כיס.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-6 border-b-2 border-[#FFD814] pb-2 inline-block text-[#FFD814]">שירות לקוחות</h4>
                        <ul className="space-y-4 font-bold">
                            <li><i className="fa-solid fa-phone ml-2 text-[#FFD814]"></i> מוקד הזמנות: 054-4914204</li>
                            <li><i className="fa-solid fa-clock ml-2 text-[#FFD814]"></i> א-ה: 09:00-19:00</li>
                            <li><i className="fa-solid fa-envelope ml-2 text-[#FFD814]"></i> info@smartbuy.co.il</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-6 border-b-2 border-[#FFD814] pb-2 inline-block text-[#FFD814]">מידע שימושי</h4>
                        <ul className="space-y-4 font-bold text-gray-200">
                            <li><a href="#" className="hover:text-[#FFD814]">תקנון האתר ומדיניות משלוחים</a></li>
                            <li><a href="#" className="hover:text-[#FFD814]">מדיניות פרטיות והחזרות</a></li>
                            <li className="text-[#FFD814] opacity-50"><i className="fa-solid fa-tag ml-1"></i> מחלקת עודפים (בקרוב)</li>
                        </ul>
                    </div>
                    <div className="text-center md:text-right">
                        <h4 className="font-black text-lg mb-6 border-b-2 border-[#FFD814] pb-2 inline-block text-[#FFD814]">תשלום בטוח</h4>
                        <div className="flex gap-4 justify-center md:justify-start text-5xl mb-6 text-white">
                            <i className="fa-brands fa-google-pay" title="Google Pay"></i>
                            <i className="fa-brands fa-apple-pay" title="Apple Pay"></i>
                            <i className="fa-brands fa-cc-visa"></i>
                            <i className="fa-brands fa-cc-mastercard"></i>
                        </div>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">PCI-DSS SECURITY COMPLIANT</p>
                    </div>
                </div>
            </footer>

            {/* מגירת סל עשירה */}
            <div className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white shadow-2xl z-[400] transition-transform duration-500 border-l-8 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-cart-shopping text-[#FFD814]"></i>
                        <span className="font-black text-2xl text-[#FFD814]">הסל שלי</span>
                    </div>
                    <button onClick={()=>setIsCartOpen(false)} className="text-4xl hover:text-[#FFD814] transition-colors">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto h-[55vh] space-y-4 bg-gray-50">
                    {cart.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 font-bold">הסל שלך ריק כרגע...</div>
                    ) : (
                        cart.map((item, i) => (
                            <div key={i} className="flex gap-4 bg-white p-3 rounded-2xl border-2 border-gray-100 relative shadow-sm hover:border-[#1e3a8a] transition-all">
                                <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10">
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                                <img src={item.image} className="w-16 h-16 object-contain" alt={item.name} />
                                <div className="flex flex-col justify-center flex-1">
                                    <span className="text-xs font-black text-gray-800 line-clamp-2 leading-tight mb-1">{item.name}</span>
                                    <b className="text-[#1e3a8a] text-lg font-black">₪{item.sellingPrice}</b>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 border-t-4 border-gray-100 bg-white absolute bottom-0 w-full shadow-[0_-15px_30px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-2 mb-6">
                        <input type="text" placeholder="קוד קופון (SMART10)" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border-2 border-gray-100 p-3 rounded-xl text-sm outline-none focus:border-[#1e3a8a]" />
                        <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-5 rounded-xl text-sm font-black hover:bg-blue-800 transition-colors">הפעל</button>
                    </div>
                    {discount > 0 && <div className="bg-green-100 text-green-700 text-xs font-black p-2 rounded-lg mb-4 text-center">🎉 קופון הופעל בהצלחה!</div>}
                    <div className="flex justify-between items-center mb-6 px-2">
                        <span className="font-black text-gray-500 uppercase tracking-widest text-xs">סה"כ לתשלום</span>
                        <span className="text-4xl font-black text-[#1e3a8a]">₪{cartTotal}</span>
                    </div>
                    <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-5 rounded-2xl font-black text-xl hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-3">
                        המשך לקופה מאובטחת <i className="fa-solid fa-shield-check text-sm"></i>
                    </button>
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/50 z-[350] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
}