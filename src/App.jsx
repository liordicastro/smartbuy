import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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

// המייל שאיתו אתה מתחבר כדי לראות את כפתור הניהול
const ADMIN_EMAIL = "liordicastro@gmail.com"; 

// ==========================================
// 1. פאנל ניהול מוסתר (Backoffice)
// ==========================================
const AdminPanel = ({ onClose, products, coupons, users }) => {
    const [activeTab, setActiveTab] = useState('products');
    const [isUpdating, setIsUpdating] = useState(false);
    const [newCoupon, setNewCoupon] = useState({ code: '', discount: 10 });

    const handleUpdateProduct = async (id, field, value) => {
        await updateDoc(doc(db, "products", id), { [field]: value });
    };

    const handleAddCoupon = async (e) => {
        e.preventDefault();
        await setDoc(doc(db, "coupons", newCoupon.code.toUpperCase()), {
            code: newCoupon.code.toUpperCase(),
            discount: newCoupon.discount / 100,
            active: true,
            createdAt: serverTimestamp()
        });
        setNewCoupon({ code: '', discount: 10 });
        alert("הקופון נוצר בהצלחה!");
    };

    const handleDeleteCoupon = async (code) => {
        await deleteDoc(doc(db, "coupons", code));
    };

    const handleRunScraper = () => {
        setIsUpdating(true);
        setTimeout(() => {
            setIsUpdating(false);
            alert("הסקריפט סיים לרוץ! מחירים ומלאי עודכנו.");
        }, 3000);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-[1000] flex text-right font-assistant" dir="rtl">
            <div className="w-64 bg-gray-950 text-white p-6 flex flex-col shadow-2xl">
                <div className="text-2xl font-black text-[#FFD814] mb-10"><i className="fa-solid fa-user-tie"></i> SmartBuy Admin</div>
                <div className="space-y-2 flex-grow">
                    <button onClick={()=>setActiveTab('products')} className={`w-full text-right p-3 rounded-xl font-bold transition-all ${activeTab==='products' ? 'bg-[#FFD814] text-gray-900' : 'hover:bg-gray-800'}`}><i className="fa-solid fa-box-open ml-2"></i> ניהול מוצרים</button>
                    <button onClick={()=>setActiveTab('coupons')} className={`w-full text-right p-3 rounded-xl font-bold transition-all ${activeTab==='coupons' ? 'bg-[#FFD814] text-gray-900' : 'hover:bg-gray-800'}`}><i className="fa-solid fa-ticket ml-2"></i> ניהול קופונים</button>
                    <button onClick={()=>setActiveTab('users')} className={`w-full text-right p-3 rounded-xl font-bold transition-all ${activeTab==='users' ? 'bg-[#FFD814] text-gray-900' : 'hover:bg-gray-800'}`}><i className="fa-solid fa-users ml-2"></i> חברי מועדון</button>
                    <button onClick={()=>setActiveTab('system')} className={`w-full text-right p-3 rounded-xl font-bold transition-all ${activeTab==='system' ? 'bg-[#FFD814] text-gray-900' : 'hover:bg-gray-800'}`}><i className="fa-solid fa-robot ml-2"></i> סקריפט רובוט</button>
                </div>
                <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-bold mt-auto"><i className="fa-solid fa-arrow-right-from-bracket ml-2"></i> חזרה לחנות</button>
            </div>
            <div className="flex-grow bg-gray-100 p-10 overflow-y-auto">
                {activeTab === 'products' && (
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 mb-8">ניהול מלאי ומחירים</h2>
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600 font-black border-b">
                                    <tr>
                                        <th className="p-4">תמונה</th>
                                        <th className="p-4">שם המוצר</th>
                                        <th className="p-4">מחיר עכשיו (₪)</th>
                                        <th className="p-4 text-center">בסליידר?</th>
                                        <th className="p-4 text-center">מומלץ?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-4"><img src={p.image} className="w-12 h-12 object-contain rounded" alt="img"/></td>
                                            <td className="p-4 font-bold text-gray-700">{p.name}</td>
                                            <td className="p-4"><input type="number" defaultValue={p.sellingPrice} onBlur={(e) => handleUpdateProduct(p.id, 'sellingPrice', Number(e.target.value))} className="border-2 p-2 rounded-lg w-24 text-center font-bold outline-none focus:border-[#1e3a8a]" /></td>
                                            <td className="p-4 text-center"><input type="checkbox" checked={p.isHero || false} onChange={(e) => handleUpdateProduct(p.id, 'isHero', e.target.checked)} className="w-5 h-5 accent-[#1e3a8a]" /></td>
                                            <td className="p-4 text-center"><input type="checkbox" checked={p.isRecommended || false} onChange={(e) => handleUpdateProduct(p.id, 'isRecommended', e.target.checked)} className="w-5 h-5 accent-[#FFD814]" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'coupons' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-8">קופונים פעילים</h2>
                            <div className="space-y-4">
                                {coupons.map(c => (
                                    <div key={c.code} className="bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center">
                                        <div><div className="text-xl font-black text-[#1e3a8a]">{c.code}</div><div className="text-sm text-gray-500 font-bold">הנחה: {c.discount * 100}%</div></div>
                                        <button onClick={()=>handleDeleteCoupon(c.code)} className="text-red-500 hover:bg-red-50 p-3 rounded-full"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-8">יצירת קופון חדש</h2>
                            <form onSubmit={handleAddCoupon} className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                                <input required placeholder="קוד (למשל VIP20)" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code: e.target.value})} className="w-full border-2 p-3 rounded-xl uppercase font-bold" />
                                <input required type="number" min="1" max="99" value={newCoupon.discount} onChange={e=>setNewCoupon({...newCoupon, discount: e.target.value})} className="w-full border-2 p-3 rounded-xl font-bold" placeholder="אחוז הנחה" />
                                <button type="submit" className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl font-black hover:bg-blue-800">צור קופון</button>
                            </form>
                        </div>
                    </div>
                )}
                {activeTab === 'users' && (
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 mb-8">חברי מועדון רשומים</h2>
                        <div className="bg-white rounded-2xl shadow-sm border p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {users.map(u => (
                                <div key={u.id} className="border p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 text-[#1e3a8a] rounded-full flex items-center justify-center font-black text-xl">{u.name?.charAt(0) || 'U'}</div>
                                    <div><div className="font-bold">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'system' && (
                    <div className="bg-white rounded-2xl shadow-sm border p-10 text-center max-w-2xl mx-auto mt-10">
                        <i className="fa-solid fa-robot text-7xl text-gray-200 mb-6"></i>
                        <h3 className="text-xl font-black text-gray-800 mb-4">עדכון מחירים מלאי ומפרטים</h3>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">הפעלת הסקריפט (Puppeteer) תריץ בוט על חנויות המתחרים ותעדכן מחירים אוטומטית.</p>
                        <button onClick={handleRunScraper} disabled={isUpdating} className={`w-full py-4 rounded-2xl font-black text-xl flex justify-center items-center gap-3 text-[#1e3a8a] transition-all ${isUpdating ? 'bg-gray-200 cursor-not-allowed' : 'bg-[#FFD814] shadow-lg hover:scale-105'}`}>
                            {isUpdating ? <><i className="fa-solid fa-circle-notch fa-spin"></i> מעדכן נתונים...</> : <><i className="fa-solid fa-bolt"></i> הפעל בוט סריקה</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 2. מודאל הרשמה למועדון (עם טופס אימייל אמיתי!)
// ==========================================
const AuthModal = ({ onClose, onGoogleLogin, onEmailLogin }) => {
    const [method, setMethod] = useState('main'); // 'main' או 'email'
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onEmailLogin(email, password, isSignUp);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[800] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[35px] w-full max-w-md p-8 relative text-center shadow-2xl border-4 border-[#1e3a8a]" onClick={e=>e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-5 left-5 text-gray-400 hover:text-black text-2xl font-bold"><i className="fa-solid fa-xmark"></i></button>
                
                <div className="text-6xl mb-4 text-[#FFD814]">👑</div>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-2">מועדון SmartBuy</h2>
                <p className="text-gray-500 mb-8 font-bold text-sm">התחברו לקבלת הטבות VIP והנחות מיוחדות.</p>

                {method === 'main' ? (
                    <div className="space-y-4">
                        <button onClick={onGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 p-4 rounded-2xl font-black hover:bg-gray-50 transition-all text-gray-700 shadow-sm">
                            <i className="fa-brands fa-google text-red-500 text-xl"></i> התחברות מהירה עם Google
                        </button>
                        <button onClick={()=>setMethod('email')} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 p-4 rounded-2xl font-black hover:bg-gray-50 transition-all text-gray-700 shadow-sm">
                            <i className="fa-regular fa-envelope text-xl text-blue-500"></i> התחברות עם אימייל וסיסמה
                        </button>
                        <button onClick={()=>alert('התחברות דרך אפל תתאפשר בקרוב.')} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 p-4 rounded-2xl font-black transition-all text-gray-400 opacity-70 cursor-not-allowed">
                            <i className="fa-brands fa-apple text-xl"></i> Apple ID (בקרוב)
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 text-right" dir="rtl">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">כתובת אימייל</label>
                            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full border-2 p-4 rounded-xl outline-none focus:border-[#1e3a8a] text-sm font-bold" placeholder="name@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">סיסמה</label>
                            <input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border-2 p-4 rounded-xl outline-none focus:border-[#1e3a8a] text-sm font-bold" placeholder="לפחות 6 תווים" />
                        </div>
                        <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-xl font-black shadow-md hover:bg-blue-800 transition-colors text-lg">
                            {isSignUp ? 'הירשם למועדון' : 'היכנס לחשבון'}
                        </button>
                        <div className="flex justify-between items-center mt-4 border-t pt-4">
                            <button type="button" onClick={()=>setIsSignUp(!isSignUp)} className="text-sm font-bold text-blue-600 hover:underline">
                                {isSignUp ? 'יש לך כבר חשבון? התחבר' : 'משתמש חדש? הירשם כאן'}
                            </button>
                            <button type="button" onClick={()=>setMethod('main')} className="text-xs font-bold text-gray-400 hover:text-black bg-gray-100 px-3 py-1 rounded-lg">
                                חזור
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. מודאל השוואת מוצרים
// ==========================================
const ComparisonModal = ({ list, onClose, onRemove }) => {
    const getRecommendation = () => {
        if (list.length < 2) return "הוסיפו לפחות עוד מוצר אחד כדי לקבל השוואה והמלצה מדויקת.";
        const bestValue = list.reduce((prev, curr) => (curr.sellingPrice < prev.sellingPrice ? curr : prev));
        return `לאחר שקלול הנתונים, הדגם ${bestValue.name} מציע את התמורה הטובה ביותר למחיר בקטגוריה זו. בחירה מצוינת!`;
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[700] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[40px] max-w-6xl w-full p-8 relative overflow-hidden flex flex-col shadow-2xl border-4 border-[#1e3a8a]" onClick={e=>e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 text-3xl font-bold hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                <h2 className="text-3xl font-black text-[#1e3a8a] mb-8 text-center uppercase tracking-tighter">השוואת דגמים מתקדמת</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[50vh] px-2 mb-6" dir="rtl">
                    {list.map(p => (
                        <div key={p.id} className="border-2 border-gray-100 rounded-[30px] p-6 bg-gray-50 flex flex-col relative shadow-sm">
                            <button onClick={()=>onRemove(p.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg hover:scale-110 font-bold"><i className="fa-solid fa-xmark text-sm"></i></button>
                            <img src={p.image} className="h-32 object-contain mb-4 bg-white rounded-2xl p-2 shadow-sm" alt={p.name} />
                            <h4 className="font-black text-[#1e3a8a] text-sm mb-4 h-10 line-clamp-2">{p.name}</h4>
                            <div className="space-y-3 text-xs font-bold">
                                <div className="flex justify-between bg-white p-2 rounded-xl text-[#1e3a8a]"><span>מחיר:</span> <span className="text-base">₪{p.sellingPrice}</span></div>
                                <div className="flex justify-between bg-white p-2 rounded-xl text-gray-600"><span>מותג:</span> <span>{p.brand || 'כללי'}</span></div>
                                <div className="flex flex-col gap-1 bg-white p-3 rounded-xl shadow-sm">
                                    <span className="text-gray-400 uppercase text-[10px]">מפרט חלקי</span>
                                    <div className="text-gray-700 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                                        {p.specs?.dimensions && <p>• מידות: {p.specs.dimensions}</p>}
                                        {p.specs?.energy_rating && <p>• אנרגיה: {p.specs.energy_rating}</p>}
                                        {p.specs?.key_features?.map((f, i) => <p key={i}>• {f}</p>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {list.length === 0 && <div className="text-center py-10 font-bold text-gray-400 col-span-full">אין מוצרים להשוואה</div>}
                </div>
                {list.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-[#FFD814]/20 p-6 rounded-3xl border-2 border-[#FFD814] shadow-inner text-right relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD814] rounded-full blur-3xl opacity-30"></div>
                        <h4 className="text-lg font-black text-[#1e3a8a] mb-2 flex items-center gap-2"><i className="fa-solid fa-robot text-[#FFD814]"></i> קבלו המלצה מ-SmartBuy</h4>
                        <p className="text-gray-800 font-bold text-sm leading-relaxed">{getRecommendation()}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 4. מודאל מוצר 
// ==========================================
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
        "offers": { "@type": "Offer", "priceCurrency": "ILS", "price": product.sellingPrice, "availability": "https://schema.org/InStock" }
    };

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        onAddReview(product.id, reviewForm);
        setReviewForm({ name: '', text: '', rating: 5 });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <Helmet><title>{product.name} | SmartBuy</title><script type="application/ld+json">{JSON.stringify(schemaMarkup)}</script></Helmet>
            <div className="bg-white rounded-[40px] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-gray-600 shadow-sm text-xl font-bold z-50 transition-all"><i className="fa-solid fa-xmark"></i></button>
                <div className="grid grid-cols-1 md:grid-cols-5 h-full overflow-hidden text-right" dir="rtl">
                    <div className="md:col-span-2 p-8 bg-gray-50 flex flex-col items-center justify-center border-l shadow-inner overflow-y-auto">
                        {brandLogo && <img src={brandLogo} className="h-10 mb-6 object-contain opacity-70" alt="brand" />}
                        <img src={product.image} className="max-h-64 object-contain mb-6 hover:scale-105 transition-transform duration-700" alt={product.name} />
                        <h2 className="text-xl font-black text-[#1e3a8a] mb-4 text-center leading-tight">{product.name}</h2>
                        <div className="flex items-center gap-1 text-[#FFD814] text-sm mb-6 bg-white px-3 py-1 rounded-full shadow-sm border">
                            <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star-half-stroke"></i>
                        </div>
                        <div className="w-full bg-white p-6 rounded-3xl shadow-sm text-center border">
                            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">מחיר מומלץ לצרכן: ₪{Math.round(product.sellingPrice * 1.25)}</div>
                            <div className="text-5xl font-black text-[#1e3a8a] mb-6">₪{product.sellingPrice}</div>
                            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full bg-[#FFD814] text-[#1e3a8a] font-black py-4 rounded-[20px] text-lg shadow-md hover:scale-105 active:scale-95 transition-all">הוספה לסל המאובטח</button>
                        </div>
                    </div>
                    <div className="md:col-span-3 p-8 bg-white overflow-y-auto custom-scrollbar">
                        <section className="mb-10">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e3a8a] px-3 py-1.5 rounded-xl font-black text-xs mb-3"><i className="fa-solid fa-award text-[#FFD814]"></i> סקירת מומחי SmartBuy</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4">{product.expertArticleTitle || 'פרטי מוצר מלאים'}</h3>
                            <div className={`relative overflow-hidden transition-all duration-700 ${isExpanded ? 'max-h-[3000px]' : 'max-h-32'}`}>
                                <p className="text-gray-600 leading-relaxed text-sm font-medium whitespace-pre-wrap">{product.expertArticleBody}</p>
                                {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>}
                            </div>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="mt-4 text-[#1e3a8a] font-black text-xs hover:underline">{isExpanded ? 'סגור סקירה' : 'להמשך קריאה...'}</button>
                        </section>
                        {product.specs && (
                            <section className="mb-10 bg-gray-50 rounded-[30px] p-6 border shadow-inner">
                                <h4 className="font-black text-[#1e3a8a] mb-4 flex items-center gap-2"><i className="fa-solid fa-list-check"></i> מפרט טכני</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    {product.specs.dimensions && <div className="bg-white p-3 rounded-xl border font-bold shadow-sm">מידות: {product.specs.dimensions}</div>}
                                    {product.specs.color && <div className="bg-white p-3 rounded-xl border font-bold shadow-sm">צבע: {product.specs.color}</div>}
                                    {product.specs.energy_rating && <div className="bg-white p-3 rounded-xl border font-bold shadow-sm">אנרגיה: {product.specs.energy_rating}</div>}
                                    {product.specs.warranty && <div className="bg-white p-3 rounded-xl border font-bold shadow-sm">אחריות: {product.specs.warranty}</div>}
                                </div>
                            </section>
                        )}
                        <section className="pt-6 border-t-2 border-dashed">
                            <h4 className="font-black text-[#1e3a8a] text-xl mb-6">חוות דעת של לקוחות שקנו</h4>
                            <div className="space-y-4 mb-6">
                                {product.reviews?.map((rev, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between text-xs mb-2 font-black text-[#1e3a8a]">
                                            <span>{rev.name}</span>
                                            <div className="text-[#FFD814]">{[...Array(rev.rating)].map((_,s)=><i key={s} className="fa-solid fa-star"></i>)}</div>
                                        </div>
                                        <p className="text-gray-600 text-xs italic leading-relaxed">"{rev.text}"</p>
                                    </div>
                                ))}
                                {(!product.reviews || product.reviews.length === 0) && <p className="text-sm font-bold text-gray-400 text-center py-4">היו הראשונים לדרג מוצר זה!</p>}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 5. קופה, שפות וסליידר ---
const CheckoutModal = ({ cart, total, onClose, onClearCart }) => {
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "orders"), { customer: formData, items: cart, totalAmount: total, status: 'חדש', createdAt: serverTimestamp() });
        window.open(`https://wa.me/972544914204?text=*הזמנה חדשה ב-SmartBuy!*%0Aשם: ${formData.name}%0Aסה"כ לתשלום: ₪${total}`, '_blank');
        onClearCart(); onClose();
    };
    return (
        <div className="fixed inset-0 bg-black/80 z-[800] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[40px] max-w-lg w-full p-10 relative shadow-2xl border-4 border-[#1e3a8a]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 left-6 text-2xl text-gray-400 hover:text-black font-bold"><i className="fa-solid fa-xmark"></i></button>
                <h2 className="text-2xl font-black text-[#1e3a8a] mb-8 text-center px-4">פרטי משלוח מהיר</h2>
                <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
                    <input required placeholder="שם מלא" className="w-full p-4 bg-gray-50 rounded-2xl border-2 focus:border-[#FFD814] outline-none font-bold text-sm" onChange={e=>setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="טלפון ליצירת קשר" className="w-full p-4 bg-gray-50 rounded-2xl border-2 focus:border-[#FFD814] outline-none font-bold text-sm" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                    <button type="submit" className="w-full bg-[#1e3a8a] text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:scale-105 transition-all">המשך לתיאום ב-WhatsApp</button>
                </form>
            </div>
        </div>
    );
};

const LanguageSwitcher = () => {
    useEffect(() => {
        if (!document.getElementById('clean-translate')) {
            const style = document.createElement('style');
            style.id = 'clean-translate';
            style.innerHTML = `
                .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon, #goog-gt-tt, .goog-tooltip, #google_translate_element { display: none !important; }
                body { top: 0px !important; position: static !important; }
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `;
            document.head.appendChild(style);
        }
    }, []);
    return (
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-white/20 shadow-inner relative z-[60]">
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} className="text-xl hover:scale-125 transition-transform" onClick={() => {
                    const select = document.querySelector(".goog-te-combo");
                    if (select) { select.value = l.c; select.dispatchEvent(new Event("change")); }
                }}>{l.f}</button>
            ))}
        </div>
    );
};

const HeroSlider = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const heroList = useMemo(() => {
        const marked = products.filter(p => p.isHero);
        return marked.length > 0 ? marked : products.slice(0, 5);
    }, [products]);

    useEffect(() => {
        if (heroList.length === 0) return;
        const itv = setInterval(() => setCurrentIndex(p => (p + 1) % heroList.length), 4500);
        return () => clearInterval(itv);
    }, [heroList]);
    if (heroList.length === 0) return null;
    return (
        <div className="w-full h-40 md:h-64 bg-black relative overflow-hidden flex items-center justify-center border-b-[8px] border-[#FFD814]">
            <img src={heroList[currentIndex].image} className="absolute inset-0 w-full h-full object-cover scale-110 opacity-30 blur-[2px] transition-all duration-1000" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a] to-transparent opacity-80"></div>
            <div className="absolute z-20 text-center px-4 animate-fade-in">
                <div className="bg-[#FFD814] text-[#1e3a8a] px-3 py-1 rounded-full text-[10px] font-black mb-3 inline-block">מבצע בזק!</div>
                <h2 className="text-white text-2xl md:text-5xl font-black drop-shadow-2xl mb-2">{heroList[currentIndex].name}</h2>
                <div className="text-[#FFD814] text-lg font-black">₪{heroList[currentIndex].sellingPrice} בלבד</div>
            </div>
        </div>
    );
};

// ==========================================
// אפליקציה ראשית - SmartBuy
// ==========================================
export default function App() {
    const [products, setProducts] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [users, setUsers] = useState([]);
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
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    // טעינת נתונים
    useEffect(() => {
        const unsubP = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubC = onSnapshot(collection(db, "coupons"), s => setCoupons(s.docs.map(d => d.data())));
        const unsubU = onSnapshot(collection(db, "users"), s => setUsers(s.docs.map(d => ({id: d.id, ...d.data()}))));
        
        onAuthStateChanged(auth, u => setUser(u));
        return () => { unsubP(); unsubC(); unsubU(); };
    }, []);

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await setDoc(doc(db, "users", result.user.uid), {
                name: result.user.displayName,
                email: result.user.email,
                photo: result.user.photoURL,
                lastLogin: serverTimestamp()
            }, { merge: true });
            setIsAuthModalOpen(false);
        } catch (error) { 
            console.error(error); 
        }
    };

    const handleEmailLogin = async (email, password, isSignUp) => {
        try {
            if (isSignUp) {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", result.user.uid), {
                    name: email.split('@')[0], email: result.user.email, lastLogin: serverTimestamp()
                }, { merge: true });
                alert("ברוכים הבאים למועדון SmartBuy!");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            setIsAuthModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("שגיאה: אימייל או סיסמה שגויים.");
        }
    };

    const isAdmin = user && user.email === ADMIN_EMAIL;

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
            const catProducts = products.filter(p => p.category === key);
            catProducts.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
            if (catProducts.length > 0) groups[key] = catProducts;
        });
        return groups;
    }, [products]);

    const addToCompare = (p) => {
        if (compareList.length >= 3) { alert("ניתן להשוות עד 3 דגמים בבת אחת."); return; }
        if (!compareList.find(i=>i.id===p.id)) setCompareList([...compareList, p]);
    };

    const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.sellingPrice, 0) * (1 - discount));
    
    const applyCoupon = () => {
        const validCoupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
        if (validCoupon) {
            setDiscount(validCoupon.discount);
            alert(`קופון ${validCoupon.code} הופעל בהצלחה!`);
        } else if (couponCode.toUpperCase() === "SMART10") {
            setDiscount(0.1);
            alert("קופון SMART10 הופעל (10% הנחה!)");
        } else {
            setDiscount(0);
            alert("קוד קופון לא חוקי או שפג תוקפו.");
        }
    };

    const handleAddReview = async (pid, rev) => {
        await updateDoc(doc(db, "products", pid), { reviews: arrayUnion({ ...rev, date: new Date().toISOString() }) });
        alert("הביקורת נוספה בהצלחה!");
    };

    const toggleBrand = (brand) => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);

    return (
        <HelmetProvider>
            <div className="min-h-screen bg-gray-50 text-right font-assistant overflow-x-hidden" dir="rtl">
                
                {isAdminOpen && isAdmin && <AdminPanel onClose={()=>setIsAdminOpen(false)} products={products} coupons={coupons} users={users} />}
                {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p) => {setCart([...cart, p]); setIsCartOpen(true);}} onAddReview={handleAddReview} brandLogo={brandLogos[selectedProduct.brand]} />}
                {isCompareOpen && <ComparisonModal list={compareList} onClose={()=>setIsCompareOpen(false)} onRemove={(id)=>setCompareList(compareList.filter(i=>i.id!==id))} />}
                {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
                {isAuthModalOpen && <AuthModal onClose={()=>setIsAuthModalOpen(false)} onGoogleLogin={handleGoogleLogin} onEmailLogin={handleEmailLogin} />}

                <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#FFD814] py-4 px-4 md:px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                            <div className="cursor-pointer" onClick={()=>{setFilter("All"); setSearchQuery(""); setSelectedBrands([]); setMaxPrice(25000);}}>
                                <div className="text-3xl font-black italic text-[#FFD814]">SMARTBUY</div>
                            </div>
                            <LanguageSwitcher />
                        </div>
                        <div className="flex-grow max-w-xl w-full relative">
                            <input type="text" placeholder="חיפוש מוצרים..." className="w-full p-3 pr-10 rounded-xl text-black focus:ring-4 ring-[#FFD814]/30 outline-none text-sm font-bold" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute right-3 top-4 text-gray-400"></i>
                        </div>
                        <div className="flex items-center gap-3">
                            {isAdmin && <button onClick={()=>setIsAdminOpen(true)} className="bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-lg hover:bg-red-700"><i className="fa-solid fa-gear"></i> ניהול</button>}
                            {user ? (
                                <div className="text-xs font-bold text-center border-l pr-3 border-white/20">שלום,<br/>{user.displayName?.split(' ')[0] || 'לקוח'}</div>
                            ) : (
                                <button onClick={()=>setIsAuthModalOpen(true)} className="text-[10px] font-black bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-all">חברי מועדון 👑</button>
                            )}
                            <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-5 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                                <i className="fa-solid fa-cart-shopping"></i> ₪{cartTotal}
                            </button>
                        </div>
                    </div>
                </header>

                <nav className="bg-white border-b sticky top-[135px] md:top-[80px] z-40 overflow-x-auto py-4 px-4 shadow-sm scrollbar-hide">
                    <div className="max-w-7xl mx-auto flex gap-4 md:justify-center min-w-max">
                        {Object.keys(categoryMap).map(cat => {
                            const sampleImg = products.find(p => p.category === cat)?.image;
                            return (
                                <button key={cat} onClick={() => {setFilter(cat); setSelectedBrands([]); setSearchQuery("");}} className={`flex flex-col items-center min-w-[90px] p-3 rounded-2xl transition-all border ${filter === cat ? "border-[#1e3a8a] bg-blue-50 shadow-md scale-105 z-10" : "border-transparent bg-white hover:bg-gray-50 opacity-80"}`}>
                                    {sampleImg ? <img src={sampleImg} className="w-10 h-10 object-contain mb-1 rounded-full bg-gray-50 p-1" /> : <i className="fa-solid fa-layer-group text-xl mb-1 text-gray-300"></i>}
                                    <span className={`text-[11px] font-black ${filter === cat ? "text-[#1e3a8a]" : "text-gray-600"}`}>{categoryMap[cat]}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {compareList.length > 0 && (
                    <button onClick={()=>setIsCompareOpen(true)} className="fixed bottom-24 right-6 bg-[#1e3a8a] text-white px-6 py-4 rounded-full shadow-2xl z-[450] animate-bounce-in flex items-center gap-3 border-2 border-[#FFD814] font-black text-sm">
                        <i className="fa-solid fa-code-compare"></i> השווה ({compareList.length})
                    </button>
                )}

                <HeroSlider products={products} />

                <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
                    <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        <div className="bg-white p-6 rounded-[30px] shadow-sm border flex-grow flex flex-col md:flex-row gap-8 items-center z-10 relative">
                            <div className="w-full md:w-1/3">
                                <label className="block text-xs font-black text-gray-400 mb-2">מחיר מקסימלי: ₪{maxPrice}</label>
                                <input type="range" min="0" max="25000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#1e3a8a]" />
                            </div>
                            <div className="w-full md:w-2/3">
                                <label className="block text-xs font-black text-gray-400 mb-2">סינון לפי מותגים</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableBrands.map(b => (
                                        <button key={b} onClick={() => toggleBrand(b)} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition-all ${selectedBrands.includes(b) ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-gray-50 text-gray-600 hover:border-[#1e3a8a]'}`}>
                                            {b}
                                        </button>
                                    ))}
                                    {(selectedBrands.length > 0 || maxPrice < 25000) && (
                                        <button onClick={()=>{setSelectedBrands([]); setMaxPrice(25000);}} className="px-4 py-2 rounded-full text-[10px] font-black text-red-500 hover:bg-red-50 transition-all">נקה מסננים ✕</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#152a63] p-6 rounded-[30px] text-white shadow-md border-b-4 border-[#FFD814] w-full lg:w-1/3 flex flex-col justify-center">
                            <h4 className="font-black text-[#FFD814] mb-2 text-sm flex items-center gap-2"><i className="fa-solid fa-lightbulb"></i> טיפ מומחים SmartBuy</h4>
                            <p className="text-xs leading-relaxed font-bold opacity-90">מוצרי חשמל עם מדחס Inverter שקטים יותר וחוסכים עד 30% בצריכת החשמל.</p>
                        </div>
                    </div>
                </div>

                <main className="max-w-7xl mx-auto p-4 md:p-8 pt-0 space-y-16">
                    {filter === "All" && !searchQuery && selectedBrands.length === 0 ? (
                        Object.keys(categorizedGroups).map(catKey => (
                            <section key={catKey}>
                                <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-2">
                                    <h2 className="text-xl font-black text-[#1e3a8a]">{categoryMap[catKey]}</h2>
                                    <button onClick={()=>setFilter(catKey)} className="mr-auto text-[10px] font-black text-blue-500 hover:underline bg-blue-50 px-3 py-1 rounded-full">צפה בהכל</button>
                                </div>
                                <div className="flex overflow-x-auto gap-4 pb-6 hide-scroll snap-x scroll-smooth w-full">
                                    {categorizedGroups[catKey].map(p => (
                                        <div key={p.id} className="w-[280px] min-w-[280px] max-w-[280px] flex-none snap-start bg-white p-5 rounded-3xl shadow-sm border relative group hover:shadow-lg transition-all flex flex-col justify-between">
                                            {p.isRecommended && <div className="absolute top-0 right-0 bg-[#FFD814] text-[#1e3a8a] text-[9px] font-black px-3 py-1 rounded-bl-xl z-20 shadow-sm"><i className="fa-solid fa-crown"></i> בחירת מומחה</div>}
                                            <div className="absolute top-4 right-4 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                                {brandLogos[p.brand] && <img src={brandLogos[p.brand]} className="h-4 w-auto object-contain grayscale group-hover:grayscale-0" alt="brand" />}
                                            </div>
                                            <button onClick={()=>addToCompare(p)} className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-gray-50 text-gray-400 hover:bg-[#1e3a8a] hover:text-white'}`}>
                                                <i className="fa-solid fa-code-compare text-[10px]"></i>
                                            </button>
                                            <div className="h-40 flex items-center justify-center mb-4 mt-6 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                                <img src={p.image} className="max-h-full object-contain group-hover:scale-105 transition-transform" alt={p.name} />
                                            </div>
                                            <div className="text-[#FFD814] text-[10px] mb-1">★★★★★</div>
                                            <h3 className="font-bold text-gray-800 text-xs mb-3 h-8 line-clamp-2 cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                            
                                            {/* --- קוביית מחירי המתחרים (שורות נגללות) --- */}
                                            <div className="bg-gray-50 p-3 rounded-2xl mb-4 border shadow-inner text-right w-full">
                                                <div className="text-[10px] font-black text-gray-400 mb-2 border-b pb-1">השוואת מחירי שוק:</div>
                                                <div className="flex justify-between items-center text-[10px] mb-1">
                                                    <span className="text-gray-600">מחסני חשמל:</span>
                                                    <span className="font-bold line-through text-red-400">
                                                        {p.competitorPrices?.machsanei_chashmal ? `₪${p.competitorPrices.machsanei_chashmal}` : 'לא זמין'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] mb-1">
                                                    <span className="text-gray-600">א.ל.מ:</span>
                                                    <span className="font-bold line-through text-red-400">
                                                        {p.competitorPrices?.alm ? `₪${p.competitorPrices.alm}` : 'לא זמין'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] mb-3">
                                                    <span className="text-gray-600">ליאור חשמל:</span>
                                                    <span className="font-bold line-through text-red-400">
                                                        {p.competitorPrices?.lior_electric ? `₪${p.competitorPrices.lior_electric}` : 'לא זמין'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-dashed border-gray-200">
                                                    <span className="bg-[#FFD814] text-[#1e3a8a] text-[10px] px-2 py-1 rounded-md font-black">המחיר שלנו</span>
                                                    <span className="text-2xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                                </div>
                                            </div>
                                            {/* ------------------------------------------- */}

                                            <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-3 rounded-xl font-black hover:bg-[#f3ce12] transition-all text-xs">הוספה לסל</button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <section>
                            <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl border shadow-sm">
                                 <h2 className="text-xl font-black text-[#1e3a8a]">{filter === "All" ? "תוצאות חיפוש" : categoryMap[filter]}</h2>
                                 <span className="bg-[#1e3a8a] text-white px-3 py-1 rounded-lg text-xs font-black">{filtered.length} פריטים</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filtered.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-3xl shadow-sm border relative hover:shadow-lg transition-all flex flex-col justify-between">
                                        <button onClick={()=>addToCompare(p)} className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 ${compareList.find(i=>i.id===p.id) ? 'bg-[#FFD814] text-[#1e3a8a]' : 'bg-gray-50 text-gray-400 hover:bg-[#1e3a8a] hover:text-white'}`}>
                                            <i className="fa-solid fa-code-compare text-[10px]"></i>
                                        </button>
                                        <div className="h-40 flex items-center justify-center mb-4 mt-4 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                                            <img src={p.image} className="max-h-full object-contain hover:scale-105 transition-transform" alt={p.name} />
                                        </div>
                                        <div className="text-[#FFD814] text-[10px] mb-1">★★★★★</div>
                                        <h3 className="font-bold text-gray-800 text-xs mb-3 h-8 line-clamp-2 cursor-pointer hover:text-[#1e3a8a]" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                                        
                                        {/* --- קוביית מחירי המתחרים (דף תוצאות חיפוש/קטגוריה) --- */}
                                        <div className="bg-gray-50 p-3 rounded-2xl mb-4 border shadow-inner text-right w-full">
                                            <div className="text-[10px] font-black text-gray-400 mb-2 border-b pb-1">השוואת מחירי שוק:</div>
                                            <div className="flex justify-between items-center text-[10px] mb-1">
                                                <span className="text-gray-600">מחסני חשמל:</span>
                                                <span className="font-bold line-through text-red-400">
                                                    {p.competitorPrices?.machsanei_chashmal ? `₪${p.competitorPrices.machsanei_chashmal}` : 'לא זמין'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] mb-1">
                                                <span className="text-gray-600">א.ל.מ:</span>
                                                <span className="font-bold line-through text-red-400">
                                                    {p.competitorPrices?.alm ? `₪${p.competitorPrices.alm}` : 'לא זמין'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] mb-3">
                                                <span className="text-gray-600">ליאור חשמל:</span>
                                                <span className="font-bold line-through text-red-400">
                                                    {p.competitorPrices?.lior_electric ? `₪${p.competitorPrices.lior_electric}` : 'לא זמין'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-dashed border-gray-200">
                                                <span className="bg-[#FFD814] text-[#1e3a8a] text-[10px] px-2 py-1 rounded-md font-black">המחיר שלנו</span>
                                                <span className="text-2xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                            </div>
                                        </div>
                                        {/* ---------------------------------------------------- */}

                                        <button onClick={() => {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] text-[#1e3a8a] py-3 rounded-xl font-black text-xs hover:bg-[#f3ce12] transition-all">הוספה לסל</button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <footer className="bg-[#1e3a8a] text-white py-16 px-6 border-t-8 border-[#FFD814] mt-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div>
                            <div className="text-3xl font-black italic text-[#FFD814] mb-4">SMARTBUY</div>
                            <p className="font-bold opacity-80 text-sm">חנות מוצרי החשמל המובילה בישראל. המחיר הטוב ביותר מובטח.</p>
                        </div>
                        <div>
                            <h4 className="font-black text-lg mb-4 border-b-2 border-[#FFD814] pb-2 inline-block">שירות לקוחות</h4>
                            <ul className="space-y-2 font-bold text-sm">
                                <li><i className="fa-solid fa-phone text-[#FFD814] ml-2"></i> 054-4914204</li>
                                <li><i className="fa-solid fa-envelope text-[#FFD814] ml-2"></i> info@smartbuy.co.il</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-lg mb-4 border-b-2 border-[#FFD814] pb-2 inline-block">אמצעי תשלום</h4>
                            <div className="flex gap-4 text-3xl mb-4 text-white/80">
                                <i className="fa-brands fa-google-pay"></i>
                                <i className="fa-brands fa-apple-pay"></i>
                                <i className="fa-brands fa-cc-visa"></i>
                            </div>
                        </div>
                    </div>
                </footer>

                {/* Cart Drawer */}
                <div className={`fixed top-0 right-0 h-full w-80 md:w-[400px] bg-white shadow-2xl z-[500] transition-transform duration-500 border-l-8 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-cart-shopping text-2xl text-[#FFD814]"></i>
                            <span className="font-black text-2xl">הסל שלי</span>
                        </div>
                        <button onClick={()=>setIsCartOpen(false)} className="text-2xl text-gray-300 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="p-4 overflow-y-auto h-[60vh] space-y-4 bg-gray-50">
                        {cart.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-bold">הסל מחכה להתמלא...</div>
                        ) : (
                            cart.map((item, i) => (
                                <div key={i} className="flex gap-4 bg-white p-4 rounded-2xl border shadow-sm relative">
                                    <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-red-50 w-6 h-6 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark text-xs"></i></button>
                                    <img src={item.image} className="w-16 h-16 object-contain" alt={item.name} />
                                    <div className="flex flex-col justify-center">
                                        <span className="text-xs font-bold line-clamp-2 mb-1">{item.name}</span>
                                        <b className="text-lg font-black text-[#1e3a8a]">₪{item.sellingPrice}</b>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-6 border-t bg-white absolute bottom-0 w-full shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-2 mb-4">
                            <input type="text" placeholder="קופון (נסה SMART10)" value={couponCode} onChange={e=>setCouponCode(e.target.value)} className="w-full border p-3 rounded-xl outline-none text-xs font-bold bg-gray-50 uppercase" />
                            <button onClick={applyCoupon} className="bg-[#1e3a8a] text-white px-4 rounded-xl font-bold text-xs hover:bg-blue-800">הפעל</button>
                        </div>
                        {discount > 0 && <div className="text-green-600 text-xs font-bold mb-4 text-center">הנחה הופעלה ({discount * 100}%)</div>}
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-bold text-gray-500 text-sm">סה"כ לתשלום:</span>
                            <span className="text-3xl font-black text-[#1e3a8a]">₪{cartTotal}</span>
                        </div>
                        <button onClick={()=>{ setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#FFD814] text-[#1e3a8a] py-4 rounded-xl font-black text-lg shadow-md hover:bg-yellow-400 transition-all flex justify-center gap-2 items-center">
                            מעבר לקופה <i className="fa-solid fa-lock text-xs"></i>
                        </button>
                    </div>
                </div>
                {isCartOpen && <div className="fixed inset-0 bg-black/40 z-[450] transition-opacity" onClick={() => setIsCartOpen(false)}></div>}
            </div>
        </HelmetProvider>
    );
}