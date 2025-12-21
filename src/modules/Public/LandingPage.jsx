import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs, limit, getDoc, doc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext"; 
import ThemeSwitcher from "../Common/ThemeSwitcher"; 

export default function LandingPage() {
  const navigate = useNavigate();
  const { themeClasses } = useTheme(); 

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [restrictedProfile, setRestrictedProfile] = useState(null); 

  useEffect(() => {
    const fetchExams = async () => {
        try {
            const q = query(collection(db, "exams"), where("examType", "==", "open"), where("status", "==", "active"), limit(6));
            const snap = await getDocs(q);
            setExams(snap.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (err) { console.error("Error fetching exams:", err); }
        setLoading(false);
    };
    fetchExams();
  }, []);

  const handleSearch = async (e) => {
      const term = e.target.value.toLowerCase();
      setSearchTerm(term);
      if(term.length < 3) { setSearchResults([]); return; }
      try {
          const q = query(collection(db, "users"), where("username", ">=", term), where("username", "<=", term + '\uf8ff'), limit(5));
          const snap = await getDocs(q);
          setSearchResults(snap.docs.map(d => d.data()));
      } catch(err) { console.error(err); }
  };

  const openRestrictedProfile = async (uid) => {
      if(!uid) return;
      try { const docSnap = await getDoc(doc(db, "users", uid)); if(docSnap.exists()) setRestrictedProfile(docSnap.data()); } catch(err) {}
  };

  return (
    <div className={`min-h-screen font-sans relative flex flex-col transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text}`}>

      <ThemeSwitcher />

      {/* MODAL: LOGIN REQUIRED */}
      {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm px-4">
              <div className={`${themeClasses.cardBg} p-8 rounded-2xl shadow-2xl max-w-md w-full text-center transform scale-105 transition-all relative border ${themeClasses.cardBorder}`}>
                  <div className="text-6xl mb-4">🔒</div>
                  <h2 className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>Student Access Required</h2>
                  <p className={`mb-6 ${themeClasses.textSec}`}>To maintain exam integrity, please login or register to continue.</p>
                  <div className="flex gap-4 justify-center">
                      <button onClick={() => navigate("/login")} className={`${themeClasses.primary} px-8 py-3 rounded-full font-bold shadow-lg transition`}>Login</button>
                      <button onClick={() => navigate("/signup")} className={`${themeClasses.inputBg} ${themeClasses.text} px-8 py-3 rounded-full font-bold hover:opacity-80 transition border ${themeClasses.cardBorder}`}>Sign Up</button>
                  </div>
                  <button onClick={() => setShowLoginModal(false)} className={`mt-6 text-sm underline hover:opacity-80 ${themeClasses.textSec}`}>Close Window</button>
              </div>
          </div>
      )}

      {/* MODAL: RESTRICTED PROFILE */}
      {restrictedProfile && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-md px-4">
              <div className={`${themeClasses.cardBg} w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative border ${themeClasses.cardBorder}`}>
                  <button onClick={() => setRestrictedProfile(null)} className="absolute top-3 right-3 bg-black/20 text-white p-2 rounded-full z-10 hover:bg-black/40">✕</button>
                  <div className={`h-28 bg-gradient-to-r ${themeClasses.heroGradient}`}></div>
                  <div className="flex justify-center -mt-14 relative">
                      <img src={restrictedProfile.photoURL || `https://ui-avatars.com/api/?name=${restrictedProfile.fullName}`} alt="Profile" className={`w-28 h-28 rounded-full border-4 shadow-lg ${themeClasses.cardBg} border-white`}/>
                  </div>
                  <div className="text-center mt-3 px-6">
                      <h2 className={`text-xl font-extrabold ${themeClasses.text}`}>{restrictedProfile.fullName}</h2>
                      <p className={`font-bold text-sm ${themeClasses.textSec}`}>@{restrictedProfile.username}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${themeClasses.inputBg} ${themeClasses.textSec}`}>{restrictedProfile.role}</span>
                  </div>
                  <div className="p-6 space-y-4 relative">
                      <div className={`absolute inset-0 ${themeClasses.cardBg}/60 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center text-center`}>
                          <div className="text-4xl mb-2">🔐</div>
                          <p className={`font-bold mb-2 ${themeClasses.text}`}>Full Profile Locked</p>
                          <button onClick={() => navigate("/login")} className={`${themeClasses.primary} px-5 py-2 rounded-full font-bold text-sm shadow transition`}>Login to View Details</button>
                      </div>
                      <div className={`flex items-center gap-3 p-3 border rounded-lg filter blur-sm ${themeClasses.cardBorder} ${themeClasses.bg}`}><div><p className="text-xs font-bold">Institute</p><p className="font-bold">Hidden Institute</p></div></div>
                      <div className={`flex items-center gap-3 p-3 border rounded-lg filter blur-sm ${themeClasses.cardBorder} ${themeClasses.bg}`}><div><p className="text-xs font-bold">Email</p><p className="font-bold">hidden@email.com</p></div></div>
                  </div>
              </div>
          </div>
      )}

      {/* NAVBAR */}
      <nav className={`${themeClasses.navBg} sticky top-0 z-40 px-4 md:px-8 py-3 flex justify-between items-center transition-colors duration-300 shadow-sm`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg bg-gradient-to-r ${themeClasses.heroGradient}`}>🚀</div>
              <h1 className={`text-lg md:text-2xl font-extrabold hidden md:block tracking-tight ${themeClasses.text}`}>ExamPortal</h1>
          </div>
          
          <div className="flex-1 max-w-md mx-2 md:mx-4 relative">
              <div className="relative group">
                  <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={handleSearch} className={`w-full border border-transparent focus:border-blue-500 rounded-full py-2 pl-10 pr-4 outline-none transition text-xs md:text-sm ${themeClasses.inputBg} ${themeClasses.text}`}/>
              </div>
              {searchResults.length > 0 && (
                  <div className={`absolute top-12 left-0 w-full rounded-lg shadow-xl border overflow-hidden z-50 animate-fade-in ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
                      {searchResults.map((user, i) => (
                          <div key={i} onClick={() => { setRestrictedProfile(user); setSearchResults([]); setSearchTerm(""); }} className={`p-3 border-b cursor-pointer flex items-center gap-3 hover:opacity-80 transition ${themeClasses.cardBorder}`}>
                              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.fullName}`} className="w-8 h-8 rounded-full" alt="dp"/>
                              <div><p className={`text-sm font-bold ${themeClasses.text}`}>{user.fullName}</p><p className={`text-xs ${themeClasses.accentText}`}>@{user.username}</p></div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="flex gap-2 md:gap-3">
              <Link to="/login" className={`px-3 py-1.5 md:px-5 md:py-2 font-bold text-xs md:text-sm rounded transition border ${themeClasses.cardBorder} ${themeClasses.textSec} hover:${themeClasses.accentText}`}>Login</Link>
              <Link to="/signup" className={`${themeClasses.primary} px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm rounded font-bold shadow-lg transition transform hover:scale-105 active:scale-95`}>Sign Up</Link>
          </div>
      </nav>

      {/* HERO SECTION */}
      <div className={`py-20 md:py-32 px-6 text-center relative overflow-hidden bg-gradient-to-br ${themeClasses.heroGradient}`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 max-w-5xl mx-auto">
              <span className="bg-white/20 text-white border border-white/30 px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-4 inline-block backdrop-blur-sm">The #1 Platform for Institutes</span>
              <h1 className="text-3xl md:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
                  Master Your Skills <br/> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">Live Exams</span>
              </h1>
              <p className="text-sm md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Join a global community of learners. Create, attempt, and analyze exams in real-time with our advanced proctoring system.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/signup" className="bg-yellow-400 text-blue-900 px-8 py-3 md:py-4 rounded-full font-bold text-sm md:text-lg shadow-xl hover:bg-yellow-300 transition transform hover:-translate-y-1">Start Exploring 🚀</Link>
                  <Link to="/signup" className="border border-white/30 bg-white/10 text-white px-8 py-3 md:py-4 rounded-full font-bold text-sm md:text-lg hover:bg-white/20 transition backdrop-blur-sm">Register Institute</Link>
              </div>
          </div>
      </div>

      {/* STATS SECTION */}
      <div className={`${themeClasses.cardBg} py-12 border-b ${themeClasses.cardBorder}`}>
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div><h3 className={`text-2xl md:text-4xl font-extrabold ${themeClasses.accentText}`}>10k+</h3><p className={`font-bold text-xs md:text-sm mt-1 uppercase ${themeClasses.textSec}`}>Students</p></div>
              <div><h3 className={`text-2xl md:text-4xl font-extrabold ${themeClasses.accentText}`}>500+</h3><p className={`font-bold text-xs md:text-sm mt-1 uppercase ${themeClasses.textSec}`}>Exams Created</p></div>
              <div><h3 className={`text-2xl md:text-4xl font-extrabold ${themeClasses.accentText}`}>1M+</h3><p className={`font-bold text-xs md:text-sm mt-1 uppercase ${themeClasses.textSec}`}>Questions Attempted</p></div>
              <div><h3 className={`text-2xl md:text-4xl font-extrabold ${themeClasses.accentText}`}>24/7</h3><p className={`font-bold text-xs md:text-sm mt-1 uppercase ${themeClasses.textSec}`}>Live Support</p></div>
          </div>
      </div>

      {/* LIVE EXAMS SECTION */}
      <div className={`max-w-7xl mx-auto px-6 py-20 ${themeClasses.bg}`}>
          <div className="flex justify-between items-end mb-12">
              <div>
                  <h2 className={`text-2xl md:text-3xl font-bold flex items-center gap-2 ${themeClasses.text}`}>🔴 Global Live Exams</h2>
                  <p className={`mt-2 text-sm md:text-base ${themeClasses.textSec}`}>Explore top public exams currently active.</p>
              </div>
              <button onClick={()=>navigate('/login')} className={`font-bold text-sm md:text-base hover:underline ${themeClasses.accentText}`}>View All Exams →</button>
          </div>

          {loading ? <div className={`text-center p-10 font-bold ${themeClasses.textSec}`}>Loading Exams...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {exams.length === 0 ? <div className={`col-span-full text-center py-20 ${themeClasses.textSec}`}>No active public exams right now.</div> : exams.map(exam => (
                      <div key={exam.id} className={`${themeClasses.cardBg} p-6 rounded-2xl shadow-lg border hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group ${themeClasses.cardBorder}`}>
                          <div className="flex justify-between items-start mb-4">
                              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded border border-red-100 animate-pulse">LIVE NOW</span>
                              <span className={`text-xs font-bold ${themeClasses.textSec}`}>{exam.duration} mins</span>
                          </div>
                          <h3 className={`font-bold text-xl mb-2 transition line-clamp-1 ${themeClasses.text} group-hover:${themeClasses.accentText}`}>{exam.title}</h3>
                          <div className={`flex items-center gap-2 text-xs font-bold mb-4 ${themeClasses.textSec}`}>
                              <span className={`px-2 py-1 rounded ${themeClasses.inputBg}`}>By: {exam.instituteName || "Institute"}</span>
                              <button onClick={(e) => { e.stopPropagation(); openRestrictedProfile(exam.createdBy); }} className={`hover:underline z-10 ${themeClasses.accentText}`}>@{exam.createdByName || "Admin"}</button>
                          </div>
                          <p className={`text-sm mb-6 line-clamp-2 ${themeClasses.textSec}`}>{exam.description || "No description provided."}</p>
                          <button onClick={() => setShowLoginModal(true)} className={`w-full py-3 rounded-xl font-bold shadow-md transition ${themeClasses.primary}`}>Attempt Exam ⚡</button>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* HOW IT WORKS */}
      <div className={`${themeClasses.cardBg} py-20`}>
          <div className="max-w-6xl mx-auto px-6">
              <h2 className={`text-3xl font-bold text-center mb-16 ${themeClasses.text}`}>How ExamPortal Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="text-center relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 ${themeClasses.inputBg} ${themeClasses.accentText}`}>1</div>
                      <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>Create Account</h3>
                      <p className={`text-sm ${themeClasses.textSec}`}>Sign up as a Student to take exams or as an Institute to host them. It's free!</p>
                  </div>
                  <div className="text-center relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 ${themeClasses.inputBg} ${themeClasses.accentText}`}>2</div>
                      <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>Join or Create Exam</h3>
                      <p className={`text-sm ${themeClasses.textSec}`}>Institutes create secure exams. Students join via code or public listings.</p>
                  </div>
                  <div className="text-center relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 ${themeClasses.inputBg} ${themeClasses.accentText}`}>3</div>
                      <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>Get Results</h3>
                      <p className={`text-sm ${themeClasses.textSec}`}>Instant grading, detailed analytics, and global leaderboards waiting for you.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* FEATURES / WHY US */}
      <div className={`${themeClasses.bg} py-20`}>
          <div className="max-w-6xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div>
                      <span className={`font-bold uppercase tracking-wider text-sm ${themeClasses.accentText}`}>Why Choose Us</span>
                      <h2 className={`text-3xl md:text-4xl font-extrabold mt-2 mb-6 ${themeClasses.text}`}>Advanced Security & <br/> Real-time Analytics</h2>
                      <ul className="space-y-4">
                          {[
                              "AI-Powered Anti-Cheating System",
                              "Instant Result Declaration",
                              "Global & Institute-level Leaderboards",
                              "Secure & Encrypted Data",
                              "Mobile & Desktop Compatible"
                          ].map((item, i) => (
                              <li key={i} className={`flex items-center gap-3 font-medium ${themeClasses.text}`}>
                                  <span className="text-green-500 text-xl">✓</span> {item}
                              </li>
                          ))}
                      </ul>
                      <button onClick={()=>navigate('/signup')} className={`mt-8 px-8 py-3 rounded-full font-bold transition ${themeClasses.primary}`}>Get Started Free</button>
                  </div>
                  <div className="relative">
                      <div className={`absolute inset-0 rounded-2xl transform rotate-3 opacity-20 ${themeClasses.accentText === 'text-blue-600' ? 'bg-blue-600' : 'bg-gray-500'}`}></div>
                      <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop" alt="Dashboard" className="relative rounded-2xl shadow-2xl transform -rotate-2 hover:rotate-0 transition duration-500 border-4 border-white"/>
                  </div>
              </div>
          </div>
      </div>

      {/* FAQ SECTION */}
      <div className={`${themeClasses.cardBg} py-20`}>
          <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className={`text-3xl font-bold mb-12 ${themeClasses.text}`}>Frequently Asked Questions</h2>
              <div className="grid gap-4 text-left">
                  <div className={`p-6 rounded-xl border ${themeClasses.inputBg} ${themeClasses.cardBorder}`}>
                      <h4 className={`font-bold ${themeClasses.text}`}>Is ExamPortal free to use?</h4>
                      <p className={`text-sm mt-2 ${themeClasses.textSec}`}>Yes! It is completely free for students. Institutes can also create free public exams.</p>
                  </div>
                  <div className={`p-6 rounded-xl border ${themeClasses.inputBg} ${themeClasses.cardBorder}`}>
                      <h4 className={`font-bold ${themeClasses.text}`}>Can I take exams on mobile?</h4>
                      <p className={`text-sm mt-2 ${themeClasses.textSec}`}>Absolutely. Our platform is fully responsive and works smoothly on mobile devices.</p>
                  </div>
                  <div className={`p-6 rounded-xl border ${themeClasses.inputBg} ${themeClasses.cardBorder}`}>
                      <h4 className={`font-bold ${themeClasses.text}`}>How is cheating prevented?</h4>
                      <p className={`text-sm mt-2 ${themeClasses.textSec}`}>We monitor tab switching, copy-pasting, and full-screen activity. Violations lead to auto-submission.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* FOOTER */}
      <footer className={`${themeClasses.footerBg} py-12 border-t border-gray-700 mt-auto`}>
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
              
              <div>
                  <h2 className="text-3xl font-extrabold mb-2 flex items-center justify-center md:justify-start gap-2">
                      🚀 ExamPortal
                  </h2>
                  <p className="text-sm max-w-xs mx-auto md:mx-0 opacity-80">The ultimate platform for secure and seamless online examinations.</p>
                  <p className="text-sm mt-4 opacity-60">
                      © 2025 All rights reserved. <br/> Developed by <span className="font-bold">Ayush Rai</span>
                  </p>
              </div>

              <div className="flex flex-col items-center md:items-end">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">Contact Developer</p>
                  <div className="flex gap-6">
                      <a href="https://github.com/ayushraistudio" target="_blank" rel="noopener noreferrer" className="hover:text-white transition transform hover:scale-110 p-2 bg-gray-800 rounded-full text-gray-400" title="GitHub">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      </a>
                      <a href="https://linkedin.com/in/ayushraistudio" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition transform hover:scale-110 p-2 bg-gray-800 rounded-full text-gray-400" title="LinkedIn">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                      </a>
                      <a href="mailto:info@ayushraistudio" className="hover:text-red-500 transition transform hover:scale-110 p-2 bg-gray-800 rounded-full text-gray-400" title="Email">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-11.179l4.623 5.467zm-4.483-6.429h21.72l-10.857 11.643-10.863-11.643zm21.86 15.085l-5.609-6.931 4.28-5.375v12.306zm-16.107-6.931l-4.28 5.375-1.611-1.989 5.891-6.886zm10.107 6.931l-4.609-5.712 5.941-6.529-1.332 12.241zm-12 0l-5.941-6.529 1.332 12.241 4.609-5.712z"/></svg>
                      </a>
                  </div>
                  <p className="text-xs opacity-60 mt-2">info@ayushraistudio</p>
              </div>
          </div>
      </footer>

    </div>
  );
}