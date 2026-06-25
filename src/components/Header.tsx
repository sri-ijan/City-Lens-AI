import React from "react";
import { Camera, MapPin } from "lucide-react";

export default function Header() {
  return (
    <header
      className="px-5 py-4 flex items-center justify-between"
      style={{ background: "#0f0d0b", borderBottom: "1px solid #2a2520" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "#1c1410", border: "1px solid #3d2e1e" }}
        >
          <Camera className="h-4.5 w-4.5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-stone-100 flex items-center gap-2">
            CityLens
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "#2a1f10", color: "#d97706", border: "1px solid #3d2e1e" }}
            >
              AI
            </span>
          </h1>
          <p className="text-[11px] text-stone-500">See. Report. Resolve.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-stone-400"
          style={{ background: "#161310", border: "1px solid #2a2520" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Civic AI Node Online
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500">
          <MapPin className="h-3 w-3 text-stone-600" />
          India Jurisdiction
        </div>
      </div>
    </header>
  );
}