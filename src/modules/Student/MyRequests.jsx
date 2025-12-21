import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, getDocs, getDoc, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import UserProfileModal from "../Common/UserProfileModal"; 
import { useTheme } from "../../context/ThemeContext"; 

export default function MyRequests({ onJoin, onBack }) {
  const { user } = useAuth();
  const { themeClasses } = useTheme(); 
  const [requests, setRequests] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState({});
  const [loading, setLoading] = useState(true);
    
  const [viewProfileId, setViewProfileId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "exam_requests"), where("studentId", "==", user.uid));
    
    const processData = async (reqData) => {
        const historyQ = query(collection(db, "answers"), where("studentId", "==", user.uid));
        const historySnap = await getDocs(historyQ);
        const attemptedExamIds = historySnap.docs.map(d => d.data().examId);
        
        const filtered = reqData.filter(req => !attemptedExamIds.includes(req.examId));
        filtered.sort((a,b) => (a.status === 'approved' ? -1 : 1));
        
        setRequests(filtered);
        const adminIds = [...new Set(filtered.map(r => r.instituteId))];
        fetchAdminProfiles(adminIds);
        setLoading(false);
    };

    const unsub = onSnapshot(q1, (snap) => {
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
      processData(data);
    });
    return unsub;
  }, [user]);

  const fetchAdminProfiles = async (ids) => {
      const profiles = {};
      await Promise.all(ids.map(async (uid) => {
          if(!uid) return;
          const snap = await getDoc(doc(db, "users", uid));
          if(snap.exists()) profiles[uid] = snap.data();
      }));
      setAdminProfiles(prev => ({...prev, ...profiles}));
  };

  const handleRemove = async (reqId) => {
      if(window.confirm("Remove this request from list?")) {
          await deleteDoc(doc(db, "exam_requests", reqId));
      }
  };

  // 🔴 FIX: Direct Join Trigger (No Upcoming Check here)
  const handleJoinClick = (examId) => {
      onJoin(examId);
  };

  if(loading) return <div className={`p-10 text-center ${themeClasses.textSec}`}>Loading Requests...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-6">
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}

      <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className={`p-2 rounded-full shadow font-bold ${themeClasses.cardBg} ${themeClasses.text}`}>← Back</button>
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>📂 My Exam Requests</h2>
      </div>

      <div className={`rounded-xl shadow overflow-hidden border ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
          {requests.length === 0 ? <div className={`p-10 text-center ${themeClasses.textSec}`}>No active requests.</div> : (
              <table className={`w-full text-left`}>
                  <thead className={`${themeClasses.inputBg} uppercase text-xs font-bold ${themeClasses.textSec}`}>
                      <tr>
                          <th className="p-4 border-b">Exam Name</th>
                          <th className="p-4 border-b">Institute ID</th>
                          <th className="p-4 border-b">Created By (@Username)</th>
                          <th className="p-4 border-b">Requested At</th>
                          <th className="p-4 border-b">Status</th>
                          <th className="p-4 border-b">Action</th>
                      </tr>
                  </thead>
                  <tbody className="text-sm">
                      {requests.map(req => {
                          const adminData = adminProfiles[req.instituteId];
                          return (
                              <tr key={req.id} className={`border-b hover:opacity-80 transition ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
                                  <td className={`p-4 font-bold ${themeClasses.text}`}>{req.examTitle}</td>
                                  <td className={`p-4 font-mono text-xs select-all ${themeClasses.textSec}`}>{req.instituteId}</td>
                                  
                                  <td className="p-4">
                                      <button 
                                        onClick={() => setViewProfileId(req.instituteId)}
                                        className={`font-bold hover:underline transition ${themeClasses.accentText}`}
                                      >
                                          @{adminData?.username || "loading..."}
                                      </button>
                                  </td>
                                  
                                  <td className={`p-4 ${themeClasses.textSec}`}>{req.requestedAt?.toDate().toLocaleDateString()}</td>
                                  <td className="p-4">
                                      {req.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">WAITING</span>}
                                      {req.status === 'approved' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">APPROVED</span>}
                                      {req.status === 'rejected' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">REJECTED</span>}
                                  </td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          {req.status === 'approved' ? (
                                              <button onClick={() => handleJoinClick(req.examId)} className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700 transition transform hover:scale-105">Join 🚀</button>
                                          ) : (<span className="text-gray-400 font-bold text-xs cursor-not-allowed">{req.status === 'rejected' ? 'DENIED' : 'PENDING'}</span>)}
                                          <button onClick={() => handleRemove(req.id)} className="text-gray-400 hover:text-red-600 transition p-2 rounded hover:bg-red-50" title="Remove Request">🗑️</button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          )}
      </div>
    </div>
  );
}