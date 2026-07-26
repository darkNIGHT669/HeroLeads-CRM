"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Sparkles, Mail, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const result = await login(email, password);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Invalid credentials");
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (role: "admin" | "member") => {
    if (role === "admin") {
      setEmail("admin@example.com");
      setPassword("password123");
    } else {
      setEmail("member@example.com");
      setPassword("password123");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 py-6 px-6 max-w-7xl mx-auto flex items-center justify-between w-full z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-blue-500 to-violet-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            HeroLeads
          </span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-2xl z-10 relative">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 text-center">
            <h2 className="text-2xl font-bold text-slate-100">Sign In to Dashboard</h2>
            <p className="text-slate-500 text-xs">
              Provide credentials to access CRM pipelines and lead lifecycle controls.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-12 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold text-white text-sm shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {isSubmitting ? "Authenticating..." : "Sign In"}
          </button>

          {/* Quick-fill Demonstration accounts */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-slate-500 text-center uppercase tracking-wider">
              Or Quick fill Demo Credentials
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="py-2 px-3 border border-slate-800 hover:border-blue-500 bg-slate-950 hover:bg-slate-900 rounded-lg flex flex-col items-center gap-1 transition-all group"
              >
                <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-bold uppercase tracking-wide">
                  Admin Role
                </span>
                <span className="text-[10px] text-slate-500">Full Access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("member")}
                className="py-2 px-3 border border-slate-800 hover:border-violet-500 bg-slate-950 hover:bg-slate-900 rounded-lg flex flex-col items-center gap-1 transition-all group"
              >
                <span className="text-[10px] text-violet-400 group-hover:text-violet-300 font-bold uppercase tracking-wide">
                  Member Role
                </span>
                <span className="text-[10px] text-slate-500">Assigned Leads</span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
