import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, onSnapshot, getDoc } from "firebase/firestore";
import ExamPaper from "./ExamPaper";
import { useAuth } from "../../context/AuthContext";

export default function ExamLobby({ examId, studentId, onLeave }) {
  const { userData, user } = useAuth();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);

  useEffect(() => {
    const examRef = doc(db, "exams", examId);
    const unsub = onSnapshot(examRef, async (docSnap) => {
        if (!docSnap.exists()) { onLeave(); return; }
        const examData = docSnap.data();
        setExam(examData);
        
        const attemptRef = doc(db, "answers", `${studentId}_${examId}`);
        const attemptSnap = await getDoc(attemptRef);
        if (attemptSnap.exists()) { setIsBlocked(true); setLoading(false); return; }
        
        const qSnap = await getDocs(collection(db, "exams", examId, "questions"));
        setQuestionCount(qSnap.size);
        
        // 🔴 LOGIC: If Upcoming -> Show Waiting Screen
        if (examData.status === 'upcoming') { 
            setIsWaitingForHost(true); 
        } else { 
            setIsWaitingForHost(false); 
        }
        setLoading(false);
    });
    return unsub;
  }, [examId, studentId, onLeave]);

  const handleStartExam = async () => {
      if(!agreed) return;
      if (window.confirm("🔴 Final Confirmation: \n\nBy clicking OK, you agree to all terms. Exam will auto-submit on malpractice.")) {
          await setDoc(doc(db, "answers", `${studentId}_${examId}`), {
              studentId,
              examId,
              examTitle: exam.title,
              
              studentName: userData?.fullName || "Student",
              studentUsername: userData?.username || user?.email?.split('@')[0] || "user",
              studentInstitute: userData?.institute || "",
              
              adminInstitute: exam.instituteName || "Institute",
              adminUsername: exam.createdByName || "Admin",

              startedAt: serverTimestamp(),
              status: "in-progress",
              cheated: false,
              answers: {},
              score: 0,
              originalScore: 0
          });
          setStart(true);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Connecting to Exam Server...</div>;

  if (isBlocked) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
              <div className="bg-red-50 p-8 rounded-2xl border-2 border-red-200 shadow-xl max-w-lg">
                  <div className="text-5xl mb-4">🚫</div>
                  <h1 className="text-2xl font-extrabold text-red-700 mb-2">Access Denied</h1>
                  <p className="text-gray-600 font-bold mb-6">You have already attempted this exam.</p>
                  <button onClick={onLeave} className="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition shadow-lg">← Back to Dashboard</button>
              </div>
          </div>
      );
  }

  // 🔴 DARK WAITING LOBBY (Restored Vibe)
  if (isWaitingForHost) {
      return (
        <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-mono">
            
            {/* Background Animation */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-black to-black animate-pulse"></div>

            {/* Content */}
            <div className="z-10 text-center space-y-6 p-6 max-w-2xl">
                
                <div className="mb-8">
                    <div className="w-20 h-20 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse">
                        WAITING LOBBY
                    </h1>
                </div>

                <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-2">{exam.title}</h2>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-6">Status: {exam.status.toUpperCase()}</p>
                    
                    <div className="flex flex-col gap-2 text-gray-300 text-sm">
                        <p>Candidate: <span className="text-blue-400 font-bold">@{userData?.username || "You"}</span></p>
                        <p>Institute: <span className="text-purple-400 font-bold">{exam.instituteName}</span></p>
                        <p>Scheduled: {new Date(exam.scheduledAt).toLocaleString()}</p>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-yellow-400 font-bold animate-bounce">
                        ⚠️ Do not refresh or close this page.
                    </p>
                    <p className="text-gray-500 text-xs">
                        The exam will start automatically when the admin activates it.
                    </p>
                </div>

                <button 
                    onClick={onLeave} 
                    className="mt-8 px-6 py-2 border border-gray-700 rounded-full text-gray-500 hover:text-white hover:border-white transition text-xs uppercase tracking-widest"
                >
                    Exit Lobby
                </button>
            </div>
        </div>
      );
  }

  if (start) return <ExamPaper examData={{...exam, id: examId}} studentId={studentId} onFinish={onLeave} />;

  // 🔴 RULES PAGE (Original UI)
  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-center">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
          
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                  <h1 className="text-2xl font-bold uppercase tracking-wider">{exam.title}</h1>
                  <p className="text-blue-200 text-sm mt-1 font-mono">
                      Institute: {exam.instituteName || "N/A"} <span className="text-yellow-400 font-bold">(@{exam.createdByName || "Admin"})</span>
                  </p>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-xs text-blue-300">Exam ID</p>
                  <p className="font-mono font-bold">{examId}</p>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
              <div className="prose max-w-none text-gray-800 text-sm leading-relaxed">
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">1. EXAMINATION OVERVIEW</h3>
                      <ul className="list-disc list-inside space-y-2">
                          <li><strong>Total Questions:</strong> The exam contains {questionCount} questions.</li>
                          <li><strong>Duration:</strong> You have strictly {exam.duration} minutes to complete the exam.</li>
                          <li><strong>Mode:</strong> This is a {exam.examType.toUpperCase()} examination monitored by AI.</li>
                          <li><strong>Result Declaration:</strong> {exam.resultMode === 'system' ? "Results will be auto-declared." : "Results will be published by the Admin."}</li>
                      </ul>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">2. MARKING & SCORING</h3>
                      <ul className="list-disc list-inside space-y-2">
                          <li>Each correct answer awards <strong>+1 Mark</strong>.</li>
                          <li className="text-red-600 font-bold">Negative Marking: {exam.negativeMarking ? "YES (-0.30 Marks)" : "NO"}</li>
                          <li>Unattempted questions will be marked as 0.</li>
                          <li>Passing Criteria: <strong>{exam.examType==='open' ? "Participation required." : "Minimum 65% Score."}</strong></li>
                      </ul>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 border-l-4 border-yellow-500">
                      <h3 className="text-lg font-bold text-red-700 mb-4 border-b pb-2">3. STRICT SECURITY PROTOCOLS</h3>
                      <p className="mb-2"><strong>WARNING:</strong> This exam is monitored by an automated proctoring system.</p>
                      <ul className="list-decimal list-inside space-y-2 font-semibold text-gray-700">
                          <li><span className="text-red-600">Full Screen is Mandatory:</span> Do not exit full-screen mode.</li>
                          <li><span className="text-red-600">No Tab Switching:</span> If you switch tabs or minimize the window, you will receive a warning.</li>
                          <li><span className="text-red-600">Blocked Keys:</span> F12, Ctrl+C, Ctrl+V, Alt+Tab, and PrintScreen are DISABLED.</li>
                          <li><span className="text-red-600">Auto-Termination:</span> Upon receiving <strong>3 WARNINGS</strong>, the system will automatically submit your exam and disqualify you.</li>
                      </ul>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">4. TECHNICAL INSTRUCTIONS</h3>
                      <ul className="list-disc list-inside space-y-2">
                          <li>Ensure you have a stable internet connection.</li>
                          <li>Do not refresh the page (F5) under any circumstances.</li>
                          <li>Do not use the browser "Back" button. Use the in-app navigation only.</li>
                          <li>In case of a power failure, your session might be lost if not submitted.</li>
                      </ul>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">5. CODE OF CONDUCT</h3>
                      <p>By attempting this exam, you declare that you are the registered student. Impersonation will lead to a permanent ban from the institute portal.</p>
                  </div>

                  <p className="text-center text-gray-400 text-xs mt-8 mb-8">--- End of Instructions ---</p>

                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mt-8">
                      <div className="flex items-start gap-4 mb-6 cursor-pointer" onClick={() => setAgreed(!agreed)}>
                          <div className={`w-6 h-6 mt-1 rounded border-2 flex items-center justify-center transition ${agreed ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`}>
                              {agreed && <span className="text-white font-bold">✓</span>}
                          </div>
                          <div>
                              <h4 className="font-bold text-gray-800">I Acceptance of Terms</h4>
                              <p className="text-sm text-gray-600 mt-1">I have read all the above instructions carefully. I understand that any violation of security protocols will result in immediate disqualification.</p>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button onClick={onLeave} className="px-6 py-3 rounded-lg font-bold text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 transition">
                              Cancel
                          </button>
                          <button 
                            onClick={handleStartExam} 
                            disabled={!agreed} 
                            className={`flex-1 px-8 py-3 rounded-lg font-bold text-white text-lg shadow-lg transition transform ${agreed ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:scale-[1.01] hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed'}`}
                          >
                              {agreed ? "Start Exam Now 🚀" : "Scroll & Agree to Proceed"}
                          </button>
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
}