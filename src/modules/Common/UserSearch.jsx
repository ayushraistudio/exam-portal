import React, { useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext"; 

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { themeClasses } = useTheme(); 

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    try {
      const q = query(collection(db, "users"), where("username", "==", term));
      const snap = await getDocs(q);

      if (!snap.empty) {
        navigate(`/user/${term}`);
        setSearchTerm("");
      } else {
        setError("User not found");
        setTimeout(() => setError(""), 3000); // 3 sec baad error gayab
      }
    } catch (err) {
      console.error(err);
      setError("Search failed");
    }
  };

  return (
    <div className="relative w-full max-w-xs md:max-w-sm">
        
        {/* 🔴 MODERN CAPSULE DESIGN */}
        <form 
            onSubmit={handleSearch} 
            className={`flex items-center w-full rounded-full px-4 py-2 border transition-all duration-300 shadow-sm
            ${themeClasses?.inputBg || "bg-gray-100"} 
            ${error ? "border-red-400 ring-2 ring-red-100" : "border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50"}
            `}
        >
            {/* Search Icon (Left) */}
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${themeClasses?.textSec || "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {/* Transparent Input */}
            <input
                type="text"
                placeholder="Search @username..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setError(""); }}
                className={`ml-3 w-full bg-transparent border-none outline-none text-sm font-medium ${themeClasses?.text || "text-gray-700"} placeholder-gray-400`}
            />

            {/* Arrow Button (Right) - Only shows when typing */}
            {searchTerm && (
                <button 
                    type="submit" 
                    className={`ml-2 p-1 rounded-full text-white transition transform hover:scale-110 active:scale-95 ${themeClasses?.primary || "bg-blue-600"}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            )}
        </form>
        
        {/* 🔴 SLEEK ERROR MESSAGE (Absolute Positioned) */}
        {error && (
            <div className="absolute top-full mt-2 left-4 bg-red-100 text-red-600 text-[10px] px-3 py-1 rounded-full font-bold shadow-md border border-red-200 animate-fade-in flex items-center gap-1 z-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
            </div>
        )}
    </div>
  );
}