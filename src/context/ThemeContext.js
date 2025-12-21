import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext"; // Auth se User ID lene ke liye

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  // Default theme is 'default'
  const [currentTheme, setCurrentTheme] = useState("default");

  // 🎨 THEME CONFIGURATIONS (Added Dashboard Specifics)
  const themes = {
    default: {
      name: "Default (Light)",
      bg: "bg-gray-50",
      text: "text-gray-800",
      textSec: "text-gray-500",
      cardBg: "bg-white",
      cardBorder: "border-gray-200",
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      accentText: "text-blue-600",
      navBg: "bg-white shadow-md",
      heroGradient: "from-blue-900 via-indigo-900 to-purple-900",
      inputBg: "bg-gray-100 border-gray-300",
      footerBg: "bg-gray-900 text-gray-400",
      // Dashboard Specific
      dashSidebar: "bg-white border-r border-gray-200",
      dashHeader: "bg-white shadow-sm",
      menuItemHover: "hover:bg-gray-100"
    },
    dark: {
      name: "Dark Mode",
      bg: "bg-gray-900",
      text: "text-gray-100",
      textSec: "text-gray-400",
      cardBg: "bg-gray-800",
      cardBorder: "border-gray-700",
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      accentText: "text-blue-400",
      navBg: "bg-gray-800 shadow-md border-b border-gray-700",
      heroGradient: "from-gray-900 via-gray-800 to-black",
      inputBg: "bg-gray-700 border-gray-600 text-white",
      footerBg: "bg-black text-gray-500",
      // Dashboard Specific
      dashSidebar: "bg-gray-800 border-r border-gray-700",
      dashHeader: "bg-gray-800 border-b border-gray-700",
      menuItemHover: "hover:bg-gray-700"
    },
    ocean: {
      name: "Ocean (Teal)",
      bg: "bg-cyan-50",
      text: "text-cyan-900",
      textSec: "text-cyan-700",
      cardBg: "bg-white",
      cardBorder: "border-cyan-200",
      primary: "bg-cyan-600 hover:bg-cyan-700 text-white",
      accentText: "text-cyan-700",
      navBg: "bg-white shadow-md border-b border-cyan-100",
      heroGradient: "from-cyan-800 via-teal-700 to-blue-800",
      inputBg: "bg-cyan-50 border-cyan-200",
      footerBg: "bg-cyan-900 text-cyan-100",
      // Dashboard Specific
      dashSidebar: "bg-cyan-50 border-r border-cyan-200",
      dashHeader: "bg-white shadow-sm border-b border-cyan-100",
      menuItemHover: "hover:bg-cyan-100"
    },
    sunset: {
      name: "Sunset (Warm)",
      bg: "bg-orange-50",
      text: "text-orange-900",
      textSec: "text-orange-800",
      cardBg: "bg-white",
      cardBorder: "border-orange-200",
      primary: "bg-orange-600 hover:bg-orange-700 text-white",
      accentText: "text-orange-700",
      navBg: "bg-white shadow-md border-b border-orange-100",
      heroGradient: "from-orange-700 via-red-700 to-pink-800",
      inputBg: "bg-orange-50 border-orange-200",
      footerBg: "bg-orange-950 text-orange-200",
      // Dashboard Specific
      dashSidebar: "bg-orange-50 border-r border-orange-200",
      dashHeader: "bg-white shadow-sm border-b border-orange-100",
      menuItemHover: "hover:bg-orange-100"
    }
  };

  // 🔴 LOGIC: Handle Theme Switching based on User State
  useEffect(() => {
    if (user) {
      // ✅ Agar User Logged In hai -> Use Personal Theme
      const savedUserTheme = localStorage.getItem(`userTheme_${user.uid}`);
      setCurrentTheme(savedUserTheme || "default");
    } else {
      // 🌍 Agar Public User hai -> Use Public Theme
      const savedPublicTheme = localStorage.getItem("publicTheme");
      setCurrentTheme(savedPublicTheme || "default");
    }
  }, [user]);

  // Function to Change & Save Theme
  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    if (user) {
      // Save for specific user
      localStorage.setItem(`userTheme_${user.uid}`, themeName);
    } else {
      // Save for public visitor
      localStorage.setItem("publicTheme", themeName);
    }
  };

  const themeClasses = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themeClasses, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}