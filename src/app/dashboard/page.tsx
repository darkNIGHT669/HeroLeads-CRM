"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  Sparkles,
  ShieldAlert,
  LogOut,
  Search,
  Filter,
  User,
  Plus,
  Trash2,
  FileText,
  UserCheck,
  Calendar,
  MessageSquare,
  History,
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building,
  Mail,
  Phone,
  Clock
} from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}

interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  author: UserInfo;
}

interface LeadActivity {
  id: string;
  actionType: string;
  metadataJson: string;
  createdAt: string;
  actor: UserInfo | null;
}

interface LeadDetail {
  id: string;
  title: string;
  company: string;
  contactEmail: string;
  phone: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "WON";
  assignedToId: string | null;
  assignedTo: UserInfo | null;
  createdAt: string;
  updatedAt: string;
  notes: LeadNote[];
  activities: LeadActivity[];
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [leads, setLeads] = useState<LeadDetail[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [usersList, setUsersList] = useState<UserInfo[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Filter and Query States
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Lead (Details Sidebar) State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Create Lead Modal State (Admin Only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: "",
    company: "",
    contactEmail: "",
    phone: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  // Stat Counters
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    won: 0,
  });

  // Fetch Leads List
  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoadingLeads(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(assigneeFilter && { assignedTo: assigneeFilter }),
        ...(searchQuery && { q: searchQuery }),
      });

