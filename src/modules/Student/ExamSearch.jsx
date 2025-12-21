import React, { useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

export default function ExamSearch({ onJoin }) {
  const { user, userData } = useAuth();
  const [searchId, setSearchId] = useState("");
  const [foundExams, setFoundExams] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pendingExams, setPendingExams] = useState(new Set());
  const [approvedExams, setApprovedExams] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleSearch = async () => {
    if(!searchId.trim()) return;
    setLoading(true); setSearched(true); setFoundExams([]); setPendingExams(new Set()); setApprovedExams(new Set());
    try {
      const q = query(collection(db, "exams"), where("createdBy", "==", searchId.trim()));
      const snap = await getDocs(q);
      if(snap.empty) { showToast("❌ No exams found for this Institute ID.", "error"); } 
      else {
          const exams = snap.docs.map(d => ({id: d.id, ...d.data()}));
          const validExams = exams.filter(e => e.status !== 'ended');
          if(validExams.length === 0) { showToast("⚠️ Institute found, but no active exams.", "error"); } 
          else { setFoundExams(validExams); checkStatuses(validExams); showToast(`✅ Found ${validExams.length} exams!`, "success"); }
      }
    } catch (err) { console.error(err); showToast("Error searching exams.", "error"); }
    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const checkStatuses = async (exams) => {
      if(!user) return;
      const newPending = new Set(); const newApproved = new Set();
      for (const exam of exams) {
          const candQ = query(collection(db, "exams", exam.id, "candidates"), where("studentId", "==", user.uid));
          const candSnap = await getDocs(candQ);
          if (!candSnap.empty) { newApproved.add(exam.id); continue; }
          if (exam.accessType !== 'direct') {
              const reqQ = query(collection(db, "exam_requests"), where("examId", "==", exam.id), where("studentId", "==", user.uid), where("status", "==", "pending"));
              const reqSnap = await getDocs(reqQ);
              if (!reqSnap.empty) newPending.add(exam.id);
          }
      }
      setApprovedExams(newApproved); setPendingExams(newPending);
  };

  const handleRequestAccess = async (exam) => {
      if (!user) return showToast("Please login first!", "error");
      setLoading(true);
      try {
          const q = query(collection(db, "exam_requests"), where("examId", "==", exam.id), where("studentId", "==", user.uid));
          const snap = await getDocs(q);
          if(!snap.empty) {
              const status = snap.docs[0].data().status;
              if(status === 'approved') { showToast("✅ Already approved! Refreshing...", "success"); setApprovedExams(prev => new Set(prev).add(exam.id)); }
              else if (status === 'pending') { showToast("⚠️ Request pending.", "error"); setPendingExams(prev => new Set(prev).add(exam.id)); }
              else { showToast("❌ Request rejected.", "error"); }
          } else {
              await addDoc(collection(db, "exam_requests"), {
                  examId: exam.id, examTitle: exam.title || "Untitled", studentId: user.uid, studentName: userData?.fullName || "Student", instituteId: exam.createdBy, status: "pending", requestedAt: serverTimestamp()
              });
              showToast("📩 Request Sent!", "success");
              setPendingExams(prev => new Set(prev).add(exam.id));
          }
      } catch (err) { console.error(err); showToast("Failed to send request.", "error"); }
      setLoading(false);
  };

  // 🔴 FIX: Removed 'Upcoming' check. Now it opens Lobby directly.
  const handleJoinClick = (exam) => { 
      onJoin(exam.id); 
  };

  return (
    <div className="relative">
      {toast && (<div className={`absolute -top-12 left-0 right-0 mx-auto w-max px-6 py-2 rounded-full shadow-lg font-bold text-white text-sm animate-fade-in z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.msg}</div>)}
      <div className="flex gap-2 mb-6"><input value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={handleKeyDown} placeholder="Paste Institute ID here..." className="border p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"/><button onClick={handleSearch} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition whitespace-nowrap">{loading ? "..." : "Search"}</button></div>
      <div className="space-y-3">
          {foundExams.length > 0 ? (
              foundExams.map(exam => {
                  const isApproved = approvedExams.has(exam.id); const isPending = pendingExams.has(exam.id); const isDirect = exam.accessType === 'direct';
                  return (
                    <div key={exam.id} className="border p-4 rounded-lg bg-white shadow-sm flex justify-between items-center hover:shadow-md transition">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{exam.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {exam.instituteName ? `${exam.instituteName} ` : ""}
                                {exam.createdByName ? `(@${exam.createdByName})` : ""}
                            </p>
                            <div className="flex gap-2 mt-1"><span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold uppercase ${exam.status==='active'?'bg-green-500':exam.status==='upcoming'?'bg-yellow-500':'bg-red-500'}`}>{exam.status}</span><span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border font-mono">{isDirect ? 'DIRECT' : 'APPROVAL'}</span></div>
                        </div>
                        {isApproved || isDirect ? (<button onClick={() => handleJoinClick(exam)} className="px-4 py-2 rounded text-sm font-bold shadow transition bg-green-600 text-white hover:bg-green-700">Join Now 🚀</button>) : isPending ? (<button disabled className="px-4 py-2 rounded text-sm font-bold shadow bg-gray-300 text-gray-600 cursor-not-allowed border border-gray-400">Request Pending ⏳</button>) : (<button onClick={() => handleRequestAccess(exam)} className="px-4 py-2 rounded text-sm font-bold shadow transition bg-purple-600 text-white hover:bg-purple-700">Request Access 🔒</button>)}
                    </div>
                  );
              })
          ) : (searched && !loading && <p className="text-gray-500 text-center text-sm">No exams found.</p>)}
      </div>
    </div>
  );
}