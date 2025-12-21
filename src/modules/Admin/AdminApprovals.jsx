import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import UserProfileModal from "../Common/UserProfileModal"; 

export default function AdminApprovals({ onBack }) {
  const { user } = useAuth();
  // 🔴 Theme Hook Removed
  const [joinRequests, setJoinRequests] = useState([]);
  const [keyRequests, setKeyRequests] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [activeTab, setActiveTab] = useState("join");
  const [loading, setLoading] = useState(true);
  const [viewProfileId, setViewProfileId] = useState(null);
   
  // 🔴 TOAST STATE (For Custom Notifications)
  const [toast, setToast] = useState(null);
  const showToast = (msg, type="success") => { 
      setToast({ msg, type }); 
      setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    if (!user) return;

    const fetchKeyRequests = async () => {
        const examsQ = query(collection(db, "exams"), where("createdBy", "==", user.uid));
        const examsSnap = await getDocs(examsQ);
        const myExamIds = examsSnap.docs.map(d => d.id);
        const examTitleMap = {};
        examsSnap.docs.forEach(d => { examTitleMap[d.id] = d.data().title; });

        if (myExamIds.length > 0) {
            const ansQ = query(collection(db, "answers"), where("requestView", "==", true));
            const ansSnap = await onSnapshot(ansQ, (snap) => {
                const pendingKeys = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(a => myExamIds.includes(a.examId));
                const finalKeys = pendingKeys.map(k => ({...k, examTitle: examTitleMap[k.examId]}));
                setKeyRequests(finalKeys);
                fetchProfiles(finalKeys.map(k => k.studentId));
            });
            return ansSnap;
        }
    };

    const qJoin = query(collection(db, "exam_requests"), where("instituteId", "==", user.uid), where("status", "==", "pending"));
    const unsubJoin = onSnapshot(qJoin, (snap) => {
        const reqs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setJoinRequests(reqs);
        fetchProfiles(reqs.map(r => r.studentId));
        setLoading(false);
    });

    fetchKeyRequests();
    return () => unsubJoin();
  }, [user]);

  const fetchProfiles = async (ids) => {
      const uniqueIds = [...new Set(ids)];
      const profiles = {};
      await Promise.all(uniqueIds.map(async (uid) => {
          if(!uid || userProfiles[uid]) return;
          const snap = await getDoc(doc(db, "users", uid));
          if(snap.exists()) profiles[uid] = snap.data();
      }));
      setUserProfiles(prev => ({...prev, ...profiles}));
  };

  const handleJoinAction = async (req, status) => {
    if(status === 'rejected' && !window.confirm("Reject student?")) return;
    await updateDoc(doc(db, "exam_requests", req.id), { status });
    if (status === 'approved') {
        const liveUser = userProfiles[req.studentId];
        await addDoc(collection(db, "exams", req.examId, "candidates"), {
            studentId: req.studentId,
            studentName: liveUser?.fullName || req.studentName || "Student",
            joinedAt: serverTimestamp()
        });
    }
    showToast(status === 'approved' ? "Request Approved" : "Request Rejected");
  };

  // 🔴 APPROVE ALL LOGIC (NO ALERT, ONLY TOAST)
  const handleApproveAll = async () => {
      if(!window.confirm(`Are you sure you want to Approve ALL ${joinRequests.length} requests?`)) return;
      
      setLoading(true);
      try {
          const promises = joinRequests.map(async (req) => {
              await updateDoc(doc(db, "exam_requests", req.id), { status: 'approved' });
              
              const liveUser = userProfiles[req.studentId];
              await addDoc(collection(db, "exams", req.examId, "candidates"), {
                  studentId: req.studentId,
                  studentName: liveUser?.fullName || req.studentName || "Student",
                  joinedAt: serverTimestamp()
              });
          });
          
          await Promise.all(promises);
          showToast("✅ All Requests Approved Successfully!"); // Toast instead of Alert
      } catch (err) {
          console.error(err);
          showToast("Error approving requests.", "error");
      }
      setLoading(false);
  };

  const handleKeyAction = async (req, allow) => {
      await updateDoc(doc(db, "answers", req.id), { viewAllowed: allow, requestView: false });
      showToast(allow ? "Access Granted" : "Access Denied");
  };

  if(loading) return <div className="p-10 text-center text-gray-500">Loading Approvals...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-6 relative">
      
      {/* 🔴 TOAST NOTIFICATION UI */}
      {toast && (
        <div className={`fixed top-5 right-5 px-6 py-3 rounded shadow-lg font-bold text-white z-50 animate-bounce-in ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.msg}
        </div>
      )}

      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}

      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="bg-white p-2 rounded-full shadow hover:bg-gray-100 font-bold text-gray-800">← Back</button>
              <h2 className="text-2xl font-bold text-gray-800">🗂️ Central Approval Center</h2>
          </div>
          
          {/* APPROVE ALL BUTTON */}
          {activeTab === 'join' && joinRequests.length > 0 && (
              <button 
                onClick={handleApproveAll}
                className="bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-green-700 animate-pulse transition transform hover:scale-105"
              >
                  Approve All ({joinRequests.length}) ✅
              </button>
          )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <div className="flex border-b border-gray-200">
              <button onClick={() => setActiveTab("join")} className={`flex-1 py-4 font-bold text-center ${activeTab==='join' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Exam Join Requests ({joinRequests.length})</button>
              <button onClick={() => setActiveTab("key")} className={`flex-1 py-4 font-bold text-center ${activeTab==='key' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}>Answer Key Requests ({keyRequests.length})</button>
          </div>

          <div className="p-6">
              {activeTab === 'join' && (
                  <div className="space-y-4">
                      {joinRequests.length === 0 ? <p className="text-center text-gray-500">No pending joining requests.</p> : joinRequests.map(req => {
                          const profile = userProfiles[req.studentId];
                          return (
                              <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
                                  <div className="mb-4 md:mb-0">
                                      <h3 className="font-bold text-lg text-gray-800">{req.examTitle}</h3>
                                      <div className="flex items-center gap-2 mt-1"><span className="font-bold text-gray-600">{profile?.fullName || req.studentName}</span><button onClick={() => setViewProfileId(req.studentId)} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-200">@{profile?.username || "user"}</button></div>
                                      {profile?.emailVisibility === 'public' && (<p className="text-xs text-gray-500 mt-1">📧 {profile.email}</p>)}
                                      <p className="text-xs text-gray-400 mt-1">Requested: {req.requestedAt?.toDate().toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex gap-3"><button onClick={()=>handleJoinAction(req, 'rejected')} className="px-4 py-2 border border-red-200 text-red-600 rounded font-bold hover:bg-red-50">Reject</button><button onClick={()=>handleJoinAction(req, 'approved')} className="px-6 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">Approve Access</button></div>
                              </div>
                          );
                      })}
                  </div>
              )}

              {activeTab === 'key' && (
                  <div className="space-y-4">
                      {keyRequests.length === 0 ? <p className="text-center text-gray-500">No answer key requests.</p> : keyRequests.map(req => {
                          const profile = userProfiles[req.studentId];
                          return (
                              <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100 hover:shadow-md transition">
                                  <div className="mb-4 md:mb-0">
                                      <h3 className="font-bold text-lg text-purple-900">{req.examTitle}</h3>
                                      <div className="flex items-center gap-2 mt-1"><span className="font-bold text-gray-600">{profile?.fullName || req.studentName}</span><button onClick={() => setViewProfileId(req.studentId)} className="text-xs bg-white text-purple-600 border border-purple-200 px-2 py-0.5 rounded font-bold hover:bg-purple-100">@{profile?.username || "user"}</button></div>
                                      {profile?.emailVisibility === 'public' && (<p className="text-xs text-gray-500 mt-1">📧 {profile.email}</p>)}
                                      <p className="text-xs text-gray-500 mt-1 italic">"Reason: {req.requestMessage}"</p>
                                  </div>
                                  <div className="flex gap-3"><button onClick={()=>handleKeyAction(req, false)} className="px-4 py-2 border border-red-200 text-red-600 rounded font-bold hover:bg-red-50">Deny</button><button onClick={()=>handleKeyAction(req, true)} className="px-6 py-2 bg-purple-600 text-white rounded font-bold shadow hover:bg-purple-700">Allow Key</button></div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}