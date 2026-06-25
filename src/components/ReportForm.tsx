import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
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
  const [landmark, setLandmark] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingSteps = [
    "Uploading image payload...",
    "Gemini inspecting visual data...",
    "Assessing structural integrity...",
    "Detecting safety hazards...",
    "Mapping to municipal departments...",
    "Formulating recommendations...",
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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB.");
      return;
    }
    setImageFile(file);
    setAnalysis(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setLandmark("");
    setReporterName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    const intervalId = triggerSpinnerSequence();
    try {
      const result = await analyzeIssueImage(imageFile);
      setAnalysis(result);
      toast.success("Analysis complete");
    } catch (error: any) {
      toast.error(error.message || "Analysis failed.");
    } finally {
      clearInterval(intervalId);
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        analysis,
        landmark: landmark.trim() || "Unspecified location",
        reporterName: reporterName.trim() || "Anonymous",
        createdAt: new Date().toISOString(),
        status: "Pending",
      });
      toast.success("Report submitted successfully");
      handleRemoveImage();
      onReportSubmitted();
    } catch (error: any) {
      toast.error("Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "high":     return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "medium":   return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "low":      return "bg-stone-500/10 text-stone-400 border-stone-500/20";
      default:         return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const inputStyle = {
    background: "#0f0d0b",
    border: "1px solid #2a2520",
    color: "#e7e5e4",
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-5 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* LEFT — Upload + Form */}
        <div className="lg:col-span-6 flex flex-col gap-5">

          {/* Upload card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#161310", border: "1px solid #2a2520" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <UploadCloud className="h-4 w-4 text-amber-600/70" />
              <h2 className="text-sm font-semibold text-stone-200 tracking-tight">
                Capture & Upload Civic Issue
              </h2>
            </div>

            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center rounded-xl p-10 text-center cursor-pointer transition-all min-h-[200px]"
                style={{
                  background: isDragging ? "#1c1a14" : "#0f0d0b",
                  border: `2px dashed ${isDragging ? "#92400e" : "#2a2520"}`,
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "#1c1917", border: "1px solid #2a2520" }}
                >
                  <UploadCloud className="h-5 w-5 text-stone-500" />
                </div>
                <p className="text-sm font-medium text-stone-300">
                  Drop image here, or{" "}
                  <span className="text-amber-500">browse</span>
                </p>
                <p className="mt-1 text-[11px] text-stone-600">
                  PNG, JPG, JPEG, WEBP — max 10MB
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-xl overflow-hidden"
                style={{ border: "1px solid #2a2520" }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-[280px] object-contain"
                  style={{ background: "#0f0d0b" }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #3d3330" }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                </button>
              </div>
            )}

            {imagePreview && !analysis && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "#92400e" }}
                onMouseEnter={(e) => !isAnalyzing && ((e.currentTarget as HTMLElement).style.background = "#78350f")}
                onMouseLeave={(e) => !isAnalyzing && ((e.currentTarget as HTMLElement).style.background = "#92400e")}
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-xs">{loadingStep}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with Gemini AI
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reporter form — unlocks after analysis */}
          {analysis && (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "#161310", border: "1px solid #2a2520" }}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600/70" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Reporter Details & Submission
                </h3>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Nearest Landmark / Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-600" />
                  <input
                    type="text"
                    required
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Near Metro Pillar 142, Indiranagar, Bengaluru"
                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-stone-600 outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#92400e")}
                    onBlur={(e) => (e.target.style.borderColor = "#2a2520")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Your Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-600" />
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Leave blank for Anonymous"
                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-stone-600 outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#92400e")}
                    onBlur={(e) => (e.target.style.borderColor = "#2a2520")}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 mt-1"
                style={{ background: "#1a3a2a", border: "1px solid #1e4d35", color: "#6ee7b7" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1e4d35")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#1a3a2a")}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                    Saving to Firestore...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit Civic Report
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT — Analysis Result */}
        <div className="lg:col-span-6">
          {!analysis ? (
            <div
              className="h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]"
              style={{ background: "#161310", border: "1px solid #2a2520" }}
            >
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: "#1c1917", border: "1px solid #2a2520" }}
              >
                <Sparkles className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="text-sm font-semibold text-stone-400 mb-2">
                Awaiting AI Analysis
              </h3>
              <p className="text-xs text-stone-600 max-w-xs leading-relaxed">
                Upload a photo of any civic issue — potholes, garbage, broken
                streetlights, drainage — and trigger the AI inspection.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: "#161310", border: "1px solid #2a2520" }}
            >
              {/* Amber top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(to right, #92400e, #d97706, #92400e)" }}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-4 pt-1">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "#1c1410", color: "#d97706", border: "1px solid #3d2e1e" }}
                >
                  <Sparkles className="h-3 w-3" />
                  AI Analysis Completed
                </span>
                <span className="text-[11px] text-stone-500">
                  Confidence:{" "}
                  <span className="text-stone-300 font-semibold">
                    {(analysis.confidence * 100).toFixed(0)}%
                  </span>
                </span>
              </div>

              {/* Severity + category + title */}
              <div
                className="pb-4 mb-4"
                style={{ borderBottom: "1px solid #2a2520" }}
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityConfig(analysis.severity)}`}
                  >
                    {analysis.severity} Severity
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded text-stone-400"
                    style={{ background: "#1c1917", border: "1px solid #2a2520" }}
                  >
                    {analysis.category}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-stone-100 leading-snug">
                  {analysis.title}
                </h3>
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-2">
                  Visible Evidence
                </p>
                <p
                  className="text-xs text-stone-400 p-3 rounded-xl leading-relaxed"
                  style={{ background: "#0f0d0b", border: "1px solid #2a2520" }}
                >
                  {analysis.description}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="rounded-xl p-3"
                  style={{ background: "#0f0d0b", border: "1px solid #2a2520" }}
                >
                  <div className="flex items-center gap-1 text-[10px] text-stone-600 uppercase tracking-wider mb-1">
                    <BarChart2 className="h-3 w-3" />
                    Severity Score
                  </div>
                  <p className="text-lg font-bold text-stone-100">
                    {analysis.severity_score}
                    <span className="text-xs text-stone-600 font-normal"> / 10</span>
                  </p>
                </div>

                <div
                  className="rounded-xl p-3"
                  style={{ background: "#0f0d0b", border: "1px solid #2a2520" }}
                >
                  <div className="flex items-center gap-1 text-[10px] text-stone-600 uppercase tracking-wider mb-1">
                    <Clock className="h-3 w-3" />
                    Est. Repair
                  </div>
                  <p className="text-sm font-bold text-stone-100">
                    {analysis.estimated_repair_time}
                  </p>
                </div>

                <div
                  className="col-span-2 rounded-xl p-3"
                  style={{ background: "#0f0d0b", border: "1px solid #2a2520" }}
                >
                  <div className="flex items-center gap-1 text-[10px] text-stone-600 uppercase tracking-wider mb-1">
                    <Building className="h-3 w-3" />
                    Responsible Department
                  </div>
                  <p className="text-sm font-semibold text-stone-200">
                    {analysis.department}
                  </p>
                </div>
              </div>

              {/* Hazards */}
              {analysis.hazards?.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-[10px] text-stone-600 uppercase tracking-wider mb-2">
                    <ShieldAlert className="h-3 w-3 text-red-500/60" />
                    Hazards Detected
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.hazards.map((hazard, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md text-red-400"
                        style={{ background: "#1c0a0a", border: "1px solid #3d1515" }}
                      >
                        ⚠ {hazard}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended action */}
              <div
                className="rounded-xl p-3.5"
                style={{ background: "#0f0d0b", border: "1px solid #2a2520" }}
              >
                <div className="flex items-center gap-1 text-[10px] text-stone-600 uppercase tracking-wider mb-1.5">
                  <ThumbsUp className="h-3 w-3 text-amber-600/60" />
                  Recommended Action
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
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