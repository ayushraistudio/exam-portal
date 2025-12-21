import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // 🔴 Theme Import
import ExamResults from "./ExamResults"; 
import UserProfileModal from "../Common/UserProfileModal";

export default function AdminHistory({ onBack }) {
  const { user } = useAuth();
  const { themeClasses } = useTheme(); // 🔴 Theme Hook
  const [createdExams, setCreatedExams] = useState([]);
  const [attemptedExams, setAttemptedExams] = useState([]);
  const [loading, setLoading] = useState(true);
   
  const [viewMode, setViewMode] = useState("list"); 
  const [selectedItem, setSelectedItem] = useState(null);
   
  const [historyResults, setHistoryResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLb, setShowLb] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const qCreated = query(collection(db, "exams"), where("createdBy", "==", user.uid));
    const unsub1 = onSnapshot(qCreated, (snap) => {
        const deletedExams = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(e => e.isDeleted === true);
        setCreatedExams(deletedExams);
    });

    const qAttempted = query(collection(db, "answers"), where("studentId", "==", user.uid));
    const unsub2 = onSnapshot(qAttempted, (snap) => {
        setAttemptedExams(snap.docs.map(d => ({id: d.id, ...d.data()})));
        setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  const fetchHistoryResults = async (examId) => {
      const q = query(collection(db, "answers"), where("examId", "==", examId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      data.sort((a,b) => parseFloat(b.score) - parseFloat(a.score)); 
      setHistoryResults(data);
  };

  const handleSingleDelete = async () => {
      if(viewMode === 'detail_created') {
          await deleteDoc(doc(db, "exams", selectedItem.id));
      } else {
          await deleteDoc(doc(db, "answers", selectedItem.id));
      }
      setViewMode("list");
      setSelectedItem(null);
  };

  // 🔴 ALERT REMOVED HERE
  const handleDeleteAll = async () => {
      if(!window.confirm("⚠️ PERMANENTLY DELETE ALL HISTORY?")) return;
      setLoading(true);
      try {
          for(const ex of createdExams) await deleteDoc(doc(db, "exams", ex.id));
          for(const att of attemptedExams) await deleteDoc(doc(db, "answers", att.id));
          // Success Alert Hata Diya ✅
      } catch(err) { console.error(err); }
      setLoading(false);
  };

  const openDetail = async (item, type) => {
      setSelectedItem(item);
      if(type === 'created') {
          setViewMode("detail_created");
          fetchHistoryResults(item.id); 
      } else {
          setViewMode("detail_attempted");
          setShowLb(false);
          if(item.examId) {
              const examSnap = await getDoc(doc(db, "exams", item.examId));
              if(examSnap.exists()) {
                  const creatorId = examSnap.data().createdBy;
                  const uSnap = await getDoc(doc(db, "users", creatorId));
                  if(uSnap.exists()) setCreatorProfile({ uid: creatorId, ...uSnap.data() });
              }
          }
      }
  };

  const fetchLeaderboard = async () => {
      if(!selectedItem.resultDeclared) return;
      const q = query(collection(db, "answers"), where("examId", "==", selectedItem.examId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      data.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
      setLeaderboard(data);
      setShowLb(true);
  };

  if(loading) return <div className={`p-10 text-center ${themeClasses.textSec}`}>Loading...</div>;

  if (viewMode === 'detail_created') {
      return (
          <div className={`max-w-6xl mx-auto mt-6 p-6 rounded-xl shadow-lg border-t-8 border-gray-600 animate-fade-in ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
              {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
              <div className={`flex justify-between items-center mb-6 border-b pb-4 ${themeClasses.cardBorder}`}>
                  <div className="flex items-center gap-4">
                      <button onClick={() => setViewMode("list")} className={`p-2 rounded-full ${themeClasses.inputBg} ${themeClasses.text}`}>← Back</button>
                      <div><h2 className={`text-2xl font-bold ${themeClasses.text}`}>{selectedItem.title}</h2><span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold uppercase">ARCHIVED VIEW</span></div>
                  </div>
                  <button onClick={handleSingleDelete} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition">Permanently Delete 🗑️</button>
              </div>
              <div className="overflow-x-auto">
                  <table className={`w-full text-left text-sm border-collapse ${themeClasses.text}`}><thead className={`font-bold uppercase ${themeClasses.inputBg}`}><tr><th className="p-3 border">Rank</th><th className="p-3 border">Student</th><th className="p-3 border">Original Score</th><th className="p-3 border">Final Score</th><th className="p-3 border">Status</th><th className="p-3 border">Tags</th></tr></thead>
                      <tbody>{historyResults.map((r, index) => (<tr key={index} className={`border-b hover:opacity-80 ${themeClasses.cardBorder}`}><td className="p-3 border font-bold">#{index + 1}</td><td className="p-3 border"><button onClick={() => setViewProfileId(r.studentId)} className={`font-bold hover:underline ${themeClasses.accentText}`}>@{r.studentUsername || "user"}</button></td><td className={`p-3 border font-mono ${themeClasses.textSec}`}>{r.originalScore || r.score}</td><td className="p-3 border font-mono font-bold">{r.score}</td><td className="p-3 border"><span className={`px-2 py-1 rounded text-xs font-bold ${r.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isPassed ? "PASSED" : "FAILED"}</span></td><td className="p-3 border">{r.cheated ? (<span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">CHEATER</span>) : (<span className="text-gray-400 text-xs">-</span>)}</td></tr>))}</tbody>
                  </table>
                  {historyResults.length === 0 && <p className={`text-center p-6 ${themeClasses.textSec}`}>No student results found for this exam.</p>}
              </div>
          </div>
      );
  }

  if (viewMode === 'detail_attempted') {
      return (
          <div className={`max-w-4xl mx-auto mt-6 p-8 rounded-xl shadow-lg border-t-8 border-blue-600 animate-fade-in relative ${themeClasses.cardBg}`}>
              {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
              <div className="flex justify-between items-start mb-8"><button onClick={() => setViewMode("list")} className={`p-2 rounded-full font-bold ${themeClasses.inputBg} ${themeClasses.text}`}>← Back</button><button onClick={handleSingleDelete} className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-200 font-bold hover:bg-red-100 transition">Delete Record 🗑️</button></div>
              <div className="text-center mb-8"><h1 className={`text-3xl font-extrabold ${themeClasses.text}`}>{selectedItem.examTitle}</h1><div className={`flex justify-center items-center gap-2 mt-2 text-sm ${themeClasses.textSec}`}><span>Created By:</span><span className={`font-bold ${themeClasses.text}`}>{creatorProfile?.institute || "Institute"}</span><button onClick={() => setViewProfileId(creatorProfile?.uid)} className={`font-bold hover:underline ${themeClasses.accentText}`}>({creatorProfile?.username || "Admin"})</button></div><div className={`mt-6 inline-block px-8 py-4 rounded-xl border-2 ${selectedItem.isPassed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}><p className="text-sm font-bold uppercase">Your Score</p><p className="text-5xl font-extrabold">{selectedItem.score}</p><p className="text-sm font-bold mt-1">{selectedItem.isPassed ? "PASSED 🎉" : "FAILED ❌"}</p></div></div>
              <div className={`border-t pt-6 ${themeClasses.cardBorder}`}>{!selectedItem.resultDeclared ? (<div className="bg-yellow-50 p-4 rounded text-center border border-yellow-200"><h3 className="font-bold text-yellow-800">⏳ Result Not Declared</h3></div>) : (<div>{!showLb ? (<button onClick={fetchLeaderboard} className={`w-full text-white py-3 rounded-lg font-bold shadow transition ${themeClasses.primary}`}>View Leaderboard 🏆</button>) : (<div className={`rounded-lg overflow-hidden border ${themeClasses.cardBorder} ${themeClasses.bg}`}><div className={`p-3 font-bold text-center ${themeClasses.inputBg} ${themeClasses.text}`}>🏆 Class Leaderboard</div><table className={`w-full text-left text-sm ${themeClasses.text}`}><thead className={`${themeClasses.inputBg} font-bold`}><tr><th className="p-3">Rank</th><th className="p-3">User</th><th className="p-3">Score</th></tr></thead><tbody>{leaderboard.map((r, i) => (<tr key={i} className={`border-b ${r.studentId === user.uid ? (themeClasses.name==='Dark Mode'?'bg-blue-900':'bg-blue-100') : ""} ${themeClasses.cardBorder}`}><td className="p-3 font-bold">#{i+1}</td><td className="p-3"><button onClick={() => setViewProfileId(r.studentId)} className={`font-bold hover:underline ${themeClasses.accentText}`}>@{r.studentUsername || "user"}</button>{r.studentId === user.uid && " (You)"}</td><td className="p-3 font-mono font-bold">{r.score}</td></tr>))}</tbody></table></div>)}</div>)}</div>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto mt-6">
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4"><button onClick={onBack} className={`p-2 rounded-full shadow font-bold ${themeClasses.cardBg} ${themeClasses.text}`}>← Back</button><h2 className={`text-2xl font-bold ${themeClasses.text}`}>📜 Past History</h2></div>
          {(createdExams.length > 0 || attemptedExams.length > 0) && (<button onClick={handleDeleteAll} className="bg-red-600 text-white px-4 py-2 rounded shadow font-bold text-sm hover:bg-red-700 transition">Delete All History 🗑️</button>)}
      </div>
      <div className="space-y-8">
          <div><h3 className={`text-lg font-bold mb-3 border-b pb-1 ${themeClasses.text} ${themeClasses.cardBorder}`}>Recently Deleted by You ({createdExams.length})</h3>{createdExams.length === 0 ? <p className={`italic text-sm ${themeClasses.textSec}`}>No deleted exams found.</p> : (<div className="grid gap-3">{createdExams.map(ex => (<div key={ex.id} onClick={() => openDetail(ex, 'created')} className={`p-4 rounded-lg shadow-sm border cursor-pointer flex justify-between items-center transition ${themeClasses.cardBg} ${themeClasses.cardBorder} hover:opacity-80`}><div><h4 className={`font-bold ${themeClasses.text}`}>{ex.title}</h4><p className={`text-xs ${themeClasses.textSec}`}>{ex.createdAt?.toDate().toLocaleDateString()}</p></div><span className="text-xs font-bold text-white bg-gray-400 px-2 py-1 rounded">DELETED</span></div>))}</div>)}</div>
          <div><h3 className={`text-lg font-bold mb-3 border-b pb-1 ${themeClasses.accentText} ${themeClasses.cardBorder}`}>Attempted by You ({attemptedExams.length})</h3>{attemptedExams.length === 0 ? <p className={`italic text-sm ${themeClasses.textSec}`}>No attempts yet.</p> : (<div className="grid gap-3">{attemptedExams.map(ex => (<div key={ex.id} onClick={() => openDetail(ex, 'attempted')} className={`p-4 rounded-lg shadow-sm border cursor-pointer flex justify-between items-center transition ${themeClasses.cardBg} ${themeClasses.cardBorder} hover:opacity-80`}><div><h4 className={`font-bold ${themeClasses.text}`}>{ex.examTitle}</h4><p className={`text-xs font-bold mt-1 ${themeClasses.accentText}`}>({ex.adminUsername})</p></div><div className="text-right"><span className={`text-xs font-bold px-2 py-1 rounded ${ex.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ex.isPassed ? "PASSED" : "FAILED"}</span><p className={`text-xs font-mono font-bold mt-1 ${themeClasses.text}`}>Score: {ex.score}</p></div></div>))}</div>)}</div>
      </div>
    </div>
  );
}