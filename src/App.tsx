import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import AuthErrorModal from "./components/AuthErrorModal";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Complaint from "./pages/Complaint";
import Rewards from "./pages/Rewards";
import MapPage from "./pages/Map";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0f0d0b] text-[#e7e5e4] flex flex-col font-sans select-none selection:bg-amber-600/30 selection:text-white">
          
          {/* Toast Notifier */}
          <Toaster 
            position="bottom-right" 
            toastOptions={{ 
              duration: 4000,
              style: {
                background: "#161310",
                color: "#e7e5e4",
                border: "1px solid #2a2520",
              }
            }} 
          />
          
          {/* Shared top Navigation Navbar */}
          <Header />
          
          {/* Global Auth Error Handler Dialog */}
          <AuthErrorModal />

          {/* Dynamic Route Pages */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/complaint" element={<Complaint />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/map" element={<MapPage />} />
              
              {/* Fallback redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Simple Footer */}
          <footer className="border-t border-[#2a2520] bg-[#161310] py-6 text-center text-xs text-[#78716c]">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} CityLens AI. All Indian Jurisdictions administered.</p>
              <div className="flex gap-4">
                <span className="hover:text-amber-500 cursor-pointer transition-colors">Privacy Policy</span>
                <span>•</span>
                <span className="hover:text-amber-500 cursor-pointer transition-colors">Municipal Terms</span>
              </div>
            </div>
          </footer>

        </div>
      </Router>
    </AuthProvider>
  );
}

