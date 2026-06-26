import { signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth, googleProvider } from "../firebase";

export interface Citizen {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  greenCoins: number;
  reportsCount: number;
  badge: string;
  createdAt: string;
  updatedAt: string;
}

export function calculateBadge(reportsCount: number): string {
  if (reportsCount >= 25) return "Legend";
  if (reportsCount >= 10) return "Hero";
  if (reportsCount >= 5) return "Guardian";
  if (reportsCount >= 1) return "Scout";
  return "Novice";
}

/**
 * Initiates the Google Sign-In Popup flow and synchronizes/creates the user document in Firestore.
 */
export async function signInWithGoogle(): Promise<Citizen> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  if (!user) {
    throw new Error("No user returned from Google authentication.");
  }

  return await syncOrCreateCitizen(user);
}

/**
 * Handles signing out the currently logged in user.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Syncs the user's authenticating state with Firestore 'citizens' collection.
 */
export async function syncOrCreateCitizen(user: FirebaseUser): Promise<Citizen> {
  const citizenRef = doc(db, "citizens", user.uid);
  const docSnap = await getDoc(citizenRef);

  const timestamp = new Date().toISOString();

  if (!docSnap.exists()) {
    // Initial citizen document initialization
    const newCitizen: Citizen = {
      uid: user.uid,
      name: user.displayName || "Anonymous Citizen",
      email: user.email || "",
      photoURL: user.photoURL || "",
      greenCoins: 0,
      reportsCount: 0,
      badge: "Novice",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(citizenRef, newCitizen);
    return newCitizen;
  } else {
    // Sync profile picture / name if changed
    const existingData = docSnap.data();
    const updatedFields = {
      name: user.displayName || existingData.name || "Anonymous Citizen",
      email: user.email || existingData.email || "",
      photoURL: user.photoURL || existingData.photoURL || "",
      updatedAt: timestamp,
    };
    await updateDoc(citizenRef, updatedFields);
    return {
      ...existingData,
      ...updatedFields,
      uid: user.uid,
    } as Citizen;
  }
}

/**
 * Retrieves a citizen's profile info by UID
 */
export async function getCitizenProfile(uid: string): Promise<Citizen | null> {
  const citizenRef = doc(db, "citizens", uid);
  const docSnap = await getDoc(citizenRef);
  if (docSnap.exists()) {
    return docSnap.data() as Citizen;
  }
  return null;
}
