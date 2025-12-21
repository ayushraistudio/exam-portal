import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) setProfile(snap.data());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchUser();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] animate-fade-in p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative transform scale-100 transition-transform">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full z-10 transition">
            ✕
        </button>

        {loading ? (
            <div className="p-10 text-center text-gray-500 font-bold">Fetching Profile...</div>
        ) : profile ? (
            <div>
                {/* 1. Header Banner */}
                <div className="h-28 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                {/* 2. Profile Image / Placeholder Box */}
                <div className="flex justify-center -mt-14 relative">
                    <img 
                        src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.fullName}&background=fff&color=000&size=128&bold=true`} 
                        alt="Profile" 
                        className="w-28 h-28 rounded-xl border-4 border-white shadow-lg bg-white object-cover"
                    />
                </div>

                {/* 3. Main Info */}
                <div className="text-center mt-3 px-6">
                    <h2 className="text-2xl font-extrabold text-gray-800">{profile.fullName}</h2>
                    <p className="text-blue-600 font-bold font-mono">@{profile.username || "user"}</p>
                    
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {profile.role || "Student"}
                    </span>
                </div>

                {/* 4. Details Section */}
                <div className="p-6 space-y-4">
                    
                    {/* Bio (Agar hai to) */}
                    {profile.bio ? (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center italic text-gray-600 text-sm">
                            "{profile.bio}"
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 text-xs italic">No bio added.</p>
                    )}

                    <div className="space-y-3 text-sm">
                        
                        {/* Institute */}
                        <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                            <span className="text-gray-500 font-bold flex items-center gap-2">
                                🏫 Institute
                            </span>
                            <span className="font-bold text-gray-800 text-right">{profile.institute || "N/A"}</span>
                        </div>

                        {/* Joined Date */}
                        <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                            <span className="text-gray-500 font-bold flex items-center gap-2">
                                📅 Joined On
                            </span>
                            <span className="font-bold text-gray-800">
                                {profile.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "Unknown"}
                            </span>
                        </div>
                    </div>

                    {/* 5. Social Links (GitHub & LinkedIn) */}
                    {(profile.github || profile.linkedin) && (
                        <div className="flex justify-center gap-4 mt-4 pt-2">
                            {profile.github && (
                                <a href={profile.github} target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white p-2 rounded-full hover:bg-black transition shadow transform hover:-translate-y-1" title="GitHub">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                </a>
                            )}
                            {profile.linkedin && (
                                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="bg-blue-700 text-white p-2 rounded-full hover:bg-blue-800 transition shadow transform hover:-translate-y-1" title="LinkedIn">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="bg-gray-50 p-4 border-t text-center">
                    <button onClick={onClose} className="text-gray-500 font-bold hover:text-black transition text-sm">
                        Close Profile
                    </button>
                </div>

            </div>
        ) : (
            <div className="p-10 text-center">
                <p className="text-red-500 font-bold">User Not Found</p>
                <button onClick={onClose} className="mt-4 bg-gray-200 px-4 py-2 rounded">Close</button>
            </div>
        )}
      </div>
    </div>
  );
}