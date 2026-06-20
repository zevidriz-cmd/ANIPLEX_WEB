import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHZGTszBO5VkrCrHzmFuXUuooVq9BP6M8",
  authDomain: "aniplex-app-f923b.firebaseapp.com",
  projectId: "aniplex-app-f923b",
  storageBucket: "aniplex-app-f923b.firebasestorage.app",
  messagingSenderId: "965933740812",
  appId: "1:965933740812:web:c08fb187a71f08a5439a8c" // Generated standard Web App Id
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
