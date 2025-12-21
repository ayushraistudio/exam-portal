import React, { useState, useEffect, useRef } from "react";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"; 
import { useAuth } from "../../context/AuthContext";

export default function ExamPaper({ examData, studentId, onFinish }) {
  const [qs, setQs] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [ans, setAns] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const isTimed = examData.examType === 'live';
  const [time, setTime] = useState(isTimed ? examData.duration * 60 : null);
  
  const [warnings, setWarnings] = useState(0);
  const isCheatedRef = useRef(false); 
  const canvasRef = useRef(null);

  // 1. 🔴 STRICT KEY BLOCKING (F12, Refresh, Copy)
  useEffect(() => {
      // Disable Right Click
      const handleContext = (e) => e.preventDefault();
      
      // Disable Keys
      const handleKeyDown = (e) => {
          // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
          if (
              e.key === 'F12' || 
              (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
              (e.ctrlKey && e.key === 'U')
          ) {
              e.preventDefault();
              triggerWarning("Do not open Developer Tools!");
          }

          // Disable Refresh (F5, Ctrl+R)
          if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
              e.preventDefault();
              // Refresh cant be fully stopped in all browsers, but we show warning
              triggerWarning("Refresh is disabled!");
          }

          // Disable Copy/Paste
          if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
              e.preventDefault();
              triggerWarning("Copy/Paste is disabled!");
          }
      };

      document.addEventListener('contextmenu', handleContext);
      document.addEventListener('keydown', handleKeyDown);
      window.history.pushState(null, document.title, window.location.href);
      const handlePop = () => window.history.pushState(null, document.title, window.location.href);
      window.addEventListener('popstate', handlePop);

      return () => {
          document.removeEventListener('contextmenu', handleContext);
          document.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('popstate', handlePop);
      };
  }, []);

  // Warning System Handler
  const triggerWarning = (msg) => {
      setWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
              isCheatedRef.current = true;
              submit(); // Auto Submit on 3rd Warning
          }
          return newCount;
      });
      alert(`⚠️ WARNING (${warnings + 1}/3): ${msg}`);
  };

  useEffect(() => {
    getDocs(collection(db, "exams", examData.id, "questions")).then(s => setQs(s.docs.map(d=>({id:d.id, ...d.data()}))));
    let timer; if (isTimed) timer = setInterval(()=>setTime(t=>t-1), 1000);
    return () => { if(timer) clearInterval(timer); };
  }, [examData, isTimed]);

  // Tab Switch Detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) triggerWarning("You switched tabs/windows!");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [warnings]); // Dependency added to capture latest state

  useEffect(() => { if(isTimed && time===0 && qs.length>0) submit(); }, [time, qs]);

  // Canvas Drawing (Same as before)
  useEffect(() => {
      if(qs.length > 0 && canvasRef.current) {
          const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
          const text = `${currentQIndex + 1}. ${qs[currentQIndex].question}`;
          ctx.font = "bold 20px Arial"; const maxWidth = canvas.width - 40; let y = 40; let line = ''; const words = text.split(' ');
          const estimatedLines = Math.ceil(ctx.measureText(text).width / maxWidth) + 2; canvas.height = Math.max(150, estimatedLines * 30 + 50);
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#000000"; ctx.font = "bold 18px Arial"; 
          for(let n = 0; n < words.length; n++) { const testLine = line + words[n] + ' '; if (ctx.measureText(testLine).width > maxWidth && n > 0) { ctx.fillText(line, 20, y); line = words[n] + ' '; y += 30; } else { line = testLine; } } ctx.fillText(line, 20, y);
      }
  }, [currentQIndex, qs]);

  const submit = async () => {
    if(submitting) return; 
    setSubmitting(true);
    let rawScore = 0;
    qs.forEach(q => { if(ans[q.id]) { if(ans[q.id] === q.correct) rawScore += 1; else if(examData.negativeMarking) rawScore -= 0.30; } });
    const cheatedStatus = isCheatedRef.current;
    
    let isPassed = false;
    if (examData.examType === 'open') {
        const attemptedCount = Object.keys(ans).length;
        if (cheatedStatus) isPassed = false; else isPassed = attemptedCount > 0;
    } else {
        const passingMarks = qs.length * 0.65;
        isPassed = rawScore >= passingMarks;
    }

    const finalScore = rawScore.toFixed(2);

    await updateDoc(doc(db, "answers", `${studentId}_${examData.id}`), {
      answers: ans, 
      score: finalScore,
      originalScore: finalScore, // 🔴 SAVING ORIGINAL SCORE (Admin cannot edit this)
      submittedAt: new Date(),
      cheated: cheatedStatus, 
      isPassed: isPassed, 
      resultDeclared: examData.examType === 'open' && examData.resultMode === 'system',
      showCheatersPublic: examData.showCheatersPublic || false, 
      status: "completed"
    });

    if(cheatedStatus) alert("🚫 Disqualified due to Cheating/Warnings.");
    else alert("✅ Exam Submitted Successfully!");
    
    onFinish();
  };

  const handleNext = () => { if (currentQIndex < qs.length - 1) setCurrentQIndex(prev => prev + 1); };
  const handlePrev = () => { if (currentQIndex > 0) setCurrentQIndex(prev => prev - 1); };

  if(qs.length === 0) return <div className="p-10 text-center">Loading...</div>;
  const currentQ = qs[currentQIndex];

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-white p-4 shadow rounded-t-lg flex justify-between items-center mb-1">
         <h2 className="text-lg font-bold text-gray-700 truncate">{examData.title}</h2>
         <div className="flex gap-4 items-center">
             {warnings > 0 && <span className="text-red-600 font-bold animate-pulse">⚠️ Warning: {warnings}/3</span>}
             {isTimed ? (<span className="bg-gray-200 px-3 py-1 rounded font-mono font-bold text-red-600">⏱ {Math.floor(time/60)}:{time%60 < 10 ? `0${time%60}` : time%60}</span>) : <span className="text-green-600 font-bold text-sm">OPEN EXAM</span>}
         </div>
      </div>
      <div className="bg-white w-full max-w-4xl p-6 shadow-xl rounded-b-lg flex flex-col h-[60vh] md:h-[500px]">
          <div className="flex justify-between text-sm text-gray-500 mb-4 border-b pb-2"><span>Q {currentQIndex + 1} of {qs.length}</span><span>{ans[currentQ.id] ? "Answered ✅" : "Pending ⭕"}</span></div>
          <div className="flex-1 flex items-center justify-center bg-gray-50 border rounded mb-6 overflow-hidden relative"><div className="absolute inset-0 z-10"></div> <canvas ref={canvasRef} width={800} height={150} className="w-full max-w-full" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A','B','C','D'].map(o => (
              <button key={o} onClick={()=>setAns({...ans, [currentQ.id]:o})} className={`text-left p-4 border-2 rounded-lg transition transform active:scale-95 ${ans[currentQ.id]===o ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 hover:border-gray-400'}`}><span className={`font-bold mr-3 px-2 py-1 rounded ${ans[currentQ.id]===o ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{o}</span> {currentQ.options[o]}</button>
            ))}
          </div>
      </div>
      <div className="w-full max-w-4xl mt-6 flex justify-between gap-4">
          <button onClick={handlePrev} disabled={currentQIndex === 0} className={`flex-1 py-3 rounded-lg font-bold shadow ${currentQIndex === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-gray-50'}`}>← Previous</button>
          {currentQIndex === qs.length - 1 ? (<button onClick={submit} disabled={submitting} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700">{submitting ? "Submitting..." : "Submit Exam ✅"}</button>) : (<button onClick={handleNext} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700">Next Question →</button>)}
      </div>
    </div>
  );
}