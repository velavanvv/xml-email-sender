"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Mail,
  Send,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Settings,
  Paperclip,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Check,
  ChevronDown,
  Info,
  Database,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
  FileCode,
  Layers,
  Sparkles,
  Calendar,
} from "lucide-react";
import confetti from "canvas-confetti";

const DEFAULT_DEMO_RECORDS = [
  {
    id: "rec_demo_1",
    recipient_email: "alex.turner@example.com",
    subject: "Monthly Statement - October 2026",
    message: "Hi Alex, please find your monthly summary statement attached. Contact our accounts team if you have any questions.",
    attachment_path: "/invoices/2026/alex_october_invoice.pdf",
    extra_fields: { name: "Alex Turner", account_no: "ACC-8921", balance: "$450.00" },
    status: "pending",
    status_message: "",
    created_at: new Date().toISOString(),
  },
  {
    id: "rec_demo_2",
    recipient_email: "sarah.jenkins@acmecorp.io",
    subject: "Contract Agreement & Verification",
    message: "Dear Sarah, attached is the revised NDA and enterprise service contract for your review and execution.",
    attachment_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    extra_fields: { name: "Sarah Jenkins", company: "Acme Corp", dept: "Procurement" },
    status: "pending",
    status_message: "",
    created_at: new Date().toISOString(),
  },
  {
    id: "rec_demo_3",
    recipient_email: "billing@globex.org",
    subject: "Payment Reminder #542",
    message: "Hello team, kindly process invoice #542 due on October 30. Details and wire instructions are attached.",
    attachment_path: "/receipts/globex_542.pdf",
    extra_fields: { name: "Globex Accounts", po_number: "PO-7741", due_date: "Oct 30" },
    status: "pending",
    status_message: "",
    created_at: new Date().toISOString(),
  },
];

