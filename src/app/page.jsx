"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileText,
  Mail,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  Settings2,
  Paperclip,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Check,
  ChevronDown,
  Info,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function EmailDashboard() {
  const [records, setRecords] = useState([
    {
      id: "rec_demo_1",
      recipient_email: "alex.turner@example.com",
      subject: "Monthly Statement - October 2026",
      message: "Hi Alex, please find your monthly summary statement attached.",
      attachment_path: "/invoices/2026/alex_october_invoice.pdf",
      extra_fields: { name: "Alex Turner", account_no: "ACC-8921" },
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    },
    {
      id: "rec_demo_2",
      recipient_email: "sarah.jenkins@acmecorp.io",
      subject: "Contract Agreement & Verification",
      message: "Dear Sarah, attached is the revised NDA and service contract.",
      attachment_path: "https://example.com/docs/signed_contract.pdf",
      extra_fields: { name: "Sarah Jenkins", company: "Acme Corp" },
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    },
    {
      id: "rec_demo_3",
      recipient_email: "billing@globex.org",
      subject: "Payment Reminder #542",
      message: "Hello team, kindly process invoice #542 due on October 30.",
      attachment_path: "/receipts/globex_542.pdf",
      extra_fields: { name: "Globex Accounts", po_number: "PO-7741" },
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    },
  ]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, sent, failed

  // Common template options
  const [useCommonBody, setUseCommonBody] = useState(false);
  const [commonSubject, setCommonSubject] = useState("Important Notice: Update on your account");
  const [commonBody, setCommonBody] = useState("Dear {name},\n\nPlease find your official documents attached below.\n\nThank you,\nClient Dispatch Team");

  // Provider configuration
  const [provider, setProvider] = useState("simulation"); // simulation, resend, smtp
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [resendKey, setResendKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("onboarding@resend.dev");
  const [smtpSettings, setSmtpSettings] = useState({
    host: "smtp.gmail.com",
    port: "587",
    user: "",
    pass: "",
  });

  // Manual Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    recipient_email: "",
    subject: "",
    message: "",
    attachment_path: "",
    extra_name: "",
    extra_field1: "",
  });

  // Batch progress
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef(null);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const sent = records.filter((r) => r.status === "sent").length;
    const failed = records.filter((r) => r.status === "failed").length;
    const pending = records.filter((r) => r.status === "pending").length;
    return { total, sent, failed, pending };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.attachment_path && r.attachment_path.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  // Handle XML File Upload
  const handleXmlUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/parse-xml", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to parse XML");
        return;
      }

      setRecords((prev) => [...json.records, ...prev]);
      alert(`Success! Imported ${json.count} email records from ${file.name}`);
    } catch (err) {
      alert("Error uploading file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download Sample XML
  const downloadSampleXml = () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<email_batch>
  <record>
    <email>customer1@example.com</email>
    <subject>Your Invoice #1001</subject>
    <message>Thank you for your business. Please see invoice attached.</message>
    <attachment_path>/attachments/invoices/inv_1001.pdf</attachment_path>
    <name>John Doe</name>
    <invoice_no>INV-1001</invoice_no>
  </record>
  <record>
    <email>customer2@company.org</email>
    <subject>Account Statement for October</subject>
    <message>Hello, attached is your updated statement of account.</message>
    <attachment_path>https://yourdomain.com/statements/october.pdf</attachment_path>
    <name>Alice Smith</name>
    <invoice_no>INV-1002</invoice_no>
  </record>
</email_batch>`;

    const blob = new Blob([sample], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_email_batch.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export records as CSV
  const exportCsv = () => {
    const headers = ["ID", "Email", "Subject", "Status", "Attachment", "Status Message", "Created At"];
    const rows = records.map((r) => [
      r.id,
      `"${r.recipient_email}"`,
      `"${(r.subject || "").replace(/"/g, '""')}"`,
      r.status,
      `"${(r.attachment_path || "").replace(/"/g, '""')}"`,
      `"${(r.status_message || "").replace(/"/g, '""')}"`,
      r.created_at,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email_dispatch_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Manual Add / Edit
  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        recipient_email: record.recipient_email,
        subject: record.subject,
        message: record.message,
        attachment_path: record.attachment_path,
        extra_name: record.extra_fields?.name || "",
        extra_field1: record.extra_fields?.note || "",
      });
    } else {
      setEditingRecord(null);
      setFormData({
        recipient_email: "",
        subject: "",
        message: "",
        attachment_path: "",
        extra_name: "",
        extra_field1: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.recipient_email.trim()) return;

    if (editingRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                recipient_email: formData.recipient_email,
                subject: formData.subject,
                message: formData.message,
                attachment_path: formData.attachment_path,
                extra_fields: {
                  ...r.extra_fields,
                  name: formData.extra_name,
                  note: formData.extra_field1,
                },
              }
            : r
        )
      );
    } else {
      const newRec = {
        id: `rec_manual_${Date.now()}`,
        recipient_email: formData.recipient_email,
        subject: formData.subject || "Notification",
        message: formData.message,
        attachment_path: formData.attachment_path,
        extra_fields: {
          name: formData.extra_name,
          note: formData.extra_field1,
        },
        status: "pending",
        status_message: "",
        created_at: new Date().toISOString(),
      };
      setRecords((prev) => [newRec, ...prev]);
    }
    setShowModal(false);
  };

  const deleteRecord = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Send batch function
  const triggerSend = async (targetRecords) => {
    if (targetRecords.length === 0) return;
    setIsSending(true);
    setSendProgress({ current: 0, total: targetRecords.length });

    // Mark as sending in UI
    const targetIds = new Set(targetRecords.map((r) => r.id));
    setRecords((prev) =>
      prev.map((r) => (targetIds.has(r.id) ? { ...r, status: "sending", status_message: "Dispatching..." } : r))
    );

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: targetRecords,
          provider,
          resendApiKey: resendKey,
          fromEmail: resendFromEmail,
          smtpConfig: provider === "smtp" ? smtpSettings : null,
          useCommonBody,
          commonSubject,
          commonBodyTemplate: commonBody,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Sending failed");
        setRecords((prev) =>
          prev.map((r) =>
            targetIds.has(r.id) ? { ...r, status: "failed", status_message: json.error || "Failed" } : r
          )
        );
        return;
      }

      // Update records with returned results
      const resultsMap = new Map();
      json.results.forEach((res) => resultsMap.set(res.id, res));

      setRecords((prev) =>
        prev.map((r) => {
          if (resultsMap.has(r.id)) {
            const result = resultsMap.get(r.id);
            return {
              ...r,
              status: result.status,
              status_message: result.status_message,
              sent_at: result.sent_at,
            };
          }
          return r;
        })
      );

      // Trigger celebratory confetti on completion
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      alert("Error sending emails: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 glass-panel sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">XML Dispatch Pro</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30">
                  Live Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">XML Email Batch Ingest, Common Templates & High Deliverability Dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Provider Switcher Badge */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 transition-all hover:border-slate-600"
            >
              <span className={`w-2 h-2 rounded-full ${provider === "simulation" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              <span>Gateway: <strong className="text-white capitalize">{provider === "simulation" ? "Simulator (Free Demo)" : provider}</strong></span>
              <Sliders className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            <button
              onClick={downloadSampleXml}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-all"
              title="Download sample XML to test"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>Sample XML</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">Imported in list</div>
            <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-amber-900/20 bg-amber-950/10 relative overflow-hidden">
            <div className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Pending Send</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats.pending}</div>
            <div className="text-[11px] text-amber-400/70 mt-1">Ready in queue</div>
            <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-emerald-900/20 bg-emerald-950/10 relative overflow-hidden">
            <div className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider">Delivered</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.sent}</div>
            <div className="text-[11px] text-emerald-400/70 mt-1">Confirmed sent</div>
            <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-rose-900/20 bg-rose-950/10 relative overflow-hidden">
            <div className="text-xs font-medium text-rose-400/90 uppercase tracking-wider">Failed / Errors</div>
            <div className="text-2xl font-bold text-rose-300 mt-1">{stats.failed}</div>
            <div className="text-[11px] text-rose-400/70 mt-1">Requires review</div>
            <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Common Email Body / Template Configuration Box */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Common Email Body & Template Mode</h2>
              <span className="text-[11px] text-slate-400 ml-1">
                (Override individual XML body with one unified message)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCommonBody}
                onChange={(e) => setUseCommonBody(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              <span className="ml-2.5 text-xs font-medium text-slate-300">
                {useCommonBody ? "Enabled (Using Template)" : "Disabled (Use XML Message)"}
              </span>
            </label>
          </div>

          {useCommonBody && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Common Subject Line</label>
                <input
                  type="text"
                  value={commonSubject}
                  onChange={(e) => setCommonSubject(e.target.value)}
                  placeholder="e.g. Monthly Statement for {name}"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">Insert tag:</span>
                  {["{name}", "{email}", "{attachment}"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCommonSubject((prev) => prev + " " + tag)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-brand-300 px-2 py-0.5 rounded transition"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Common Email Body</label>
                <textarea
                  rows={3}
                  value={commonBody}
                  onChange={(e) => setCommonBody(e.target.value)}
                  placeholder="Enter common email content..."
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left Actions: Upload & Add */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xml"
              onChange={(e) => handleXmlUpload(e.target.files?.[0])}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? "Parsing XML..." : "Upload XML File"}</span>
            </button>

            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:border-slate-600"
            >
              <Plus className="w-4 h-4 text-brand-400" />
              <span>Manual Entry</span>
            </button>

            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {records.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all records?")) {
                    setRecords([]);
                    setSelectedIds(new Set());
                  }
                }}
                className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 transition"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Right Actions: Filters & Send Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search email, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-44 sm:w-56"
              />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Only</option>
              <option value="sent">Sent Only</option>
              <option value="failed">Failed Only</option>
            </select>

            {/* Send Action */}
            <button
              onClick={() => {
                const target =
                  selectedIds.size > 0
                    ? records.filter((r) => selectedIds.has(r.id))
                    : records.filter((r) => r.status === "pending");
                triggerSend(target);
              }}
              disabled={isSending || records.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? "animate-pulse" : ""}`} />
              <span>
                {isSending
                  ? "Dispatching..."
                  : selectedIds.size > 0
                  ? `Send Selected (${selectedIds.size})`
                  : `Send All Pending (${stats.pending})`}
              </span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Message Body</th>
                  <th className="py-3.5 px-4">Attachment</th>
                  <th className="py-3.5 px-4">Custom Fields</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-medium">No email records found</p>
                        <p className="text-xs text-slate-500">
                          Upload an XML file or click "Manual Entry" above to add emails.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isSelected = selectedIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-brand-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{r.recipient_email}</span>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {useCommonBody ? (
                            <span className="text-brand-300 font-medium italic">
                              [Common] {commonSubject || "(Empty subject)"}
                            </span>
                          ) : (
                            r.subject || <span className="text-slate-500 italic">No subject</span>
                          )}
                        </td>

                        {/* Message Preview */}
                        <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={r.message}>
                          {useCommonBody ? (
                            <span className="text-brand-300/80 italic">[Common Template applied]</span>
                          ) : (
                            r.message || <span className="text-slate-500 italic">Empty body</span>
                          )}
                        </td>

                        {/* Attachment */}
                        <td className="py-3 px-4 text-slate-300">
                          {r.attachment_path ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 max-w-[180px] truncate"
                              title={r.attachment_path}
                            >
                              <Paperclip className="w-3 h-3 text-brand-400 shrink-0" />
                              <span className="truncate">{r.attachment_path.split("/").pop()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">None</span>
                          )}
                        </td>

                        {/* Extra Fields */}
                        <td className="py-3 px-4">
                          {r.extra_fields && Object.keys(r.extra_fields).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(r.extra_fields).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                                >
                                  {k}: <strong className="text-slate-300">{String(v)}</strong>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {r.status === "sent" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[10px] border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Sent
                            </span>
                          )}
                          {r.status === "sending" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium text-[10px] border border-indigo-500/30 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Sending
                            </span>
                          )}
                          {r.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[10px] border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {r.status === "failed" && (
                            <div className="space-y-1">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium text-[10px] border border-rose-500/30"
                              >
                                <AlertCircle className="w-3 h-3 text-rose-400" /> Failed
                              </span>
                              {r.status_message && (
                                <p className="text-[10px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-900/40 max-w-xs leading-tight">
                                  {r.status_message}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => triggerSend([r])}
                              disabled={isSending}
                              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 transition"
                              title="Send this email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openModal(r)}
                              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
                              title="Edit record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRecord(r.id)}
                              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-rose-400 transition"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manual Entry / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold text-white mb-4">
              {editingRecord ? "Edit Email Record" : "Add Email Record Manually"}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  placeholder="e.g. client@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Monthly statement"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Message</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Custom message for this recipient..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Attachment File Path / URL</label>
                <input
                  type="text"
                  value={formData.attachment_path}
                  onChange={(e) => setFormData({ ...formData, attachment_path: e.target.value })}
                  placeholder="e.g. /invoices/inv_101.pdf or https://..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Recipient Name (Tag: name)</label>
                  <input
                    type="text"
                    value={formData.extra_name}
                    onChange={(e) => setFormData({ ...formData, extra_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Note (Tag: note)</label>
                  <input
                    type="text"
                    value={formData.extra_field1}
                    onChange={(e) => setFormData({ ...formData, extra_field1: e.target.value })}
                    placeholder="e.g. Priority client"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md shadow-brand-600/30"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gateway Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Mail Gateway Settings</h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose between Instant Simulator for live client demos, Resend free API (3,000/mo), or your custom SMTP.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: "simulation", name: "Simulator", desc: "No API key needed (Demo)" },
                { id: "resend", name: "Resend", desc: "3,000 emails/mo Free" },
                { id: "smtp", name: "SMTP", desc: "Gmail / Brevo / Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    provider === p.id
                      ? "border-brand-500 bg-brand-950/40 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold capitalize text-slate-200">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{p.desc}</div>
                </button>
              ))}
            </div>

            {provider === "simulation" && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-200/90 text-xs">
                <strong>Demo Mode Active:</strong> Allows the client to test the full XML upload, template editing, and batch send experience right away without needing email API credentials.
              </div>
            )}

            {provider === "resend" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Resend API Key</label>
                  <input
                    type="password"
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">From Sender Email</label>
                  <input
                    type="text"
                    value={resendFromEmail}
                    onChange={(e) => setResendFromEmail(e.target.value)}
                    placeholder="onboarding@resend.dev or alerts@yourdomain.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                  <div className="p-2.5 mt-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200/90 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Why did you see a 403 error?
                    </p>
                    <p>
                      Resend's default <code>onboarding@resend.dev</code> only sends emails to <strong>the email address you used to register on Resend</strong>.
                    </p>
                    <p>
                      To send to <strong>any</strong> email (like client inboxes), you must verify your own domain in Resend (<a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline text-brand-300">resend.com/domains</a>), <strong>OR</strong> simply switch to <strong>SMTP (Gmail / Brevo)</strong> above!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {provider === "smtp" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Port</label>
                    <input
                      type="text"
                      value={smtpSettings.port}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                      placeholder="587"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Username / Email</label>
                  <input
                    type="text"
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                    placeholder="your-email@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Password / App Password</label>
                  <input
                    type="password"
                    value={smtpSettings.pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        XML Dispatch Pro &copy; {new Date().getFullYear()} &bull; Built with Next.js, Fast XML & Cloud Mail
      </footer>
    </div>
  );
}
