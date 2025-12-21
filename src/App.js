import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./modules/Auth/Login";
import Signup from "./modules/Auth/Signup";
import AdminDashboard from "./modules/Admin/AdminDashboard";
import StudentDashboard from "./modules/Student/StudentDashboard";
import UserProfile from "./modules/Common/UserProfile";
import LandingPage from "./modules/Public/LandingPage";

function AppRoutes() {
  const { user, userData, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Loading Portal...</div>;

  return (
    <Routes>
      {/* 🔴 ROOT: Agar User hai to Dashboard, Nahi to Landing Page */}
      <Route path="/" element={
          user ? (
              userData?.role === "admin" ? <Navigate to="/admin" /> : <Navigate to="/student" />
          ) : (
              <LandingPage />
          )
      } />

      {/* 🔴 AUTH */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

      {/* 🔴 DASHBOARDS (Logout hone par '/' par bhejo, '/login' par nahi) */}
      <Route path="/admin" element={
        user && userData?.role === "admin" ? <AdminDashboard /> : <Navigate to="/" />
      } />
      
      <Route path="/student" element={
        user && userData?.role === "student" ? <StudentDashboard /> : <Navigate to="/" />
      } />
      
      {/* 🔴 PROFILES (Fix Search Path) */}
      <Route path="/profile" element={user ? <UserProfile /> : <Navigate to="/" />} />
      <Route path="/user/:username" element={user ? <UserProfile /> : <Navigate to="/" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}