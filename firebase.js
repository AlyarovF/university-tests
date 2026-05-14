import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAxyaRDp8uuXSlAxEDg7PlfBC1QYFjiOQ",
  authDomain: "test-43140.firebaseapp.com",
  projectId: "test-43140",
  storageBucket: "test-43140.firebasestorage.app",
  messagingSenderId: "560664238334",
  appId: "1:560664238334:web:41a985850fc8b9002d6daf",
  measurementId: "G-MQK4YM7J72"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed", error);
        alert("Kirishda xatolik yuz berdi: " + error.message);
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const saveResult = async (userEmail, subjectId, variantId, correct, incorrect, answers) => {
    try {
        // Path: users/{userEmail}/results/{subjectId}_{variantId}
        const userDocRef = doc(db, "users", userEmail);
        const resultDocRef = doc(collection(userDocRef, "results"), `${subjectId}_${variantId}`);
        
        await setDoc(resultDocRef, {
            subjectId,
            variantId,
            correct,
            incorrect,
            answers,
            timestamp: serverTimestamp()
        }, { merge: true }); // Merge true to overwrite previous attempt or update
        
        return true;
    } catch (error) {
        console.error("Error saving result: ", error);
        return false;
    }
};
