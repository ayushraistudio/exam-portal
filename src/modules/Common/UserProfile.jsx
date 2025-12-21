import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom"; 
import { useTheme } from "../../context/ThemeContext"; // 🔴 Theme Intact

export default function UserProfile() {
  const { user, userData } = useAuth(); // userData is the viewer
  const { themeClasses } = useTheme(); 
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState("idle"); 
  const [toast, setToast] = useState(null); 
  const [formData, setFormData] = useState({});

  // 🔴 Check if viewing own profile
  const isOwnProfile = !username || (user && profileData?.uid === user.uid);

  const showToast = (msg, type="success") => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let data = null;
        let uid = null;
        
        if (username) {
          const q = query(collection(db, "users"), where("username", "==", username));
          const snap = await getDocs(q);
          if (!snap.empty) { data = snap.docs[0].data(); uid = snap.docs[0].id; } 
          else { setProfileData("NOT_FOUND"); setLoading(false); return; }
        } else if (user) {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) { data = docSnap.data(); uid = user.uid; }
        }

        if (data) { 
            setProfileData({ ...data, uid }); 
            setFormData({
                username: data.username || "",
                fullName: data.fullName || "",
                institute: data.institute || "",
                bio: data.bio || "",
                photoURL: data.photoURL || "",
                emailVisibility: data.emailVisibility || "private",
                portfolio: data.socials?.portfolio || "",
                github: data.socials?.github || "",
                linkedin: data.socials?.linkedin || ""
            });
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [user, username, navigate]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) return showToast("File too large! Max 500KB.", "error");
    const reader = new FileReader();
    reader.onloadend = () => setFormData({ ...formData, photoURL: reader.result });
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
      if(window.confirm("Remove profile photo?")) { setFormData({ ...formData, photoURL: "" }); }
  };

  const checkUsername = async () => {
      const clean = formData.username.toLowerCase().replace(/\s/g, '');
      if(!clean) return;
      if(clean === profileData.username) { setUsernameStatus("available"); return; }

      setUsernameStatus("checking");
      const q = query(collection(db, "users"), where("username", "==", clean));
      const snap = await getDocs(q);
      
      if(snap.empty) setUsernameStatus("available");
      else setUsernameStatus("taken");
  };

  const handleSave = async () => {
    if (!isOwnProfile) return;
    if (!formData.username.trim()) return showToast("Username cannot be empty", "error");
    
    const cleanUsername = formData.username.toLowerCase().replace(/\s/g, '');
    if (cleanUsername !== profileData.username && usernameStatus !== 'available') {
        showToast("Please check username availability first!", "error");
        return;
    }

    setIsSaving(true);
    try {
        const userRef = doc(db, "users", user.uid);
        const updates = {
            username: cleanUsername,
            fullName: formData.fullName,
            institute: formData.institute, 
            bio: formData.bio,
            photoURL: formData.photoURL,
            emailVisibility: formData.emailVisibility,
            socials: {
                portfolio: formData.portfolio,
                github: formData.github,
                linkedin: formData.linkedin
            }
        };
        await updateDoc(userRef, updates);

        // Force Update Exams
        const qExams = query(collection(db, "exams"), where("createdBy", "==", user.uid));
        const querySnapshot = await getDocs(qExams);
        
        if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                const examRef = doc.ref;
                batch.update(examRef, { 
                    createdByName: cleanUsername, 
                    instituteName: formData.institute
                });
            });
            await batch.commit();
        }

        setProfileData({ ...profileData, ...updates });
        setFormData({ ...formData, username: cleanUsername });
        setUsernameStatus("idle");
        setIsEditing(false);
        showToast("✅ Profile & Exams Updated!");

    } catch (error) { console.error(error); showToast("Failed to update.", "error"); }
    setIsSaving(false);
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(profileData.uid);
      showToast("📋 Institute ID Copied!");
  };

  if (loading) return <div className={`h-screen flex items-center justify-center font-bold ${themeClasses.textSec}`}>Loading Profile...</div>;

  if (profileData === "NOT_FOUND") {
      return (
          <div className={`h-screen flex flex-col items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
              <div className="text-6xl mb-4">😕</div>
              <h2 className="text-2xl font-bold">User Not Found</h2>
              <p className={`mt-2 ${themeClasses.textSec}`}>The user you are looking for does not exist.</p>
              <button onClick={() => navigate(-1)} className={`mt-6 px-6 py-2 rounded-full font-bold shadow ${themeClasses.primary}`}>Go Back</button>
          </div>
      );
  }

  const displayAvatar = isEditing 
      ? (formData.photoURL || `https://ui-avatars.com/api/?name=${formData.username}&background=random&color=fff&size=128`)
      : (profileData.photoURL || `https://ui-avatars.com/api/?name=${profileData.username}&background=random&color=fff&size=128`);

  return (
    <div className={`min-h-screen p-6 flex justify-center items-start ${themeClasses.bg} ${themeClasses.text}`}>
      
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl font-bold z-50 animate-bounce-in text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.msg}
        </div>
      )}

      <div className={`${themeClasses.cardBg} w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden border ${themeClasses.cardBorder} mt-10 relative`}>
        
        <div className={`h-40 bg-gradient-to-r ${themeClasses.heroGradient} relative`}>
             <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded shadow text-sm font-bold backdrop-blur-sm">← Back</button>
        </div>

        <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6">
                
                <div className="md:w-1/3 -mt-16 flex flex-col items-center text-center">
                    <div className="relative group">
                        <img src={displayAvatar} alt="Avatar" className={`w-36 h-36 rounded-full shadow-xl object-cover border-4 ${themeClasses.cardBg}`}/>
                        {isEditing && (
                            <div className="absolute bottom-0 right-0 flex gap-2">
                                <label className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg" title="Upload Photo">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </label>
                                {formData.photoURL && (
                                    <button onClick={handleRemoveImage} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg" title="Remove Photo">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <h2 className={`text-2xl font-bold mt-4 ${themeClasses.text}`}>@{profileData.username}</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 ${themeClasses.inputBg} ${themeClasses.textSec}`}>{profileData.role}</span>
                    
                    <div className="flex flex-col gap-3 mt-6 w-full">
                       {profileData.socials?.portfolio && (<a href={profileData.socials.portfolio} target="_blank" rel="noreferrer" className={`text-sm py-2 rounded font-bold border ${themeClasses.cardBorder} hover:opacity-80 ${themeClasses.text} ${themeClasses.inputBg}`}>🌐 Portfolio Website</a>)}
                       <div className="flex gap-4 justify-center">
                           {profileData.socials?.github && <a href={profileData.socials.github} target="_blank" rel="noreferrer"><img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="git" className="w-6 h-6 opacity-70 hover:opacity-100 transition"/></a>}
                           {profileData.socials?.linkedin && <a href={profileData.socials.linkedin} target="_blank" rel="noreferrer"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="in" className="w-6 h-6 opacity-70 hover:opacity-100 transition"/></a>}
                       </div>
                    </div>

                    {isOwnProfile && !isEditing && (<button onClick={() => setIsEditing(true)} className={`mt-8 px-6 py-2 rounded-full font-bold shadow w-full transition ${themeClasses.primary}`}>Edit Profile</button>)}
                </div>

                <div className="md:w-2/3 mt-6 md:mt-2">
                    <h1 className={`text-2xl font-bold border-b pb-2 mb-4 ${themeClasses.cardBorder}`}>{isEditing ? "Edit Details" : "About Me"}</h1>

                    {/* 🔴 CORRECTED LOGIC: Show if Admin & (Viewer is Student OR Viewer is Self) */}
                    {profileData.role === 'admin' && (userData?.role === 'student' || isOwnProfile) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 flex justify-between items-center shadow-sm">
                            <div><p className="text-xs font-bold text-yellow-800 uppercase">🔑 Institute ID</p><code className="text-gray-800 font-mono font-bold text-lg select-all">{profileData.uid}</code></div>
                            <button onClick={copyToClipboard} className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-300">Copy</button>
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className={`p-3 rounded border ${themeClasses.cardBorder} ${themeClasses.inputBg}`}>
                                <label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Username</label>
                                <div className="flex gap-2">
                                    <input value={formData.username} onChange={e=>{ setFormData({...formData, username:e.target.value}); setUsernameStatus("idle"); }} className={`border w-full p-2 rounded font-bold ${usernameStatus==='available'?'border-green-500 bg-green-50': usernameStatus==='taken'?'border-red-500 bg-red-50':''}`} />
                                    <button onClick={checkUsername} disabled={usernameStatus === 'available'} className={`px-4 rounded font-bold transition text-white ${usernameStatus==='available'?'bg-green-500 cursor-default':'bg-blue-600 hover:bg-blue-700'}`}>
                                        {usernameStatus === 'checking' ? '...' : usernameStatus === 'available' ? '✓' : usernameStatus === 'taken' ? '✖' : 'Check'}
                                    </button>
                                </div>
                                {usernameStatus === 'taken' && <p className="text-red-500 text-xs mt-1 font-bold">Username already taken!</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Full Name</label><input value={formData.fullName} onChange={e=>setFormData({...formData, fullName:e.target.value})} className="border w-full p-2 rounded"/></div>
                                <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Institute</label><input value={formData.institute} onChange={e=>setFormData({...formData, institute:e.target.value})} className="border w-full p-2 rounded"/></div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Email Privacy</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="emailVisibility" value="private" checked={formData.emailVisibility === "private"} onChange={(e) => setFormData({...formData, emailVisibility: e.target.value})} className="w-4 h-4 text-blue-600"/><span className="text-sm font-bold text-gray-700">🔒 Private</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="emailVisibility" value="public" checked={formData.emailVisibility === "public"} onChange={(e) => setFormData({...formData, emailVisibility: e.target.value})} className="w-4 h-4 text-green-600"/><span className="text-sm font-bold text-gray-700">🌍 Public</span></label>
                                </div>
                            </div>

                            <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Bio</label><textarea value={formData.bio} onChange={e=>setFormData({...formData, bio:e.target.value})} className="border w-full p-2 rounded h-24"/></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>GitHub</label><input value={formData.github} onChange={e=>setFormData({...formData, github:e.target.value})} className="border w-full p-2 rounded text-sm"/></div>
                                <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>LinkedIn</label><input value={formData.linkedin} onChange={e=>setFormData({...formData, linkedin:e.target.value})} className="border w-full p-2 rounded text-sm"/></div>
                            </div>
                            <div><label className={`block text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Portfolio</label><input value={formData.portfolio} onChange={e=>setFormData({...formData, portfolio:e.target.value})} className="border w-full p-2 rounded text-sm"/></div>

                            <div className="flex gap-4 mt-4">
                                <button disabled={isSaving} onClick={handleSave} className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow disabled:opacity-50">{isSaving ? "Saving..." : "Save Changes"}</button>
                                <button disabled={isSaving} onClick={() => setIsEditing(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-400">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div><h3 className={`text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Full Name</h3><p className={`text-xl font-medium ${themeClasses.text}`}>{profileData.fullName}</p></div>
                            
                            {(isOwnProfile || profileData.emailVisibility === 'public') && (
                                <div>
                                    <h3 className={`text-xs font-bold uppercase mb-1 flex items-center gap-2 ${themeClasses.textSec}`}>
                                        Email 
                                        {isOwnProfile && <span className={`text-[10px] px-2 py-0.5 rounded text-white ${profileData.emailVisibility === 'public' ? 'bg-green-500' : 'bg-gray-500'}`}>{profileData.emailVisibility === 'public' ? 'Public' : 'Private'}</span>}
                                    </h3>
                                    <p className={`text-lg break-all ${themeClasses.text}`}>{profileData.email}</p>
                                </div>
                            )}

                            <div><h3 className={`text-xs font-bold uppercase mb-1 ${themeClasses.textSec}`}>Institute</h3><p className={`text-lg ${themeClasses.text}`}>{profileData.institute || "N/A"}</p></div>
                            <div><h3 className={`text-xs font-bold uppercase mb-2 ${themeClasses.textSec}`}>Bio</h3><p className={`whitespace-pre-wrap p-4 rounded-lg border ${themeClasses.inputBg} ${themeClasses.cardBorder} ${themeClasses.text}`}>{profileData.bio || "No bio added."}</p></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}