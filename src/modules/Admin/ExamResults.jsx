import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";

export default function ExamResults({ examId }) {
  const [results, setResults] = useState([]);
  const [userProfiles, setUserProfiles] = useState({}); // 🔴 Store Live User Data
  
  // 🔴 Toast State
  const [toast, setToast] = useState(null);
  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const q = query(collection(db, "answers"), where("examId", "==", examId));
    const unsub = onSnapshot(q, async (snap) => {
        let data = snap.docs.map(d => ({id: d.id, ...d.data()}));
        data.sort((a,b) => parseFloat(b.score) - parseFloat(a.score));
        setResults(data);

        // 🔴 FETCH LIVE USER PROFILES (Username updates handle karne ke liye)
        const profiles = {};
        const fetchPromises = data.map(async (r) => {
            if (r.studentId) {
                const userSnap = await getDoc(doc(db, "users", r.studentId));
                if (userSnap.exists()) {
                    profiles[r.studentId] = userSnap.data();
                }
            }
        });
        await Promise.all(fetchPromises);
        setUserProfiles(profiles);
    });
    return unsub;
  }, [examId]);

  const getTimeTaken = (res) => {
      if(!res.startedAt || !res.submittedAt) return "N/A";
      const start = res.startedAt.toDate ? res.startedAt.toDate() : new Date(res.startedAt);
      const end = res.submittedAt.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}m ${diffSecs}s`;
  };

  // 🔴 DECLARE RESULT (No Browser Alert)
  const declareResult = async () => {
      try {
          await updateDoc(doc(db, "exams", examId), { resultDeclared: true });
          
          // Update all answers
          const batchPromises = results.map(r => 
              updateDoc(doc(db, "answers", r.id), { resultDeclared: true })
          );
          await Promise.all(batchPromises);

          showToast("📢 Results Announced Successfully!"); // Green Toast
      } catch (err) {
          console.error(err);
          showToast("Failed to declare results.", "error");
      }
  };

  const toggleAnswerKey = async (res) => {
      await updateDoc(doc(db, "answers", res.id), { viewAllowed: !res.viewAllowed, requestView: false });
      showToast(res.viewAllowed ? "Access Revoked" : "Access Granted");
  };

  const updateManual = async (res, field, value) => { await updateDoc(doc(db, "answers", res.id), { [field]: value }); };

  return (
    <div className="bg-gray-50 p-6 rounded border relative">
      
      {/* 🔴 TOAST NOTIFICATION */}
      {toast && (
          <div className={`absolute top-2 right-2 px-6 py-3 rounded shadow-lg font-bold text-white z-50 animate-bounce-in ${toast.type==='error'?'bg-red-600':'bg-green-600'}`}>
              {toast.msg}
          </div>
      )}

      <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-gray-700">🏆 Leaderboard Management</h3>
          <button 
            onClick={declareResult} 
            className="bg-purple-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-purple-700 animate-pulse transition transform active:scale-95"
          >
              📢 Declare Results
          </button>
      </div>
      
      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase font-bold border-b">
              <tr>
                  <th className="p-3 border">Rank</th>
                  <th className="p-3 border">Student Details</th>
                  <th className="p-3 border">Institute</th>
                  <th className="p-3 border">Time</th>
                  <th className="p-3 border">Score</th>
                  <th className="p-3 border">Actions</th>
                  <th className="p-3 border">Key Access</th>
              </tr>
          </thead>
          <tbody>
              {results.map((r, index) => {
                  // 🔴 USE LIVE PROFILE DATA
                  const liveUser = userProfiles[r.studentId];
                  const displayName = liveUser?.fullName || r.studentName;
                  const displayUsername = liveUser?.username || r.studentUsername || "user";
                  const displayInstitute = liveUser?.institute || r.studentInstitute || "N/A";

                  return (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 border font-bold">#{index + 1}</td>
                        
                        {/* Name & Username */}
                        <td className="p-3 border">
                            <div className="font-bold text-gray-800">{displayName}</div>
                            <div className="text-xs text-blue-600 font-bold tracking-wide">@{displayUsername}</div>
                        </td>

                        <td className="p-3 border text-gray-600 font-medium">{displayInstitute}</td>
                        <td className="p-3 border font-mono text-blue-600">{getTimeTaken(r)}</td>

                        <td className="p-3 border">
                            <input 
                                type="number" 
                                defaultValue={r.score}
                                onBlur={(e) => updateManual(r, 'score', e.target.value)} 
                                className="border p-1 w-16 rounded text-center bg-gray-50 font-bold"
                            />
                        </td>
                        
                        <td className="p-3 border space-y-1">
                            <button onClick={() => updateManual(r, 'isPassed', !r.isPassed)} className={`block w-full px-2 py-1 rounded text-xs font-bold ${r.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isPassed ? "PASSED" : "FAILED"}</button>
                            <button onClick={() => updateManual(r, 'cheated', !r.cheated)} className={`block w-full px-2 py-1 rounded text-xs font-bold ${r.cheated ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{r.cheated ? "CHEATER" : "CLEAN"}</button>
                        </td>

                        <td className="p-3 border">
                            {r.requestView ? (
                                <button onClick={() => toggleAnswerKey(r)} className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold animate-pulse hover:bg-purple-700 w-full">Approve Request 🔓</button>
                            ) : (
                                <button onClick={() => toggleAnswerKey(r)} className={`w-full px-3 py-1 rounded text-xs font-bold border ${r.viewAllowed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{r.viewAllowed ? "Revoke Access" : "Grant Access"}</button>
                            )}
                        </td>
                    </tr>
                  );
              })}
          </tbody>
      </table>
      </div>
    </div>
  );
}