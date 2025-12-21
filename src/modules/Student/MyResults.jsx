import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import UserProfileModal from "../Common/UserProfileModal"; 
import { useTheme } from "../../context/ThemeContext"; // 🔴 Theme Import

export default function MyResults({ viewMode = 'list', detailData, onBack, onSelectResult }) {
  const { user } = useAuth();
  const { themeClasses } = useTheme(); // 🔴 Theme Hook
  const [history, setHistory] = useState([]);
  const [currentDetail, setCurrentDetail] = useState(detailData?.fetchRequired ? null : detailData);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [creatorProfiles, setCreatorProfiles] = useState({}); 
  const [toast, setToast] = useState(null);
   
  // 🔴 State for Profile Popup
  const [viewProfileId, setViewProfileId] = useState(null);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        const q = query(collection(db, "answers"), where("studentId", "==", user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({docId: d.id, ...d.data()}));
        data.sort((a, b) => b.submittedAt - a.submittedAt);
        setHistory(data);
        
        // Fetch Creator IDs (Admin IDs) from Exams
        const examIds = [...new Set(data.map(h => h.examId))];
        fetchCreators(examIds);

        if(detailData?.fetchRequired) {
            const target = data.find(h => h.examId === detailData.examId);
            if(target) setCurrentDetail(target);
        }
      }
    };
    fetchHistory();
  }, [user, detailData]);

  const fetchCreators = async (examIds) => {
      const profiles = {};
      await Promise.all(examIds.map(async (eid) => {
          const examSnap = await getDoc(doc(db, "exams", eid));
          if(examSnap.exists()) {
              const creatorId = examSnap.data().createdBy;
              if(creatorId) {
                  const userSnap = await getDoc(doc(db, "users", creatorId));
                  if(userSnap.exists()) profiles[eid] = { ...userSnap.data(), uid: creatorId };
              }
          }
      }));
      setCreatorProfiles(prev => ({...prev, ...profiles}));
  };

  const deleteHistory = async () => { if(window.confirm("Delete record?")) { await deleteDoc(doc(db, "answers", currentDetail.docId)); onBack(); } };
  const loadLeaderboard = async () => { if(!currentDetail.resultDeclared) { showToast("🔒 Results not declared yet.", "error"); return; } const q = query(collection(db, "answers"), where("examId", "==", currentDetail.examId)); const snap = await getDocs(q); let lb = snap.docs.map(d => d.data()); lb.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)); setLeaderboardData(lb); setShowLeaderboard(true); };
  const requestAccess = async () => { const reason = prompt("Reason?"); if(!reason) return; await updateDoc(doc(db, "answers", currentDetail.docId), { requestView: true, requestMessage: reason }); showToast("📩 Request sent!"); setCurrentDetail({...currentDetail, requestView: true}); };
  const viewAnswerKey = async () => { const qSnap = await getDocs(collection(db, "exams", currentDetail.examId, "questions")); setQuestions(qSnap.docs.map(d => ({id: d.id, ...d.data()}))); };

  if (viewMode === 'detail') {
      if(!currentDetail) return <div className={`p-10 text-center ${themeClasses.textSec}`}>Loading...</div>;
      const isAnswerAllowed = currentDetail.examType === 'open' || currentDetail.viewAllowed === true;
      const creator = creatorProfiles[currentDetail.examId]; 

      return (
          <div className={`p-6 rounded shadow relative animate-fade-in max-w-4xl mx-auto mt-10 ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
              {/* 🔴 PROFILE MODAL */}
              {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}

              <button onClick={onBack} className={`absolute -top-12 left-0 flex items-center gap-2 font-bold transition ${themeClasses.textSec} hover:${themeClasses.text}`}>← Back</button>
              
              <div className={`flex justify-between items-start border-b pb-4 mb-4 ${themeClasses.cardBorder}`}>
                  <div>
                      <h2 className={`text-3xl font-bold ${themeClasses.text}`}>{currentDetail.examTitle}</h2>
                      <div className={`text-sm font-bold mt-1 flex gap-1 ${themeClasses.accentText}`}>
                          Conducted by: 
                          <button 
                             onClick={() => creator?.uid && setViewProfileId(creator.uid)}
                             className="hover:underline"
                          >
                             @{creator?.username || "Admin"}
                          </button>
                      </div>
                      <p className={`text-xs mt-1 ${themeClasses.textSec}`}>Submitted: {currentDetail.submittedAt?.toDate().toLocaleString()}</p>
                  </div>
                  <button onClick={deleteHistory} className="text-red-500 text-sm hover:underline font-semibold">Delete Record</button>
              </div>

              {!currentDetail.resultDeclared ? (<div className="p-8 bg-yellow-50 text-center rounded border border-yellow-200"><h3 className="text-2xl font-bold text-yellow-700 mb-2">⏳ Submitted Successfully</h3><p className="text-yellow-800">Result pending declaration.</p></div>) : (<div className={`p-8 rounded border text-center ${currentDetail.isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><h3 className={`text-5xl font-extrabold mt-2 ${currentDetail.isPassed ? 'text-green-600' : 'text-red-600'}`}>{currentDetail.isPassed ? "PASSED 🎉" : "FAILED ❌"}</h3><p className={`mt-2 font-bold text-gray-600`}>Score: {currentDetail.score}</p></div>)}
              
              <div className="flex gap-4 mt-8"><button onClick={loadLeaderboard} className={`flex-1 text-white py-3 rounded-lg font-bold shadow transition bg-purple-600 hover:bg-purple-700`}>🏆 Leaderboard</button>{isAnswerAllowed ? (<button onClick={viewAnswerKey} className={`flex-1 text-white py-3 rounded-lg font-bold shadow transition ${themeClasses.primary}`}>📖 Answer Key</button>) : (<button onClick={requestAccess} disabled={currentDetail.requestView} className={`flex-1 border py-3 rounded-lg font-bold transition ${currentDetail.requestView ? 'bg-gray-100 text-gray-400' : `border-blue-600 ${themeClasses.accentText} hover:bg-blue-50`}`}>{currentDetail.requestView ? "Request Pending..." : "Request Answer Key"}</button>)}</div>
              
              {showLeaderboard && (
                  <div className={`mt-8 border rounded-lg overflow-hidden animate-fade-in ${themeClasses.cardBorder}`}>
                      <div className={`p-3 font-bold border-b ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.cardBorder}`}>Class Leaderboard</div>
                      <table className={`w-full text-left ${themeClasses.cardBg} ${themeClasses.text}`}><thead className={`${themeClasses.inputBg} text-xs uppercase ${themeClasses.textSec}`}><tr><th className="p-3">Rank</th><th className="p-3">Student</th><th className="p-3">Score</th></tr></thead>
                          <tbody>{leaderboardData.map((s, i) => (
                              <tr key={i} className={`border-b ${themeClasses.cardBorder} ${s.studentId===user.uid ? (themeClasses.name==='Dark Mode'?'bg-blue-900':'bg-blue-50') : ''}`}>
                                  <td className="p-3 font-bold">#{i+1}</td>
                                  <td className="p-3">
                                      {/* 🔴 Clickable Student Username in Leaderboard */}
                                      <button onClick={() => setViewProfileId(s.studentId)} className={`hover:underline font-medium ${themeClasses.accentText}`}>
                                          @{s.studentUsername || "user"}
                                      </button>
                                      {s.studentId===user.uid&&" (You)"}
                                  </td>
                                  <td className="p-3 font-mono">{s.studentId===user.uid?s.score:"--"}</td>
                              </tr>
                          ))}</tbody>
                      </table>
                  </div>
              )}
              {questions.length > 0 && <div className="mt-8 space-y-4">{questions.map((q, i) => (<div key={i} className={`p-4 rounded border ${themeClasses.bg} ${themeClasses.cardBorder}`}><p className={`font-bold ${themeClasses.text}`}>{i+1}. {q.question}</p><div className="mt-2 text-sm flex gap-4"><span className={currentDetail.answers[q.id]===q.correct ? "text-green-600 font-bold" : "text-red-500 font-bold"}>You: {currentDetail.answers[q.id] || "Skipped"}</span><span className="text-blue-600 font-bold">Correct: {q.correct}</span></div></div>))}</div>}
          </div>
      );
  }

  // LIST VIEW
  return (
    <div className={`mt-8 p-6 rounded shadow ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
      {/* 🔴 PROFILE MODAL */}
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
      
      {toast && <div className="fixed bottom-5 right-5 bg-gray-800 text-white px-6 py-3 rounded shadow-lg z-50 animate-bounce-in">{toast.msg}</div>}
      <h2 className={`text-xl font-bold mb-4 border-b pb-2 ${themeClasses.text} ${themeClasses.cardBorder}`}>My Exam History</h2>
      {history.length === 0 ? <p className={themeClasses.textSec}>No exams taken yet.</p> : (
        <div className="space-y-3">
          {history.map((h, i) => {
             const creator = creatorProfiles[h.examId];
             return (
                <div key={i} onClick={() => onSelectResult(h)} className={`group flex justify-between items-center border p-4 rounded-lg hover:shadow-md cursor-pointer transition transform hover:-translate-y-0.5 ${themeClasses.cardBg} ${themeClasses.cardBorder} hover:border-blue-400`}>
                   <div>
                       <h3 className={`font-bold text-lg transition group-hover:${themeClasses.accentText} ${themeClasses.text}`}>{h.examTitle}</h3>
                       
                       {/* 🔴 LIVE CLICKABLE USERNAME */}
                       <div className={`text-xs font-bold mt-1 flex gap-1 z-10 relative ${themeClasses.accentText}`}>
                           <button 
                                onClick={(e) => { e.stopPropagation(); creator?.uid && setViewProfileId(creator.uid); }} 
                                className="hover:underline"
                           >
                               @{creator?.username || "loading..."}
                           </button>
                           <span className={themeClasses.textSec}>• {creator?.institute || "Institute"}</span>
                       </div>
                       
                       <p className={`text-xs mt-1 ${themeClasses.textSec}`}>Taken: {h.submittedAt?.toDate().toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                       {h.resultDeclared ? (<span className={`px-3 py-1 rounded-full text-xs font-bold ${h.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.isPassed ? "PASSED" : "FAILED"}</span>) : (<span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">WAITING</span>)}
                   </div>
                </div>
             );
          })}
        </div>
      )}
    </div>
  );
}