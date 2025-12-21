import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; 
import UserProfileModal from "../Common/UserProfileModal"; 

export default function GlobalLiveExams({ onBack, onJoin }) { 
  const { user, userData } = useAuth();
  const { themeClasses } = useTheme(); 
  const [exams, setExams] = useState([]);
  const [myRequests, setMyRequests] = useState({}); 
  const [viewProfileId, setViewProfileId] = useState(null);

  useEffect(() => {
    if(!user) return;

    const q = query(
        collection(db, "exams"), 
        where("examType", "==", "open"), 
        where("status", "==", "active"),
        where("isDeleted", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setExams(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qReq = query(collection(db, "exam_requests"), where("studentId", "==", user.uid));
    const unsubReq = onSnapshot(qReq, (snap) => {
        const statusMap = {};
        snap.docs.forEach(d => { statusMap[d.data().examId] = d.data().status; });
        setMyRequests(statusMap);
    });

    return () => { unsub(); unsubReq(); };
  }, [user]);

  // 🔴 NO ALERTS HERE
  const handleRequest = async (exam) => {
      try {
        await addDoc(collection(db, "exam_requests"), {
            examId: exam.id,
            examTitle: exam.title,
            instituteId: exam.createdBy,
            studentId: user.uid,
            studentName: userData.fullName || "Student",
            status: 'pending',
            requestedAt: serverTimestamp()
        });
        // Request bhejte hi button apne aap 'Pending' ho jayega snapshot ki wajah se.
      } catch(err) {
        console.error(err);
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}

      <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className={`p-2 rounded-full shadow font-bold ${themeClasses.cardBg} ${themeClasses.text}`}>← Back</button>
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>🔴 Global Open Exams</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.length === 0 ? <p className={themeClasses.textSec}>No active global exams.</p> : exams.map(exam => {
              const reqStatus = myRequests[exam.id]; 
              const isDirect = exam.accessType === 'direct'; 
              const canStart = isDirect || reqStatus === 'approved';

              return (
                  <div key={exam.id} className={`p-6 rounded-xl shadow-lg border hover:shadow-xl transition relative overflow-hidden ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
                      
                      <span className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg text-white ${isDirect ? 'bg-green-600' : 'bg-orange-500'}`}>
                          {isDirect ? "DIRECT ACCESS" : "APPROVAL BASED"}
                      </span>

                      <div className="flex justify-between items-start mt-2">
                          <div>
                              <h3 className={`font-bold text-xl ${themeClasses.text}`}>{exam.title}</h3>
                              <div className={`text-xs font-bold mt-1 flex gap-1 items-center ${themeClasses.textSec}`}>
                                  By: {exam.instituteName || "Institute"} 
                                  (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setViewProfileId(exam.createdBy); }}
                                    className={`hover:underline ${themeClasses.accentText}`}
                                  >
                                      @{exam.createdByName || "Admin"}
                                  </button>
                                  )
                              </div>
                              <p className={`text-sm mt-2 line-clamp-2 ${themeClasses.textSec}`}>{exam.description || "No description"}</p>
                          </div>
                      </div>
                      
                      <div className={`mt-4 flex justify-between items-center border-t pt-4 ${themeClasses.cardBorder}`}>
                          <div className={`text-xs font-mono ${themeClasses.textSec}`}>ID: {exam.createdBy.substring(0,6)}...</div>
                          
                          {canStart ? (
                              <button 
                                onClick={() => onJoin(exam.id)} 
                                className={`px-6 py-2 rounded-full font-bold shadow text-white transition transform hover:scale-105 ${themeClasses.primary}`}
                              >
                                  Start Exam 🚀
                              </button>
                          ) : (
                              <>
                                  {reqStatus === 'pending' && <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold text-sm border border-yellow-300">⏳ Pending</span>}
                                  {reqStatus === 'rejected' && <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full font-bold text-sm border border-red-300">❌ Rejected</span>}
                                  {!reqStatus && (
                                      <button 
                                        onClick={() => handleRequest(exam)} 
                                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 transition"
                                      >
                                          Request Access 🔒
                                      </button>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}