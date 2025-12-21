import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import UserProfileModal from "../Common/UserProfileModal"; 
import { useTheme } from "../../context/ThemeContext"; // 🔴 Theme Import

export default function ManageCandidates({ examId }) {
  const { themeClasses } = useTheme(); // 🔴 Theme Hook
  const [candidates, setCandidates] = useState([]);
  const [answers, setAnswers] = useState({});
  const [userProfiles, setUserProfiles] = useState({});
   
  // 🔴 Profile State
  const [viewProfileId, setViewProfileId] = useState(null);

  useEffect(() => {
    const q1 = query(collection(db, "exams", examId, "candidates"));
    const unsub1 = onSnapshot(q1, (snap) => {
        setCandidates(snap.docs.map(d => ({id: d.id, ...d.data()})));
        fetchProfiles(snap.docs.map(d => d.data().studentId));
    });

    const q2 = query(collection(db, "answers"), where("examId", "==", examId));
    const unsub2 = onSnapshot(q2, (snap) => {
        const ansMap = {};
        snap.docs.forEach(d => { ansMap[d.data().studentId] = d.data(); });
        setAnswers(ansMap);
    });
    return () => { unsub1(); unsub2(); };
  }, [examId]);

  const fetchProfiles = async (studentIds) => {
      const profiles = {};
      const uniqueIds = [...new Set(studentIds)];
      await Promise.all(uniqueIds.map(async (uid) => {
          if(!uid) return;
          const snap = await getDoc(doc(db, "users", uid));
          if(snap.exists()) profiles[uid] = snap.data();
      }));
      setUserProfiles(prev => ({...prev, ...profiles}));
  };

  const getTimeTaken = (res) => {
      if(!res || !res.startedAt || !res.submittedAt) return "-";
      const start = res.startedAt.toDate ? res.startedAt.toDate() : new Date(res.startedAt);
      const end = res.submittedAt.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
      const diffMs = end - start;
      return `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`;
  };

  return (
    <div className={`p-6 rounded shadow border ${themeClasses.cardBg} ${themeClasses.cardBorder}`}>
      {/* 🔴 PROFILE MODAL */}
      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}

      <h3 className={`font-bold text-xl mb-4 ${themeClasses.text}`}>All Candidates ({candidates.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className={`${themeClasses.inputBg} ${themeClasses.textSec} uppercase text-xs font-bold`}>
                <tr>
                    <th className="p-3 border">User Detail</th>
                    <th className="p-3 border">Institute</th>
                    <th className="p-3 border">Joined At</th>
                    <th className="p-3 border">Status</th>
                    <th className="p-3 border">Time</th>
                    <th className="p-3 border">Original Score</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {candidates.map(c => {
                    const result = answers[c.studentId];
                    const liveUser = userProfiles[c.studentId];
                    const displayName = liveUser?.fullName || c.studentName;
                    const displayUsername = liveUser?.username || result?.studentUsername || "user";
                    const displayInstitute = liveUser?.institute || result?.studentInstitute || "";
                    const displayScore = result ? (result.originalScore !== undefined ? result.originalScore : result.score) : "-";

                    return (
                        <tr key={c.id} className={`border-b hover:opacity-80 transition ${themeClasses.cardBorder}`}>
                            <td className="p-3 border">
                                <div className={`font-bold ${themeClasses.text}`}>{displayName}</div>
                                {/* 🔴 CLICKABLE USERNAME */}
                                <button 
                                    onClick={() => setViewProfileId(c.studentId)}
                                    className={`text-xs font-bold tracking-wide hover:underline ${themeClasses.accentText}`}
                                >
                                    @{displayUsername}
                                </button>
                            </td>
                            <td className={`p-3 border ${themeClasses.textSec}`}>{displayInstitute}</td>
                            <td className={`p-3 border ${themeClasses.textSec}`}>{c.joinedAt?.toDate().toLocaleDateString()}</td>
                            <td className="p-3 border">{result ? (<span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ATTEMPTED</span>) : (<span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">NOT STARTED</span>)}</td>
                            <td className={`p-3 border font-mono ${themeClasses.accentText}`}>{getTimeTaken(result)}</td>
                            <td className={`p-3 border font-bold ${themeClasses.text}`}>{displayScore}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
}