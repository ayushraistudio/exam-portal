import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; 
import ExamSearch from "./ExamSearch";
import ExamLobby from "./ExamLobby";
import UserSearch from "../Common/UserSearch";
import { Link } from "react-router-dom";
import MyResults from "./MyResults";
import GlobalLiveExams from "./GlobalLiveExams";
import MyRequests from "./MyRequests";

export default function StudentDashboard() {
  const { logout, userData } = useAuth();
  const { themeClasses, changeTheme, themes } = useTheme(); 
  
  const [viewMode, setViewMode] = useState("dashboard");
  const [previousView, setPreviousView] = useState("dashboard");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
      const handleClickOutside = (event) => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
              setShowMenu(false);
              setShowThemeMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { if(window.confirm("Logout?")) { logout(); } };

  // 🔴 FIX: Allows opening lobby even if exam is not started (Logic handled inside ExamLobby)
  const openLobby = (examId, source = "dashboard") => { 
      setPreviousView(source); 
      setSelectedExamId(examId); 
      setViewMode("lobby"); 
  };

  const openResultDetail = (result) => { setSelectedResult(result); setViewMode("result_detail"); };
  const goBack = () => { viewMode === "lobby" ? setViewMode(previousView) : setViewMode("dashboard"); setSelectedExamId(null); setSelectedResult(null); };
  const getAvatar = (name) => `https://ui-avatars.com/api/?name=${name || "User"}&background=random&color=fff&size=128`;

  if (viewMode === "lobby" && selectedExamId) return <ExamLobby examId={selectedExamId} studentId={userData?.uid} onLeave={goBack} />;
  if (viewMode === "global") return <div className={`min-h-screen p-4 ${themeClasses.bg} ${themeClasses.text}`}><GlobalLiveExams onBack={goBack} onJoin={(id) => openLobby(id, "global")} /></div>;
  if (viewMode === "result_detail") return <div className={`min-h-screen p-4 ${themeClasses.bg} ${themeClasses.text}`}><MyResults viewMode="detail" detailData={selectedResult} onBack={goBack} /></div>;
  if (viewMode === "requests") return <div className={`min-h-screen p-4 ${themeClasses.bg} ${themeClasses.text}`}><MyRequests onBack={goBack} onJoin={(id) => openLobby(id, "requests")} /></div>;

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300`}>
      
      {/* HEADER */}
      <div className={`${themeClasses.dashHeader} px-6 py-3 flex flex-col md:flex-row justify-between items-center mb-6 gap-4 sticky top-0 z-40 transition-colors duration-300`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
             <Link to="/profile"><img src={userData?.photoURL || getAvatar(userData?.fullName)} alt="Profile" className={`w-10 h-10 rounded-full border-2 object-cover ${themeClasses.cardBorder}`}/></Link>
             <div><h1 className="font-bold text-lg leading-tight">Student Portal</h1><p className={`text-xs font-semibold ${themeClasses.accentText}`}>{userData?.fullName?.split(" ")[0]}</p></div>
        </div>
        
        <div className="flex-1 w-full md:w-auto flex justify-center"><UserSearch /></div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            
            {/* HAMBURGER MENU */}
            <div className="relative" ref={menuRef}>
                 <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded transition focus:outline-none ${themeClasses.menuItemHover}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                 </button>

                 {showMenu && (
                     <div className={`absolute right-0 mt-2 w-60 rounded-lg shadow-xl border z-50 animate-fade-in overflow-hidden ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
                         
                         <button onClick={() => { setViewMode("requests"); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-sm font-bold border-b flex items-center gap-2 ${themeClasses.text} ${themeClasses.cardBorder} ${themeClasses.menuItemHover}`}>
                           📂 My Requests
                         </button>
                         
                         <Link to="/profile" className={`block w-full text-left px-4 py-3 text-sm font-bold border-b ${themeClasses.text} ${themeClasses.cardBorder} ${themeClasses.menuItemHover}`}>
                           👤 Profile
                         </Link>

                         {/* THEME SUB-MENU */}
                         <div className={`border-b ${themeClasses.cardBorder}`}>
                             <button onClick={() => setShowThemeMenu(!showThemeMenu)} className={`w-full text-left px-4 py-3 text-sm font-bold flex justify-between items-center ${themeClasses.text} ${themeClasses.menuItemHover}`}>
                                <span>🎨 Theme</span>
                                <span>{showThemeMenu ? '▲' : '▼'}</span>
                             </button>
                             {showThemeMenu && (
                                 <div className={`bg-black/5 p-2 grid grid-cols-2 gap-2`}>
                                     {Object.keys(themes).map(key => (
                                         <button 
                                            key={key} 
                                            onClick={() => changeTheme(key)} 
                                            className={`text-xs font-bold py-2 rounded border flex items-center justify-center gap-1 ${themeClasses.cardBg} ${themeClasses.cardBorder} hover:opacity-80`}
                                         >
                                             <span className={`w-2 h-2 rounded-full ${key==='default'?'bg-blue-600':key==='dark'?'bg-gray-900':key==='ocean'?'bg-cyan-500':'bg-orange-500'}`}></span>
                                             {themes[key].name.split(" ")[0]}
                                         </button>
                                     ))}
                                 </div>
                             )}
                         </div>

                         <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
                           🚪 Logout
                         </button>
                     </div>
                 )}
            </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
            <div onClick={() => setViewMode("global")} className={`bg-gradient-to-r ${themeClasses.heroGradient} text-white p-8 rounded-2xl shadow-xl mb-8 cursor-pointer transform hover:scale-[1.01] transition text-center relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 transition group-hover:scale-150"></div>
                <h2 className="text-3xl font-extrabold mb-2 relative z-10">🔴 Live Ongoing Exams</h2>
                <p className="text-blue-100 relative z-10">Access global exams from top institutes instantly.</p>
            </div>
            
            <div className="mb-8">
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${themeClasses.text}`}>
                    <span className={`${themeClasses.cardBg} ${themeClasses.accentText} p-1 rounded shadow-sm border ${themeClasses.cardBorder}`}>🔍</span> Search Institute Exam
                </h2>
                <ExamSearch onJoin={(id) => openLobby(id, "dashboard")} />
            </div>
            
            <MyResults viewMode="list" onSelectResult={openResultDetail} />
      </div>
    </div>
  );
}