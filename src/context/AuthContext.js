import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // 🔴 Default TRUE rakho taaki pehle check kare

  // 1. Check User Session on App Start
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Checking starts
      
      if (currentUser) {
        // Agar user firebase me login hai, to uska data fetch karo
        try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setUserData(docSnap.data());
                setUser(currentUser);
            } else {
                // Agar User Auth me hai par Database me nahi (Rare case)
                console.log("No user data found!");
                setUser(null);
                setUserData(null);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(null);
        }
      } else {
        // Agar user logout hai
        setUser(null);
        setUserData(null);
      }
      
      setLoading(false); // Checking done
    });

    return () => unsubscribe();
  }, []);

  // 2. Signup Function
  const signup = async (email, password, role, username) => {
     // (Signup logic is handled in component now, but keeping helper if needed)
     return createUserWithEmailAndPassword(auth, email, password);
  };

  // 3. Login Function
  const login = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    // Fetch role immediately to help with redirect
    const docSnap = await getDoc(doc(db, "users", res.user.uid));
    if(docSnap.exists()) {
        return docSnap.data().role;
    }
    return "student"; 
  };

  // 4. 🔴 LOGOUT FUNCTION (Proper SignOut)
  const logout = async () => {
    try {
        await signOut(auth); // Firebase se session clear
        setUser(null);       // State clear
        setUserData(null);   // Data clear
        return true;
    } catch (error) {
        console.error("Logout Error:", error);
    }
  };

  const value = {
    user,
    userData,
    loading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 🔴 Jab tak Loading hai, tab tak app render mat karo */}
      {!loading && children}
    </AuthContext.Provider>
  );
}