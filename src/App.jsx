import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier, signOut } from "firebase/auth";

// הגדרות Firebase - זהות להגדרות שלך
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

// --- רכיב החלפת שפות (דגלים) ---
const LanguageSwitcher = () => {
    const [activeLang, setActiveLang] = useState('he');
    const languages = [
        { code: 'he', flag: '🇮🇱', name: 'עברית' },
        { code: 'en', flag: '🇺🇸', name: 'English' },
        { code: 'fr', flag: '🇫🇷', name: 'Français' },
        { code: 'ru', flag: '🇷🇺', name: 'Русский' }
    ];

    const changeLanguage = (langCode) => {
        setActiveLang(langCode);
        const selectBox = document.querySelector(".goog-te-combo");
        if (selectBox) {
            selectBox.value = langCode;
            selectBox.dispatchEvent(new Event('change'));
        }
    };

    return (
        <div className="flex gap-3 items-center bg-[#1e2630] px-4 py-2 rounded-full border border-gray-700 shadow-inner">
            {languages.map(lang => (
                <button key={lang.code} onClick={() => changeLanguage(lang.code)} className={`text-2xl transition-all ${activeLang === lang.code ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>
                    {lang.flag}
                </button>
            ))}
        </div>
    );
};

// --- רכיב קופה (Checkout) ---
const CheckoutModal = ({ cart, total, onClose, onClearCart }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', city: '', address: '', notes: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "orders"), { customer: formData, items: cart, totalAmount: total, status: 'חדש', createdAt: serverTimestamp() });
        let waText = `*הזמנה חדשה מ-SmartBuy!*%0A👤 שם: ${formData.name}%0A📍 כתובת: ${formData.address}%0A💰 סה"כ: ₪${total}`;
        onClearCart(); onClose();
        window.open(`https://wa.me/972544914204?text=${waText}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-3xl w-full p-8 relative shadow-2xl flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 text-2xl font-bold">&times;</button>
                <div className="md:w-1/2 p-4 border-l">
                    <h3 className="text-xl font-black mb-4">סיכום הזמנה</h3>
                    <div className="text-3xl font-black text-red-600">₪{total}</div>
                </div>
                <div className="md:w-1/2 p-4">
                    <h2 className="text-xl font-bold mb-4">פרטי משלוח</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input required placeholder="שם מלא" className="w-full p-2 bg-gray-100 rounded-lg" onChange={e=>setFormData({...formData, name: e.target.value})} />
                        <input required placeholder="טלפון" className="w-full p-2 bg-gray-100 rounded-lg" onChange={e=>setFormData({...formData, phone: e.target.value})} />
                        <input required placeholder="כתובת מלאה" className="w-full p-2 bg-gray-100 rounded-lg" onChange={e=>setFormData({...formData, address: e.target.value})} />
                        <button type="submit" className="w-full bg-[#131921] text-white py-3 rounded-xl font-bold">סיום הזמנה בווטסאפ</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- האפליקציה הראשית ---
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
        const unsubProducts = onSnapshot(collection(db, "products"), s => {
            setProducts(s.docs.map(d => ({id: d.id, ...d.data()})));
        });
        const unsubAuth = onAuthStateChanged(auth, u => setUser(u ? { name: u.displayName || u.phoneNumber } : null));
        return () => { unsubProducts(); unsubAuth(); };
    }, []);

    const filtered = products.filter(p => (filter === "All" || p.category === filter) && p.name.includes(searchQuery) && p.sellingPrice <= maxPrice);
    const cartTotal = cart.reduce((sum, i) => sum + i.sellingPrice, 0);

    return (
        <div className="min-h-screen text-right">
            {isCheckoutOpen && <CheckoutModal cart={cart} total={cartTotal} onClose={()=>setIsCheckoutOpen(false)} onClearCart={()=>setCart([])} />}
            
            <header className="bg-[#131921] text-white sticky top-0 z-50 p-4 border-b-4 border-[#FFD814]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="text-4xl font-black italic text-[#FFD814]">SMARTBUY</div>
                        <LanguageSwitcher />
                    </div>
                    <div className="flex-grow max-w-xl w-full">
                        <input type="text" placeholder="חפש מוצר..." className="w-full p-3 rounded-xl text-black" onChange={e=>setSearchQuery(e.target.value)} />
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-300">
                            תקציב עד: ₪{maxPrice}
                            <input type="range" min="0" max="20000" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full" />
                        </div>
                    </div>
                    <button onClick={()=>setIsCartOpen(true)} className="bg-white/10 p-3 rounded-xl flex items-center gap-2">
                        <i className="fa-solid fa-cart-shopping text-[#FFD814]"></i>
                        <span>₪{cartTotal} ({cart.length})</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <img src={p.image} className="h-48 object-contain mb-4" />
                        <h3 className="font-bold text-sm mb-2 h-10 overflow-hidden">{p.name}</h3>
                        <div className="text-2xl font-black">₪{p.sellingPrice}</div>
                        <button onClick={()=> {setCart([...cart, p]); setIsCartOpen(true);}} className="w-full bg-[#FFD814] py-2 rounded-xl mt-4 font-bold">הוספה לסל</button>
                    </div>
                ))}
            </main>

            {/* מגירת סל (פשוטה) */}
            <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-[200] transition-transform ${isCartOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 bg-[#131921] text-white flex justify-between">
                    <span className="font-bold">הסל שלי</span>
                    <button onClick={()=>setIsCartOpen(false)}>&times;</button>
                </div>
                <div className="p-4 overflow-y-auto h-[70vh]">
                    {cart.map((item, i) => <div key={i} className="border-b py-2 flex justify-between"><span>{item.name}</span><b>₪{item.sellingPrice}</b></div>)}
                </div>
                <div className="p-5 border-t">
                    <div className="text-xl font-black mb-4">סה"כ: ₪{cartTotal}</div>
                    <button onClick={()=>{setIsCartOpen(false); setIsCheckoutOpen(true);}} className="w-full bg-[#FFD814] py-4 rounded-xl font-black">מעבר לקופה</button>
                </div>
            </div>
        </div>
    );
}