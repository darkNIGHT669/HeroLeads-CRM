"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles, Building2, User2, Mail, Phone } from "lucide-react";

export default function LandingPage() {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    contactEmail: "",
    phone: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({ title: "", company: "", contactEmail: "", phone: "" });
      } else {
        const data = await response.json();
        setError(data.error || "Something went wrong. Please check your inputs.");
      }
    } catch (err) {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 py-6 px-6 max-w-7xl mx-auto flex items-center justify-between w-full z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-blue-500 to-violet-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            HeroLeads
          </span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 transition-all font-medium text-sm"
        >
          Sign In to Portal
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero Content + Form Grid */}
      <main className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-24 relative z-10">
        {/* Left Column: Copy */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-center lg:text-left">
          <div className="inline-flex self-center lg:self-start items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Empower Your Sales Process
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
            Scale Your Pipeline with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
              HeroLeads
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
            A premium orchestration engine for modern sales teams. Capture incoming leads, coordinate tasks, log interaction history, and trace status pipelines with zero friction.
          </p>

          <div className="hidden lg:flex flex-col gap-4 mt-4 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <span>Instantly routes captured data to your team</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <span>Granular permission checks and full activity trails</span>
            </div>
          </div>
        </div>

        {/* Right Column: Lead Form Card */}
        <div className="lg:col-span-6 flex justify-center w-full">
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {success ? (
              <div className="flex flex-col items-center justify-center text-center py-8 gap-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100">Submission Received</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Thank you for your interest! A sales specialist from our team will reach out to you shortly.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-6 px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-sm font-medium"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-xl font-bold text-slate-100">Get in Touch</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Submit your details and we will initialize a lead inquiry in our central pipeline.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Input Fields */}
                <div className="flex flex-col gap-4">
                  {/* Inquiry Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Inquiry Title
                    </label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="e.g. Enterprise Cloud License Query"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        name="company"
                        required
                        placeholder="e.g. Acme Corporation"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Contact Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        name="contactEmail"
                        required
                        placeholder="e.g. you@company.com"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        name="phone"
                        required
                        placeholder="e.g. +1 (555) 000-0000"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold text-white text-sm shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {isSubmitting ? "Submitting Inquiry..." : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
