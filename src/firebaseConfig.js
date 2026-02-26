// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // הוספנו את זה כדי לעבוד עם מסד הנתונים

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCndeeXqbALJ93XChyAybvN1PWtbqNZJ4M",
  authDomain: "smartbuy-b4390.firebaseapp.com",
  projectId: "smartbuy-b4390",
  storageBucket: "smartbuy-b4390.firebasestorage.app",
  messagingSenderId: "301016485157",
  appId: "1:301016485157:web:9f291f6da715d9ab7cdecc",
  measurementId: "G-S3B6456VNX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export it
export const db = getFirestore(app); // זה קריטי - מכאן ה-Home.jsx מושך את המידע