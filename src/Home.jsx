import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig'; // וודא שהשם תואם לקובץ ההגדרות שלך
import { collection, onSnapshot } from 'firebase/firestore';

const ProductCard = ({ product }) => (
    <div className="bg-white p-4 border border-gray-200 rounded-sm shadow-sm hover:shadow-md transition-shadow text-right flex flex-col justify-between h-full">
        <div>
            <div className="h-48 flex items-center justify-center mb-4 relative">
                <img src={product.image || 'https://via.placeholder.com/200'} alt={product.name} className="max-h-full max-w-full object-contain" />
            </div>
            <h3 className="text-sm font-bold leading-tight mb-2 text-gray-800">{product.name}</h3>
            {/* הצגת התיאור של ה-AI */}
            <p className="text-xs text-gray-600 mb-2 leading-relaxed">{product.description}</p>
        </div>
        <div className="mt-4 border-t pt-4">
            <div className="flex flex-row-reverse justify-between items-baseline">
                <div className="text-2xl font-black text-red-600">₪{product.sellingPrice}</div>
                <div className="text-gray-400 line-through text-xs">₪{Math.round(product.sellingPrice * 1.15)}</div>
            </div>
            <button className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black font-bold py-2 rounded-full mt-3 shadow-sm">
                הוספה לסל
            </button>
        </div>
    </div>
);

const Home = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        // חיבור בזמן אמת ל-Firestore - כל עדכון של הבוט יקפוץ מיד באתר!
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            const productList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productList);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-[#f3f3f3]">
            <nav className="bg-[#232f3e] p-3 text-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="text-2xl font-black italic tracking-tighter text-[#FFD814]">SMART<span className="text-white">BUY</span></div>
                    <div className="font-bold">שלום, ליאור 👋</div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 lg:p-8">
                <div className="bg-white p-4 mb-6 shadow-sm border-r-4 border-[#FFD814]">
                    <h1 className="text-xl font-bold text-gray-800">המבצעים הכי שווים ליישובים ולמושבים</h1>
                </div>
                
                {products.length === 0 ? (
                    <div className="text-center p-10 text-gray-500">מחפש מוצרים במחסן...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;