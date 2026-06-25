import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import Header from "./components/Header";
import ReportForm from "./components/ReportForm";
import { CivicAnalysis } from "./services/geminiService";
import { 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  Search, 
  Filter, 
  Activity, 
  ChevronRight, 
  Wrench, 
  MapPin, 
  User, 
  Trash2,
  ListFilter
} from "lucide-react";

interface ReportDocument {
  id: string;
  analysis: CivicAnalysis;
  landmark: string;
  reporterName: string;
  createdAt: string;
  status: "Pending" | "In Progress" | "Resolved";
}

export default function App() {
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
      await updateDoc(docRef, { status: newStatus });
      toast.success(`Report status updated to ${newStatus}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
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
      case "low": return "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
      default: return "text-gray-400 bg-gray-900/60 border-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-medium border border-red-500/15">● Pending Approval</span>;
      case "In Progress":
        return <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full font-medium border border-blue-500/15">⚙ Under Repair</span>;
      case "Resolved":
        return <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/15">✓ Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      <Header />

      <main className="flex-1 pb-16">
        
        {/* Form and Image analysis area */}
        <ReportForm onReportSubmitted={() => {}} />

        {/* Dashboard Statistics banner */}
        <section className="max-w-6xl mx-auto px-4 mb-10">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span>Real-time Civic Resolution Feed Stats</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5">
                <span className="text-xs text-gray-500 block mb-1">Total Logged</span>
                <span className="text-2xl font-bold text-white">{totalReports}</span>
              </div>
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5">
                <span className="text-xs text-red-500/70 block mb-1">Pending Action</span>
                <span className="text-2xl font-bold text-red-400">{pendingCount}</span>
              </div>
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5">
                <span className="text-xs text-blue-500/70 block mb-1">In Progress</span>
                <span className="text-2xl font-bold text-blue-400">{inProgressCount}</span>
              </div>
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5">
                <span className="text-xs text-emerald-500/70 block mb-1">Resolved</span>
                <span className="text-2xl font-bold text-emerald-400">{resolvedCount}</span>
              </div>
              <div className="bg-gray-950 border border-red-950 rounded-xl p-3.5 col-span-2 sm:col-span-1">
                <span className="text-xs text-rose-400/80 block mb-1 flex items-center gap-1">
                  <AlertOctagon className="h-3 w-3 text-red-500" />
                  Critical Emergencies
                </span>
                <span className="text-2xl font-bold text-red-500">{criticalCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Feed list of issues */}
        <section className="max-w-6xl mx-auto px-4" id="civic-feed">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            
            {/* List Header and Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Reported Civic Incidents</h2>
                <p className="text-xs text-gray-400 mt-1">Review, track, and resolve infrastructure issues across your municipality.</p>
              </div>

              {/* Filtering layout */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search landmark/title..."
                    className="w-full rounded-lg bg-gray-950 border border-gray-800 pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                {/* Severity filter */}
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-2.5 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-gray-900">All Severities</option>
                    <option value="Critical" className="bg-gray-900 text-red-400">Critical Only</option>
                    <option value="High" className="bg-gray-900 text-orange-400">High Only</option>
                    <option value="Medium" className="bg-gray-900 text-amber-400">Medium Only</option>
                    <option value="Low" className="bg-gray-900 text-emerald-400">Low Only</option>
                  </select>
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-2.5 py-1.5">
                  <ListFilter className="h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-gray-900">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Incident Cards list */}
            {isLoading ? (
              <div className="py-12 text-center text-gray-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-transparent mb-3"></div>
                <p className="text-sm">Retrieving civic reports from Firestore...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-16 text-center text-gray-500 rounded-xl bg-gray-950/40 border border-gray-800/60">
                <p className="text-sm">No reported incidents match your search criteria.</p>
                <p className="text-xs mt-1.5 text-gray-600">Be the first to report an issue using the capture form above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id}
                    className="rounded-xl border border-gray-800/80 bg-gray-950 p-5 hover:border-gray-700/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge and state bar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityColor(report.analysis.severity)}`}>
                            {report.analysis.severity}
                          </span>
                          <span className="text-[10px] bg-gray-900 text-gray-400 border border-gray-800 px-2 py-0.5 rounded">
                            {report.analysis.category}
                          </span>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>

                      {/* Title & Desc */}
                      <h4 className="text-base font-bold text-white mb-1 leading-tight">{report.analysis.title}</h4>
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{report.analysis.description}</p>

                      {/* Location and Reporter info */}
                      <div className="grid grid-cols-1 gap-2 border-t border-b border-gray-800/60 py-3 mb-4 text-xs">
                        <div className="flex items-start gap-1.5 text-gray-300">
                          <MapPin className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="font-medium line-clamp-1">{report.landmark}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span>Reported by: <strong className="text-gray-300 font-medium">{report.reporterName}</strong></span>
                        </div>
                      </div>

                      {/* Specific extractions */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 mb-4 bg-gray-900/30 p-2.5 rounded-lg border border-gray-800/40">
                        <div>
                          <span className="text-gray-500 block">Department:</span>
                          <span className="font-semibold text-gray-300 line-clamp-1">{report.analysis.department}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Est. Repair:</span>
                          <span className="font-semibold text-gray-300">{report.analysis.estimated_repair_time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex items-center justify-between gap-3 border-t border-gray-800/50 pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        {report.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(report.id, "In Progress")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold rounded-lg transition-colors"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>Start Repair</span>
                          </button>
                        )}
                        {report.status === "In Progress" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(report.id, "Resolved")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        {report.status === "Resolved" && (
                          <span className="text-xs text-emerald-400/80 flex items-center gap-1 font-semibold px-2 py-1 rounded bg-emerald-950/20 border border-emerald-900/30">
                            ✓ Issue Resolved
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all"
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

      </main>
    </div>
  );
}
