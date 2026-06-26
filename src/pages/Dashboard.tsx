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
  runTransaction
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { CivicAnalysis } from "../services/geminiService";
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
  ThumbsUp
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
}

export default function Dashboard() {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering and Searching State
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

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
          });
        });
        setReports(reportsList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore live feed subscription error:", error);
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
        // Run as a transaction to award coins atomically and prevent double resolution rewards
        await runTransaction(db, async (transaction) => {
          const reportSnap = await transaction.get(docRef);
          if (!reportSnap.exists()) return;
          
          const reportData = reportSnap.data();
          if (reportData.status === "Resolved") {
            return; // Already resolved
          }
          
          transaction.update(docRef, { status: "Resolved" });
          
          // If there's an associated registered user, credit them +50 GreenCoins for resolving the issue!
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
              
              // Record transaction subcollection document
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
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    }
  };

  const handleUpvote = async (reportId: string) => {
    try {
      const docRef = doc(db, "reports", reportId);
      
      await runTransaction(db, async (transaction) => {
        const reportSnap = await transaction.get(docRef);
        if (!reportSnap.exists()) return;
        
        const reportData = reportSnap.data();
        const currentUpvotes = typeof reportData.upvotes === "number" ? reportData.upvotes : 0;
        const newUpvotes = currentUpvotes + 1;
        
        const reportUpdates: any = { upvotes: newUpvotes };
        
        // Check if report reaches 3 or more upvotes for the first time and has reporterUid
        if (newUpvotes >= 3 && !reportData.upvoteRewardCredited && reportData.reporterUid) {
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
            
            // Record the transaction subcollection document
            const transactionsCollectionRef = collection(db, "citizens", reporterUid, "transactions");
            const newTxRef = doc(transactionsCollectionRef);
            transaction.set(newTxRef, {
              amount: 25,
              reason: "Community Verified",
              timestamp: new Date().toISOString(),
              reportId
            });
            
            reportUpdates.upvoteRewardCredited = true;
          }
        }
        
        transaction.update(docRef, reportUpdates);
      });
      
      toast.success("Civic report verified/upvoted! 👍");
    } catch (error) {
      console.error("Upvoting error:", error);
      toast.error("Could not register upvote.");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this civic report from Firestore?")) {
      try {
        await deleteDoc(doc(db, "reports", id));
        toast.success("Report deleted successfully!");
      } catch (error) {
        console.error("Error deleting report:", error);
        toast.error("Failed to delete report.");
      }
    }
  };

  // Compute stats
  const totalReports = reports.length;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const inProgressCount = reports.filter((r) => r.status === "In Progress").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const criticalCount = reports.filter((r) => r.analysis.severity === "Critical").length;

  // Filter lists based on search, severity, and category
  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.analysis.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === "All" || report.analysis.severity === severityFilter;
    
    const matchesCategory = categoryFilter === "All" || report.analysis.category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
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

          {/* Incident Cards list */}
          {isLoading ? (
            <div className="py-12 text-center text-[#78716c]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#78716c] border-t-transparent mb-3"></div>
              <p className="text-sm">Retrieving civic reports from Firestore...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-[#78716c] rounded-xl bg-[#0f0d0b]/40 border border-[#2a2520]">
              <p className="text-sm">No reported incidents match your search criteria.</p>
              <p className="text-xs mt-1.5 text-[#78716c]">Be the first to report an issue on the Home page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  className="rounded-xl border border-[#2a2520] bg-[#0f0d0b] p-5 hover:border-amber-500/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Badge and state bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityColor(report.analysis.severity)}`}>
                          {report.analysis.severity}
                        </span>
                        <span className="text-[10px] bg-[#161310] text-[#e7e5e4] border border-[#2a2520] px-2 py-0.5 rounded">
                          {report.analysis.category}
                        </span>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    {/* Title & Desc */}
                    <h4 className="text-base font-bold text-[#e7e5e4] mb-1 leading-tight">{report.analysis.title}</h4>
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
                          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold transition-all shrink-0"
                          title="Verify / upvote this report"
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
                        <span className="font-semibold text-stone-300 line-clamp-1">{report.analysis.department}</span>
                      </div>
                      <div>
                        <span className="text-[#78716c] block">Est. Repair:</span>
                        <span className="font-semibold text-stone-300">{report.analysis.estimated_repair_time}</span>
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
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(report.id, "Resolved")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-xs text-white font-semibold rounded-lg transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark Resolved</span>
                        </button>
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
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
