import React from "react";
import { useAuth } from "../hooks/useAuth";
import { AlertTriangle, Copy, Check, Shield, ArrowRight, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AuthErrorModal() {
  const { authError, clearAuthError, loginAsDemo } = useAuth();
  const [copiedDev, setCopiedDev] = React.useState(false);
  const [copiedPre, setCopiedPre] = React.useState(false);

  if (!authError) return null;

  const isUnauthorizedDomain = authError === "unauthorized-domain";

  const devDomain = "ais-dev-trfrykz2oqqgz6tjrceme2-743932252512.asia-east1.run.app";
  const preDomain = "ais-pre-trfrykz2oqqgz6tjrceme2-743932252512.asia-east1.run.app";

  const copyToClipboard = (text: string, type: "dev" | "pre") => {
    navigator.clipboard.writeText(text);
    if (type === "dev") {
      setCopiedDev(true);
      setTimeout(() => setCopiedDev(false), 2000);
    } else {
      setCopiedPre(true);
      setTimeout(() => setCopiedPre(false), 2000);
    }
    toast.success("Domain copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#161310] border border-[#2a2520] rounded-2xl shadow-2xl p-6 overflow-hidden md:p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top orange gradient boundary */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700" />

        {/* Close Button */}
        <button 
          onClick={clearAuthError}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 p-1.5 rounded-lg hover:bg-stone-900 transition-colors"
          title="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        {isUnauthorizedDomain ? (
          <div>
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-stone-200">Firebase Authorization Required</h3>
                <p className="text-xs text-[#78716c]">auth/unauthorized-domain detected</p>
              </div>
            </div>

            <p className="text-sm text-stone-300 mb-5 leading-relaxed">
              Google Sign-In is failing because the preview environment's host domains are not whitelisted in your Firebase console settings.
            </p>

            {/* Instruction block */}
            <div className="bg-[#0f0d0b] border border-[#2a2520] rounded-xl p-4.5 mb-6 text-xs flex flex-col gap-4">
              <div>
                <p className="font-bold text-[#e7e5e4] mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">1</span>
                  Whitelisted Domains (Copy these):
                </p>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between gap-2 bg-[#161310] border border-[#2a2520] p-2.5 rounded-lg">
                    <code className="font-mono text-[11px] text-amber-500 break-all">{devDomain}</code>
                    <button
                      onClick={() => copyToClipboard(devDomain, "dev")}
                      className="flex items-center gap-1 bg-[#0f0d0b] hover:bg-stone-900 border border-[#2a2520] px-2 py-1 rounded text-[10px] text-stone-400 font-semibold transition-all shrink-0"
                    >
                      {copiedDev ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-[#161310] border border-[#2a2520] p-2.5 rounded-lg">
                    <code className="font-mono text-[11px] text-amber-500 break-all">{preDomain}</code>
                    <button
                      onClick={() => copyToClipboard(preDomain, "pre")}
                      className="flex items-center gap-1 bg-[#0f0d0b] hover:bg-stone-900 border border-[#2a2520] px-2 py-1 rounded text-[10px] text-stone-400 font-semibold transition-all shrink-0"
                    >
                      {copiedPre ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2a2520]/60 pt-4">
                <p className="font-bold text-[#e7e5e4] mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">2</span>
                  Update Firebase Console:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-stone-400 leading-relaxed">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-semibold">Firebase Console</a></li>
                  <li>Select your project <strong className="font-semibold text-stone-200">citylens-ai-2b97e</strong></li>
                  <li>Navigate to <strong className="font-semibold text-stone-200">Build &gt; Authentication &gt; Settings &gt; Authorized domains</strong></li>
                  <li>Click <strong className="font-semibold text-[#e7e5e4]">Add domain</strong>, paste each domain from above, and save.</li>
                </ol>
              </div>
            </div>

            {/* Quick Demo Bypass option */}
            <div className="bg-amber-600/5 border border-amber-600/25 p-4 rounded-xl mb-6">
              <h4 className="text-sm font-bold text-[#e7e5e4] flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                <span>Bypass & Test Instantly?</span>
              </h4>
              <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                If you don't have access to the Firebase console right now, you can activate <strong className="text-stone-300 font-semibold">Demo Citizen Mode</strong> instead. This creates a fully functional simulated profile allowing you to upvote reports, claim GreenCoins, and test all civic flows.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#2a2520] pt-4.5">
              <button
                type="button"
                onClick={clearAuthError}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2a2520] hover:bg-stone-900 text-stone-300 font-bold text-xs transition-colors"
              >
                Close & Configure Later
              </button>
              
              <button
                type="button"
                onClick={loginAsDemo}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 border border-amber-500/10"
              >
                <Shield className="h-4 w-4" />
                <span>Enter Demo Citizen Mode</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-stone-200">Authentication Error</h3>
                <p className="text-xs text-[#78716c]">Unexpected login failure</p>
              </div>
            </div>

            <p className="text-sm text-stone-300 mb-6 leading-relaxed bg-[#0f0d0b] border border-[#2a2520] p-4 rounded-xl font-mono">
              {authError}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#2a2520] pt-4.5">
              <button
                type="button"
                onClick={clearAuthError}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2a2520] hover:bg-stone-900 text-stone-300 font-bold text-xs transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={loginAsDemo}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Shield className="h-4 w-4" />
                <span>Enter Demo Citizen Mode</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
