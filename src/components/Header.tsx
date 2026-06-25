import React from "react";
import { Camera, MapPin, Layers } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950 px-4 py-4 md:px-8 shadow-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              CityLens <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-xs font-semibold text-blue-400">AI</span>
            </h1>
            <p className="text-xs font-medium text-gray-400">See. Report. Resolve.</p>
          </div>
        </div>

        {/* Live stats or status indicator */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1.5 border border-gray-800 text-gray-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Civic AI Node Online</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <MapPin className="h-3.5 w-3.5 text-blue-500" />
            <span>India Jurisdiction</span>
          </div>
        </div>
      </div>
    </header>
  );
}
