import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { generateComplaintLetter } from "../services/geminiService";
import { 
  Scale, 
  FileText, 
  Sparkles, 
  ClipboardCopy, 
  Calendar, 
  MapPin, 
  User, 
  ChevronRight,
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function Complaint() {
  const [issueType, setIssueType] = useState("Pothole");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [dateOfIncident, setDateOfIncident] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location.trim()) {
      toast.error("Please enter the location of the incident.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please provide a brief description of the issue.");
      return;
    }

    setIsGenerating(true);
    setGeneratedLetter("");

    try {
      const letter = await generateComplaintLetter({
        issueType,
        location,
        description,
        reporterName,
        dateOfIncident
      });
      setGeneratedLetter(letter);
      toast.success("AI Legal Complaint Letter Drafted!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Could not generate complaint letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    toast.success("Copied draft letter to Clipboard! 📋");
  };

  const categories = [
    "Pothole", "Water Leakage", "Broken Streetlight", 
    "Garbage Dumping", "Damaged Road", "Encroachment", 
    "Drainage Issue", "Other"
  ];

  return (
    <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Intro */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20 mb-3">
            <Scale className="h-3.5 w-3.5" />
            Legal & Civic Public Advocacy
          </div>
          <h2 className="text-3xl font-extrabold text-[#e7e5e4] tracking-tight">AI Municipal Complaint Generator</h2>
          <p className="text-sm text-[#78716c] mt-1.5 max-w-2xl">
            Draft a formal, legally grounded complaint letter cited with Indian administrative norms. Ready to be printed, emailed, or filed at your local ward office.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#2a2520] bg-[#161310] p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[#e7e5e4] mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <span>Letter Parameters</span>
              </h3>

              <form onSubmit={handleGenerate} className="flex flex-col gap-4">
                
                {/* Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                    Civic Incident Category
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] px-4 py-3 text-sm text-[#e7e5e4] outline-none focus:border-amber-600 transition-colors cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#161310]">{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                    Location / Ward / City *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716c]" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Ward 44, Halasuru Main Road, Bengaluru"
                      className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] pl-10 pr-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                    Date of Incident / Occurrence (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716c]" />
                    <input
                      type="text"
                      value={dateOfIncident}
                      onChange={(e) => setDateOfIncident(e.target.value)}
                      placeholder="e.g., June 24, 2026"
                      className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] pl-10 pr-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Reporter's Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                    Your Full Name / Sign-off
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716c]" />
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="e.g., Devendra Kumar (or Concerned Citizen)"
                      className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] pl-10 pr-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-1.5">
                    Factual Description & Impact *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what occurred, public danger caused, damage to vehicles, blockades, health risks etc."
                    className="w-full rounded-xl bg-[#0f0d0b] border border-[#2a2520] px-4 py-3 text-sm text-[#e7e5e4] placeholder-[#78716c] focus:outline-none focus:border-amber-600 transition-colors resize-none"
                  ></textarea>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 transition-all shadow-lg shadow-amber-600/10 disabled:opacity-50"
                  id="generate-complaint-btn"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Drafting legal arguments...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Generate Legal Complaint</span>
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Letter Draft Area */}
          <div className="lg:col-span-7 flex flex-col h-full">
            {!generatedLetter && !isGenerating ? (
              <div className="flex-1 rounded-2xl border border-dashed border-[#2a2520] bg-[#161310]/40 p-8 flex flex-col items-center justify-center text-center text-[#78716c] min-h-[400px]">
                <Scale className="h-12 w-12 text-[#2a2520] mb-4" />
                <h3 className="text-lg font-bold text-[#e7e5e4]/75">No Letter Generated Yet</h3>
                <p className="mt-2 text-xs max-w-sm text-[#78716c] leading-relaxed">
                  Fill in the incident parameters on the left and click "Generate Legal Complaint" to have Gemini create a tailored legal appeal addressed to Indian public departments.
                </p>
              </div>
            ) : isGenerating ? (
              <div className="flex-1 rounded-2xl border border-[#2a2520] bg-[#161310] p-8 flex flex-col items-center justify-center text-center text-[#78716c] min-h-[400px] animate-pulse">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
                <h3 className="text-base font-bold text-amber-500">Drafting Administrative Writ</h3>
                <p className="mt-1.5 text-xs text-[#78716c] max-w-xs">
                  Gemini is incorporating Indian municipal statutes, municipal liability guidelines, and department responsibilities. Please wait...
                </p>
              </div>
            ) : (
              <div className="flex-grow flex flex-col rounded-2xl border border-amber-500/20 bg-[#161310] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2a2520]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <h3 className="font-extrabold text-[#e7e5e4] text-sm tracking-wide uppercase">Official Municipal Draft</h3>
                  </div>

                  <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-1 text-xs font-semibold bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all"
                    id="copy-complaint-btn"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    <span>Copy Letter</span>
                  </button>
                </div>

                {/* Main letter block */}
                <div className="flex-1 bg-[#0f0d0b] border border-[#2a2520] p-5 rounded-xl">
                  <pre className="text-xs text-[#e7e5e4] leading-relaxed font-mono whitespace-pre-wrap select-text h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {generatedLetter}
                  </pre>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-[#78716c]">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Verified advocacy draft. Review municipal addresses before submitting to official registrar.</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