      const response = await fetch(`/api/v1/leads?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads);
        setTotalLeads(data.meta.total);
        setTotalPages(data.meta.totalPages);
        
        // Calculate dynamic stats from response and database
        // (For real time stats, we can fetch all leads or calculate based on loaded database data. 
        // We'll compute dashboard metrics based on filtered or general database overview)
      }
    } catch (e) {
      console.error("Error fetching leads:", e);
    } finally {
      setLoadingLeads(false);
    }
  }, [user, page, limit, statusFilter, assigneeFilter, searchQuery]);

  // Fetch Users List (for Assignment filter/dropdown - Admin Only)
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/v1/users");
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users);
      }
    } catch (e) {
      console.error("Error fetching users list:", e);
    }
  };

  // Fetch Stats Overview
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch full count details (we query page=1, limit=1000 temporarily to compile accurate dashboard stats card sums)
      const response = await fetch(`/api/v1/leads?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const allLeads = data.leads as LeadDetail[];
        setStats({
          total: allLeads.length,
          new: allLeads.filter((l) => l.status === "NEW").length,
          contacted: allLeads.filter((l) => l.status === "CONTACTED").length,
          qualified: allLeads.filter((l) => l.status === "QUALIFIED").length,
          won: allLeads.filter((l) => l.status === "WON").length,
        });
      }
    } catch (e) {
      console.error("Error compilation stats:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchStats();
      if (user.role === "ADMIN") {
        fetchUsers();
      }
    }
  }, [user, fetchLeads, fetchStats]);

  // Fetch Selected Lead Detail
  const fetchLeadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/v1/leads/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedLead(data);
      } else {
        setSelectedLead(null);
        setSelectedLeadId(null);
      }
    } catch (e) {
      console.error("Error fetching lead detail:", e);
      setSelectedLead(null);
      setSelectedLeadId(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetail(selectedLeadId);
    } else {
      setSelectedLead(null);
    }
  }, [selectedLeadId, fetchLeadDetail]);

  // Handle Note Submit
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedLeadId) return;
    setSubmittingNote(true);

    try {
      const response = await fetch(`/api/v1/leads/${selectedLeadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (response.ok) {
        setNewNoteContent("");
        // Reload details to capture new note and activity log
        await fetchLeadDetail(selectedLeadId);
        fetchLeads();
      }
    } catch (e) {
      console.error("Error adding note:", e);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Status Update (Client + Server Action)
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchLeads();
        fetchStats();
        if (selectedLeadId === leadId) {
          fetchLeadDetail(leadId);
        }
      }
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  // Handle Assignee Update (Admin Only)
  const handleAssigneeChange = async (leadId: string, assigneeId: string | null) => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: assigneeId }),
      });

      if (response.ok) {
        fetchLeads();
        if (selectedLeadId === leadId) {
          fetchLeadDetail(leadId);
        }
      }
    } catch (e) {
      console.error("Error assigning lead:", e);
    }
  };

  // Handle Lead Deletion (Admin Only)
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead? This action is permanent and cannot be undone.")) return;

    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSelectedLeadId(null);
        setSelectedLead(null);
        fetchLeads();
        fetchStats();
      }
    } catch (e) {
      console.error("Error deleting lead:", e);
    }
  };

  // Handle Lead Creation (Admin Only)
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setCreateError("");

    try {
      const response = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({ title: "", company: "", contactEmail: "", phone: "" });
        fetchLeads();
        fetchStats();
      } else {
        const data = await response.json();
        setCreateError(data.error || "Failed to create lead.");
      }
    } catch (err) {
      setCreateError("Connection error. Please try again.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const parseActivityMeta = (activity: LeadActivity) => {
    try {
      const meta = JSON.parse(activity.metadataJson);
      const actorName = activity.actor?.name || "System";

      switch (activity.actionType) {
        case "LEAD_CREATED":
          return `${meta.message || "Lead was added to central records."}`;
        case "STATUS_CHANGE":
          return `Status updated from ${meta.oldStatus} to ${meta.newStatus} by ${actorName}`;
        case "ASSIGNED":
          return `Assigned to ${meta.assignedTo} by ${actorName}`;
        case "NOTE_ADDED":
          return `New discussion note appended by ${actorName}`;
        default:
          return `${activity.actionType} triggered by ${actorName}`;
      }
    } catch (e) {
      return `${activity.actionType} event logged.`;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium tracking-wide">Validating session permissions...</span>
      </div>
    );
  }

  if (!user) return null; // Router redirect handled by middleware

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-violet-600 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              HeroLeads
            </span>
          </Link>
          <div className="h-4 w-px bg-slate-800 hidden sm:block" />
          <div className="items-center gap-2 hidden sm:flex text-slate-400 text-xs">
            <span className="font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-300">
              {user.role}
            </span>
            <span>logged in as <b>{user.name}</b> ({user.email})</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-850 hover:text-white transition-all text-xs font-semibold text-slate-400 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace content */}
        <main className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-8">
          
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">CRM Dashboard</h1>
              <p className="text-slate-500 text-xs mt-1">
                {user.role === "ADMIN" 
                  ? "Global control center. Overlook incoming inquiries, statuses, assignments, and audit logs." 
                  : "Member viewport. Manage leads assigned to you, update statuses, and log discussion progress."
                }
              </p>
            </div>

            {user.role === "ADMIN" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-xs shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Capture Lead Manually
              </button>
            )}
          </div>

          {/* Stats Overview row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Leads</span>
              <p className="text-2xl font-black mt-1 text-slate-100">{stats.total}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">New</span>
              <p className="text-2xl font-black mt-1 text-blue-400">{stats.new}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Contacted</span>
              <p className="text-2xl font-black mt-1 text-amber-500">{stats.contacted}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Qualified</span>
              <p className="text-2xl font-black mt-1 text-indigo-400">{stats.qualified}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Won</span>
              <p className="text-2xl font-black mt-1 text-emerald-400">{stats.won}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/30 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                <input
                  type="text"
                  placeholder="Search company, contact..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-44">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-650" />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-400 outline-none appearance-none cursor-pointer focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="LOST">Lost</option>
                  <option value="WON">Won</option>
                </select>
              </div>

              {/* Assignee Filter (Admin Only) */}
              {user.role === "ADMIN" && (
                <div className="relative w-full sm:w-44">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-650" />
                  <select
                    value={assigneeFilter}
                    onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-400 outline-none appearance-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="">All Assignees</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => { setStatusFilter(""); setAssigneeFilter(""); setSearchQuery(""); setPage(1); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-350 shrink-0 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* Leads Table Card */}
          <div className="border border-slate-900 rounded-xl bg-slate-950/20 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/60 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Inquiry / Company</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Owner / Assignee</th>
                    <th className="px-6 py-4">Submission Date</th>
                    {user.role === "ADMIN" && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-xs">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan={6} className="py-24 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        Loading lead data...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-24 text-center text-slate-550">
                        No leads found matching current filter scope.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`hover:bg-slate-900/30 cursor-pointer transition-colors ${
                          selectedLeadId === lead.id ? "bg-blue-500/5 hover:bg-blue-500/5" : ""
                        }`}
                      >
                        {/* Title & Company */}
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-100">{lead.title}</p>
                          <p className="text-slate-550 text-[11px] mt-0.5">{lead.company}</p>
                        </td>

                        {/* Contact Email & Phone */}
                        <td className="px-6 py-4">
                          <p className="text-slate-300">{lead.contactEmail}</p>
                          <p className="text-slate-550 text-[11px] mt-0.5">{lead.phone}</p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`rounded-lg py-1 px-2 border text-[10px] font-bold uppercase tracking-wider outline-none appearance-none cursor-pointer bg-slate-950 ${
                              lead.status === "NEW"
                                ? "border-blue-500/20 text-blue-400"
                                : lead.status === "CONTACTED"
                                ? "border-amber-500/20 text-amber-500"
                                : lead.status === "QUALIFIED"
                                ? "border-indigo-500/20 text-indigo-400"
                                : lead.status === "LOST"
                                ? "border-rose-500/20 text-rose-400"
                                : "border-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="LOST">Lost</option>
                            <option value="WON">Won</option>
                          </select>
                        </td>

                        {/* Owner / Assignee */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {user.role === "ADMIN" ? (
                            <select
                              value={lead.assignedToId || ""}
                              onChange={(e) => handleAssigneeChange(lead.id, e.target.value || null)}
                              className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg py-1 px-2 text-[11px] text-slate-400 outline-none cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {usersList.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {lead.assignedTo ? lead.assignedTo.name : "Unassigned"}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-slate-450">
                          {new Date(lead.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>

                        {/* Admin Action */}
                        {user.role === "ADMIN" && (
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-slate-600 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {!loadingLeads && totalLeads > 0 && (
              <div className="border-t border-slate-900 bg-slate-950/20 px-6 py-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Showing <b>{(page - 1) * limit + 1}</b> to{" "}
                  <b>{Math.min(page * limit, totalLeads)}</b> of <b>{totalLeads}</b> leads
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 px-3">
                    Page <b>{page}</b> of <b>{totalPages}</b>
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Selected Lead Side Panel */}
        {selectedLeadId && (
          <aside className="w-96 border-l border-slate-900 bg-slate-950 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            {/* Sidebar header */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Dossier</span>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="text-xs font-semibold text-slate-650 hover:text-slate-350 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

            {loadingDetail || !selectedLead ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mb-2" />
                <span className="text-xs">Accessing lead records...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-slate-900/60">
                {/* Profile Card */}
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold leading-tight">{selectedLead.title}</h3>
                    <p className="text-blue-400 font-semibold text-xs mt-1">{selectedLead.company}</p>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-650" />
                      <span>{selectedLead.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-650" />
                      <span>{selectedLead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-650" />
                      <span>
                        Created:{" "}
                        {new Date(selectedLead.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status & Assignment selectors */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-1">
                        Pipeline Status
                      </span>
                      <select
                        value={selectedLead.status}
                        onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="LOST">Lost</option>
                        <option value="WON">Won</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-1">
                        Lead Owner
                      </span>
                      {user.role === "ADMIN" ? (
                        <select
                          value={selectedLead.assignedToId || ""}
                          onChange={(e) => handleAssigneeChange(selectedLead.id, e.target.value || null)}
                          className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-300 outline-none cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {usersList.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="bg-slate-900 border border-slate-900 px-2.5 py-1 text-xs text-slate-400 rounded-lg">
                          {selectedLead.assignedTo ? selectedLead.assignedTo.name : "Unassigned"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discussion Notes Section */}
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-slate-350">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-xs uppercase tracking-wider">Discussion Notes</span>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                    <textarea
                      placeholder="Type a note (update details, logs, next steps)..."
                      required
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-300 placeholder:text-slate-650 outline-none resize-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submittingNote}
                      className="self-end px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {submittingNote ? "Saving Note..." : "Add Note"}
                    </button>
                  </form>

                  {/* Notes Timeline */}
                  <div className="flex flex-col gap-4 mt-2">
                    {selectedLead.notes.length === 0 ? (
                      <span className="text-xs text-slate-550 text-center py-4">
                        No team notes logged yet.
                      </span>
                    ) : (
                      selectedLead.notes.map((note) => (
                        <div key={note.id} className="p-3.5 rounded-lg bg-slate-900/40 border border-slate-900 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-400">
                              {note.author.name} ({note.author.role})
                            </span>
                            <span>
                              {new Date(note.createdAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Activity Trail Section */}
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-slate-350">
                    <History className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-xs uppercase tracking-wider">Activity Trail</span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {selectedLead.activities.length === 0 ? (
                      <span className="text-xs text-slate-550 text-center py-4">
                        No operations logged yet.
                      </span>
                    ) : (
                      selectedLead.activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <div className="p-1 rounded-full bg-slate-900 border border-slate-850 text-slate-500">
                              <ActivityIcon className="w-3 h-3" />
                            </div>
                            <div className="flex-1 w-px bg-slate-900 my-1" />
                          </div>
                          <div className="flex flex-col gap-1 pb-2">
                            <p className="text-slate-300 leading-tight">
                              {parseActivityMeta(activity)}
                            </p>
                            <span className="text-[10px] text-slate-550">
                              {new Date(activity.createdAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Manual Creation Dialog (Admin Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="text-lg font-bold text-slate-100">Capture New Lead</h3>
              <p className="text-slate-500 text-xs">
                Creates a new inquiry records and inserts a default NEW status stage.
              </p>
            </div>

            {createError && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLeadSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Inquiry Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP Implementation consultation"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={createFormData.company}
                  onChange={(e) => setCreateFormData({ ...createFormData, company: e.target.value })}
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. customer@acme.com"
                  value={createFormData.contactEmail}
                  onChange={(e) => setCreateFormData({ ...createFormData, contactEmail: e.target.value })}
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1-555-1234"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800/60 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
                >
                  {submittingCreate ? "Saving Lead..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
