import React, { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { CivicAnalysis } from "../services/geminiService";
import { MapPin, User, Tag, AlertTriangle, ShieldAlert, CheckCircle, Clock } from "lucide-react";

interface ReportDocument {
  id: string;
  analysis: CivicAnalysis;
  landmark: string;
  reporterName: string;
  createdAt: string;
  status: "Pending" | "In Progress" | "Resolved";
  upvotes?: number;
  reporterUid?: string | null;
  coordinates?: {
    lat: number;
    lng: number;
    address: string;
  };
}

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  "AIzaSyDu_ofjnm8vm7hWXrF_SI1nxVbblXi1sHI";

const containerStyle = {
  width: "100%",
  height: "calc(100vh - 180px)",
  minHeight: "500px",
  borderRadius: "0.75rem",
};

const center = {
  lat: 20.5937,
  lng: 78.9629,
};

const mapOptions = {
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1a1612" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#78716c" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f0d0b" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2520" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0908" }] }
  ],
  disableDefaultUI: false,
  zoomControl: true,
};

const getMarkerIcon = (severity: "Low" | "Medium" | "High" | "Critical" | string) => {
  let color = "#78716c"; // Low - stone/gray
  if (severity === "Critical") color = "#ef4444"; // red
  else if (severity === "High") color = "#f97316"; // orange
  else if (severity === "Medium") color = "#eab308"; // amber

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path fill="${color}" stroke="#0f0d0b" stroke-width="1.5" d="M15 3C8.4 3 3 8.4 3 15c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12zm0 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export default function MapPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Subscribe to all reports in real time from Firestore
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
            coordinates: data.coordinates || undefined,
          });
        });
        setReports(reportsList);
        setIsLoadingReports(false);
      },
      (error) => {
        console.error("Error loading reports for map:", error);
        setIsLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter out reports that do not have coordinates
  const validReports = reports.filter(
    (r) => r.coordinates && typeof r.coordinates.lat === "number" && typeof r.coordinates.lng === "number"
  );

  if (loadError) {
    return (
      <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen py-12 flex items-center justify-center">
        <div className="bg-[#161310] border border-[#2a2520] p-8 rounded-2xl max-w-md text-center shadow-xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Google Maps Load Failure</h2>
          <p className="text-xs text-[#78716c] leading-relaxed mb-4">
            Could not initialize the Google Maps library. Check your network or verify your API key configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0d0b] text-[#e7e5e4] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col gap-6">
        
        {/* Page header and summary */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2a2520] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#e7e5e4]">Civic Issues Geospatial Map</h1>
            <p className="text-xs text-[#78716c] mt-1">
              Visualize hazards, defects, and reported issues across Indian cities in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#161310] border border-[#2a2520] px-4 py-2.5 rounded-xl text-xs shrink-0">
            <MapPin className="h-4.5 w-4.5 text-amber-500" />
            <span className="font-semibold text-stone-300">
              {validReports.length} of {reports.length} reports plotted
            </span>
          </div>
        </div>

        {/* Map Stage container */}
        <div className="relative overflow-hidden border border-[#2a2520] rounded-xl bg-[#161310]">
          
          {!isLoaded || isLoadingReports ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#161310]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mb-3" />
              <p className="text-xs text-[#78716c]">Loading map layers & database coordinates...</p>
            </div>
          ) : null}

          {isLoaded && (
            <div className="relative">
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={5}
                options={mapOptions}
              >
                {validReports.map((report) => (
                  <Marker
                    key={report.id}
                    position={{
                      lat: report.coordinates!.lat,
                      lng: report.coordinates!.lng,
                    }}
                    icon={getMarkerIcon(report.analysis?.severity)}
                    onClick={() => setSelectedReport(report)}
                  />
                ))}

                {selectedReport && selectedReport.coordinates && (
                  <InfoWindow
                    position={{
                      lat: selectedReport.coordinates.lat,
                      lng: selectedReport.coordinates.lng,
                    }}
                    onCloseClick={() => setSelectedReport(null)}
                  >
                    <div className="p-3 max-w-[280px] bg-[#161310] text-[#e7e5e4] rounded-lg border border-[#2a2520] text-xs leading-relaxed font-sans">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-extrabold text-stone-200 text-sm tracking-tight line-clamp-2">
                          {selectedReport.analysis?.title || "Reported Issue"}
                        </span>
                        
                        {/* Status tag */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                          selectedReport.status === "Resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : selectedReport.status === "In Progress"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-stone-500/10 text-stone-400 border-stone-500/20"
                        }`}>
                          {selectedReport.status}
                        </span>
                      </div>

                      {/* Meta information tags */}
                      <div className="space-y-1.5 border-t border-[#2a2520]/60 pt-2 text-[#a8a29e]">
                        <p className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-[#e7e5e4]">Category:</span>
                          <span>{selectedReport.analysis?.category || "Other"}</span>
                        </p>

                        <p className="flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-[#e7e5e4]">Severity:</span>
                          <span className={`font-bold ${
                            selectedReport.analysis?.severity === "Critical"
                              ? "text-red-500"
                              : selectedReport.analysis?.severity === "High"
                              ? "text-orange-500"
                              : selectedReport.analysis?.severity === "Medium"
                              ? "text-amber-500"
                              : "text-stone-400"
                          }`}>
                            {selectedReport.analysis?.severity || "Low"}
                          </span>
                        </p>

                        <p className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-semibold text-[#e7e5e4] shrink-0">Location:</span>
                          <span className="line-clamp-2">{selectedReport.landmark}</span>
                        </p>

                        <p className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#78716c] shrink-0" />
                          <span className="font-semibold text-[#e7e5e4]">Reporter:</span>
                          <span>{selectedReport.reporterName}</span>
                        </p>
                      </div>

                      {selectedReport.analysis?.department && (
                        <div className="mt-3 bg-[#0f0d0b] border border-[#2a2520] p-2 rounded text-[10px] text-[#78716c]">
                          <span className="font-bold text-[#e7e5e4] block mb-0.5">Assigned Ward:</span>
                          {selectedReport.analysis.department}
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              {/* Custom Map Legend (bottom-left overlay) */}
              <div className="absolute bottom-6 left-6 z-10 bg-[#161310]/95 backdrop-blur-sm border border-[#2a2520] px-4 py-3 rounded-xl shadow-2xl flex flex-col gap-2 max-w-[180px]">
                <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider mb-1">Severity Legend</span>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-3 w-3 rounded-full bg-red-500 border border-black/40 shrink-0" />
                  <span className="font-medium text-stone-300">Critical</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-3 w-3 rounded-full bg-orange-500 border border-black/40 shrink-0" />
                  <span className="font-medium text-stone-300">High</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-3 w-3 rounded-full bg-amber-500 border border-black/40 shrink-0" />
                  <span className="font-medium text-stone-300">Medium</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-3 w-3 rounded-full bg-stone-500 border border-black/40 shrink-0" />
                  <span className="font-medium text-stone-300">Low</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
