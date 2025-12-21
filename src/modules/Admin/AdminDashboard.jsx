import React, { useState, useEffect, useRef } from "react";
import { db } from "../../config/firebase";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

import QuestionManager from "./QuestionManager";
import ManageCandidates from "./ManageCandidates";
import ExamResults from "./ExamResults";
import ManageRequests from "./ManageRequests";
import UserSearch from "../Common/UserSearch";
import AdminGlobalExams from "./AdminGlobalExams"; 
import ExamLobby from "../Student/ExamLobby"; 
import AdminApprovals from "./AdminApprovals";
import AdminHistory from "./AdminHistory"; 
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user, userData, logout } = useAuth();

  const [exams, setExams] = useState([]);
  const [viewState, setViewState] = useState("dashboard"); 
  const [selExam, setSelExam] = useState(null);
  const [tab, setTab] = useState("q");
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  const [form, setForm] = useState({ 
      title: "", duration: 30, accessType: "approval", 
      examType: "live", resultMode: "system", 
      negativeMarking: true, showCheatersPublic: false, 
      description: "", rules: "", scheduledAt: "" 
  });
  
  const [viewQs, setViewQs] = useState([]);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type="success") => { setToast({msg, type}); setTimeout(()=>setToast(null), 3000); };

  useEffect(() => {
    if(!user) return;
    const q = query(collection(db, "exams"), where("createdBy", "==", user.uid));
    const unsub = onSnapshot(q, (s) => {
        const activeExams = s.docs
            .map(d => ({id: d.id, ...d.data()}))
            .filter(e => e.isDeleted !== true); 
        setExams(activeExams);
    });
    
    const handleClickOutside = (event) => { 
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setShowMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { unsub(); document.removeEventListener("mousedown", handleClickOutside); };
  }, [user]);

  const handleManageFromGlobal = (exam) => { setSelExam(exam); setViewState("manager"); };
  const handleJoinGlobalExam = (examId) => { setSelExam({ id: examId }); setViewState("lobby"); };
  const handleLogout = () => { if(window.confirm("Are you sure you want to Logout?")) { logout(); } };

  const create = async () => { 
    if(!form.title) return showToast("Title is required!", "error");
    try {
        await addDoc(collection(db, "exams"), { 
            ...form, 
            duration: Number(form.duration), 
            createdBy: user.uid, 
            createdByName: userData?.username || "Admin", 
            instituteName: userData?.institute || "Institute", 
            status: form.examType === 'open' ? 'active' : 'upcoming', 
            isDeleted: false, 
            createdAt: serverTimestamp() 
        }); 
        setForm({ title: "", duration: 30, accessType: "approval", examType: "live", resultMode: "system", negativeMarking: true, showCheatersPublic: false, description: "", rules: "", scheduledAt: "" }); 
        showToast("✅ Exam Created Successfully!");
    } catch(err) { showToast("Failed to create exam.", "error"); }
  };

  const toggle = async (ex) => { let next; if (ex.examType === 'open') { next = ex.status === 'active' ? 'ended' : 'active'; } else { next = ex.status === "upcoming" ? "started" : "ended"; } await updateDoc(doc(db, "exams", ex.id), { status: next }); };
  
  const softDeleteExam = async (e, examId) => { 
      if(e) e.stopPropagation(); 
      if(window.confirm("Move to History?")) { 
          await updateDoc(doc(db, "exams", examId), { 
              isDeleted: true, 
              status: 'ended' 
          }); 
          if(selExam?.id === examId) { setSelExam(null); setViewState("dashboard"); } 
          showToast("🗑️ Moved to Past History");
      } 
  };

  useEffect(() => { if(tab === 'd' && selExam) { getDocs(collection(db, "exams", selExam.id, "questions")).then(s => setViewQs(s.docs.map(d => d.data()))); } }, [tab, selExam]);

  if (!user) return <div className="p-10 text-center">Loading...</div>;

  const ViewWrapper = ({ children }) => <div className="min-h-screen bg-gray-50 text-gray-800">{children}</div>;

  if (viewState === "lobby" && selExam) return <ExamLobby examId={selExam.id} studentId={user.uid} onLeave={() => { setViewState("global"); setSelExam(null); }} />;
  if (viewState === "global") return <ViewWrapper><AdminGlobalExams onBack={() => setViewState("dashboard")} onManageOwn={handleManageFromGlobal} onJoin={handleJoinGlobalExam} /></ViewWrapper>;
  if (viewState === "approvals") return <ViewWrapper><AdminApprovals onBack={() => setViewState("dashboard")} /></ViewWrapper>;
  if (viewState === "history") return <ViewWrapper><AdminHistory onBack={() => setViewState("dashboard")} /></ViewWrapper>;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50 text-gray-800">
      {toast && <div className={`fixed top-5 right-5 px-6 py-3 rounded shadow-lg font-bold text-white z-50 animate-bounce-in ${toast.type==='error'?'bg-red-600':'bg-green-600'}`}>{toast.msg}</div>}

      {/* HEADER */}
      <div className="bg-white border flex flex-col md:flex-row justify-between items-center mb-8 px-4 py-4 rounded-xl gap-4 sticky top-0 z-40 shadow-sm">
         <div className="flex items-center gap-3 w-full md:w-auto">
             <Link to="/profile">
                <img src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.fullName}`} alt="Profile" className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 object-cover border-gray-200"/>
             </Link>
             <div><h1 className="font-bold text-lg md:text-xl leading-none text-gray-900">Admin Panel</h1><p className="text-xs mt-1 text-gray-500">{userData?.institute || "Institute"}</p></div>
         </div>
         <div className="flex-1 w-full md:w-auto flex justify-center"><UserSearch /></div>
         
         <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             <button onClick={() => setViewState("global")} className="bg-red-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold shadow text-xs md:text-sm animate-pulse whitespace-nowrap">🔴 Live Global</button>
             
             <div className="relative" ref={menuRef}>
                 <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded transition focus:outline-none hover:bg-gray-100">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                 </button>
                 {showMenu && (
                     <div className="absolute right-0 mt-2 w-60 rounded-lg shadow-xl border bg-white z-50 animate-fade-in overflow-hidden">
                         <button onClick={() => { setViewState("approvals"); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold border-b flex items-center gap-2 hover:bg-gray-50 text-gray-700">🗂️ My Approvals</button>
                         <button onClick={() => { setViewState("history"); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold border-b flex items-center gap-2 hover:bg-gray-50 text-gray-700">📜 Past History</button>
                         <Link to="/profile" className="block w-full text-left px-4 py-3 text-sm font-bold border-b hover:bg-gray-50 text-gray-700">👤 Profile</Link>
                         <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">🚪 Logout</button>
                     </div>
                 )}
             </div>
         </div>
      </div>

      {viewState === "manager" && selExam ? (
          <div className="bg-white p-4 md:p-6 shadow rounded min-h-[500px] animate-fade-in border border-gray-200">
             <div className="flex justify-between items-center mb-6">
                 <button onClick={() => { setSelExam(null); setViewState("dashboard"); }} className="bg-gray-100 px-4 py-2 rounded font-bold hover:bg-gray-200 text-gray-700 text-sm">← Back</button>
                 <button onClick={(e) => softDeleteExam(e, selExam.id)} className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded font-bold hover:bg-red-600 hover:text-white transition text-sm">Delete Exam 🗑️</button>
             </div>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6 gap-2"><div><h2 className="text-xl md:text-2xl font-bold text-gray-900">{selExam.title}</h2><p className="text-sm mt-1 text-gray-500">Created: {selExam.createdAt?.toDate().toLocaleString()}</p></div><span className={`px-3 py-1 rounded text-white text-sm font-bold uppercase ${selExam.status==='active' || selExam.status==='started' ? 'bg-green-500' : 'bg-gray-500'}`}>{selExam.status}</span></div>
             
             {/* 🔴 SCROLLABLE TABS */}
             <div className="flex gap-2 mb-6 p-1 rounded inline-flex bg-gray-100 overflow-x-auto w-full md:w-auto">
                 {['q','c','r','req','d'].map(t => (<button key={t} onClick={()=>setTab(t)} className={`px-4 md:px-6 py-2 rounded font-bold transition whitespace-nowrap ${tab===t?'bg-white shadow text-blue-600':'text-gray-500 hover:text-gray-800'}`}>{t==='q'?'Questions':t==='c'?'Candidates':t==='r'?'Results':t==='req'?'Requests':'Details'}</button>))}
             </div>

             <div className="overflow-x-auto">
                {tab==='q' && <QuestionManager examId={selExam.id}/>}
                {tab==='c' && <ManageCandidates examId={selExam.id}/>}
                {tab==='r' && <ExamResults examId={selExam.id}/>}
                {tab==='req' && <ManageRequests examId={selExam.id}/>}
             </div>

             {tab==='d' && (<div className="p-6 rounded border bg-gray-50 border-gray-200"><h3 className="font-bold border-b pb-1 mb-2 text-gray-700">Description</h3><p className="p-3 rounded mb-4 bg-white border">{selExam.description || "No description"}</p><h3 className="font-bold border-b pb-1 mb-2 text-gray-700">Questions</h3><div className="space-y-4 h-96 overflow-y-auto">{viewQs.map((q, i) => (<div key={i} className="p-3 border rounded bg-white"><p className="font-semibold text-gray-800">{i+1}. {q.question}</p><p className="text-sm text-green-600 font-bold mt-1">Correct: {q.correct}</p></div>))}</div></div>)}
          </div>
      ) : (
          <>
            <div className="bg-white p-4 md:p-6 rounded shadow mb-8 border border-gray-200">
                <h2 className="font-bold text-lg mb-4 text-gray-900">Create New Exam</h2>
                
                {/* 🔴 MOBILE FORM STACK */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Exam Title *" className="border p-2 rounded md:col-span-2 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500 w-full" />
                    <select value={form.examType} onChange={e=>setForm({...form, examType:e.target.value})} className="border p-2 rounded bg-gray-50 focus:bg-white w-full"><option value="live">Live (Time Based)</option><option value="open">Open (Anytime)</option></select>
                    <select value={form.accessType} onChange={e=>setForm({...form, accessType:e.target.value})} className="border p-2 rounded bg-gray-50 focus:bg-white w-full"><option value="approval">Approval Based</option><option value="direct">Direct Join</option></select>
                </div>
                
                {form.examType === 'live' && (
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <input type="number" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} placeholder="Mins" className="border p-2 rounded w-full md:w-24 bg-gray-50 focus:bg-white" />
                        <input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form, scheduledAt:e.target.value})} className="border p-2 rounded flex-1 bg-gray-50 focus:bg-white w-full" />
                    </div>
                )}
                
                {form.examType === 'open' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 rounded bg-gray-50 border border-gray-200">
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1 text-gray-500">Result Mode</label>
                            <select value={form.resultMode} onChange={e=>setForm({...form, resultMode:e.target.value})} className="border p-2 rounded w-full bg-white">
                                <option value="system">System (Auto Declare)</option>
                                <option value="manual">Manual (Admin Publish)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                             <label className="flex items-center gap-2 cursor-pointer mt-1 text-gray-700">
                                 <input type="checkbox" checked={form.negativeMarking} onChange={e=>setForm({...form, negativeMarking:e.target.checked})} className="w-4 h-4"/>
                                 <span className="text-sm font-bold">Negative Marking (-0.3)</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                 <input type="checkbox" checked={form.showCheatersPublic} onChange={e=>setForm({...form, showCheatersPublic:e.target.checked})} className="w-4 h-4"/>
                                 <span className="text-sm font-bold">Show 'Cheater' Tag to Everyone</span>
                             </label>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Description" className="border p-2 rounded h-20 bg-gray-50 focus:bg-white w-full" />
                    <textarea value={form.rules} onChange={e=>setForm({...form, rules:e.target.value})} placeholder="Rules" className="border p-2 rounded h-20 bg-gray-50 focus:bg-white w-full" />
                </div>
                <button onClick={create} className="bg-blue-600 text-white px-8 py-2 rounded font-bold shadow w-full md:w-auto hover:bg-blue-700">Create Exam</button>
            </div>
            
            <h2 className="font-bold text-xl mb-4 text-gray-800">Your Exams</h2>
            {exams.length === 0 ? <p className="text-gray-500">No active exams.</p> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{exams.map(e => (<div key={e.id} onClick={()=>{ setSelExam(e); setViewState("manager"); }} className="bg-white p-5 rounded-lg shadow border border-transparent hover:border-blue-500 hover:shadow-lg cursor-pointer transition transform hover:-translate-y-1 group relative"><div className="mb-1"><h3 className="font-bold text-lg group-hover:text-blue-600 text-gray-800">{e.title}</h3></div><p className="text-xs mb-3 font-mono text-gray-500">{e.createdAt?.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) || "Just now"}</p><div className="flex gap-2 mb-3"><span className="text-xs px-2 py-1 rounded font-semibold bg-gray-100 text-gray-600">{(e.examType || "live").toUpperCase()}</span><span className="text-xs px-2 py-1 rounded font-semibold bg-gray-100 text-gray-600">{(e.accessType || "approval").toUpperCase()}</span></div><div className="flex justify-between items-center mt-4 pt-2 border-t"><span className={`text-xs px-2 py-1 rounded text-white font-bold uppercase ${e.status==='active' || e.status==='started' ? 'bg-green-500' : e.status==='ended'?'bg-red-500':'bg-gray-400'}`}>{e.status}</span>{e.status !== 'ended' && (<button onClick={(ev)=>{ev.stopPropagation(); toggle(e)}} className={`text-xs px-3 py-1 rounded text-white font-bold shadow transition ${e.examType === 'open' ? (e.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700') : (e.status === 'started' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}`}>{e.examType === 'open' ? (e.status === 'active' ? 'END EXAM' : 'PUBLISH') : (e.status === 'upcoming' ? 'START LIVE' : 'STOP CLASS')}</button>)}</div></div>))}</div>)}
          </>
      )}
    </div>
  );
}