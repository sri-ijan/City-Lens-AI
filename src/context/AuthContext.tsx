import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { syncOrCreateCitizen, logoutUser, signInWithGoogle, Citizen } from "../services/authService";
import toast from "react-hot-toast";

export interface AuthContextType {
  user: FirebaseUser | any | null;
  citizen: Citizen | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  loginAsDemo: () => void;
  isDemoMode: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | any | null>(null);
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Real-time listener on the current user's citizen document in Firestore
  useEffect(() => {
    // Check if there is a saved demo user
    const savedDemoUser = localStorage.getItem("citylens_demo_user");
    const savedDemoCitizen = localStorage.getItem("citylens_demo_citizen");
    if (savedDemoUser && savedDemoCitizen) {
      setUser(JSON.parse(savedDemoUser));
      setCitizen(JSON.parse(savedDemoCitizen));
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Initialize/sync user document first
          const profile = await syncOrCreateCitizen(firebaseUser);
          setCitizen(profile);

          // Setup real-time listener for current user's profile changes (coins, badge, etc.)
          const citizenRef = doc(db, "citizens", firebaseUser.uid);
          const unsubscribeProfile = onSnapshot(
            citizenRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setCitizen(docSnap.data() as Citizen);
              }
            },
            (error) => {
              console.error("Error listening to citizen profile:", error);
            }
          );

          setLoading(false);
          return () => unsubscribeProfile();
        } catch (error) {
          console.error("Error syncing user data on sign in:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setCitizen(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (): Promise<void> => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error && (error.code === "auth/unauthorized-domain" || error.message?.includes("unauthorized-domain") || error.message?.includes("auth/unauthorized-domain"))) {
        setAuthError("unauthorized-domain");
      } else {
        setAuthError(error.message || String(error));
      }
      throw error;
    }
  };

  const loginAsDemo = () => {
    const demoUser = {
      uid: "demo-citizen-123",
      displayName: "Aarav Sharma (Demo)",
      email: "aarav.sharma.demo@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
    };
    const demoCitizen: Citizen = {
      uid: "demo-citizen-123",
      name: "Aarav Sharma (Demo)",
      email: "aarav.sharma.demo@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
      greenCoins: 120,
      reportsCount: 3,
      badge: "Scout",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setUser(demoUser);
    setCitizen(demoCitizen);
    setIsDemoMode(true);
    setAuthError(null);
    localStorage.setItem("citylens_demo_user", JSON.stringify(demoUser));
    localStorage.setItem("citylens_demo_citizen", JSON.stringify(demoCitizen));
    toast.success("Logged in as Demo Citizen Aarav Sharma! 🌟");
  };

  const logout = async (): Promise<void> => {
    try {
      if (isDemoMode) {
        setUser(null);
        setCitizen(null);
        setIsDemoMode(false);
        localStorage.removeItem("citylens_demo_user");
        localStorage.removeItem("citylens_demo_citizen");
        toast.success("Signed out from Demo Mode.");
        return;
      }
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ user, citizen, loading, login, logout, authError, clearAuthError, loginAsDemo, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};
