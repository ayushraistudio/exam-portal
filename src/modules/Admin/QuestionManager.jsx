import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";

export default function QuestionManager({ examId }) {
  const [qs, setQs] = useState([]);
  const [form, setForm] = useState({ q: "", a: "", b: "", c: "", d: "", correct: "A" });

  useEffect(() => onSnapshot(collection(db, "exams", examId, "questions"), s => setQs(s.docs.map(d=>({id:d.id, ...d.data()})))), [examId]);

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "exams", examId, "questions"), {
      question: form.q, options: {A:form.a, B:form.b, C:form.c, D:form.d}, correct: form.correct
    });
    setForm({ q: "", a: "", b: "", c: "", d: "", correct: "A" });
  };

  return (
    <div>
      <form onSubmit={add} className="bg-gray-50 p-4 mb-4 rounded">
        <input value={form.q} onChange={e=>setForm({...form, q:e.target.value})} placeholder="Question" className="border w-full p-2 mb-2 rounded bg-white" required/>
        
        {/* 🔴 MOBILE FIX: grid-cols-1 on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          {['a','b','c','d'].map(o => <input key={o} value={form[o]} onChange={e=>setForm({...form, [o]:e.target.value})} placeholder={`Option ${o.toUpperCase()}`} className="border p-2 rounded bg-white" required/>)}
        </div>
        
        <select value={form.correct} onChange={e=>setForm({...form, correct:e.target.value})} className="border p-2 rounded bg-white w-full md:w-auto">
            {['A','B','C','D'].map(o=><option key={o} value={o}>Correct: {o}</option>)}
        </select>
        <button className="bg-green-600 text-white px-4 py-2 mt-2 md:mt-0 md:ml-2 rounded w-full md:w-auto">Add Question</button>
      </form>
      
      <div className="space-y-2 h-64 overflow-y-auto">
        {qs.map((q, i) => (
           <div key={q.id} className="p-2 border flex justify-between items-center rounded bg-white">
               <span className="text-sm md:text-base font-medium">{i+1}. {q.question}</span>
               <button onClick={()=>deleteDoc(doc(db,"exams",examId,"questions",q.id))} className="text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded">Del</button>
           </div>
        ))}
      </div>
    </div>
  );
}