import React, { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { 
  UploadCloud, 
  Trash2, 
  Sparkles, 
  Clock, 
  Building, 
  ShieldAlert, 
  MapPin, 
  User,
  CheckCircle,
  BarChart2,
  ThumbsUp,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { analyzeIssueImage, CivicAnalysis } from "../services/geminiService";
import { collection, addDoc, doc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { creditGreenCoins } from "../services/rewardService";

interface ReportFormProps {
  onReportSubmitted?: () => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  "AIzaSyDu_ofjnm8vm7hWXrF_SI1nxVbblXi1sHI";

export default function ReportForm({ onReportSubmitted }: ReportFormProps) {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CivicAnalysis | null>(null);
  const [loadingStep, setLoadingStep] = useState("");
  
  // Custom user inputs to accompany the report
  const [landmark, setLandmark] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Location and Routing states
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number; address: string } | null>(null);
  
  interface RoutingResult {
    department: string;
    departmentCode: string;
    priority: "P1" | "P2" | "P3" | "P4";
    estimatedDays: number;
    escalationPath: string[];
    contactHint: string;
  }
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate reporter name when user logs in
  useEffect(() => {
    if (user && user.displayName && !reporterName) {
      setReporterName(user.displayName);
    }
  }, [user]);

  // Loading animation simulation steps for the user
  const loadingSteps = [
    "Uploading visual payload...",
    "Gemini inspecting image pixels...",
    "Assessing Indian structural integrity...",
    "Detecting environmental safety hazards...",
    "Mapping to municipal department protocols...",
    "Formulating action recommendations..."
  ];

  const triggerSpinnerSequence = () => {
    let index = 0;
    setLoadingStep(loadingSteps[0]);
    const interval = setInterval(() => {
      index = (index + 1) % loadingSteps.length;
      setLoadingStep(loadingSteps[index]);
    }, 1800);
    return interval;
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    
    // File size limit of 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Max size is 10MB.");
      return;
    }

    setImageFile(file);
    setAnalysis(null); // Clear previous analysis when a new file is uploaded
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    toast.success("Image uploaded successfully!");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setRoutingResult(null);
    setLandmark("");
    setReporterName("");
    setCoordinates(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingLocation(true);
    toast.loading("Accessing browser GPS...", { id: "gps-loading" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          toast.loading("Resolving coordinates to address...", { id: "gps-loading" });
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error("Failed to contact Geocoding service");
          }
          const data = await res.json();
          if (data.status === "OK" && data.results && data.results[0]) {
            const address = data.results[0].formatted_address;
            setLandmark(address);
            setCoordinates({ lat: latitude, lng: longitude, address });
            toast.success("Location detected successfully! 📍", { id: "gps-loading" });
          } else {
            console.warn("Geocoding was not successful:", data);
            const rawAddress = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            setLandmark(rawAddress);
            setCoordinates({ lat: latitude, lng: longitude, address: rawAddress });
            toast.success("Location set to GPS coordinates 📍", { id: "gps-loading" });
          }
        } catch (error) {
          console.error("Geocoding Error:", error);
          const rawAddress = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          setLandmark(rawAddress);
          setCoordinates({ lat: latitude, lng: longitude, address: rawAddress });
          toast.success("Location set to GPS coordinates 📍", { id: "gps-loading" });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation Error:", error);
        toast.error(`Could not access GPS: ${error.message}`, { id: "gps-loading" });
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCallRouting = async (analysisResult: CivicAnalysis) => {
    setIsRouting(true);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: analysisResult.category,
          severity: analysisResult.severity,
          location: landmark || coordinates?.address || "Unknown Location",
        }),
      });

      if (!response.ok) {
        throw new Error("Routing agent failed to respond");
      }

      const data = await response.json();
      setRoutingResult(data.routing);
      toast.success("Routing paths calculated by AI agent! 🗺");
    } catch (err) {
      console.error("Routing error:", err);
      setRoutingResult({
        department: analysisResult.department || "Local Municipal Corporation",
        departmentCode: "MUNI",
        priority: analysisResult.severity === "Critical" ? "P1" : analysisResult.severity === "High" ? "P2" : analysisResult.severity === "Medium" ? "P3" : "P4",
        estimatedDays: analysisResult.estimated_repair_time.includes("24") ? 1 : 5,
        escalationPath: ["Ward Inspector", "Executive Engineer", "Chief Commissioner"],
        contactHint: "Local citizen portal hotline"
      });
    } finally {
      setIsRouting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      toast.error("Please upload an image to analyze.");
      return;
    }

    setIsAnalyzing(true);
    const intervalId = triggerSpinnerSequence();

    try {
      const result = await analyzeIssueImage(imageFile);
      setAnalysis(result);
      toast.success("AI Analysis Completed!");
      await handleCallRouting(result);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "AI Analysis failed. Please try again.");
    } finally {
      clearInterval(intervalId);
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) {
      toast.error("Please analyze the image with AI before submitting.");
      return;
    }

    setIsSubmitting(true);
    const finalReporterName = reporterName.trim() || "Anonymous";
    
    const payload = {
      analysis,
      landmark: landmark.trim() || "Unspecified location",
      reporterName: finalReporterName,
      reporterUid: user ? user.uid : null,
      createdAt: new Date().toISOString(),
      status: "Pending",
      upvotes: 0,
      ...(coordinates ? { coordinates } : {}),
      ...(routingResult ? { routing: routingResult } : {})
    };

    console.log("Submitting Civic Report:", payload);

    try {
      const docRef = await addDoc(collection(db, "reports"), payload);
      
      if (user) {
        await creditGreenCoins(user.uid, 10, "Report Submitted", docRef.id, true);
        toast.success("Report saved! +10 GreenCoins credited to your civic wallet! 🏆");
      } else {
        const citizenRef = doc(db, "citizens", finalReporterName);
        await setDoc(citizenRef, {
          name: finalReporterName,
          points: increment(10),
          reportsCount: increment(1),
          lastReportedAt: new Date().toISOString()
        }, { merge: true });
        toast.success("Anonymous report saved! +10 Points registered! 🏆");
      }
      
      handleRemoveImage();
      
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      toast.error("Could not persist report to Firestore.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to color-code severity badges
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-950/40 text-red-400 border-red-900/50";
      case "high":
        return "bg-orange-950/40 text-orange-400 border-orange-900/50";
      case "medium":
        return "bg-amber-950/40 text-amber-400 border-amber-900/50";
      case "low":
        return "bg-stone-900/60 text-[#e7e5e4] border-stone-800";
      default:
        return "bg-stone-900/40 text-[#78716c] border-[#2a2520]";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Left Side: Upload and Form Controls */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-[#e7e5e4] flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-amber-500" />
              <span>Capture & Upload Civic Issue</span>
            </h2>
            
            {/* Image Upload Area */}
            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer min-h-[220px] ${
                  isDragging
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-[#2a2520] bg-[#0f0d0b] hover:border-amber-500/50 hover:bg-[#161310]"
                }`}
                id="drop-zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#161310] border border-[#2a2520] group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-7 w-7 text-stone-500 group-hover:text-amber-500 transition-colors" />
                </div>
                
                <p className="text-sm font-semibold text-[#e7e5e4]">
                  Drag and drop your image here, or <span className="text-amber-500">browse</span>
                </p>
                <p className="mt-1.5 text-xs text-[#78716c]">
                  Supports PNG, JPG, JPEG, WEBP (Max 10MB)
                </p>
              </div>
            ) : (
              /* Image Preview Area */
              <div className="relative rounded-xl overflow-hidden border border-[#2a2520] bg-[#0f0d0b]">
                <img
                  src={imagePreview}
                  alt="Civic issue preview"
                  className="w-full max-h-[320px] object-contain mx-auto"
                />
                
                {/* Delete/Remove button overlay */}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0f0d0b]/80 hover:bg-amber-700 text-[#e7e5e4] transition-colors border border-[#2a2520]"
                  title="Remove image"
                  id="remove-image-btn"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            )}

            {/* AI Action button */}
            {imagePreview && !analysis && (
              <div className="mt-6">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleAnalyze}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3.5 transition-all shadow-lg shadow-amber-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  id="analyze-ai-btn"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span className="animate-pulse">{loadingStep}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-amber-200" />
                      <span>Analyze with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Form details, only unlocked after AI has generated the report */}
          {analysis && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-lg font-bold text-[#e7e5e4] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-500" />
                <span>Reporter Details & Submission</span>
              </h3>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider">
                    Nearest Landmark / Location (Street, Ward, City) *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors disabled:text-stone-500 disabled:cursor-not-allowed"
                  >
                    <MapPin className="h-3.5 w-3.5 animate-pulse" />
                    <span>{isDetectingLocation ? "Detecting..." : "Detect My Location"}</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716c]" />
                  <input
                    type="text"
                    required
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Near Metro Pillar 142, Indiranagar, Bengaluru"
                    className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] pl-10 pr-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                  Your Name (Optional - earn +10 Points!)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716c]" />
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Leave blank for Anonymous"
                    className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] pl-10 pr-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 transition-all shadow-lg shadow-amber-600/15 disabled:opacity-50"
                id="submit-report-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Persisting Report & Awarding Points...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Submit Report (Earn +10 Citizen Points)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Analysis Card */}
        <div className="lg:col-span-6">
          {!analysis ? (
            <div className="h-full rounded-2xl border border-[#2a2520] bg-[#161310] p-8 flex flex-col items-center justify-center text-center text-[#78716c] min-h-[350px]">
              <Sparkles className="h-12 w-12 text-[#2a2520] mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-[#e7e5e4]/75">Awaiting AI Analysis</h3>
              <p className="mt-2 text-sm max-w-sm text-[#78716c] leading-relaxed">
                Upload a photo of any Indian civic issue—such as potholes, garbage piles, broken lights, or water leaks—to inspect with Gemini AI.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-[#161310] p-6 shadow-xl relative overflow-hidden">
              {/* Subtle top decoration badge */}
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-amber-600 via-amber-800 to-amber-900"></div>

              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Analysis Completed
                </span>
                
                <span className="text-xs font-mono text-[#78716c]">
                  Confidence: <span className="text-amber-500 font-semibold">{(analysis.confidence * 100).toFixed(0)}%</span>
                </span>
              </div>

              {/* Title & Category */}
              <div className="border-b border-[#2a2520] pb-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityBadgeClass(analysis.severity)}`}>
                    {analysis.severity} Severity
                  </span>
                  <span className="text-xs bg-[#0f0d0b] text-[#e7e5e4] px-2 py-0.5 rounded border border-[#2a2520]">
                    {analysis.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#e7e5e4] leading-snug">{analysis.title}</h3>
              </div>

              {/* Description */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold uppercase text-[#78716c] tracking-wider mb-2">Visible Evidence Description</h4>
                <p className="text-sm text-[#e7e5e4] bg-[#0f0d0b] p-4 rounded-xl border border-[#2a2520] leading-relaxed">
                  {analysis.description}
                </p>
              </div>

              {/* Grid: Stats & Details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-[#2a2520] bg-[#0f0d0b]/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c] font-semibold uppercase tracking-wider mb-1">
                    <BarChart2 className="h-3.5 w-3.5 text-amber-500" />
                    Severity Score
                  </div>
                  <p className="text-lg font-bold text-[#e7e5e4]">
                    {analysis.severity_score} <span className="text-xs text-[#78716c]">/ 10</span>
                  </p>
                </div>

                <div className="rounded-xl border border-[#2a2520] bg-[#0f0d0b]/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c] font-semibold uppercase tracking-wider mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Est. Resolve Time
                  </div>
                  <p className="text-lg font-bold text-[#e7e5e4]">
                    {analysis.estimated_repair_time}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-[#2a2520] bg-[#0f0d0b]/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c] font-semibold uppercase tracking-wider mb-1.5">
                    <Building className="h-3.5 w-3.5 text-amber-500/70" />
                    Responsible Department
                  </div>
                  <p className="text-sm font-bold text-[#e7e5e4]">
                    {analysis.department}
                  </p>
                </div>
              </div>

              {/* Hazards detected */}
              {analysis.hazards && analysis.hazards.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase text-[#78716c] tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Safety Hazards Detected
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.hazards.map((hazard, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-amber-500/5 border border-amber-500/20 text-[#e7e5e4] px-2.5 py-1 rounded-lg font-medium"
                      >
                        ⚠ {hazard}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4.5">
                <h4 className="text-xs font-semibold uppercase text-amber-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4" />
                  Recommended Action
                </h4>
                <p className="text-sm text-[#e7e5e4]/90 leading-relaxed">
                  {analysis.recommended_action}
                </p>
              </div>

            </div>
          )}

          {/* TASK 4: Routing Agent Card */}
          {analysis && (
            <div className="mt-6 rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-800"></div>
              
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Routing Agent Active
                </span>
                {isRouting && (
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <span>Routing...</span>
                  </div>
                )}
              </div>

              {routingResult ? (
                <div className="space-y-4">
                  {/* Department Name & Code */}
                  <div className="border-b border-[#2a2520] pb-3">
                    <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block mb-1">
                      Responsible Jurisdiction
                    </span>
                    <h4 className="text-sm font-bold text-[#e7e5e4] flex items-center gap-2">
                      <span>{routingResult.department}</span>
                      <span className="bg-[#0f0d0b] text-[#78716c] px-2 py-0.5 rounded text-[10px] font-mono border border-[#2a2520] shrink-0">
                        {routingResult.departmentCode}
                      </span>
                    </h4>
                  </div>

                  {/* Priority & Estimated days */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0f0d0b] border border-[#2a2520] p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block mb-1">
                        SLA Routing Priority
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${
                        routingResult.priority === "P1"
                          ? "bg-red-950/40 text-red-400 border-red-900/50"
                          : routingResult.priority === "P2"
                          ? "bg-orange-950/40 text-orange-400 border-orange-900/50"
                          : routingResult.priority === "P3"
                          ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                          : "bg-stone-900/60 text-[#e7e5e4] border-stone-800"
                      }`}>
                        {routingResult.priority}
                      </span>
                    </div>

                    <div className="bg-[#0f0d0b] border border-[#2a2520] p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block mb-1">
                        Resolution SLA
                      </span>
                      <span className="text-xs font-bold text-[#e7e5e4] block mt-1">
                        {routingResult.estimatedDays} Days
                      </span>
                    </div>
                  </div>

                  {/* Escalation Path */}
                  {routingResult.escalationPath && routingResult.escalationPath.length > 0 && (
                    <div className="bg-[#0f0d0b]/40 border border-[#2a2520] p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block mb-2">
                        Escalation & Resolution Path
                      </span>
                      <ol className="relative border-l border-[#2a2520] ml-2 pl-4 space-y-3">
                        {routingResult.escalationPath.map((step, index) => (
                          <li key={index} className="text-xs relative">
                            <span className="absolute -left-[22px] top-1 flex h-2 w-2 items-center justify-center rounded-full bg-amber-600 ring-4 ring-[#161310]" />
                            <p className="font-semibold text-stone-300">{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Contact Hint */}
                  {routingResult.contactHint && (
                    <div className="bg-emerald-950/10 border border-emerald-900/20 p-3 rounded-xl text-[11px] text-stone-400">
                      <span className="font-bold text-emerald-400 block mb-0.5">Nodal Contact Hint:</span>
                      {routingResult.contactHint}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#78716c]">
                  Calculating department escalation matrix...
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
