import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrPYROaxF4XisCTAS3Yog--GST1PjRz34",
  authDomain: "citylens-ai-2b97e.firebaseapp.com",
  projectId: "citylens-ai-2b97e",
  storageBucket: "citylens-ai-2b97e.firebasestorage.app",
  messagingSenderId: "480724392770",
  appId: "1:480724392770:web:4ec4d7f954f3733b1e46db",
  measurementId: "G-HGNHM936XK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Operational types for Firestore error logging
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

/**
 * Standardized Firebase Error Handler conforming strictly to skill specifications.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // Custom auth is not fully configured, so we keep it null
      email: null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error logged: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test_connection", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your network. Firebase Firestore client reports offline.");
    }
  }
}
testConnection();
