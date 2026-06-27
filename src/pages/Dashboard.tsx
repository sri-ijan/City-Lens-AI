import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  runTransaction,
  increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { CivicAnalysis } from "../services/geminiService";
import { useAuth } from "../hooks/useAuth";
import { creditGreenCoins } from "../services/rewardService";
import { 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  Search, 
  Filter, 
  Activity, 
  Wrench, 
  MapPin, 
  User, 
  Trash2,
  ListFilter,
  ThumbsUp,
  XCircle,
  AlertTriangle,
  Sparkles,
  X,
  Award
} from "lucide-react";

interface ReportDocument {
  id: string;
  analysis: CivicAnalysis;
  landmark: string;
  reporterName: string;
  createdAt: string;
  status: "Pending" | "In Progress" | "Resolved";
  upvotes?: number;
  reporterUid?: string | null;
  upvoteRewardCredited?: boolean;
  upvoteRewardGiven?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return "recent";
  }
};

const renderSeverityScoreDots = (severity: string, score?: number) => {
  let filled = 1;
  if (score && score <= 5) {
    filled = Math.round(score);
  } else if (score && score <= 10) {
    filled = Math.round(score / 2);
  } else {
    if (severity === "Critical") filled = 5;
    else if (severity === "High") filled = 4;
    else if (severity === "Medium") filled = 3;
    else filled = 1;
  }
  
  filled = Math.max(1, Math.min(5, filled));

  return (
    <div className="flex items-center gap-1 mt-1" title={`Severity Score: ${score || severity}`}>
      <span className="text-[10px] text-[#78716c] font-semibold mr-1">Impact:</span>
      {[1, 2, 3, 4, 5].map((dot) => (
        <span
          key={dot}
          className={`h-1.5 w-1.5 rounded-full ${
            dot <= filled
              ? severity === "Critical"
                ? "bg-red-500"
                : severity === "High"
                ? "bg-orange-500"
                : severity === "Medium"
                ? "bg-amber-500"
                : "bg-stone-400"
              : "bg-[#2a2520]"
          }`}
        />
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering and Searching State
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Resolved">("All");

  const [votedReports, setVotedReports] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("citylens_voted_reports") || "[]");
    } catch {
      return [];
    }
  });

  // Modal State for resolution verifier
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedReportForResolution, setSelectedReportForResolution] = useState<ReportDocument | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<{
    isResolved: boolean;
    fixQuality: "Poor" | "Partial" | "Complete";
    confidence: number;
    verificationSummary: string;
    remainingConcerns: string[];
  } | null>(null);

  // Real-time listener for reports in Firestore
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsList: ReportDocument[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          reportsList.push({
            id: docSnap.id,
            analysis: data.analysis,
            landmark: data.landmark || "Unspecified location",
            reporterName: data.reporterName || "Anonymous",
            createdAt: data.createdAt,
            status: data.status || "Pending",
            upvotes: typeof data.upvotes === "number" ? data.upvotes : 0,
            reporterUid: data.reporterUid || null,
            upvoteRewardCredited: !!data.upvoteRewardCredited,
            upvoteRewardGiven: !!data.upvoteRewardGiven,
          });
        });
        setReports(reportsList);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reports");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "Pending" | "In Progress" | "Resolved") => {
    try {
      const docRef = doc(db, "reports", id);
      
      if (newStatus === "Resolved") {
        await runTransaction(db, async (transaction) => {
          const reportSnap = await transaction.get(docRef);
          if (!reportSnap.exists()) return;
          
          const reportData = reportSnap.data();
          if (reportData.status === "Resolved") {
            return;
          }
          
          transaction.update(docRef, { status: "Resolved" });
          
          if (reportData.reporterUid && !reportData.resolvedRewardCredited) {
            const reporterUid = reportData.reporterUid;
            const citizenRef = doc(db, "citizens", reporterUid);
            const citizenSnap = await transaction.get(citizenRef);
            
            if (citizenSnap.exists()) {
              const citizenData = citizenSnap.data();
              const currentCoins = typeof citizenData.greenCoins === "number" ? citizenData.greenCoins : 0;
              const newCoins = currentCoins + 50;
              
              transaction.update(citizenRef, {
                greenCoins: newCoins,
                updatedAt: new Date().toISOString()
              });
              
              const transactionsCollectionRef = collection(db, "citizens", reporterUid, "transactions");
              const newTxRef = doc(transactionsCollectionRef);
              transaction.set(newTxRef, {
                amount: 50,
                reason: "Issue Resolved",
                timestamp: new Date().toISOString(),
                reportId: id
              });
              
              transaction.update(docRef, { resolvedRewardCredited: true });
            }
          }
        });
        toast.success("Issue resolved! +50 GreenCoins awarded to reporter! 🏆");
      } else {
        await updateDoc(docRef, { status: newStatus });
        toast.success(`Report status updated to ${newStatus}!`);
      }
    } catch (error) {
      toast.error("Failed to update status. Please try again.");
    }
  };

  const handleUpvote = async (reportId: string) => {
    if (votedReports.includes(reportId)) {
      toast.error("You have already verified/upvoted this report!");
      return;
    }

    try {
      const docRef = doc(db, "reports", reportId);
      let earnedCoins = false;

      await runTransaction(db, async (transaction) => {
        const reportSnap = await transaction.get(docRef);
        if (!reportSnap.exists()) return;
        
        const reportData = reportSnap.data();
        const currentUpvotes = typeof reportData.upvotes === "number" ? reportData.upvotes : 0;
        const newUpvotes = currentUpvotes + 1;
        
        const reportUpdates: any = { upvotes: increment(1) };
        
        const isAlreadyCredited = reportData.upvoteRewardGiven || reportData.upvoteRewardCredited;
        if (newUpvotes >= 3 && !isAlreadyCredited && reportData.reporterUid) {
          const reporterUid = reportData.reporterUid;
          const citizenRef = doc(db, "citizens", reporterUid);
          const citizenSnap = await transaction.get(citizenRef);
          
          if (citizenSnap.exists()) {
            const citizenData = citizenSnap.data();
            const currentCoins = typeof citizenData.greenCoins === "number" ? citizenData.greenCoins : 0;
            const newCoins = currentCoins + 25;
            
            transaction.update(citizenRef, {
              greenCoins: newCoins,
              updatedAt: new Date().toISOString()
            });
            
            const transactionsCollectionRef = collection(db, "citizens", reporterUid, "transactions");
            const newTxRef = doc(transactionsCollectionRef);
            transaction.set(newTxRef, {
              amount: 25,
              reason: "Community Verified",
              timestamp: new Date().toISOString(),
              reportId
            });
            
            reportUpdates.upvoteRewardGiven = true;
            reportUpdates.upvoteRewardCredited = true;
            earnedCoins = true;
          }
        }
        
        transaction.update(docRef, reportUpdates);
      });
      
      const newVoted = [...votedReports, reportId];
      setVotedReports(newVoted);
      localStorage.setItem("citylens_voted_reports", JSON.stringify(newVoted));

      if (earnedCoins) {
        toast.success("Community Verified! +25 GreenCoins awarded to reporter! 🏆");
      } else {
        toast.success("Civic report verified/upvoted! 👍");
      }
    } catch (error) {
      toast.error("Could not register upvote.");
    }
  };

  const handleVerifyResolution = async () => {
    if (!afterImageFile || !selectedReportForResolution) {
      toast.error("Please select an 'after' photo to verify.");
      return;
    }

    setIsVerifyingResolution(true);
    setResolutionResult(null);

    try {
      const base64Data = await fileToBase64(afterImageFile);
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          afterImageBase64: base64Data,
          mimeType: afterImageFile.type,
          originalReport: {
            title: selectedReportForResolution.analysis.title,
            category: selectedReportForResolution.analysis.category,
            description: selectedReportForResolution.analysis.description,
            severity: selectedReportForResolution.analysis.severity,
          },
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Failed to verify resolution");
      }

      const data = await res.json();
      setResolutionResult(data.resolution);
      toast.success("AI verification complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify resolution. Please try again.");
    } finally {
      setIsVerifyingResolution(false);
    }
  };

  const handleMarkAsResolved = async (reportId: string, reporterUid?: string | null) => {
    try {
      const docRef = doc(db, "reports", reportId);
      
      await runTransaction(db, async (transaction) => {
        const reportSnap = await transaction.get(docRef);
        if (!reportSnap.exists()) return;
        
        const reportData = reportSnap.data();
        if (reportData.status === "Resolved") {
          return;
        }
        
        transaction.update(docRef, { status: "Resolved" });
        
        if (reporterUid && !reportData.resolvedRewardCredited) {
          const citizenRef = doc(db, "citizens", reporterUid);
          const citizenSnap = await transaction.get(citizenRef);
          
          if (citizenSnap.exists()) {
            const citizenData = citizenSnap.data();
            const currentCoins = typeof citizenData.greenCoins === "number" ? citizenData.greenCoins : 0;
            const newCoins = currentCoins + 50;
            
            transaction.update(citizenRef, {
              greenCoins: newCoins,
              updatedAt: new Date().toISOString()
            });
            
            const transactionsCollectionRef = collection(db, "citizens", reporterUid, "transactions");
            const newTxRef = doc(transactionsCollectionRef);
            transaction.set(newTxRef, {
              amount: 50,
              reason: "Issue Resolved",
              timestamp: new Date().toISOString(),
              reportId: reportId
            });
            
            transaction.update(docRef, { resolvedRewardCredited: true });
          }
        }
      });

      toast.success("Issue marked as Resolved! +50 GreenCoins awarded to reporter! 🏆");
      setIsResolveModalOpen(false);
      setSelectedReportForResolution(null);
      setAfterImageFile(null);
      setAfterImagePreview(null);
      setResolutionResult(null);
    } catch (error) {
      toast.error("Failed to mark report as resolved.");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this civic report from Firestore?")) {
      try {
        await deleteDoc(doc(db, "reports", id));
        toast.success("Report deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete report.");
      }
    }
  };

  const totalReports = reports.length;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const inProgressCount = reports.filter((r) => r.status === "In Progress").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const criticalCount = reports.filter((r) => r.analysis.severity === "Critical").length;

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.analysis.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === "All" || report.analysis.severity === severityFilter;
    const matchesCategory = categoryFilter === "All" || report.analysis.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || report.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesCategory && matchesStatus;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    const isACritical = a.analysis.severity === "Critical";
    const isBCritical = b.analysis.severity === "Critical";
    
    if (isACritical && !isBCritical) return -1;
    if (!isACritical && isBCritical) return 1;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const categories = [
    "Pothole", "Water Leakage", "Broken Streetlight", 
    "Garbage Dumping", "Damaged Road", "Encroachment", 
    "Drainage Issue", "Other"
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "text-red-400 bg-red-950/40 border-red-900/50";
      case "high": return "text-orange-400 bg-orange-950/40 border-orange-900/50";
      case "medium": return "text-amber-400 bg-amber-950/40 border-amber-900/50";
      case "low": return "text-stone-300 bg-stone-900/60 border-stone-800";
      default: return "text-[#78716c] bg-[#161310] border-[#2a2520]";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="inline-flex items-center gap-1 text-[11px] bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-semibold border border-red-500/15">● Pending Approval</span>;
      case "In Progress":
        return <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full font-semibold border border-amber-500/15">⚙ Under Repair</span>;
      case "Resolved":
        return <span className="inline-flex items-center gap-1 text-[11px] bg-stone-800 text-[#e7e5e4] px-2.5 py-0.5 rounded-full font-semibold border border-stone-700">✓ Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen py-8">
      
      {/* Dashboard Statistics banner */}
      <section className="max-w-6xl mx-auto px-4 mb-8">
        <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c] mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <span>Real-time Civic Resolution Feed Stats</span>
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-3.5">
              <span className="text-xs text-[#78716c] block mb-1">Total Logged</span>
              <span className="text-2xl font-bold text-white">{totalReports}</span>
            </div>
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-3.5">
              <span className="text-xs text-red-500/70 block mb-1">Pending Action</span>
              <span className="text-2xl font-bold text-red-400">{pendingCount}</span>
            </div>
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-3.5">
              <span className="text-xs text-amber-500 block mb-1">In Progress</span>
              <span className="text-2xl font-bold text-amber-500">{inProgressCount}</span>
            </div>
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-3.5">
              <span className="text-xs text-stone-400 block mb-1">Resolved</span>
              <span className="text-2xl font-bold text-stone-300">{resolvedCount}</span>
            </div>
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-3.5 col-span-2 sm:col-span-1">
              <span className="text-xs text-rose-400/80 block mb-1 flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 text-red-500" />
                Critical
              </span>
              <span className="text-2xl font-bold text-red-500">{criticalCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Feed list of issues */}
      <section className="max-w-6xl mx-auto px-4" id="civic-feed">
        <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
          
          {/* List Header and Controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-[#2a2520]">
            <div>
              <h2 className="text-xl font-bold text-[#e7e5e4] tracking-tight">Reported Civic Incidents</h2>
              <p className="text-xs text-[#78716c] mt-1">Review, track, and resolve infrastructure issues across your municipality.</p>
            </div>

            {/* Filtering layout */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#78716c]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search landmark/title..."
                  className="w-full rounded-lg bg-[#0f0d0b] border border-[#2a2520] pl-9 pr-3 py-2 text-xs text-white placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                />
              </div>

              {/* Severity filter */}
              <div className="flex items-center gap-1.5 rounded-lg bg-[#0f0d0b] border border-[#2a2520] px-2.5 py-1.5">
                <Filter className="h-3.5 w-3.5 text-[#78716c]" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="All" className="bg-[#161310]">All Severities</option>
                  <option value="Critical" className="bg-[#161310] text-red-400">Critical Only</option>
                  <option value="High" className="bg-[#161310] text-orange-400">High Only</option>
                  <option value="Medium" className="bg-[#161310] text-amber-400">Medium Only</option>
                  <option value="Low" className="bg-[#161310] text-stone-300">Low Only</option>
                </select>
              </div>

              {/* Category filter */}
              <div className="flex items-center gap-1.5 rounded-lg bg-[#0f0d0b] border border-[#2a2520] px-2.5 py-1.5">
                <ListFilter className="h-3.5 w-3.5 text-[#78716c]" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="All" className="bg-[#161310]">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#161310]">{cat}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#2a2520]/60">
            {(["All", "Pending", "In Progress", "Resolved"] as const).map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-[#2a1f10] text-amber-500 border border-amber-500/20"
                      : "bg-[#0f0d0b] text-[#e7e5e4]/70 hover:text-white border border-[#2a2520] hover:bg-[#161310]"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {/* Incident Cards list */}
          {isLoading ? (
            <div className="py-12 text-center text-[#78716c]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#78716c] border-t-transparent mb-3"></div>
              <p className="text-sm">Retrieving civic reports from Firestore...</p>
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="py-16 text-center text-[#78716c] rounded-xl bg-[#0f0d0b]/40 border border-[#2a2520] flex flex-col items-center justify-center">
              <AlertOctagon className="h-10 w-10 text-stone-500 mb-3" />
              <p className="text-sm font-semibold text-stone-300">
                {statusFilter === "All" ? "No reports found" : `No ${statusFilter} reports found`}
              </p>
              <p className="text-xs mt-1.5 text-[#78716c]">Be the first to report an issue on the Home page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedReports.map((report) => {
                const isVoted = votedReports.includes(report.id);
                const hasWonCommunityBadge = (report.upvotes && report.upvotes >= 3) || !!report.upvoteRewardGiven || !!report.upvoteRewardCredited;
                
                return (
                  <div 
                    key={report.id}
                    className="rounded-xl border border-[#2a2520] bg-[#0f0d0b] p-5 hover:border-amber-500/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge and state bar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityColor(report.analysis.severity)}`}>
                            {report.analysis.severity}
                          </span>
                          <span className="text-[10px] bg-[#161310] text-[#e7e5e4] border border-[#2a2520] px-2 py-0.5 rounded">
                            {report.analysis.category}
                          </span>
                          {hasWonCommunityBadge && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                              🏆 Community Verified
                            </span>
                          )}
                        </div>
                        {getStatusBadge(report.status)}
                      </div>

                      {/* Title & Desc */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-bold text-[#e7e5e4] mb-1 leading-tight">{report.analysis.title}</h4>
                        <span className="text-[10px] text-[#78716c] font-medium shrink-0 bg-[#161310] px-1.5 py-0.5 rounded border border-[#2a2520] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(report.createdAt)}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        {renderSeverityScoreDots(report.analysis.severity, report.analysis.severity_score)}
                      </div>

                      <p className="text-xs text-[#78716c] mb-4 line-clamp-2 leading-relaxed">{report.analysis.description}</p>

                      {/* Location and Reporter info */}
                      <div className="grid grid-cols-1 gap-2 border-t border-b border-[#2a2520] py-3 mb-4 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-start gap-1.5 text-stone-300">
                            <MapPin className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <span className="font-medium line-clamp-1">{report.landmark}</span>
                          </div>
                          
                          {/* Interactive Upvote / Verify Button */}
                          <button
                            type="button"
                            onClick={() => handleUpvote(report.id)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all shrink-0 ${
                              isVoted
                                ? "text-amber-500 border-amber-500/30 bg-amber-500/5 cursor-default"
                                : "text-[#78716c] border-[#2a2520] hover:text-stone-300 hover:border-stone-700 bg-stone-900/40"
                            }`}
                            title={isVoted ? "You have upvoted this" : "Verify / upvote this report"}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span>{report.upvotes || 0}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#78716c]">
                          <User className="h-3.5 w-3.5 text-[#78716c] shrink-0" />
                          <span>Reported by: <strong className="text-[#e7e5e4] font-medium">{report.reporterName}</strong></span>
                        </div>
                      </div>

                      {/* Specific extractions */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#78716c] mb-4 bg-[#161310] p-2.5 rounded-lg border border-[#2a2520]">
                        <div>
                          <span className="text-[#78716c] block">Department:</span>
                          <span className="font-semibold text-stone-300 line-clamp-1">🏢 {report.analysis.department}</span>
                        </div>
                        <div>
                          <span className="text-[#78716c] block">Est. Repair:</span>
                          <span className="font-semibold text-stone-300">⏳ {report.analysis.estimated_repair_time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex items-center justify-between gap-3 border-t border-[#2a2520] pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        {report.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(report.id, "In Progress")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-xs text-white font-semibold rounded-lg transition-colors"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>Start Repair</span>
                          </button>
                        )}
                        {report.status === "In Progress" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReportForResolution(report);
                                setIsResolveModalOpen(true);
                                setAfterImageFile(null);
                                setAfterImagePreview(null);
                                setResolutionResult(null);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-xs text-white font-semibold rounded-lg transition-colors"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Verify Resolution</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, "Resolved")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs text-[#e7e5e4] font-semibold rounded-lg transition-colors border border-[#2a2520]"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                          </div>
                        )}
                        {report.status === "Resolved" && (
                          <span className="text-xs text-stone-400 flex items-center gap-1 font-semibold px-2.5 py-1 rounded bg-[#161310] border border-[#2a2520]">
                            ✓ Resolved & Fixed
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-[#78716c] hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                        title="Delete report from Firestore"
                        id={`delete-report-btn-${report.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* Resolution Verification Modal */}
      {isResolveModalOpen && selectedReportForResolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f0d0b]/80 backdrop-blur-sm">
          <div 
            className="w-full max-w-xl rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2a2520] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span>Verify Resolution with AI</span>
                </h3>
                <p className="text-xs text-[#78716c] mt-0.5">
                  Analyze and verify work completion for: <span className="text-stone-300 font-semibold">{selectedReportForResolution.analysis.title}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsResolveModalOpen(false);
                  setSelectedReportForResolution(null);
                  setAfterImageFile(null);
                  setAfterImagePreview(null);
                  setResolutionResult(null);
                }}
                className="text-[#78716c] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                id="close-resolution-modal-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Image upload preview area */}
              {!afterImagePreview ? (
                <div className="border-2 border-dashed border-[#2a2520] rounded-xl p-8 text-center hover:border-amber-500/30 transition-colors bg-[#0f0d0b]/30">
                  <input
                    type="file"
                    accept="image/*"
                    id="after-image-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAfterImageFile(file);
                        setAfterImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="after-image-upload" className="cursor-pointer flex flex-col items-center">
                    <Wrench className="h-10 w-10 text-amber-500 mb-3" />
                    <span className="text-xs font-semibold text-stone-300 block mb-1">
                      Upload "After Fix" Photo
                    </span>
                    <span className="text-[10px] text-[#78716c]">
                      Drag and drop or click to browse image
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative rounded-xl border border-[#2a2520] overflow-hidden bg-[#0f0d0b]">
                  <img
                    src={afterImagePreview}
                    alt="After fix"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAfterImageFile(null);
                      setAfterImagePreview(null);
                      setResolutionResult(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-stone-300 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Action Button */}
              {afterImagePreview && !resolutionResult && (
                <button
                  type="button"
                  disabled={isVerifyingResolution}
                  onClick={handleVerifyResolution}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800/40 text-xs font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isVerifyingResolution ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>AI is verifying the fix...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Verify with AI</span>
                    </>
                  )}
                </button>
              )}

              {/* Resolution Result Card */}
              {resolutionResult && (
                <div className="rounded-xl border border-[#2a2520] bg-[#0f0d0b] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2a2520] pb-2.5">
                    <div className="flex items-center gap-1.5">
                      {resolutionResult.isResolved ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-xs font-bold text-stone-200">
                        {resolutionResult.isResolved ? "Issue Genuinely Resolved" : "Issue Unresolved/Incomplete"}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      resolutionResult.fixQuality === "Complete"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : resolutionResult.fixQuality === "Partial"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-red-500/15 text-red-400 border-red-500/20"
                    }`}>
                      {resolutionResult.fixQuality} Fix
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#78716c] block text-[10px] uppercase font-bold tracking-wider mb-0.5">Confidence Score:</span>
                      <span className="text-[#e7e5e4] font-semibold">{(resolutionResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#78716c] block text-[10px] uppercase font-bold tracking-wider mb-1">AI Verification Details:</span>
                    <p className="text-xs text-stone-300 leading-relaxed bg-[#161310] p-2.5 rounded-lg border border-[#2a2520]">
                      {resolutionResult.verificationSummary}
                    </p>
                  </div>

                  {resolutionResult.remainingConcerns && resolutionResult.remainingConcerns.length > 0 && (
                    <div>
                      <span className="text-red-400 block text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Remaining Concerns:
                      </span>
                      <ul className="list-disc pl-4 text-xs text-stone-400 space-y-1">
                        {resolutionResult.remainingConcerns.map((concern, idx) => (
                          <li key={idx}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions based on resolution */}
                  {resolutionResult.isResolved && resolutionResult.fixQuality === "Complete" ? (
                    <div className="pt-3 border-t border-[#2a2520]">
                      <button
                        type="button"
                        onClick={() => handleMarkAsResolved(selectedReportForResolution.id, selectedReportForResolution.reporterUid)}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Award className="h-4 w-4" />
                        <span>Mark as Resolved & Award +50 GreenCoins</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-[#2a2520] text-center">
                      <p className="text-xs text-orange-400 font-semibold mb-2">
                        Keep In Progress — Fix is incomplete or unverified.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResolveModalOpen(false);
                          setSelectedReportForResolution(null);
                          setAfterImageFile(null);
                          setAfterImagePreview(null);
                          setResolutionResult(null);
                        }}
                        className="w-full py-2 px-4 bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 rounded-xl transition-all"
                      >
                        Back to Feed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
