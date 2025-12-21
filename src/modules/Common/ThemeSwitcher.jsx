import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeSwitcher() {
  // 🔴 FIX: 'setCurrentTheme' ki jagah 'changeTheme' use kiya
  const { currentTheme, changeTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (!themes) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2">
      
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 animate-fade-in mb-2 w-48">
          <p className="text-xs font-bold text-gray-400 uppercase px-2 py-1">Select Theme</p>
          {Object.keys(themes).map((key) => (
            <button
              key={key}
              onClick={() => { changeTheme(key); setIsOpen(false); }} // 🔴 FIX HERE
              className={`text-left px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2
                ${currentTheme === key 
                  ? "bg-blue-100 text-blue-700 border border-blue-200" 
                  : "hover:bg-gray-100 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"}`}
            >
              <span className={`w-3 h-3 rounded-full ${key === 'default' ? 'bg-blue-600' : key === 'dark' ? 'bg-gray-900' : key === 'ocean' ? 'bg-cyan-500' : 'bg-orange-500'}`}></span>
              {themes[key].name}
            </button>
          ))}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-12 h-12 rounded-full bg-white text-gray-800 shadow-xl border border-gray-200 flex items-center justify-center hover:scale-110 transition transform hover:rotate-90 z-50"
        title="Change Theme"
      >
        <span className="text-2xl">🎨</span>
      </button>
    </div>
  );
}