export default function EnterpriseEmailDashboard() {
  const [records, setRecords] = useState(DEFAULT_DEMO_RECORDS);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Interpolation helper for preview and template placeholders
  const interpolate = (template, item) => {
    if (!template || !item) return "";
    let res = template;
    res = res.replace(/\{email\}/gi, item.recipient_email || "");
    res = res.replace(/\{attachment\}/gi, item.attachment_path ? item.attachment_path.split("/").pop() : "");
    if (item.extra_fields) {
      for (const [key, val] of Object.entries(item.extra_fields)) {
        const regex = new RegExp(`\\{${key}\\}`, "gi");
        res = res.replace(regex, String(val));
      }
    }
    return res;
  };

  // Common template options
  const [useCommonBody, setUseCommonBody] = useState(false);
  const [commonSubject, setCommonSubject] = useState("Official Notice: Statement & Documents for {name}");
  const [commonBody, setCommonBody] = useState("Dear {name},\n\nPlease find attached the official documentation for your account.\n\nAccount Reference: {account_no}\n\nIf you have any questions or require additional support, reply directly to this email.\n\nBest regards,\nClient Services Team");

  // Gateway Configuration
  const [provider, setProvider] = useState("simulation"); // simulation, mailchimp, resend, smtp
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [resendKey, setResendKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("onboarding@resend.dev");

  // Mailchimp (Mandrill) private domain state
  const [mailchimpApiKey, setMailchimpApiKey] = useState("");
  const [mailchimpFromEmail, setMailchimpFromEmail] = useState("");
  const [mailchimpFromName, setMailchimpFromName] = useState("Accounts Department");

  // SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState({
    host: "smtp.gmail.com",
    port: "587",
    user: "",
    pass: "",
  });

  // Manual Add / Edit Modal
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

  // View Record Preview Modal
  const [previewRecord, setPreviewRecord] = useState(null);

  const fileInputRef = useRef(null);

  // Load from LocalStorage
  useEffect(() => {
    setIsClientLoaded(true);
    try {
      const saved = localStorage.getItem("xml_dispatch_records");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
        }
      }
      const savedCfg = localStorage.getItem("xml_dispatch_config");
      if (savedCfg) {
        const cfg = JSON.parse(savedCfg);
        if (cfg.provider) setProvider(cfg.provider);
        if (cfg.resendKey) setResendKey(cfg.resendKey);
        if (cfg.resendFromEmail) setResendFromEmail(cfg.resendFromEmail);
        if (cfg.mailchimpApiKey) setMailchimpApiKey(cfg.mailchimpApiKey);
        if (cfg.mailchimpFromEmail) setMailchimpFromEmail(cfg.mailchimpFromEmail);
        if (cfg.mailchimpFromName) setMailchimpFromName(cfg.mailchimpFromName);
        if (cfg.smtpSettings) setSmtpSettings(cfg.smtpSettings);
      }
    } catch (e) {
      console.warn("Could not read from local storage", e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isClientLoaded) return;
    try {
      localStorage.setItem("xml_dispatch_records", JSON.stringify(records));
    } catch (e) {
      console.warn("Could not save records to local storage", e);
    }
  }, [records, isClientLoaded]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const sent = records.filter((r) => r.status === "sent").length;
    const failed = records.filter((r) => r.status === "failed").length;
    const pending = records.filter((r) => r.status === "pending").length;
    return { total, sent, failed, pending };
  }, [records]);


  // Unique XML batches for daily separation
  const uniqueBatches = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.batch_name) set.add(r.batch_name);
    });
    return Array.from(set);
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
      const matchesBatch = batchFilter === "all" ? true : r.batch_name === batchFilter;

      const matchesDate = (() => {
        if (!startDate && !endDate) return true;
        const toYMD = (val) => {
          if (!val) return "";
          try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return "";
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          } catch (e) {
            return "";
          }
        };

        const sentYMD = toYMD(r.sent_at);
        const createdYMD = toYMD(r.created_at);

        const inRange = (dStr) => {
          if (!dStr) return false;
          if (startDate && endDate) return dStr >= startDate && dStr <= endDate;
          if (startDate) return dStr >= startDate;
          if (endDate) return dStr <= endDate;
          return true;
        };

        return inRange(sentYMD) || inRange(createdYMD);
      })();

      return matchesSearch && matchesStatus && matchesBatch && matchesDate;
    });
  }, [records, searchQuery, statusFilter, batchFilter, startDate, endDate]);

  // Multi-file upload for XML, CSV, and JSON
  const handleFilesUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);

    const files = Array.from(fileList);
    let totalAdded = 0;
    const errors = [];
    const newRecords = [];

    for (const file of files) {
      try {
        const data = new FormData();
        data.append("file", file);

        const res = await fetch("/api/parse-xml", {
          method: "POST",
          body: data,
        });

        const json = await res.json();
        if (!res.ok) {
          errors.push(`${file.name}: ${json.error || "Failed to parse file."}`);
          continue;
        }

        const batchName = file.name || `Batch_${new Date().toLocaleDateString()}`;
        const taggedRecords = (json.records || []).map((r) => ({
          ...r,
          batch_name: batchName,
        }));

        newRecords.push(...taggedRecords);
        totalAdded += taggedRecords.length;
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (newRecords.length > 0) {
      setRecords((prev) => [...newRecords, ...prev]);
    }

    if (errors.length > 0) {
      alert(`Uploaded ${files.length} file(s) with ${totalAdded} record(s) loaded.\n\nErrors encountered:\n` + errors.join("\n"));
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Download Sample CSV
  const downloadSampleCsv = () => {
    const sample = `email,name,subject,message,attachment,account_no,balance
alex.turner@example.com,Alex Turner,Monthly Statement - October 2026,"Hi Alex, please find your monthly summary statement attached. Contact our accounts team if you have any questions.",/invoices/2026/alex_october_invoice.pdf,ACC-8921,$450.00
sarah.jenkins@acmecorp.io,Sarah Jenkins,Contract Agreement & Verification,"Dear Sarah, attached is the revised NDA and enterprise service contract for your review and execution.",https://example.com/docs/signed_contract.pdf,ACC-4412,$1200.00
billing@globex.org,David Miller,Payment Reminder #542,"Hello team, kindly process invoice #542 due on October 30.",/receipts/globex_542.pdf,ACC-1004,$3850.50`;

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_recipients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Sample XML
  const downloadSampleXml = () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<email_batch>
  <record>
    <email>alex.turner@example.com</email>
    <name>Alex Turner</name>
    <subject>Monthly Statement - October 2026</subject>
    <message>Hi Alex, please find your monthly summary statement attached.</message>
    <attachment_path>/invoices/2026/alex_october_invoice.pdf</attachment_path>
    <account_no>ACC-8921</account_no>
  </record>
  <record>
    <email>sarah.jenkins@acmecorp.io</email>
    <name>Sarah Jenkins</name>
    <subject>Contract Agreement &amp; Verification</subject>
    <message>Dear Sarah, attached is the revised NDA and enterprise service contract.</message>
    <attachment_path>https://example.com/docs/signed_contract.pdf</attachment_path>
    <company>Acme Corp</company>
  </record>
  <record>
    <email>billing@globex.org</email>
    <name>Globex Accounts</name>
    <subject>Payment Reminder #542</subject>
    <message>Hello team, kindly process invoice #542 due on October 30.</message>
    <attachment_path>/receipts/globex_542.pdf</attachment_path>
    <po_number>PO-7741</po_number>
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

  // Export CSV
  const exportCsv = () => {
    const headers = ["ID", "Recipient Email", "Subject", "Status", "Sent Date", "Sent Time", "Attachment", "Status Details", "Batch Source"];
    const rows = records.map((r) => {
      const sentDate = r.sent_at
        ? new Date(r.sent_at).toLocaleDateString()
        : r.created_at
        ? new Date(r.created_at).toLocaleDateString()
        : "";
      const sentTime = r.sent_at ? new Date(r.sent_at).toLocaleTimeString() : "";

      return [
        r.id,
        `"${r.recipient_email}"`,
        `"${(useCommonBody ? interpolate(commonSubject, r) : (r.subject || "")).replace(/"/g, '""')}"`,
        r.status,
        `"${sentDate}"`,
        `"${sentTime}"`,
        `"${(r.attachment_path || "").replace(/"/g, '""')}"`,
        `"${(r.status_message || "").replace(/"/g, '""')}"`,
        `"${(r.batch_name || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email_batch_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Manual Modal Save
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.recipient_email.trim()) return;

    if (editingRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                recipient_email: formData.recipient_email.trim(),
                subject: formData.subject.trim(),
                message: formData.message,
                attachment_path: formData.attachment_path.trim(),
                extra_fields: {
                  ...r.extra_fields,
                  name: formData.extra_name,
                  reference: formData.extra_field1,
                },
              }
            : r
        )
      );
    } else {
      const newRec = {
        id: `rec_manual_${Date.now()}`,
        recipient_email: formData.recipient_email.trim(),
        subject: formData.subject.trim() || "Notification",
        message: formData.message,
        attachment_path: formData.attachment_path.trim(),
        extra_fields: {
          name: formData.extra_name,
          reference: formData.extra_field1,
        },
        status: "pending",
        status_message: "",
        created_at: new Date().toISOString(),
      };
      setRecords((prev) => [newRec, ...prev]);
    }
    setShowModal(false);
  };

  // Open Edit Modal
  const openEditModal = (rec) => {
    setEditingRecord(rec);
    setFormData({
      recipient_email: rec.recipient_email,
      subject: rec.subject,
      message: rec.message,
      attachment_path: rec.attachment_path,
      extra_name: rec.extra_fields?.name || "",
      extra_field1: rec.extra_fields?.reference || rec.extra_fields?.account_no || "",
    });
    setShowModal(true);
  };

  // Delete Record
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

  // Dispatch Batch
  const triggerSend = async (targetRecords) => {
    if (targetRecords.length === 0) return;
    setIsSending(true);
    setSendProgress({ current: 0, total: targetRecords.length });

    const targetIds = new Set(targetRecords.map((r) => r.id));
    setRecords((prev) =>
      prev.map((r) => (targetIds.has(r.id) ? { ...r, status: "sending", status_message: "Transmitting..." } : r))
    );

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: targetRecords,
          provider,
          resendApiKey: resendKey,
          fromEmail: provider === "mailchimp" ? mailchimpFromEmail : resendFromEmail,
          fromName: provider === "mailchimp" ? mailchimpFromName : "Dispatch Team",
          mailchimpApiKey,
          smtpConfig: provider === "smtp" ? smtpSettings : null,
          useCommonBody,
          commonSubject,
          commonBodyTemplate: commonBody,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Batch transmission failed.");
        setRecords((prev) =>
          prev.map((r) =>
            targetIds.has(r.id) ? { ...r, status: "failed", status_message: json.error || "Failed" } : r
          )
        );
        return;
      }

      const resultsMap = new Map();
      json.results.forEach((r) => resultsMap.set(r.id, r));

      setRecords((prev) =>
        prev.map((r) => {
          if (resultsMap.has(r.id)) {
            const res = resultsMap.get(r.id);
            return {
              ...r,
              status: res.status,
              status_message: res.status_message,
              sent_at: res.sent_at,
            };
          }
          return r;
        })
      );

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.65 },
      });
    } catch (err) {
      alert("Error sending batch: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. GOOGLE CLOUD STYLE ENTERPRISE HEADER
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#dadce0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#1a73e8] flex items-center justify-center text-white shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base tracking-tight text-[#202124]">CloudMail XML</span>
                  <span className="text-[11px] font-medium bg-[#e8f0fe] text-[#1a73e8] px-2 py-0.5 rounded-full border border-[#d2e3fc]">
                    Enterprise Dispatcher
                  </span>
                </div>
                <div className="text-xs text-[#5f6368] hidden sm:block">
                  Automated XML Batch Ingestion &amp; Deliverability Console
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gateway Status Badge */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#3c4043] transition-colors"
              title="Click to configure email delivery gateway"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  provider === "simulation"
                    ? "bg-[#f29900]"
                    : provider === "mailchimp"
                    ? "bg-[#1e8e3e]"
                    : "bg-[#1a73e8]"
                }`}
              />
              <span className="text-[#5f6368]">Gateway:</span>
              <span className="font-semibold text-[#202124] capitalize">
                {provider === "simulation"
                  ? "Simulator (Demo)"
                  : provider === "mailchimp"
                  ? "Mailchimp (Private Domain)"
                  : provider}
              </span>
              <Settings className="w-3.5 h-3.5 text-[#5f6368] ml-1" />
            </button>

            {/* Download Sample Templates (CSV & XML) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={downloadSampleCsv}
                title="Download Sample CSV Template"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#1a73e8] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample CSV</span>
              </button>

              <button
                onClick={downloadSampleXml}
                title="Download Sample XML Template"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#5f6368] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample XML</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. WORKFLOW STEPPER BANNER (Makes the app self-explanatory for clients)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#e8eaed] py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-[#5f6368] gap-3">
          <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-[#1a73e8] font-medium">
              <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Upload CSV / XML / Add Records</span>
            </div>
            <span className="text-[#dadce0] hidden sm:inline">&rarr;</span>
            <div className="flex items-center gap-2 font-medium text-[#202124]">
              <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Configure Body / Template</span>
            </div>
            <span className="text-[#dadce0] hidden sm:inline">&rarr;</span>
            <div className="flex items-center gap-2 font-medium text-[#202124]">
              <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Review &amp; Dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#5f6368]">
            <Database className="w-3.5 h-3.5 text-[#1e8e3e]" />
            <span>Browser autosave active</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. MAIN DASHBOARD CONTENT
      ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div className="enterprise-card p-4">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Records</span>
              <FileText className="w-4 h-4 text-[#5f6368]" />
            </div>
            <div className="text-2xl font-bold text-[#202124] mt-2">{stats.total}</div>
            <div className="text-xs text-[#5f6368] mt-1">Uploaded in active campaign</div>
          </div>

          {/* Card 2: Pending */}
          <div className="enterprise-card p-4 border-l-4 border-l-[#f29900]">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b06000]">Pending Queue</span>
              <Clock className="w-4 h-4 text-[#f29900]" />
            </div>
            <div className="text-2xl font-bold text-[#202124] mt-2">{stats.pending}</div>
            <div className="text-xs text-[#5f6368] mt-1">Ready for transmission</div>
          </div>

          {/* Card 3: Delivered */}
          <div className="enterprise-card p-4 border-l-4 border-l-[#1e8e3e]">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1e8e3e]">Delivered</span>
              <CheckCircle className="w-4 h-4 text-[#1e8e3e]" />
            </div>
            <div className="text-2xl font-bold text-[#202124] mt-2">{stats.sent}</div>
            <div className="text-xs text-[#5f6368] mt-1">Confirmed sent via gateway</div>
          </div>

          {/* Card 4: Failed */}
          <div className="enterprise-card p-4 border-l-4 border-l-[#d93025]">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#d93025]">Failed / Flagged</span>
              <AlertTriangle className="w-4 h-4 text-[#d93025]" />
            </div>
            <div className="text-2xl font-bold text-[#202124] mt-2">{stats.failed}</div>
            <div className="text-xs text-[#5f6368] mt-1">Requires review or retry</div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            STEP 2: COMMON EMAIL BODY & TEMPLATE CONFIGURATION
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="enterprise-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8eaed]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#202124]">Email Body &amp; Content Mode</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#f1f3f4] text-[#5f6368] font-medium">
                  Step 2
                </span>
              </div>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Choose whether each recipient gets their individual XML message or a unified company template.
              </p>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${!useCommonBody ? "text-[#1a73e8]" : "text-[#5f6368]"}`}>
                Individual XML Body
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCommonBody}
                  onChange={(e) => setUseCommonBody(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dadce0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a73e8]"></div>
              </label>
              <span className={`text-xs font-medium ${useCommonBody ? "text-[#1a73e8]" : "text-[#5f6368]"}`}>
                Unified Template Mode
              </span>
            </div>
          </div>

          {useCommonBody && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in bg-[#f8f9fa] p-4 rounded-lg border border-[#e8eaed]">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  Common Subject Line
                </label>
                <input
                  type="text"
                  value={commonSubject}
                  onChange={(e) => setCommonSubject(e.target.value)}
                  placeholder="e.g. Monthly Statement for {name}"
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />

                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#5f6368]">Insert placeholder:</span>
                  {["{name}", "{email}", "{account_no}", "{attachment}"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCommonSubject((prev) => prev + " " + tag)}
                      className="text-[11px] font-mono bg-white hover:bg-[#e8f0fe] border border-[#dadce0] hover:border-[#1a73e8] text-[#1a73e8] px-2 py-0.5 rounded transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  Common Email Body Template
                </label>
                <textarea
                  rows={4}
                  value={commonBody}
                  onChange={(e) => setCommonBody(e.target.value)}
                  placeholder="Write common message content..."
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] font-sans leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            STEP 1 & 3: TOOLBAR & RECIPIENT ACTIONS
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left Actions: Upload CSV / XML & Manual Entry */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xml,.csv,.json,text/csv,application/json,text/xml,application/xml"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesUpload(e.target.files);
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-google-primary inline-flex items-center gap-2"
              title="Upload one or multiple CSV, XML, or JSON files"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? "Processing File(s)..." : "Upload CSV / XML"}</span>
            </button>

            <button
              onClick={() => {
                setEditingRecord(null);
                setFormData({
                  recipient_email: "",
                  subject: "",
                  message: "",
                  attachment_path: "",
                  extra_name: "",
                  extra_field1: "",
                });
                setShowModal(true);
              }}
              className="btn-google-secondary"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>

            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#3c4043] transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#5f6368]" />
              <span>Export CSV</span>
            </button>

            {stats.sent > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Remove ${stats.sent} delivered records from the active table? (Pending records will remain)`)) {
                    setRecords((prev) => prev.filter((r) => r.status !== "sent"));
                    setSelectedIds(new Set());
                  }
                }}
                className="px-2.5 py-2 text-xs font-medium text-[#1e8e3e] hover:bg-[#e6f4ea] rounded-md border border-[#ceead6] transition-colors"
                title="Clear already sent emails to start clean for next batch"
              >
                Clear Sent ({stats.sent})
              </button>
            )}

            {records.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear all recipient records from this batch?")) {
                    setRecords([]);
                    setSelectedIds(new Set());
                  }
                }}
                className="px-2.5 py-2 text-xs font-medium text-[#5f6368] hover:text-[#d93025] transition-colors"
              >
                Clear All
              </button>
            )}

            <button
              onClick={() => {
                if (confirm("Reset back to default sample records?")) {
                  setRecords(DEFAULT_DEMO_RECORDS);
                  setSelectedIds(new Set());
                }
              }}
              className="px-2.5 py-2 text-xs font-medium text-[#5f6368] hover:text-[#1a73e8] transition-colors inline-flex items-center gap-1"
              title="Reset to demo data"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo</span>
            </button>
          </div>

          {/* Right Filters & Main Dispatch Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              <input
                type="text"
                placeholder="Search email, subject, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-[#dadce0] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#202124] placeholder-[#80868b] focus:outline-none focus:border-[#1a73e8] w-44 sm:w-56"
              />
            </div>

            {/* Batch Filter (if more than 1 batch) */}
            {uniqueBatches.length > 1 && (
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-white border border-[#dadce0] rounded-md px-2.5 py-1.5 text-xs text-[#3c4043] focus:outline-none focus:border-[#1a73e8] max-w-[160px] truncate"
              >
                <option value="all">All Files ({uniqueBatches.length})</option>
                {uniqueBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range Picker (Between Start & End) */}
            <div
              className={`flex items-center gap-1.5 bg-white border ${
                startDate || endDate
                  ? "border-[#1a73e8] bg-[#f8fafd] ring-1 ring-[#1a73e8]"
                  : "border-[#dadce0] hover:border-[#bdc1c6]"
              } focus-within:border-[#1a73e8] focus-within:ring-1 focus-within:ring-[#1a73e8] rounded-md px-2.5 py-1 text-xs text-[#3c4043] transition-all shadow-xs`}
            >
              <Calendar
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  startDate || endDate ? "text-[#1a73e8]" : "text-[#5f6368]"
                }`}
              />

              {/* Start Date */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-[#70757a]">From:</span>
                <input
                  id="date-filter-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Filter from Start Date"
                  className="bg-transparent text-xs text-[#202124] focus:outline-none cursor-pointer max-w-[110px]"
                />
              </div>

              <span className="text-[#9aa0a6] font-medium text-xs px-0.5">to</span>

              {/* End Date */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-[#70757a]">To:</span>
                <input
                  id="date-filter-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="Filter to End Date"
                  className="bg-transparent text-xs text-[#202124] focus:outline-none cursor-pointer max-w-[110px]"
                />
              </div>

              {startDate || endDate ? (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  title="Clear date range (show all dates)"
                  className="p-0.5 text-[#70757a] hover:text-[#202124] hover:bg-[#e8f0fe] rounded transition-colors ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, "0");
                    const d = String(today.getDate()).padStart(2, "0");
                    const todayStr = `${y}-${m}-${d}`;
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  title="Filter for Today's date"
                  className="text-[10px] text-[#1a73e8] hover:underline font-medium px-1.5 py-0.5 bg-[#e8f0fe] rounded ml-0.5 whitespace-nowrap"
                >
                  Today
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#dadce0] rounded-md px-2.5 py-1.5 text-xs text-[#3c4043] focus:outline-none focus:border-[#1a73e8]"
            >
              <option value="all">All Statuses ({records.length})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="sent">Delivered ({stats.sent})</option>
              <option value="failed">Failed ({stats.failed})</option>
            </select>

            {/* Main Dispatch CTA */}
            <button
              onClick={() => {
                const target =
                  selectedIds.size > 0
                    ? records.filter((r) => selectedIds.has(r.id))
                    : records.filter((r) => r.status === "pending");
                triggerSend(target);
              }}
              disabled={isSending || records.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1e8e3e] hover:bg-[#187532] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
              <span>
                {isSending
                  ? "Transmitting Batch..."
                  : selectedIds.size > 0
                  ? `Send Selected (${selectedIds.size})`
                  : `Send All Pending (${stats.pending})`}
              </span>
            </button>
          </div>
        </div>

        {/* Selection Bar (Gmail / Drive style banner when items are checked) */}
        {selectedIds.size > 0 && (
          <div className="bg-[#e8f0fe] border border-[#d2e3fc] px-4 py-2 rounded-md flex items-center justify-between text-xs text-[#1a73e8] animate-fade-in">
            <span className="font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const target = records.filter((r) => selectedIds.has(r.id));
                  triggerSend(target);
                }}
                disabled={isSending}
                className="font-semibold hover:underline flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Send Selected
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} selected records?`)) {
                    setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
                    setSelectedIds(new Set());
                  }
                }}
                className="font-medium text-[#d93025] hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="font-medium text-[#5f6368] hover:underline"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            DATA GRID (Google Workspace & Cloud Console Quality)
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                      onChange={toggleSelectAll}
                      className="rounded border-[#dadce0] text-[#1a73e8] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th>Recipient Email</th>
                  <th>Subject</th>
                  <th>Message Preview</th>
                  <th>Attachment</th>
                  <th>Custom Fields (CSV / XML)</th>
                  <th>Sent Date</th>
                  <th>Delivery Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#5f6368]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileCode className="w-8 h-8 text-[#9aa0a6]" />
                        <p className="text-sm font-medium text-[#202124]">
                          {startDate || endDate || searchQuery || statusFilter !== "all" || batchFilter !== "all"
                            ? "No records match the active filters"
                            : "No records in current view"}
                        </p>
                        <p className="text-xs text-[#5f6368] max-w-md">
                          {(startDate || endDate) && `Date range: ${startDate || "Start"} to ${endDate || "End"}. `}
                          {startDate || endDate || searchQuery || statusFilter !== "all" || batchFilter !== "all"
                            ? "Try clearing or selecting a different date range or filter to see your emails."
                            : "Upload a CSV or XML file, or click \"Manual Entry\" above to add recipient data."}
                        </p>
                        {(startDate || endDate || searchQuery || statusFilter !== "all" || batchFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setStartDate("");
                              setEndDate("");
                              setSearchQuery("");
                              setStatusFilter("all");
                              setBatchFilter("all");
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#dadce0] hover:bg-[#f8f9fa] text-xs font-medium text-[#1a73e8] transition-colors shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset All Filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isSelected = selectedIds.has(r.id);
                    return (
                      <tr key={r.id} className={isSelected ? "row-selected" : ""}>
                        {/* Checkbox */}
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            className="rounded border-[#dadce0] text-[#1a73e8] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Recipient Email */}
                        <td>
                          <div className="font-mono text-xs font-medium text-[#202124] flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
                            <span>{r.recipient_email}</span>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="max-w-xs truncate text-[#3c4043]">
                          {useCommonBody ? (
                            <span className="text-[#1a73e8] font-medium text-xs">
                              {interpolate(commonSubject, r) || "(Empty subject)"}
                            </span>
                          ) : (
                            r.subject || <span className="text-[#80868b] italic">No subject</span>
                          )}
                        </td>

                        {/* Message Preview */}
                        <td className="max-w-xs truncate text-[#5f6368] text-xs">
                          {useCommonBody ? (
                            <span className="text-[#3c4043]">
                              {interpolate(commonBody, r)}
                            </span>
                          ) : (
                            r.message || <span className="text-[#80868b] italic">Empty message</span>
                          )}
                        </td>

                        {/* Attachment */}
                        <td>
                          {r.attachment_path ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f1f3f4] border border-[#dadce0] text-xs text-[#3c4043] max-w-[180px] truncate"
                              title={r.attachment_path}
                            >
                              <Paperclip className="w-3 h-3 text-[#5f6368] shrink-0" />
                              <span className="truncate">{r.attachment_path.split("/").pop()}</span>
                            </div>
                          ) : (
                            <span className="text-[#80868b] text-xs">None</span>
                          )}
                        </td>

                        {/* Custom Fields */}
                        <td>
                          {r.extra_fields && Object.keys(r.extra_fields).length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {Object.entries(r.extra_fields).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[11px] px-1.5 py-0.5 rounded bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0]"
                                >
                                  {k}: <strong className="text-[#202124] font-medium">{String(v)}</strong>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#80868b] text-xs">—</span>
                          )}
                        </td>

                        {/* Sent Date / Created Date */}
                        <td className="whitespace-nowrap">
                          {r.status === "sent" && r.sent_at ? (
                            <div>
                              <div className="font-medium text-[#202124] flex items-center gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-[#1e8e3e]" />
                                <span>{new Date(r.sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                              <div className="text-[11px] text-[#5f6368] pl-5 font-mono">
                                {new Date(r.sent_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[#5f6368] flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5 text-[#80868b]" />
                                <span>{r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Today"}</span>
                              </div>
                              <div className="text-[10px] text-[#80868b] pl-5">Queue created</div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          {r.status === "sent" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#1e8e3e] font-medium text-xs border border-[#ceead6]">
                              <CheckCircle className="w-3 h-3" /> Delivered
                            </span>
                          )}
                          {r.status === "sending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-medium text-xs border border-[#d2e3fc]">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Sending...
                            </span>
                          )}
                          {r.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] font-medium text-xs border border-[#feefc3]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {r.status === "failed" && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fce8e6] text-[#d93025] font-medium text-xs border border-[#fad2cf]">
                                <AlertTriangle className="w-3 h-3" /> Failed
                              </span>
                              {r.status_message && (
                                <p className="text-[11px] text-[#d93025] max-w-xs leading-tight">
                                  {r.status_message}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setPreviewRecord(r)}
                              className="p-1.5 rounded hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#202124] transition-colors"
                              title="Preview complete email"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => triggerSend([r])}
                              disabled={isSending}
                              className="p-1.5 rounded hover:bg-[#e6f4ea] text-[#5f6368] hover:text-[#1e8e3e] transition-colors"
                              title="Send this email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(r)}
                              className="p-1.5 rounded hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#202124] transition-colors"
                              title="Edit record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRecord(r.id)}
                              className="p-1.5 rounded hover:bg-[#fce8e6] text-[#5f6368] hover:text-[#d93025] transition-colors"
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

      {/* ──────────────────────────────────────────────────────────────────────────
          4. MANUAL ENTRY & EDIT MODAL (Google Style Clean Form)
      ────────────────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-lg border border-[#dadce0] shadow-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <h3 className="text-base font-semibold text-[#202124]">
                {editingRecord ? "Edit Recipient Record" : "Add Recipient Manually"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-[#202124] font-medium mb-1">
                  Recipient Email Address <span className="text-[#d93025]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  placeholder="e.g. client@company.com"
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-[#202124] font-medium mb-1">Email Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Invoice Statement #1002"
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-[#202124] font-medium mb-1">Individual Email Message</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Custom email content for this recipient..."
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-[#202124] font-medium mb-1">Attachment File URL or Server Path</label>
                <input
                  type="text"
                  value={formData.attachment_path}
                  onChange={(e) => setFormData({ ...formData, attachment_path: e.target.value })}
                  placeholder="e.g. /invoices/statement.pdf or https://..."
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[#5f6368] font-medium mb-1">Recipient Name (Placeholder: {"{name}"})</label>
                  <input
                    type="text"
                    value={formData.extra_name}
                    onChange={(e) => setFormData({ ...formData, extra_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
                <div>
                  <label className="block text-[#5f6368] font-medium mb-1">Account Ref / Custom Field</label>
                  <input
                    type="text"
                    value={formData.extra_field1}
                    onChange={(e) => setFormData({ ...formData, extra_field1: e.target.value })}
                    placeholder="e.g. ACC-1092"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#dadce0]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#5f6368]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          5. GATEWAY CONFIGURATION MODAL (Google Cloud Console Style)
      ────────────────────────────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-lg border border-[#dadce0] shadow-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Email Delivery Gateway Settings</h3>
                <p className="text-xs text-[#5f6368]">Configure your transmission vendor, sender domain, and credentials.</p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              {[
                { id: "simulation", name: "Simulator", desc: "Zero setup test mode" },
                { id: "mailchimp", name: "Mailchimp", desc: "Private domain (Mandrill)" },
                { id: "resend", name: "Resend", desc: "Free 3k emails/month" },
                { id: "smtp", name: "Custom SMTP", desc: "Gmail / Brevo / Server" },
              ].map((p) => {
                const isActive = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`p-3 rounded-md border text-left transition-all ${
                      isActive
                        ? "border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8]"
                        : "border-[#dadce0] bg-white text-[#5f6368] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#202124]">{p.name}</div>
                    <div className="text-[11px] text-[#5f6368] mt-0.5 leading-tight">{p.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Simulation Tab */}
            {provider === "simulation" && (
              <div className="p-3.5 rounded-md bg-[#fef7e0] border border-[#feefc3] text-xs text-[#8a5700] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#f29900]" />
                  <span>Sandbox Simulator Active</span>
                </div>
                <p>
                  No external API credentials required. Safely test XML file ingestion, common templates, and batch sending. Records will transition realistically to <strong>Delivered</strong> with zero cost.
                </p>
              </div>
            )}

            {/* Mailchimp Tab */}
            {provider === "mailchimp" && (
              <div className="space-y-3.5 text-xs bg-[#f8f9fa] p-4 rounded-md border border-[#dadce0]">
                <div className="font-semibold text-[#202124] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#1e8e3e]" />
                  <span>Mailchimp Transactional (Mandrill) with Private Domain</span>
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">
                    Mailchimp Mandrill API Key <span className="text-[#d93025]">*</span>
                  </label>
                  <input
                    type="password"
                    value={mailchimpApiKey}
                    onChange={(e) => setMailchimpApiKey(e.target.value)}
                    placeholder="md-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] font-mono focus:outline-none focus:border-[#1a73e8]"
                  />
                  <span className="text-[11px] text-[#5f6368] mt-1 block">
                    Found in Mandrill Dashboard &gt; Settings &gt; API Keys.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#202124] font-medium mb-1">
                      Private Domain Sender Email <span className="text-[#d93025]">*</span>
                    </label>
                    <input
                      type="email"
                      value={mailchimpFromEmail}
                      onChange={(e) => setMailchimpFromEmail(e.target.value)}
                      placeholder="billing@yourdomain.com"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#202124] font-medium mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={mailchimpFromName}
                      onChange={(e) => setMailchimpFromName(e.target.value)}
                      placeholder="e.g. Accounts Department"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#dadce0] text-[11px] text-[#5f6368] space-y-1">
                  <span className="font-semibold text-[#202124]">Domain Deliverability Requirements:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Verify your domain in Mailchimp &gt; Sending Domains</li>
                    <li>Add the 2 TXT DNS records (SPF &amp; DKIM) on your domain registrar</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Resend Tab */}
            {provider === "resend" && (
              <div className="space-y-3.5 text-xs bg-[#f8f9fa] p-4 rounded-md border border-[#dadce0]">
                <div>
                  <label className="block text-[#202124] font-medium mb-1">
                    Resend API Key <span className="text-[#d93025]">*</span>
                  </label>
                  <input
                    type="password"
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxx"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] font-mono focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">From Sender Address</label>
                  <input
                    type="text"
                    value={resendFromEmail}
                    onChange={(e) => setResendFromEmail(e.target.value)}
                    placeholder="onboarding@resend.dev or alerts@yourdomain.com"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                  <div className="p-2.5 mt-2 rounded bg-[#fef7e0] border border-[#feefc3] text-[#8a5700] text-[11px] space-y-1">
                    <p className="font-semibold">Resend 403 Security Rule:</p>
                    <p>
                      <code>onboarding@resend.dev</code> only delivers to the exact email used to register Resend. To send to any client inbox, verify a domain in Resend or use Gmail/Mailchimp.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SMTP Tab */}
            {provider === "smtp" && (
              <div className="space-y-3.5 text-xs bg-[#f8f9fa] p-4 rounded-md border border-[#dadce0]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#202124] font-medium mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#202124] font-medium mb-1">Port</label>
                    <input
                      type="text"
                      value={smtpSettings.port}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                      placeholder="587"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                    placeholder="your-email@gmail.com"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">SMTP Password / App Password</label>
                  <input
                    type="password"
                    value={smtpSettings.pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[#dadce0]">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(
                      "xml_dispatch_config",
                      JSON.stringify({
                        provider,
                        resendKey,
                        resendFromEmail,
                        mailchimpApiKey,
                        mailchimpFromEmail,
                        mailchimpFromName,
                        smtpSettings,
                      })
                    );
                  } catch (e) {
                    console.warn(e);
                  }
                  setShowConfigModal(false);
                }}
                className="btn-google-primary"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          6. PREVIEW RECORD MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-lg border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <h3 className="text-base font-semibold text-[#202124]">Email Message Preview</h3>
              <button
                onClick={() => setPreviewRecord(null)}
                className="p-1 rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-[#f8f9fa] p-3 rounded border border-[#dadce0] space-y-1">
                <div>
                  <strong className="text-[#5f6368]">To:</strong>{" "}
                  <span className="font-mono text-[#202124]">{previewRecord.recipient_email}</span>
                </div>
                <div>
                  <strong className="text-[#5f6368]">Subject:</strong>{" "}
                  <span className="text-[#202124] font-medium">
                    {useCommonBody ? interpolate(commonSubject, previewRecord) : previewRecord.subject || "(No subject)"}
                  </span>
                </div>
                {previewRecord.attachment_path && (
                  <div>
                    <strong className="text-[#5f6368]">Attachment:</strong>{" "}
                    <span className="text-[#1a73e8] font-mono">{previewRecord.attachment_path}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#5f6368] font-semibold mb-1">Rendered Personalized Body Content:</label>
                <div className="p-4 rounded border border-[#dadce0] bg-white text-[#202124] whitespace-pre-wrap leading-relaxed font-sans min-h-[120px]">
                  {useCommonBody ? interpolate(commonBody, previewRecord) : previewRecord.message || "(Empty message content)"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[#dadce0]">
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#5f6368]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerSend([previewRecord]);
                  setPreviewRecord(null);
                }}
                disabled={isSending}
                className="btn-google-primary"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send This Email Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          7. GOOGLE CLOUD STYLE FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#dadce0] bg-white py-4 px-6 mt-auto text-xs text-[#5f6368]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CloudMail XML Dispatcher &bull; Enterprise Batch Deliverability Platform
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Google Enterprise Design Standard</span>
            <span>&bull;</span>
            <span>Mailchimp / Resend / SMTP Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
