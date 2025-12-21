import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom"; 
import { auth, db } from "../../config/firebase";
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../../context/ThemeContext"; // 🔴 Import Theme

export default function Login() {
  const { themeClasses } = useTheme(); // 🔴 Get Theme
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [selectedRole, setSelectedRole] = useState("student");
  const [instituteName, setInstituteName] = useState(""); 

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const role = await login(email, password);
      if (role === "admin") navigate("/admin"); else navigate("/student");
    } catch (err) { setError("Failed to login. Check email/password."); }
    setLoading(false);
  };

  const handleReset = async (e) => {
      e.preventDefault(); if(!email) return setError("Please enter your email.");
      setError(""); setMessage(""); setLoading(true);
      try { await sendPasswordResetEmail(auth, email); setMessage("✅ Reset link sent!"); } 
      catch (err) { setError("❌ Failed to send reset email."); }
      setLoading(false);
  };

  const handleRegister = async (e) => {
      e.preventDefault();
      if(password !== confirmPass) return setError("Passwords do not match!");
      if(selectedRole === 'admin' && !instituteName) return setError("Institute Name is required for Admins.");
      setError(""); setLoading(true);
      try {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          const userData = { uid: res.user.uid, username: username.toLowerCase().replace(/\s/g, ''), fullName, email, role: selectedRole, createdAt: serverTimestamp() };
          if(selectedRole === 'admin') userData.institute = instituteName;
          await setDoc(doc(db, "users", res.user.uid), userData);
          if (selectedRole === "admin") navigate("/admin"); else navigate("/student");
      } catch (err) {
          if(err.code === 'auth/email-already-in-use') setError("Email already exists!"); else setError("Failed to create account.");
      }
      setLoading(false);
  };

  const switchView = (v) => { setView(v); setError(""); setMessage(""); };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text}`}>
      
      {/* 🔴 BACK TO HOME BUTTON */}
      <Link to="/" className={`absolute top-6 left-6 font-bold flex items-center gap-2 transition ${themeClasses.textSec} hover:${themeClasses.text}`}>
          <span>←</span> Back to Home
      </Link>

      <div className={`${themeClasses.cardBg} p-8 rounded-xl shadow-lg w-full max-w-md mt-10 border ${themeClasses.cardBorder}`}>
        
        <h2 className={`text-3xl font-bold text-center mb-6 ${themeClasses.accentText}`}>
            {view === 'login' ? "Exam Portal Login" : view === 'register' ? "Create New Account" : "Reset Password"}
        </h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-bold text-center">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm font-bold text-center">{message}</div>}

        {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
                <div><label className="block font-bold mb-2">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={`w-full p-3 border rounded focus:ring-2 ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                <div><label className="block font-bold mb-2">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={`w-full p-3 border rounded focus:ring-2 ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /><div className="text-right mt-1"><button type="button" onClick={()=>switchView('reset')} className={`text-sm hover:underline font-semibold ${themeClasses.accentText}`}>Forgot Password?</button></div></div>
                <button disabled={loading} className={`w-full py-3 rounded-lg font-bold transition disabled:opacity-50 ${themeClasses.primary}`}>{loading ? "Logging in..." : "Login"}</button>
                <p className={`text-center text-sm mt-4 ${themeClasses.textSec}`}>No account? <button type="button" onClick={()=>switchView('register')} className={`font-bold hover:underline ${themeClasses.accentText}`}>Register Now</button></p>
            </form>
        )}

        {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
                <div className={`flex gap-4 mb-2 p-1 rounded-lg ${themeClasses.inputBg}`}>
                    <button type="button" onClick={() => setSelectedRole("student")} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${selectedRole === 'student' ? `${themeClasses.cardBg} ${themeClasses.accentText} shadow` : themeClasses.textSec}`}>Student</button>
                    <button type="button" onClick={() => setSelectedRole("admin")} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${selectedRole === 'admin' ? `${themeClasses.cardBg} ${themeClasses.accentText} shadow` : themeClasses.textSec}`}>Admin / Institute</button>
                </div>
                <div><label className="block font-bold mb-1">Full Name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                {selectedRole === 'admin' && (<div className="animate-fade-in"><label className="block font-bold mb-1">Institute Name</label><input value={instituteName} onChange={e=>setInstituteName(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} placeholder="Ex: Career Point" required /></div>)}
                <div><label className="block font-bold mb-1">Username</label><input value={username} onChange={e=>setUsername(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                <div><label className="block font-bold mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className="block font-bold mb-1">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                    <div><label className="block font-bold mb-1">Confirm</label><input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                </div>
                <button disabled={loading} className={`w-full text-white py-3 rounded-lg font-bold transition disabled:opacity-50 ${themeClasses.primary}`}>{loading ? "Creating Account..." : `Register as ${selectedRole === 'admin' ? 'Admin' : 'Student'}`}</button>
                <button type="button" onClick={()=>switchView('login')} className={`w-full text-sm hover:underline mt-2 ${themeClasses.textSec}`}>← Back to Login</button>
            </form>
        )}

        {view === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
                <p className={`text-sm text-center mb-4 ${themeClasses.textSec}`}>Enter email to receive reset link.</p>
                <div><label className="block font-bold mb-2">Email Address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={`w-full p-3 border rounded ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`} required /></div>
                <button disabled={loading} className={`w-full py-3 rounded-lg font-bold transition disabled:opacity-50 ${themeClasses.primary}`}>{loading ? "Sending..." : "Send Reset Link"}</button>
                <button type="button" onClick={()=>switchView('login')} className={`w-full text-sm hover:underline mt-2 ${themeClasses.textSec}`}>← Back to Login</button>
            </form>
        )}
      </div>
    </div>
  );
}