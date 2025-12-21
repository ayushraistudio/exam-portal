import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore"; 
import { createUserWithEmailAndPassword } from "firebase/auth"; 
import { auth } from "../../config/firebase"; 
import { useTheme } from "../../context/ThemeContext"; 

export default function Signup() {
  const { themeClasses } = useTheme(); 
  const [form, setForm] = useState({email:"", pass:"", username:"", fullName:"", role:"student"});
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setError(""); // Purana error hata do

    try {
      // 🔴 1. Check Username Availability (Sabse Pehle)
      const q = query(collection(db, "users"), where("username", "==", form.username.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      // Agar username database me mila, to yahi rok do
      if (!querySnapshot.empty) {
          throw new Error("Username is not available (Try another one)");
      }

      // 🔴 2. Create Auth User (Agar username unique hai tabhi yahan aayega)
      const res = await createUserWithEmailAndPassword(auth, form.email, form.pass);

      // 3. Save to Firestore
      await setDoc(doc(db, "users", res.user.uid), {
          uid: res.user.uid,
          username: form.username.toLowerCase().trim(),
          fullName: form.fullName || "User",
          email: form.email,
          role: form.role,
          createdAt: serverTimestamp()
      });

      form.role === 'admin' ? navigate("/admin") : navigate("/student");

    } catch (e) { 
        // 🔴 Error Handling (Screen par dikhane ke liye)
        if(e.code === 'auth/email-already-in-use') {
            setError("Email already registered!");
        } else if (e.message.includes("Username is not available")) {
            setError("⚠️ This Username is not available."); // Custom Message
        } else {
            setError(e.message); 
        }
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text}`}>
      
      {/* Back Button */}
      <Link to="/" className={`absolute top-6 left-6 font-bold flex items-center gap-2 transition ${themeClasses.textSec} hover:${themeClasses.text}`}>
          <span>←</span> Back to Home
      </Link>

      <div className={`${themeClasses.cardBg} p-8 rounded-xl shadow-lg w-full max-w-md mt-10 border ${themeClasses.cardBorder}`}>
        <h2 className={`text-3xl font-bold text-center mb-6 ${themeClasses.accentText}`}>Sign Up</h2>
        
        {/* 🔴 ERROR MESSAGE DISPLAY (On Screen, Not Alert) */}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-bold text-center border border-red-200">{error}</div>}

        <form onSubmit={handle} className="space-y-4">
            
            <div>
                <label className="block font-bold mb-1">Full Name</label>
                <input className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} placeholder="Your Name" onChange={e=>setForm({...form, fullName:e.target.value})} required />
            </div>

            <div>
                <label className="block font-bold mb-1">Username</label>
                <input className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} placeholder="Unique Username" onChange={e=>setForm({...form, username:e.target.value})} required />
            </div>

            <div>
                <label className="block font-bold mb-1">Email</label>
                <input className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} type="email" placeholder="Email Address" onChange={e=>setForm({...form, email:e.target.value})} required />
            </div>

            <div>
                <label className="block font-bold mb-1">Password</label>
                <input className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} type="password" placeholder="Password" onChange={e=>setForm({...form, pass:e.target.value})} required />
            </div>

            <div>
                <label className="block font-bold mb-1">Role</label>
                <select className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} onChange={e=>setForm({...form, role:e.target.value})}>
                    <option value="student">Student</option>
                    <option value="admin">Teacher (Institute)</option>
                </select>
            </div>

            <button disabled={loading} className={`w-full py-3 rounded-lg font-bold transition disabled:opacity-50 ${themeClasses.primary}`}>
                {loading ? "Creating Account..." : "Create Account"}
            </button>
            
            <Link to="/login" className={`block text-center mt-4 text-sm hover:underline ${themeClasses.accentText}`}>
                Already have an account? Login
            </Link>
        </form>
      </div>
    </div>
  );
}