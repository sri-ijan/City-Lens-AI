import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { 
  UploadCloud, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  Building, 
  ShieldAlert, 
  MapPin, 
  User,
  CheckCircle,
  HelpCircle,
  BarChart2,
  ThumbsUp
} from "lucide-react";
import toast from "react-hot-toast";
import { analyzeIssueImage, CivicAnalysis } from "../services/geminiService";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

interface ReportFormProps {
  onReportSubmitted: () => void;
}

export default function ReportForm({ onReportSubmitted }: ReportFormProps) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setLandmark("");
    setReporterName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    const payload = {
      analysis,
      landmark: landmark.trim() || "Unspecified location",
      reporterName: reporterName.trim() || "Anonymous",
      createdAt: new Date().toISOString(),
      status: "Pending" // Initial status of reported issue
    };

    console.log("Submitting Civic Report:", payload);

    try {
      // Save report to Firestore 'reports' collection
      await addDoc(collection(db, "reports"), payload);
      
      toast.success("Report registered successfully on Firestore!");
      
      // Reset form
      handleRemoveImage();
      
      // Callback to refresh dashboard list
      onReportSubmitted();
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      toast.error("Could not persist report to Firestore. Printed to Console instead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to color-code severity badges
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Left Side: Upload and Form Controls */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-500" />
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
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-gray-800 bg-gray-950 hover:border-gray-700 hover:bg-gray-900/50"
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
                
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 border border-gray-800 group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-7 w-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                
                <p className="text-sm font-semibold text-white">
                  Drag and drop your image here, or <span className="text-blue-500">browse</span>
                </p>
                <p className="mt-1.5 text-xs text-gray-400">
                  Supports PNG, JPG, JPEG, WEBP (Max 10MB)
                </p>
              </div>
            ) : (
              /* Image Preview Area */
              <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                <img
                  src={imagePreview}
                  alt="Civic issue preview"
                  className="w-full max-h-[320px] object-contain mx-auto"
                />
                
                {/* Delete/Remove button overlay */}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 hover:bg-red-600/90 text-white transition-colors border border-white/10"
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  id="analyze-ai-btn"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>{loadingStep}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Analyze with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Form details, only unlocked after AI has generated the report */}
          {analysis && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                <span>Reporter Details & Submission</span>
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Nearest Landmark / Location (Street, Ward, City) *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Near Metro Pillar 142, Indiranagar, Bengaluru"
                    className="w-full rounded-xl bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Your Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Leave blank for Anonymous"
                    className="w-full rounded-xl bg-gray-950 border border-gray-800 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 transition-colors shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                id="submit-report-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Persisting to Firestore...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Submit Official Civic Report</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Analysis Card */}
        <div className="lg:col-span-6">
          {!analysis ? (
            <div className="h-full rounded-2xl border border-gray-800 bg-gray-900 p-8 flex flex-col items-center justify-center text-center text-gray-400 min-h-[350px]">
              <Sparkles className="h-12 w-12 text-gray-700 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-gray-300">Awaiting AI Analysis</h3>
              <p className="mt-2 text-sm max-w-sm text-gray-500 leading-relaxed">
                Upload a photo of any local Indian civic issue—such as potholes, overflowing garbage piles, open sewers, or broken street lights—and trigger the AI inspection.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-500/20 bg-gray-900 p-6 shadow-xl relative overflow-hidden">
              {/* Subtle top decoration badge */}
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-blue-500 via-teal-500 to-indigo-500"></div>

              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Analysis Completed
                </span>
                
                <span className="text-xs font-mono text-gray-400">
                  Confidence: <span className="text-emerald-400 font-semibold">{(analysis.confidence * 100).toFixed(0)}%</span>
                </span>
              </div>

              {/* Title & Category */}
              <div className="border-b border-gray-800 pb-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityBadgeClass(analysis.severity)}`}>
                    {analysis.severity} Severity
                  </span>
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                    {analysis.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">{analysis.title}</h3>
              </div>

              {/* Description */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Visible Evidence Description</h4>
                <p className="text-sm text-gray-300 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 leading-relaxed">
                  {analysis.description}
                </p>
              </div>

              {/* Grid: Stats & Details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                    <BarChart2 className="h-3.5 w-3.5 text-blue-500" />
                    Severity Score
                  </div>
                  <p className="text-lg font-bold text-white">
                    {analysis.severity_score} <span className="text-xs text-gray-500">/ 10</span>
                  </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Est. Resolve Time
                  </div>
                  <p className="text-lg font-bold text-white">
                    {analysis.estimated_repair_time}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-gray-800 bg-gray-950/40 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                    <Building className="h-3.5 w-3.5 text-indigo-400" />
                    Responsible Department
                  </div>
                  <p className="text-sm font-bold text-white">
                    {analysis.department}
                  </p>
                </div>
              </div>

              {/* Hazards detected */}
              {analysis.hazards && analysis.hazards.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Safety Hazards Detected
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.hazards.map((hazard, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-lg font-medium"
                      >
                        ⚠ {hazard}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4.5">
                <h4 className="text-xs font-semibold uppercase text-blue-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4" />
                  Recommended Inspector Action
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {analysis.recommended_action}
                </p>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
