import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

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
        }
    };

    return (
        <div className="flex gap-2 items-center bg-[#1e3a8a] px-3 py-1.5 rounded-full border border-[#D4AF37]/50 shadow-inner">
            {[ {c:'he', f:'🇮🇱'}, {c:'en', f:'🇺🇸'}, {c:'fr', f:'🇫🇷'}, {c:'ru', f:'🇷🇺'} ].map(l => (
                <button key={l.c} onClick={() => changeLanguage(l.c)} className="text-xl hover:scale-125 transition-transform">{l.f}</button>
            ))}
        </div>
    );
};

// --- מודאל קופה (Checkout) ---
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
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 relative flex flex-col md:flex-row shadow-[0_0_50px_rgba(212,175,55,0.3)] border-2 border-[#D4AF37]" onClick={e => e.stopPropagation()}>
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
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "products"), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
        onAuthStateChanged(auth, u => setUser(u ? { name: u.displayName || u.phoneNumber } : null));
        return () => unsub();
    }, []);

    const addToCart = (p) => { setCart([...cart, p]); setIsCartOpen(true); };
    const filtered = products.filter(p => (filter === "All" || p.category === filter) && p.name.includes(searchQuery) && p.sellingPrice <= maxPrice);
    const cartTotal = cart.reduce((sum, i) => sum + i.sellingPrice, 0);

    const categories = { 
        "All": "הכל", "Fridges": "מקררים", "AC": "מזגנים", "Ovens": "תנורים", "TV": "טלוויזיות" 
    };

    return (
        <div className="min-h-screen bg-gray-50 text-right font-assistant">
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
            
            {/* Header משודרג בכחול וזהב */}
            <header className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-2xl border-b-4 border-[#D4AF37]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="cursor-pointer" onClick={()=>setFilter("All")}>
                            <div className="text-4xl font-black italic text-[#FFD814] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">SMARTBUY</div>
                            <div className="text-[10px] font-bold tracking-[0.2em] text-[#D4AF37]">קנייה חכמה מתחילה כאן</div>
                        </div>
                        <LanguageSwitcher />
                    </div>
                    <div className="flex-grow max-w-xl w-full">
                        <div className="relative group">
                            <input type="text" placeholder="חפש מוצר פרימיום..." className="w-full p-3 pr-10 rounded-xl text-black border-2 border-transparent focus:border-[#FFD814] transition-all shadow-inner" onChange={e=>setSearchQuery(e.target.value)} />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-4 text-gray-400"></i>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#D4AF37]">
                            תקציב: ₪{maxPrice}
                            <input type="range" min="0" max="20000" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} className="w-full accent-[#FFD814]" />
                        </div>
                    </div>
                    <button onClick={()=>setIsCartOpen(true)} className="bg-[#FFD814] text-[#1e3a8a] px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-[0_4px_15px_rgba(255,216,20,0.3)]">
                        <i className="fa-solid fa-cart-shopping"></i>
                        <span>₪{cartTotal} ({cart.length})</span>
                    </button>
                </div>
            </header>

            {/* קטגוריות עם אייקונים */}
            <nav className="bg-white border-b sticky top-[138px] md:top-[92px] z-40 overflow-x-auto hide-scroll px-6 py-4">
                <div className="max-w-7xl mx-auto flex gap-6 md:justify-center min-w-max">
                    {Object.entries(categories).map(([key, val]) => (
                        <button key={key} onClick={() => setFilter(key)} className={`flex flex-col items-center p-2 min-w-[80px] rounded-2xl transition-all ${filter === key ? "bg-[#1e3a8a] text-[#FFD814] shadow-lg scale-110" : "hover:bg-gray-100"}`}>
                            <div className="w-10 h-10 mb-1 flex items-center justify-center bg-gray-50 rounded-full">
                                <i className={`fa-solid ${key === 'All' ? 'fa-house' : 'fa-plug'} text-lg`}></i>
                            </div>
                            <span className="text-[11px] font-bold">{val}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* רשת מוצרים */}
            <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filtered.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute top-4 right-4 bg-[#1e3a8a] text-[#D4AF37] text-[10px] font-bold px-3 py-1 rounded-full z-10">PREMIUM</div>
                        <img src={p.image} className="h-52 object-contain mb-4 group-hover:scale-110 transition-transform duration-500" />
                        <div>
                            <h3 className="font-bold text-sm mb-2 h-10 line-clamp-2 text-gray-800">{p.name}</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-3xl font-black text-[#1e3a8a]">₪{p.sellingPrice}</span>
                                <span className="text-xs text-gray-400 line-through">₪{Math.round(p.sellingPrice * 1.15)}</span>
                            </div>
                        </div>
                        <button onClick={()=>addToCart(p)} className="w-full bg-[#FFD814] text-[#1e3a8a] py-3 rounded-2xl font-black hover:bg-[#1e3a8a] hover:text-[#FFD814] transition-all shadow-md">הוספה לסל</button>
                    </div>
                ))}
            </main>

            {/* Footer מהודר */}
            <footer className="bg-[#131921] text-gray-400 py-16 px-8 border-t-8 border-[#1e3a8a]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">
                    <div>
                        <div className="text-3xl font-black italic text-[#FFD814] mb-4">SMARTBUY</div>
                        <p className="leading-relaxed">קנייה חכמה מתחילה כאן. מכשירי חשמל פרימיום בפריסה ארצית, שירות ללא פשרות ומחירים שוברי שוק.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4 border-b border-[#D4AF37] pb-2">שירות לקוחות</h4>
                        <ul className="space-y-2">
                            <li><i className="fa-solid fa-phone text-[#FFD814] ml-2"></i> 054-4914204</li>
                            <li><i className="fa-solid fa-truck text-[#FFD814] ml-2"></i> משלוחים לכל הארץ</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4 border-b border-[#D4AF37] pb-2">קנייה מאובטחת</h4>
                        <div className="flex gap-4 text-3xl mb-4 text-gray-600">
                            <i className="fa-brands fa-cc-visa"></i>
                            <i className="fa-brands fa-cc-mastercard"></i>
                            <i className="fa-brands fa-cc-apple-pay"></i>
                        </div>
                    </div>
                </div>
            </footer>

            {/* מגירת סל (מתוקנת עם תמונות) */}
            <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-[200] transition-transform duration-500 border-r-4 border-[#1e3a8a] ${isCartOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 bg-[#1e3a8a] text-white flex justify-between items-center shadow-lg">
                    <span className="font-black text-xl text-[#FFD814]">הסל שלי</span>
                    <button onClick={()=>setIsCartOpen(false)} className="text-3xl">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto h-[70vh] space-y-4">
                    {cart.map((item, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <img src={item.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1 shadow-sm" />
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
        </div>
    );
}