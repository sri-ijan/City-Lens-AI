import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Camera, MapPin, Coins, LogOut, ChevronDown, Trophy, Award, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function Header() {
  const { user, citizen, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await login();
      toast.success("Successfully logged in with Google! 🎉");
    } catch (error: any) {
      console.error(error);
      toast.error("Google authentication failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      toast.success("Signed out successfully.");
      navigate("/");
    } catch (error: any) {
      console.error(error);
      toast.error("Sign out failed.");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#2a2520] bg-[#0f0d0b]/95 backdrop-blur-md px-4 py-3 md:px-8 shadow-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        
        {/* Left: Logo and title */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97706] shadow-[0_0_15px_rgba(217,119,6,0.3)] group-hover:scale-105 transition-transform">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#e7e5e4] flex items-center gap-1.5">
              CityLens <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-500">AI</span>
            </h1>
            <p className="text-[10px] font-medium text-[#78716c]">See. Report. Resolve.</p>
          </div>
        </NavLink>

        {/* Center: Nav links */}
        <nav className="flex items-center gap-1 bg-[#161310] border border-[#2a2520] p-1 rounded-xl">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#e7e5e4]/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#e7e5e4]/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#e7e5e4]/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Map
          </NavLink>
          <NavLink
            to="/complaint"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#e7e5e4]/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Complaint
          </NavLink>
          <NavLink
            to="/rewards"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#e7e5e4]/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Rewards
          </NavLink>
        </nav>

        {/* Right: User Authentication / Status Node */}
        <div className="flex items-center gap-3 text-xs">
          
          {user ? (
            /* Logged In State with Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl bg-[#161310] border border-[#2a2520] hover:border-[#d97706]/40 p-1.5 pr-3 transition-colors text-[#e7e5e4] focus:outline-none"
              >
                <img
                  src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"}
                  alt={user.displayName || "User"}
                  className="h-7 w-7 rounded-lg object-cover border border-[#2a2520]"
                  referrerPolicy="no-referrer"
                />
                
                <div className="text-left hidden sm:block max-w-[100px]">
                  <p className="text-[11px] font-bold text-[#e7e5e4] truncate leading-tight">
                    {user.displayName || "Citizen"}
                  </p>
                  <p className="text-[9px] font-semibold text-amber-500 flex items-center gap-0.5 mt-0.5 leading-none">
                    <Coins className="h-2.5 w-2.5" />
                    <span>{citizen?.greenCoins ?? 0} GC</span>
                  </p>
                </div>

                <ChevronDown className={`h-3 w-3 text-[#78716c] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#2a2520] bg-[#161310] p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                  <div className="px-3 py-2 border-b border-[#2a2520] mb-1">
                    <p className="text-[10px] uppercase font-semibold text-[#78716c]">Civic Badge</p>
                    <p className="text-xs font-bold text-[#e7e5e4] mt-0.5">{citizen?.badge || "Novice"}</p>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/rewards");
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#e7e5e4] hover:bg-amber-600 hover:text-white transition-colors"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>My Rewards & Stats</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not Logged In State - Google Sign In Button */
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 text-xs transition-colors shadow-lg shadow-amber-600/10 border border-amber-500/10 disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 10.97-4.63 10.97-11.1 0-.74-.08-1.3-.2-1.85h-10.77z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          )}

          {/* Map Node Indicator */}
          <div className="hidden md:flex items-center gap-1 text-[#78716c] ml-2">
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px]">India</span>
          </div>
        </div>

      </div>
    </header>
  );
}
