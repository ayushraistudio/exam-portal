import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";

export default function ManageRequests({ examId }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [keyRequests, setKeyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("join");
  
  // 🔴 STORE LIVE PROFILES
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    if (!examId) return;

    // Fetch Join Requests
    const q1 = query(collection(db, "exam_requests"), where("examId", "==", examId));
    const unsub1 = onSnapshot(q1, (snap) => {
        const reqs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(r => r.status === 'pending');
        setJoinRequests(reqs);
        // Fetch Live Profiles for these students
        fetchProfiles(reqs.map(r => r.studentId));
    });

    // Fetch Key Requests
    const q2 = query(collection(db, "answers"), where("examId", "==", examId), where("requestView", "==", true));
    const unsub2 = onSnapshot(q2, (snap) => {
        const reqs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setKeyRequests(reqs);
        // Fetch Live Profiles for these students
        fetchProfiles(reqs.map(r => r.studentId));
    });

    return () => { unsub1(); unsub2(); };
  }, [examId]);

  // 🔴 HELPER: Live Profile Fetcher
  const fetchProfiles = async (ids) => {
      const uniqueIds = [...new Set(ids)];
      const profiles = {};
      await Promise.all(uniqueIds.map(async (uid) => {
          if(!uid) return;
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
        await addDoc(collection(db, "exams", examId, "candidates"), {
            studentId: req.studentId,
            studentName: liveUser?.fullName || req.studentName || "Student",
            joinedAt: serverTimestamp()
        });
    }
  };

  const handleKeyAction = async (req, allow) => {
      await updateDoc(doc(db, "answers", req.id), { viewAllowed: allow, requestView: false });
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border">
      <div className="flex gap-4 mb-6 border-b pb-1">
          <button onClick={() => setActiveTab("join")} className={`px-4 py-2 font-bold ${activeTab==='join'?'text-blue-600 border-b-2 border-blue-600':'text-gray-500'}`}>Exam Access ({joinRequests.length})</button>
          <button onClick={() => setActiveTab("key")} className={`px-4 py-2 font-bold ${activeTab==='key'?'text-purple-600 border-b-2 border-purple-600':'text-gray-500'}`}>Answer Key ({keyRequests.length})</button>
      </div>

      {activeTab === 'join' && (
          <div className="space-y-3">
              {joinRequests.length === 0 ? <p className="text-gray-400 italic">No pending requests.</p> : joinRequests.map(req => {
                  const liveUser = userProfiles[req.studentId];
                  return (
                      <div key={req.id} className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
                          <div>
                              <h4 className="font-bold text-gray-800">{liveUser?.fullName || req.studentName}</h4>
                              {/* 🔴 SHOW LIVE USERNAME */}
                              <p className="text-xs text-blue-600 font-bold">@{liveUser?.username || "user"}</p>
                              <span className="text-xs text-gray-400">Requesting Access</span>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={()=>handleJoinAction(req, 'rejected')} className="text-red-600 font-bold text-sm border px-3 py-1 rounded hover:bg-red-50">Reject</button>
                              <button onClick={()=>handleJoinAction(req, 'approved')} className="bg-blue-600 text-white font-bold text-sm px-4 py-1 rounded hover:bg-blue-700">Approve</button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {activeTab === 'key' && (
          <div className="space-y-3">
              {keyRequests.length === 0 ? <p className="text-gray-400 italic">No key requests.</p> : keyRequests.map(req => {
                  const liveUser = userProfiles[req.studentId];
                  return (
                      <div key={req.id} className="flex justify-between items-center bg-white p-4 rounded shadow-sm border-l-4 border-purple-500">
                          <div>
                              <h4 className="font-bold">{liveUser?.fullName || req.studentName}</h4>
                              {/* 🔴 SHOW LIVE USERNAME */}
                              <p className="text-xs text-blue-600 font-bold">@{liveUser?.username || "user"}</p>
                              <p className="text-xs text-gray-500 italic">"Reason: {req.requestMessage || 'None'}"</p>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={()=>handleKeyAction(req, false)} className="text-red-600 font-bold text-sm border px-3 py-1 rounded hover:bg-red-50">Deny</button>
                              <button onClick={()=>handleKeyAction(req, true)} className="bg-purple-600 text-white font-bold text-sm px-4 py-1 rounded hover:bg-purple-700">Allow</button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}