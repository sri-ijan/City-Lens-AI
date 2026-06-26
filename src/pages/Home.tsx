import React from "react";
import ReportForm from "../components/ReportForm";
import { Sparkles, ShieldCheck, HeartHandshake } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-8 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20 mb-6 animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          Empowered by Gemini AI & Cloud Firestore
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#e7e5e4] tracking-tight mb-4">
          Empowering Communities Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700">AI Civil Inspections</span>
        </h1>
        
        <p className="text-sm md:text-base text-[#78716c] max-w-2xl mx-auto leading-relaxed">
          Instantly analyze infrastructural anomalies, file legally drafted municipal letters, and join a nationwide network of vigilant citizens striving for safer cities.
        </p>

        {/* Feature Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto text-left">
          <div className="flex gap-3 bg-[#161310] border border-[#2a2520] p-4 rounded-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e7e5e4]">Gemini Pixel Scanner</h4>
              <p className="text-[11px] text-[#78716c] mt-0.5">Automated detection of severity and hazards.</p>
            </div>
          </div>
          
          <div className="flex gap-3 bg-[#161310] border border-[#2a2520] p-4 rounded-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e7e5e4]">Department Routing</h4>
              <p className="text-[11px] text-[#78716c] mt-0.5">Intelligent resolution routing for Indian municipalities.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-[#161310] border border-[#2a2520] p-4 rounded-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <HeartHandshake className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#e7e5e4]">Citizen Rewards</h4>
              <p className="text-[11px] text-[#78716c] mt-0.5">Submit issues to earn profile points and ranks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Inspection Capture Form */}
      <section className="pb-16 border-t border-[#2a2520]">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="px-4 mb-2">
            <h3 className="text-xl font-extrabold text-[#e7e5e4] tracking-tight">Active Reporter Intake</h3>
            <p className="text-xs text-[#78716c]">Provide visual evidence to generate structural metrics instantly.</p>
          </div>
          <ReportForm />
        </div>
      </section>
    </div>
  );
}
