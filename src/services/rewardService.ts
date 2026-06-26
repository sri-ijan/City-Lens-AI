import { db } from "../firebase";
import { doc, runTransaction, collection } from "firebase/firestore";
import { calculateBadge } from "./authService";

/**
 * Credits GreenCoins to a citizen using a Firestore transaction to ensure atomic updates and accurate badge calculation.
 * 
 * Rules:
 * - Report submitted: +10 GreenCoins
 * - Report reaches 3 or more upvotes: +25 GreenCoins (Community Verified)
 * - Report marked Resolved: +50 GreenCoins (Issue Resolved)
 */
export async function creditGreenCoins(
  uid: string,
  amount: number,
  reason: string,
  reportId: string,
  isReportSubmission: boolean = false
): Promise<void> {
  const citizenRef = doc(db, "citizens", uid);
  // Reference for the subcollection document
  const transactionsCollectionRef = collection(db, "citizens", uid, "transactions");

  await runTransaction(db, async (transaction) => {
    const citizenSnap = await transaction.get(citizenRef);
    
    // In case the citizen document doesn't exist yet, we initialize a default or throw an error
    if (!citizenSnap.exists()) {
      throw new Error(`Citizen document with uid ${uid} does not exist.`);
    }

    const currentData = citizenSnap.data();
    const currentCoins = typeof currentData.greenCoins === "number" ? currentData.greenCoins : 0;
    const currentReports = typeof currentData.reportsCount === "number" ? currentData.reportsCount : 0;

    const newCoins = currentCoins + amount;
    const newReports = isReportSubmission ? currentReports + 1 : currentReports;
    const newBadge = calculateBadge(newReports);

    // Update the parent citizen document
    transaction.update(citizenRef, {
      greenCoins: newCoins,
      reportsCount: newReports,
      badge: newBadge,
      updatedAt: new Date().toISOString()
    });

    // Write a new transaction record inside citizens/{uid}/transactions subcollection
    // We get a new document reference with an auto-generated ID inside the transaction
    const newTxRef = doc(transactionsCollectionRef);
    transaction.set(newTxRef, {
      amount,
      reason,
      timestamp: new Date().toISOString(),
      reportId
    });
  });
}
