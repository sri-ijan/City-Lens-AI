import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { 
  Trophy, 
  Award, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Medal, 
  UserCheck, 
  Crown,
  Activity,
  Coins,
  History,
  Info,
  ChevronRight,
  Shield,
  HelpCircle,
  Clock
} from "lucide-react";

interface CitizenLeaderboardEntry {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  greenCoins: number;
  reportsCount: number;
  badge: string;
  lastReportedAt?: string;
}

interface TransactionRecord {
  id: string;
  amount: number;
  reason: string;
  timestamp: string;
  reportId?: string;
}

export default function Rewards() {
  const { user, citizen, login } = useAuth();
  const [citizens, setCitizens] = useState<CitizenLeaderboardEntry[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [isTxLoading, setIsTxLoading] = useState(false);

  // Subscribe to citizens collection for the leaderboard
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "citizens"), (snapshot) => {
      const list: CitizenLeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || "Anonymous Citizen",
          email: data.email || "",
          photoURL: data.photoURL || "",
          greenCoins: typeof data.greenCoins === "number" ? data.greenCoins : (typeof data.points === "number" ? data.points : 0),
          reportsCount: typeof data.reportsCount === "number" ? data.reportsCount : 0,
          badge: data.badge || "Novice",
          lastReportedAt: data.lastReportedAt || ""
        });
      });

      // Sort in-memory: 1. GreenCoins descending, 2. ReportsCount descending
      list.sort((a, b) => {
        if (b.greenCoins !== a.greenCoins) {
          return b.greenCoins - a.greenCoins;
        }
        return b.reportsCount - a.reportsCount;
      });

      setCitizens(list);
      setIsLeaderboardLoading(false);
    }, (error) => {
      console.error("Leaderboard read error:", error);
      setIsLeaderboardLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to authenticated user's recent transactions
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setIsTxLoading(true);
    const unsubscribeTx = onSnapshot(
      collection(db, "citizens", user.uid, "transactions"),
      (snapshot) => {
        const txList: TransactionRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          txList.push({
            id: docSnap.id,
            amount: data.amount || 0,
            reason: data.reason || "Reward Credited",
            timestamp: data.timestamp || "",
            reportId: data.reportId || ""
          });
        });

        // Sort desc in-memory by timestamp
        txList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Show only the latest 5 transactions
        setTransactions(txList.slice(0, 5));
        setIsTxLoading(false);
      },
      (error) => {
        console.error("Transactions read error:", error);
        setIsTxLoading(false);
      }
    );

    return () => unsubscribeTx();
  }, [user]);

  // Compute Badge tier visual representation
  const getBadgeTier = (reportsCount: number) => {
    if (reportsCount >= 25) {
      return {
        title: "Legend",
        style: "bg-amber-500/10 text-amber-500 border-amber-500/30",
        icon: <Crown className="h-3 w-3 text-amber-400" />
      };
    } else if (reportsCount >= 10) {
      return {
        title: "Hero",
        style: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        icon: <Trophy className="h-3 w-3 text-orange-400" />
      };
    } else if (reportsCount >= 5) {
      return {
        title: "Guardian",
        style: "bg-stone-200/10 text-stone-200 border-stone-200/20",
        icon: <ShieldCheck className="h-3 w-3 text-stone-300" />
      };
    } else if (reportsCount >= 1) {
      return {
        title: "Scout",
        style: "bg-amber-900/15 text-amber-600 border-amber-900/25",
        icon: <Medal className="h-3 w-3 text-amber-700" />
      };
    } else {
      return {
        title: "Novice",
        style: "bg-stone-900 text-[#78716c] border-[#2a2520]",
        icon: <UserCheck className="h-3 w-3 text-[#78716c]" />
      };
    }
  };

  // Badge tier rules helper for UI progress displays
  const getNextBadgeProgress = (reportsCount: number) => {
    if (reportsCount >= 25) {
      return { nextBadge: "Max Badge", progress: 100, needed: 0 };
    } else if (reportsCount >= 10) {
      const needed = 25 - reportsCount;
      const progress = Math.min(100, Math.floor(((reportsCount - 10) / 15) * 100));
      return { nextBadge: "Legend", progress, needed };
    } else if (reportsCount >= 5) {
      const needed = 10 - reportsCount;
      const progress = Math.min(100, Math.floor(((reportsCount - 5) / 5) * 100));
      return { nextBadge: "Hero", progress, needed };
    } else if (reportsCount >= 1) {
      const needed = 5 - reportsCount;
      const progress = Math.min(100, Math.floor(((reportsCount - 1) / 4) * 100));
      return { nextBadge: "Guardian", progress, needed };
    } else {
      const needed = 1 - reportsCount;
      return { nextBadge: "Scout", progress: 0, needed };
    }
  };

  const handleSignIn = async () => {
    try {
      await login();
      toast.success("Successfully signed in with Google! Wallet loaded. 📋");
    } catch (e) {
      toast.error("Google authentication failed.");
    }
  };

  const badgeProgress = citizen ? getNextBadgeProgress(citizen.reportsCount || 0) : null;

  return (
    <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-8">
        
        {/* Banner header with info */}
        <section className="relative overflow-hidden bg-[#161310] border border-[#2a2520] p-8 rounded-2xl shadow-xl">
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-[#d97706]"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20 mb-3">
                <Award className="h-3.5 w-3.5" />
                Vigilant Citizens Incentive
              </span>
              <h2 className="text-3xl font-extrabold text-[#e7e5e4] tracking-tight">Citizen GreenCoins & Ranks</h2>
              <p className="text-sm text-[#78716c] mt-2 leading-relaxed">
                Earn GreenCoins and badges by submitting real-time reports of potholes, broken streetlights, water leakages, and hazards. Join hands to build safer civic wards!
              </p>
              
              <div className="mt-4 flex items-start gap-2 text-xs text-[#78716c] bg-[#0f0d0b]/80 border border-[#2a2520] p-3 rounded-xl max-w-xl">
                <Info className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer:</strong> GreenCoins are civic reward tokens designed to encourage citizen participation and may support future municipal reward partnerships. They are NOT real money and are NOT redeemable currency.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-[#0f0d0b] p-5 rounded-xl border border-[#2a2520] shrink-0 w-full md:w-auto text-center md:text-left">
              <span className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider block">Coin Accumulation Matrix</span>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center justify-between gap-4 text-[#e7e5e4]">
                  <span>Report Submitted</span>
                  <strong className="text-amber-500 font-mono">+10 GC</strong>
                </p>
                <p className="flex items-center justify-between gap-4 text-[#e7e5e4]">
                  <span>Community Verified (3+ upvotes)</span>
                  <strong className="text-amber-500 font-mono">+25 GC</strong>
                </p>
                <p className="flex items-center justify-between gap-4 text-[#e7e5e4]">
                  <span>Issue Resolved by Crew</span>
                  <strong className="text-amber-500 font-mono">+50 GC</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic authenticated view / sign-in CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Section 1 & 2: Personal Wallet and History */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {user ? (
              /* Authenticated User Stats & Wallet Card */
              <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-[3px] bg-amber-600/50"></div>
                
                <h3 className="text-lg font-bold text-[#e7e5e4] mb-4 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <span>My Citizen Wallet</span>
                </h3>

                {/* Profile mini header */}
                <div className="flex items-center gap-4 bg-[#0f0d0b] p-4 rounded-xl border border-[#2a2520] mb-5">
                  <img
                    src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"}
                    alt={user.displayName || "User"}
                    className="h-12 w-12 rounded-lg object-cover border border-[#2a2520]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#e7e5e4] leading-snug">{user.displayName}</h4>
                    <p className="text-[10px] text-[#78716c] truncate max-w-[200px]">{user.email}</p>
                  </div>
                </div>

                {/* Grid balances */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-4 text-center">
                    <span className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider block">Wallet Balance</span>
                    <span className="text-2xl font-black text-amber-500 mt-1 block font-mono">
                      {citizen?.greenCoins ?? 0} <span className="text-xs font-bold text-amber-600 font-sans">GC</span>
                    </span>
                  </div>
                  <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-4 text-center">
                    <span className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider block">Rank Tier</span>
                    <span className="text-sm font-extrabold text-[#e7e5e4] mt-2.5 inline-flex items-center gap-1 bg-[#161310] border border-[#2a2520] px-3 py-1 rounded-full">
                      {citizen ? getBadgeTier(citizen.reportsCount || 0).icon : null}
                      <span>{citizen?.badge || "Novice"}</span>
                    </span>
                  </div>
                </div>

                {/* Reports and progress info */}
                <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#78716c] font-semibold">Total Submissions:</span>
                    <span className="font-extrabold text-stone-200 font-mono">{citizen?.reportsCount ?? 0} reports</span>
                  </div>

                  {badgeProgress && (
                    <div className="border-t border-[#2a2520]/60 pt-3 mt-1">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-[#78716c] font-semibold">Next Badge ({badgeProgress.nextBadge}):</span>
                        {badgeProgress.needed > 0 ? (
                          <span className="text-amber-500 font-bold">{badgeProgress.needed} reports needed</span>
                        ) : (
                          <span className="text-amber-500 font-bold">Max Badge level achieved!</span>
                        )}
                      </div>
                      <div className="w-full bg-[#161310] border border-[#2a2520] rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${badgeProgress.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Sign In CTA Card */
              <div className="rounded-2xl border border-dashed border-[#2a2520] bg-[#161310]/40 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Coins className="h-12 w-12 text-[#2a2520] mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-[#e7e5e4] mb-2">My Wallet & Coins Locked</h3>
                <p className="text-xs text-[#78716c] max-w-sm leading-relaxed mb-6">
                  Sign in with your Google account to unlock your personal GreenCoin wallet, track badge milestone progression, and view your real-time ledger statement history.
                </p>
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 text-xs transition-all shadow-lg shadow-amber-600/10 border border-amber-500/10"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 10.97-4.63 10.97-11.1 0-.74-.08-1.3-.2-1.85h-10.77z"/>
                  </svg>
                  <span>Unlock Personal Wallet</span>
                </button>
              </div>
            )}

            {/* Section 2: Recent Transactions Ledger */}
            {user && (
              <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
                <h3 className="text-base font-bold text-[#e7e5e4] mb-4 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-amber-500" />
                  <span>Recent Transaction Ledger</span>
                </h3>

                {isTxLoading ? (
                  <div className="py-8 text-center text-[#78716c]">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border border-[#2a2520] border-t-transparent mb-1"></div>
                    <p className="text-[11px]">Loading ledger statements...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-[#78716c] rounded-xl bg-[#0f0d0b] border border-[#2a2520]">
                    <p className="text-xs">No ledger records logged yet.</p>
                    <p className="text-[10px] mt-0.5 text-[#78716c]">File a report on our home feed to earn GreenCoins.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="bg-[#0f0d0b] border border-[#2a2520]/60 p-3 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#e7e5e4] leading-snug">{tx.reason}</p>
                          {tx.timestamp && (
                            <span className="text-[9px] text-[#78716c] block font-light mt-1 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-amber-500/60" />
                              {new Date(tx.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black font-mono text-amber-500 shrink-0">
                          +{tx.amount} <span className="text-[10px] font-normal text-[#78716c]">GC</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Scoreboard Community Leaderboard */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-[#e7e5e4] flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Public Leaderboard standings</span>
                </h3>
                
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                  Live Sync
                </span>
              </div>

              {isLeaderboardLoading ? (
                <div className="py-16 text-center text-[#78716c]">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#2a2520] border-t-transparent mb-2"></div>
                  <p className="text-xs">Loading scoreboard standings...</p>
                </div>
              ) : citizens.length === 0 ? (
                <div className="py-16 text-center text-[#78716c] rounded-xl bg-[#0f0d0b] border border-[#2a2520]">
                  <p className="text-sm">No standing citizens registered yet.</p>
                  <p className="text-xs mt-1 text-[#78716c]">Submit your first reported hazard to register!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a2520] text-xs font-semibold text-[#78716c] uppercase tracking-wider">
                        <th className="py-3 px-4 text-center w-12">Rank</th>
                        <th className="py-3 px-4">Citizen Name</th>
                        <th className="py-3 px-4 text-center">Reports</th>
                        <th className="py-3 px-4 text-center">Status Badge</th>
                        <th className="py-3 px-4 text-right">GreenCoins</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2520]/40">
                      {citizens.map((cit, index) => {
                        const tier = getBadgeTier(cit.reportsCount);
                        const isTop3 = index < 3;
                        const isCurrentUser = user && user.uid === cit.id;
                        
                        return (
                          <tr 
                            key={cit.id} 
                            className={`text-sm hover:bg-[#0f0d0b]/40 transition-colors ${
                              isCurrentUser ? "bg-amber-600/5 hover:bg-amber-600/10" : ""
                            }`}
                          >
                            {/* Rank Column */}
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-[#e7e5e4]">
                              {isTop3 ? (
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black border ${
                                  index === 0 
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(217,119,6,0.2)]" 
                                    : index === 1 
                                      ? "bg-stone-300/10 text-stone-300 border-stone-300/20" 
                                      : "bg-amber-700/10 text-amber-600 border-amber-700/20"
                                }`}>
                                  {index + 1}
                                </span>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </td>

                            {/* Name and Avatar Column */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={cit.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"}
                                  alt={cit.name}
                                  className="h-7 w-7 rounded-lg object-cover border border-[#2a2520]"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="font-semibold text-[#e7e5e4] flex items-center gap-1.5">
                                    {cit.name}
                                    {isCurrentUser && (
                                      <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/20">
                                        You
                                      </span>
                                    )}
                                    {index === 0 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                                  </span>
                                  {cit.lastReportedAt && (
                                    <span className="text-[10px] text-[#78716c] block font-light mt-0.5">
                                      Active: {new Date(cit.lastReportedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Reports count */}
                            <td className="py-3.5 px-4 text-center font-bold text-stone-300">
                              {cit.reportsCount}
                            </td>

                            {/* Badge Status Tier */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tier.style}`}>
                                {tier.icon}
                                <span>{tier.title}</span>
                              </span>
                            </td>

                            {/* GreenCoins count */}
                            <td className="py-3.5 px-4 text-right font-black text-amber-500 font-mono">
                              {cit.greenCoins} <span className="text-[10px] text-[#78716c] font-normal font-sans">GC</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Section 4: What can GreenCoins become? Informational Cards */}
        <section className="bg-[#161310] border border-[#2a2520] p-6 rounded-2xl shadow-xl">
          <h3 className="text-base font-bold text-[#e7e5e4] mb-2 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            <span>What can GreenCoins become?</span>
          </h3>
          <p className="text-xs text-[#78716c] mb-6">
            GreenCoins are non-monetary community utility assets designed to increase civic engagement. Take a look at future civic program blueprints:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-[#0f0d0b] border border-[#2a2520] p-4.5 rounded-xl">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
                <Shield className="h-4.5 w-4.5" />
              </span>
              <h4 className="text-xs font-bold text-[#e7e5e4] mb-1">Municipal Voucher Partnerships</h4>
              <p className="text-[11px] text-[#78716c] leading-relaxed">
                Exchangeable for waste composting kits, eco-bags, solar panel discounts, or local organic municipal vendor markets.
              </p>
            </div>

            <div className="bg-[#0f0d0b] border border-[#2a2520] p-4.5 rounded-xl">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
                <Clock className="h-4.5 w-4.5" />
              </span>
              <h4 className="text-xs font-bold text-[#e7e5e4] mb-1">Public Transport Discounts</h4>
              <p className="text-[11px] text-[#78716c] leading-relaxed">
                Recharge Metro cards, City bus passes, or municipal parking tickets via GreenCoins integration drafts.
              </p>
            </div>

            <div className="bg-[#0f0d0b] border border-[#2a2520] p-4.5 rounded-xl">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
                <Award className="h-4.5 w-4.5" />
              </span>
              <h4 className="text-xs font-bold text-[#e7e5e4] mb-1">Community Recognition Programs</h4>
              <p className="text-[11px] text-[#78716c] leading-relaxed">
                Earn public commendation letters, local ward awards, and highlight profiles on the CityLens active citizen panel.
              </p>
            </div>

            <div className="bg-[#0f0d0b] border border-[#2a2520] p-4.5 rounded-xl">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
                <Activity className="h-4.5 w-4.5" />
              </span>
              <h4 className="text-xs font-bold text-[#e7e5e4] mb-1">Civic Participation Incentives</h4>
              <p className="text-[11px] text-[#78716c] leading-relaxed">
                Secure passes for municipal ward meetings, city tree plantation sessions, and civic design workshops.
              </p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
