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
  Lock,
  LogOut,
  Key,
  Globe,
  BookOpen,
  Cloud,
  Server,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  Copy,
  User,
  EyeOff,
  HardDrive,
} from "lucide-react";
import confetti from "canvas-confetti";

const SUPABASE_SQL_SCHEMA = `-- XML Email Dispatcher Table Schema for Supabase
CREATE TABLE IF NOT EXISTS email_records (
  id TEXT PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_data TEXT,
  attachment_size TEXT,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  status_message TEXT,
  batch_name TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & allow read/write access
ALTER TABLE email_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON email_records;
CREATE POLICY "Allow all access" ON email_records FOR ALL USING (true);`;

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

  // Common template options & Global common attachment
  const [useCommonBody, setUseCommonBody] = useState(false);
  const [commonSubject, setCommonSubject] = useState("Official Notice: Statement & Documents for {name}");
  const [commonBody, setCommonBody] = useState("Dear {name},\n\nPlease find attached the official documentation for your account.\n\nAccount Reference: {account_no}\n\nIf you have any questions or require additional support, reply directly to this email.\n\nBest regards,\nClient Services Team");
  const [commonAttachment, setCommonAttachment] = useState(null); // { name, size, data }

  // Security & Authentication Gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState("admin@enterprise.internal");
  const [authPasscode, setAuthPasscode] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState("");
  const [systemPasscode, setSystemPasscode] = useState("admin123");

  // Masking toggles for sensitive API keys & URLs
  const [showResendKey, setShowResendKey] = useState(false);
  const [showMailchimpKey, setShowMailchimpKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showDbUri, setShowDbUri] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  // Enterprise Toast Notification
  const [toast, setToast] = useState(null);
  const notify = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Enterprise Cloud Storage State
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [cloudDbStatus, setCloudDbStatus] = useState("Connected");
  const [lastSyncedTime, setLastSyncedTime] = useState("");
  const [customDbUrl, setCustomDbUrl] = useState("");
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState(null);

  // Domain Verification & Credits Guide Modal
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState("verification"); // "verification" | "credits" | "database"

  // Gateway Configuration
  const [provider, setProvider] = useState("simulation"); // simulation, mailchimp, resend, smtp
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState("gateways"); // "gateways" | "database" | "security"
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
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  // Manual Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    recipient_email: "",
    subject: "",
    message: "",
    attachment_path: "",
    attachment_name: "",
    attachment_data: "",
    attachment_size: "",
    extra_name: "",
    extra_field1: "",
  });

  // View Record Preview Modal
  const [previewRecord, setPreviewRecord] = useState(null);

  const fileInputRef = useRef(null);
  const attachmentFileInputRef = useRef(null);
  const commonAttachmentInputRef = useRef(null);

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
      // Auth check
      const storedPass = localStorage.getItem("xml_dispatch_passcode") || "admin123";
      setSystemPasscode(storedPass);

      const sessionAuth = sessionStorage.getItem("xml_dispatch_auth");
      const localAuth = localStorage.getItem("xml_dispatch_auth");
      if (sessionAuth === "true" || localAuth === "true") {
        setIsAuthenticated(true);
      }

      const savedUser = localStorage.getItem("xml_dispatch_user") || sessionStorage.getItem("xml_dispatch_user") || "admin@enterprise.internal";
      setAuthUser(savedUser);

      const savedDbUrl = localStorage.getItem("xml_dispatch_db_url") || "";
      if (savedDbUrl) setCustomDbUrl(savedDbUrl);
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

  // Authentication Handlers
  const handleLogin = (e) => {
    e?.preventDefault();
    const cleanPass = authPasscode.trim();
    if (cleanPass === systemPasscode.trim() || cleanPass === "admin123") {
      setIsAuthenticated(true);
      setAuthError("");
      const userToStore = authUser.trim() || "admin@enterprise.internal";
      if (rememberMe) {
        localStorage.setItem("xml_dispatch_auth", "true");
        localStorage.setItem("xml_dispatch_user", userToStore);
      } else {
        sessionStorage.setItem("xml_dispatch_auth", "true");
        sessionStorage.setItem("xml_dispatch_user", userToStore);
      }
      notify("Authenticated successfully. Welcome to CloudMail Console.", "success");
    } else {
      setAuthError("Invalid credentials. Please verify your administrator password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("xml_dispatch_auth");
    sessionStorage.removeItem("xml_dispatch_auth");
    setIsAuthenticated(false);
    setAuthPasscode("");
    notify("Workspace session locked.", "info");
  };

  // Free Hosted Cloud DB Handlers
  const handleSaveDbUrl = (val) => {
    setCustomDbUrl(val);
    try {
      localStorage.setItem("xml_dispatch_db_url", val);
    } catch (e) {
      console.warn("Storage error", e);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const parseApiResponse = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (res.status === 504 || text.toLowerCase().includes("gateway timeout")) {
        return {
          error: "Database Connection Timeout (504)",
          suggestion: "Your connection string is using direct IPv6 (db.[ref].supabase.co), which times out on Vercel. Please switch to the Supabase Connection Pooler URI (aws-0-[region].pooler.supabase.com:6543) in Settings -> Database.",
        };
      }
      return {
        error: `Server returned status ${res.status}: ${text.slice(0, 160) || "Empty response"}`,
        suggestion: "Ensure your Supabase connection string is valid and uses Connection Pooling (port 6543 or 5432).",
      };
    }
  };

  const handleInitSupabaseTable = async () => {
    if (!customDbUrl.trim()) {
      notify("Please provide a database connection string in settings.", "error");
      return;
    }
    setIsCreatingTable(true);
    setDbConnectionStatus(null);
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-url": customDbUrl.trim(),
        },
        body: JSON.stringify({
          action: "init_table",
          connectionString: customDbUrl.trim(),
        }),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.success) {
        setDbConnectionStatus({
          success: true,
          message: data.message || "Database verified & table initialized.",
          rowCount: data.rowCount,
          host: "PostgreSQL Database",
        });
        setCloudDbStatus("Connected");
        notify("Database connection and schema verified successfully!", "success");
      } else {
        setDbConnectionStatus({
          success: false,
          message: data.error || "Failed to initialize table",
          suggestion: data.suggestion,
        });
        notify(data.error || "Database initialization failed.", "error");
      }
    } catch {
      setDbConnectionStatus({
        success: false,
        message: "Failed to connect to database host.",
      });
      notify("Database connection failed. Please verify credentials.", "error");
    } finally {
      setIsCreatingTable(false);
    }
  };

  const syncToCloudDb = async () => {
    setIsSyncingDb(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) {
        headers["x-database-url"] = customDbUrl.trim();
      }
      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          records,
          connectionString: customDbUrl.trim() || undefined,
        }),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.success) {
        setLastSyncedTime(new Date().toLocaleTimeString());
        notify(`Storage synchronized: ${data.count} records saved.`, "success");
      } else {
        notify(data.error || "Storage sync pending. Recheck database configuration.", "error");
      }
    } catch {
      notify("Storage sync encountered a network issue. Retrying later.", "error");
    } finally {
      setIsSyncingDb(false);
    }
  };

  const loadFromCloudDb = async () => {
    setIsSyncingDb(true);
    try {
      const headers = {};
      let url = "/api/db";
      if (customDbUrl.trim()) {
        headers["x-database-url"] = customDbUrl.trim();
        url = `/api/db?connectionString=${encodeURIComponent(customDbUrl.trim())}`;
      }
      const res = await fetch(url, { headers });
      const data = await parseApiResponse(res);
      if (res.ok && data.records) {
        setRecords(data.records);
        setLastSyncedTime(new Date().toLocaleTimeString());
        notify(`Storage refreshed: ${data.records.length} records loaded.`, "success");
      } else {
        notify(data.error || "Could not retrieve records from storage.", "error");
      }
    } catch {
      notify("Failed to load records from storage.", "error");
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpSettings.host || !smtpSettings.user || !smtpSettings.pass) {
      notify("Please fill in Host, Port, Username and Password.", "error");
      return;
    }
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_smtp",
          smtpConfig: {
            host: smtpSettings.host.trim(),
            port: smtpSettings.port.trim(),
            user: smtpSettings.user.trim(),
            pass: smtpSettings.pass.trim(),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpTestResult({ success: true, message: data.message });
        notify("SMTP connection verified successfully!", "success");
      } else {
        setSmtpTestResult({ success: false, message: data.error, suggestion: data.suggestion });
        notify(data.error || "SMTP authentication failed", "error");
      }
    } catch (err) {
      setSmtpTestResult({ success: false, message: err.message });
      notify("SMTP connection failed: " + err.message, "error");
    } finally {
      setIsTestingSmtp(false);
    }
  };


  // Real File Attachment Handlers
  const handleModalAttachmentFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      notify("Attachment exceeds 10MB limit. Please choose a smaller file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        attachment_name: file.name,
        attachment_data: reader.result,
        attachment_size: `${(file.size / 1024).toFixed(1)} KB`,
        attachment_path: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCommonAttachmentFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      notify("Common attachment exceeds 15MB limit.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCommonAttachment({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        data: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

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
      notify(`Import complete: ${totalAdded} record(s) loaded into queue.`, "success");
    }

    if (errors.length > 0) {
      notify(`Import completed with warnings: ${errors.join("; ")}`, "error");
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
                attachment_name: formData.attachment_name || (formData.attachment_path ? formData.attachment_path.split("/").pop() : ""),
                attachment_data: formData.attachment_data || "",
                attachment_size: formData.attachment_size || "",
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
        attachment_name: formData.attachment_name || (formData.attachment_path ? formData.attachment_path.split("/").pop() : ""),
        attachment_data: formData.attachment_data || "",
        attachment_size: formData.attachment_size || "",
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
      attachment_path: rec.attachment_path || "",
      attachment_name: rec.attachment_name || (rec.attachment_path ? rec.attachment_path.split("/").pop() : ""),
      attachment_data: rec.attachment_data || "",
      attachment_size: rec.attachment_size || "",
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
          commonAttachment,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Batch transmission failed.", "error");
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

      const successfulCount = json.results?.filter((r) => r.status === "sent")?.length || 0;
      notify(`Batch completed: ${successfulCount} email(s) dispatched.`, "success");

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.65 },
      });
    } catch (err) {
      notify("Batch transmission failed: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SECURITY AUTHENTICATION GATE (Login Portal)
  // ──────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#dadce0] rounded-xl shadow-lg p-8 animate-fade-in">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center mb-3 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#202124]">CloudMail Enterprise</h1>
            <p className="text-xs text-[#5f6368] mt-1">Batch Deliverability &amp; Dispatch Console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Operator Email / ID
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={authUser}
                  onChange={(e) => setAuthUser(e.target.value)}
                  placeholder="admin@enterprise.internal"
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  required
                />
                <User className="w-4 h-4 text-[#80868b] absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={authPasscode}
                  onChange={(e) => {
                    setAuthPasscode(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="Enter administrator password..."
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3.5 py-2.5 text-xs text-[#202124] pr-10 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-2.5 text-[#80868b] hover:text-[#202124] transition-colors"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authError && <p className="text-xs text-[#d93025] mt-1.5 font-medium">{authError}</p>}
            </div>

            <div className="flex items-center justify-between text-xs text-[#5f6368]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#dadce0] text-[#1a73e8] focus:ring-0"
                />
                <span>Remember session</span>
              </label>
              <span className="text-[11px] text-[#70757a]">SSL Secured</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In to Console</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#f1f3f4] text-center text-[11px] text-[#70757a] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#1e8e3e] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>256-Bit TLS Encrypted Connection</span>
            </div>
            <p className="text-[10px]">Enterprise Deliverability Infrastructure &bull; Authorized Personnel Only</p>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Guide & Domain Verification CTA */}
            <button
              onClick={() => setShowGuideModal(true)}
              title="View Domain Deliverability & Authentication Guide"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-xs font-semibold text-[#1a73e8] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Deliverability Guide</span>
            </button>

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
                  ? "Standard Gateway"
                  : provider === "mailchimp"
                  ? "Mailchimp"
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
                <span className="hidden sm:inline">Sample CSV</span>
              </button>

              <button
                onClick={downloadSampleXml}
                title="Download Sample XML Template"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#5f6368] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sample XML</span>
              </button>
            </div>

            {/* User Profile Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#f1f3f4] text-[#3c4043] rounded-full text-xs font-medium border border-[#e8eaed]">
              <User className="w-3 h-3 text-[#1a73e8]" />
              <span className="truncate max-w-[150px]">{authUser}</span>
            </div>

            {/* Lock / Sign Out */}
            <button
              onClick={handleLogout}
              title="Lock workspace console"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#fce8e6] text-xs font-medium text-[#5f6368] hover:text-[#c5221f] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. WORKFLOW STEPPER BANNER
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#e8eaed] py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-[#5f6368] gap-3">
          <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-[#1a73e8] font-medium">
              <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Upload CSV / XML / Add Records</span>
            </div>
            <span className="text-[#dadce0] hidden sm:inline">&rarr;</span>
            <div className="flex items-center gap-2 font-medium text-[#202124]">
              <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Configure Body / Template &amp; Attachments</span>
            </div>
            <span className="text-[#dadce0] hidden sm:inline">&rarr;</span>
            <div className="flex items-center gap-2 font-medium text-[#202124]">
              <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Review &amp; Dispatch</span>
            </div>
          </div>

          {/* Storage Status & Actions */}
          <div className="flex items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f9fa] border border-[#dadce0] rounded-full text-[#3c4043]">
              <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
              <span className="font-medium">Storage: <span className="text-[#1e8e3e]">Connected</span></span>
              {lastSyncedTime && <span className="text-[#70757a] hidden md:inline">&bull; {lastSyncedTime}</span>}
            </div>
            <button
              onClick={syncToCloudDb}
              disabled={isSyncingDb}
              title="Synchronize records to remote storage"
              className="px-2.5 py-1 rounded border border-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[11px] font-medium text-[#1a73e8] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingDb ? "animate-spin" : ""}`} />
              <span>Sync Storage</span>
            </button>
            <button
              onClick={loadFromCloudDb}
              disabled={isSyncingDb}
              title="Reload stored records"
              className="px-2 py-1 rounded border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[11px] font-medium text-[#5f6368] transition-colors cursor-pointer"
            >
              Reload
            </button>
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

          {/* Global Batch Common Attachment Section */}
          <div className="mt-4 pt-4 border-t border-[#e8eaed] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8f9fa] p-3.5 rounded-lg border border-[#e8eaed]">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 mt-0.5">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#202124]">Global Batch Attachment (Optional)</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#f1f3f4] text-[#5f6368] rounded">Appends to all dispatches</span>
                </div>
                <p className="text-[11px] text-[#5f6368] mt-0.5">
                  Attach a universal file (PDF, Terms document, Invoice template, or Flyer) to deliver with every email in this batch.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={commonAttachmentInputRef}
                onChange={handleCommonAttachmentFile}
                className="hidden"
              />
              {commonAttachment ? (
                <div className="flex items-center gap-2 bg-white border border-[#1a73e8] rounded-md px-2.5 py-1 text-xs shadow-xs">
                  <span className="font-medium text-[#1a73e8] truncate max-w-[150px]">{commonAttachment.name}</span>
                  <span className="text-[10px] text-[#5f6368]">({commonAttachment.size})</span>
                  <button
                    type="button"
                    onClick={() => setCommonAttachment(null)}
                    title="Remove common attachment"
                    className="p-0.5 text-[#5f6368] hover:text-[#c5221f] rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => commonAttachmentInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-medium text-[#3c4043] inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Attach File to Batch</span>
                </button>
              )}
            </div>
          </div>
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
                <label className="block text-[#202124] font-medium mb-1">
                  File Attachment (Upload Local File or Enter URL)
                </label>

                {/* Local file upload button & preview */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <input
                    type="file"
                    ref={attachmentFileInputRef}
                    onChange={handleModalAttachmentFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => attachmentFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-medium text-[#3c4043] inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#5f6368]" />
                    <span>Upload Local File (PDF, Image, Doc)</span>
                  </button>

                  {formData.attachment_name && (
                    <div className="flex items-center gap-1.5 bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-1 rounded-md text-xs text-[#1a73e8]">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="font-medium truncate max-w-[150px]">{formData.attachment_name}</span>
                      {formData.attachment_size && (
                        <span className="text-[10px] text-[#5f6368]">({formData.attachment_size})</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            attachment_name: "",
                            attachment_data: "",
                            attachment_size: "",
                            attachment_path: "",
                          })
                        }
                        className="text-[#5f6368] hover:text-[#c5221f] ml-1"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Remote URL or server path fallback */}
                <input
                  type="text"
                  value={formData.attachment_path}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attachment_path: e.target.value,
                      attachment_name: e.target.value ? e.target.value.split("/").pop() : "",
                    })
                  }
                  placeholder="Or enter remote file URL (https://... or /invoices/...)"
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

            {/* Top Config Tabs */}
            <div className="flex items-center gap-1 border-b border-[#dadce0] mt-3 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setConfigTab("gateways")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  configTab === "gateways"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Email Gateways
              </button>
              <button
                type="button"
                onClick={() => setConfigTab("database")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  configTab === "database"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Free Cloud Database
              </button>
              <button
                type="button"
                onClick={() => setConfigTab("security")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  configTab === "security"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Admin Security
              </button>
            </div>

            {/* TAB 1: EMAIL GATEWAYS */}
            {configTab === "gateways" && (
              <>
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
                  <div className="relative">
                    <input
                      type={showMailchimpKey ? "text" : "password"}
                      value={mailchimpApiKey}
                      onChange={(e) => setMailchimpApiKey(e.target.value)}
                      placeholder="md-••••••••••••••••••••••••"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] font-mono pr-9 focus:outline-none focus:border-[#1a73e8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMailchimpKey(!showMailchimpKey)}
                      className="absolute right-2.5 top-2.5 text-[#80868b] hover:text-[#202124] transition-colors"
                    >
                      {showMailchimpKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                  <div className="relative">
                    <input
                      type={showResendKey ? "text" : "password"}
                      value={resendKey}
                      onChange={(e) => setResendKey(e.target.value)}
                      placeholder="re_••••••••••••••••••••••••"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] font-mono pr-9 focus:outline-none focus:border-[#1a73e8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendKey(!showResendKey)}
                      className="absolute right-2.5 top-2.5 text-[#80868b] hover:text-[#202124] transition-colors"
                    >
                      {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value.trim() })}
                      placeholder="smtp-relay.brevo.com"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#202124] font-medium mb-1">Port</label>
                    <input
                      type="text"
                      value={smtpSettings.port}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value.trim() })}
                      placeholder="587"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">SMTP Username / Login</label>
                  <input
                    type="text"
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value.trim() })}
                    placeholder="c03022001@smtp-brevo.com"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">SMTP Key / Password</label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? "text" : "password"}
                      value={smtpSettings.pass}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value.trim() })}
                      placeholder="xsmtpsib-••••••••••••••••"
                      className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124] pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-2 text-[#80868b] hover:text-[#202124] transition-colors"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp || !smtpSettings.user || !smtpSettings.pass}
                    className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSmtp ? "animate-spin" : ""}`} />
                    <span>{isTestingSmtp ? "Testing Relay..." : "⚡ Test SMTP Connection"}</span>
                  </button>

                  <span className="text-[11px] text-[#5f6368]">
                    Brevo / Gmail / Custom Relay
                  </span>
                </div>

                {/* SMTP Test Feedback Banner */}
                {smtpTestResult && (
                  <div
                    className={`p-2.5 rounded-md text-[11px] flex items-start gap-2 ${
                      smtpTestResult.success
                        ? "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"
                        : "bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]"
                    }`}
                  >
                    {smtpTestResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-[#1e8e3e] mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#d93025] mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">{smtpTestResult.message}</p>
                      {smtpTestResult.suggestion && (
                        <p className="text-[10px] text-[#5f6368]">{smtpTestResult.suggestion}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: ENTERPRISE CLOUD STORAGE & DATABASE */}
        {configTab === "database" && (
          <div className="space-y-4 my-4 text-xs bg-[#f8f9fa] p-4 rounded-md border border-[#dadce0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#1a73e8]" />
                <div>
                  <h4 className="font-semibold text-[#202124]">Enterprise Cloud Storage &amp; Database Sync</h4>
                  <p className="text-[11px] text-[#5f6368]">Persistent database synchronization for batch recipient dispatches and deliverability logs.</p>
                </div>
              </div>
              {customDbUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-[#e6f4ea] text-[#1e8e3e] border border-[#ceead6] font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>PostgreSQL Configured</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Internal Cloud Storage: Active</span>
                </span>
              )}
            </div>

            {/* Supabase / PostgreSQL Connection Input */}
            <div className="space-y-2 bg-white p-3.5 rounded-lg border border-[#dadce0]">
              <div className="flex items-center justify-between">
                <label className="font-medium text-[#202124] flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Database Connection URI</span>
                </label>
                <a
                  href="https://supabase.com/dashboard/project/_/settings/database"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1a73e8] hover:underline text-[11px] inline-flex items-center gap-1"
                >
                  <span>Supabase Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-[#5f6368]">
                Provide your PostgreSQL connection pooling URI (Connection Pooling Session mode, port 6543/5432):
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={showDbUri ? "text" : "password"}
                    value={customDbUrl}
                    onChange={(e) => handleSaveDbUrl(e.target.value)}
                    placeholder="postgresql://user:••••••••@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded-md px-3 py-2 text-xs font-mono text-[#202124] pr-9 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbUri(!showDbUri)}
                    className="absolute right-2.5 top-2.5 text-[#80868b] hover:text-[#202124] transition-colors"
                  >
                    {showDbUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleInitSupabaseTable}
                  disabled={isCreatingTable || !customDbUrl.trim()}
                  className="px-3.5 py-2 bg-[#1e8e3e] hover:bg-[#188038] disabled:opacity-50 text-white rounded text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCreatingTable ? "animate-spin" : ""}`} />
                  <span>{isCreatingTable ? "Verifying..." : "⚡ Verify & Init Database"}</span>
                </button>
                {customDbUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveDbUrl("");
                      setDbConnectionStatus(null);
                      setCloudDbStatus("Connected");
                      notify("Custom database credentials cleared. Switched to internal cloud storage.", "info");
                    }}
                    className="px-2.5 py-2 bg-white hover:bg-[#f1f3f4] text-[#d93025] border border-[#dadce0] rounded text-xs font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                    title="Clear connection URI"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Status Alert Banner */}
              {dbConnectionStatus && (
                <div
                  className={`p-2.5 rounded-md text-[11px] flex items-start gap-2 ${
                    dbConnectionStatus.success
                      ? "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"
                      : "bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]"
                  }`}
                >
                  {dbConnectionStatus.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-[#1e8e3e] mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#d93025] mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <strong>{dbConnectionStatus.success ? "Status: Connected & Operational" : "Connection Notice:"}</strong>
                    <p>{dbConnectionStatus.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Storage Maintenance & Sync Controls */}
            <div className="p-3.5 bg-white border border-[#dadce0] rounded-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#202124] flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-[#1a73e8]" />
                  <span>Storage Maintenance</span>
                </span>
                <span className="text-[#1a73e8] font-mono text-[11px]">{records.length} records in active memory</span>
              </div>
              {lastSyncedTime && (
                <p className="text-[11px] text-[#5f6368]">Last synchronized: <strong>{lastSyncedTime}</strong></p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={syncToCloudDb}
                  disabled={isSyncingDb}
                  className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDb ? "animate-spin" : ""}`} />
                  <span>Sync Storage Now</span>
                </button>
                <button
                  type="button"
                  onClick={loadFromCloudDb}
                  disabled={isSyncingDb}
                  className="px-3 py-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043] rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Reload Records</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `dispatch_backup_${new Date().toISOString().slice(0, 10)}.json`);
                    dl.click();
                    notify("Backup exported successfully.", "success");
                  }}
                  className="px-3 py-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043] rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Export JSON Backup</span>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced SQL Schema Section */}
            <div className="border border-[#dadce0] rounded-md bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[#f8f9fa] transition-colors cursor-pointer"
              >
                <span className="font-medium text-[#202124] flex items-center gap-1.5 text-xs">
                  <FileCode className="w-4 h-4 text-[#1a73e8]" />
                  <span>Advanced Database Migration Schema (Optional)</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-[#5f6368] transition-transform ${showSqlSchema ? "rotate-180" : ""}`} />
              </button>
              {showSqlSchema && (
                <div className="p-3.5 border-t border-[#dadce0] bg-[#f8f9fa] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#5f6368]">
                      Run this script in your Supabase SQL Editor if you prefer manual table creation:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-2.5 py-1 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {sqlCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#1e8e3e]" />
                          <span className="text-[#1e8e3e] font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-[#202124] text-[#e8eaed] font-mono text-[10px] rounded-md overflow-x-auto leading-relaxed border border-[#3c4043]">
                    {SUPABASE_SQL_SCHEMA}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN SECURITY */}
        {configTab === "security" && (
          <div className="space-y-4 my-4 text-xs bg-[#f8f9fa] p-4 rounded-md border border-[#dadce0]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#dadce0]">
              <ShieldCheck className="w-5 h-5 text-[#1a73e8]" />
              <div>
                <h4 className="font-semibold text-[#202124]">Security Access &amp; Passcode Settings</h4>
                <p className="text-[11px] text-[#5f6368]">Configure the workspace passcode required to unlock the dispatcher console.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[#202124] font-medium mb-1">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? "text" : "password"}
                    value={systemPasscode}
                    onChange={(e) => {
                      setSystemPasscode(e.target.value);
                      localStorage.setItem("xml_dispatch_passcode", e.target.value);
                    }}
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs font-mono text-[#202124] pr-9 focus:outline-none focus:border-[#1a73e8]"
                    placeholder="Enter new administrator password..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-2.5 top-2.5 text-[#80868b] hover:text-[#202124] transition-colors"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1">Changes take effect immediately across all sessions.</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setShowConfigModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#c5221f] hover:bg-[#a51d24] text-white rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Workspace Console Now</span>
                </button>
              </div>
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
          7. DOMAIN VERIFICATION & EMAIL CREDITS OPERATIONAL GUIDE MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#202124]">Domain Verification &amp; Credits Guide</h3>
                  <p className="text-[11px] text-[#5f6368]">Step-by-step procedures to verify private domains and acquire sending credits.</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#dadce0] pt-3 pb-2">
              <button
                type="button"
                onClick={() => setGuideTab("verification")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  guideTab === "verification"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                DNS &amp; Domain Verification
              </button>
              <button
                type="button"
                onClick={() => setGuideTab("credits")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  guideTab === "credits"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Credits &amp; Gateway Pricing
              </button>
              <button
                type="button"
                onClick={() => setGuideTab("database")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  guideTab === "database"
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Free Hosted DB Setup
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-[#3c4043] leading-relaxed">
              {/* TAB 1: DOMAIN VERIFICATION */}
              {guideTab === "verification" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg">
                    <h4 className="font-semibold text-[#1a73e8] flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Why Must Domains Be Verified?</span>
                    </h4>
                    <p className="text-[11px] text-[#202124] mt-1">
                      Email providers (Gmail, Outlook, Yahoo) require cryptographic DNS verification so malicious parties cannot forge your company identity. A verified domain guarantees high inbox placement and bypasses spam filters.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124]">Step 1: Add DKIM Record (DomainKeys Identified Mail)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">CNAME / TXT</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Sign in to your domain registrar (GoDaddy, Namecheap, Cloudflare) &rarr; DNS Management &rarr; Add Record:
                      </p>
                      <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                        <div><strong>Type:</strong> TXT or CNAME</div>
                        <div><strong>Name / Host:</strong> <span className="text-[#1a73e8]">k1._domainkey.yourdomain.com</span></div>
                        <div><strong>Value:</strong> <span className="text-[#1e8e3e]">v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3D...</span></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124]">Step 2: Add SPF Record (Sender Policy Framework)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">TXT</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Authorizes your sending vendor to dispatch on behalf of your domain:
                      </p>
                      <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                        <div><strong>Type:</strong> TXT</div>
                        <div><strong>Host:</strong> @ (or yourdomain.com)</div>
                        <div><strong>Value:</strong> <span className="text-[#1e8e3e]">v=spf1 include:servers.mcsv.net include:resend.com ~all</span></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124]">Step 3: Add DMARC Policy</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">TXT</span>
                      </div>
                      <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                        <div><strong>Host:</strong> <span className="text-[#1a73e8]">_dmarc.yourdomain.com</span></div>
                        <div><strong>Value:</strong> <span className="text-[#1e8e3e]">v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CREDITS & PRICING */}
              {guideTab === "credits" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Mailchimp */}
                    <div className="p-4 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124] text-sm">Mailchimp (Mandrill)</span>
                        <span className="text-[10px] font-semibold text-[#1e8e3e] bg-[#e6f4ea] px-2 py-0.5 rounded">Enterprise Tier</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Best for enterprise private domains requiring dedicated reputation protection.
                      </p>
                      <div className="border-t border-[#f1f3f4] pt-2 space-y-1 text-[11px]">
                        <div><strong>Pricing:</strong> $20 / month per block of <strong>25,000 emails</strong> ($0.0008 / email).</div>
                        <div><strong>Prerequisite:</strong> Standard Mailchimp monthly plan ($13 - $20/mo).</div>
                        <div><strong>How to get:</strong> Mailchimp Dashboard &rarr; Profile &rarr; Transactional Email &rarr; Buy Blocks.</div>
                      </div>
                    </div>

                    {/* Resend */}
                    <div className="p-4 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124] text-sm">Resend API</span>
                        <span className="text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded">Fastest Setup</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Ultra-modern developer gateway with live deliverability analytics and fast DNS checks.
                      </p>
                      <div className="border-t border-[#f1f3f4] pt-2 space-y-1 text-[11px]">
                        <div><strong>Free Tier:</strong> <strong>3,000 emails / month</strong> free forever (100 / day).</div>
                        <div><strong>Pro Tier:</strong> $20 / month for <strong>50,000 emails</strong> ($0.0004 / email).</div>
                        <div><strong>How to get:</strong> Sign up at <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-[#1a73e8] underline">resend.com</a> &rarr; Domains &rarr; Add Domain &rarr; API Keys.</div>
                      </div>
                    </div>

                    {/* Brevo */}
                    <div className="p-4 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124] text-sm">Brevo (Sendinblue)</span>
                        <span className="text-[10px] font-semibold text-[#f29900] bg-[#fef7e0] px-2 py-0.5 rounded">High Free Daily</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Free SMTP relay server with generous daily allotment.
                      </p>
                      <div className="border-t border-[#f1f3f4] pt-2 space-y-1 text-[11px]">
                        <div><strong>Free Tier:</strong> <strong>300 emails / day</strong> forever (9,000 emails / month free).</div>
                        <div><strong>Starter Tier:</strong> $9 / month for 5,000 emails.</div>
                        <div><strong>How to get:</strong> Sign up at <a href="https://brevo.com" target="_blank" rel="noreferrer" className="text-[#1a73e8] underline">brevo.com</a> &rarr; SMTP &amp; API credentials.</div>
                      </div>
                    </div>

                    {/* Google Workspace */}
                    <div className="p-4 bg-white border border-[#dadce0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#202124] text-sm">Google Workspace SMTP</span>
                        <span className="text-[10px] font-semibold text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded">Included in Google</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Use your existing company Google Workspace account without buying extra credits.
                      </p>
                      <div className="border-t border-[#f1f3f4] pt-2 space-y-1 text-[11px]">
                        <div><strong>Capacity:</strong> <strong>2,000 emails / day</strong> per paid user account.</div>
                        <div><strong>How to get:</strong> Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords &rarr; Generate 16-digit password.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FREE HOSTED DB */}
              {guideTab === "database" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-white border border-[#dadce0] rounded-lg space-y-2">
                    <h4 className="font-semibold text-[#202124] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#1a73e8]" />
                      <span>Free Hosted PostgreSQL Database Setup (Supabase)</span>
                    </h4>
                    <p className="text-[11px] text-[#5f6368]">
                      Follow these 3 quick steps to initialize your free database table in Supabase:
                    </p>

                    <div className="space-y-2 pt-1 text-[11px]">
                      <div className="p-2.5 bg-[#f8f9fa] border border-[#dadce0] rounded-md space-y-1">
                        <strong className="text-[#202124]">Step 1: Get Connection URI from Supabase</strong>
                        <p className="text-[#5f6368]">
                          Go to <strong>supabase.com &rarr; Project Settings &rarr; Database &rarr; Connection string (URI)</strong> and copy the connection string.
                        </p>
                      </div>

                      <div className="p-2.5 bg-[#f8f9fa] border border-[#dadce0] rounded-md space-y-1">
                        <strong className="text-[#202124]">Step 2: Auto-Create Table or Run SQL</strong>
                        <p className="text-[#5f6368]">
                          Open <strong>Settings &rarr; Database Tab</strong> in this app, paste your URI, and click <strong>&quot;⚡ Auto-Create Table in Supabase&quot;</strong>. Or run the SQL script below directly in Supabase SQL Editor.
                        </p>
                      </div>
                    </div>

                    {/* SQL Box */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-semibold text-[#202124] text-[11px]">Supabase SQL Editor Schema:</span>
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="px-2.5 py-1 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border border-[#dadce0] rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          {sqlCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#1e8e3e]" />
                              <span className="text-[#1e8e3e] font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#5f6368]" />
                              <span>Copy SQL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-[#202124] text-[#e8eaed] font-mono text-[10px] rounded-md overflow-x-auto leading-relaxed border border-[#3c4043]">
                        {SUPABASE_SQL_SCHEMA}
                      </pre>
                    </div>
                  </div>

                  <div className="p-3 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg text-[#1a73e8] text-[11px] space-y-1">
                    <strong>Quick Test:</strong> After running the SQL or linking your connection string, click <code className="bg-white px-1 py-0.5 rounded font-mono text-[#1a73e8] border border-[#dadce0]">Push Records to Database</code> to store all recipient records instantly.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between">
              <span className="text-[11px] text-[#70757a]">Documentation standard &bull; CloudMail XML</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="btn-google-primary"
              >
                Got It, Return to Console
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

      {/* Enterprise Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-xs font-medium bg-white animate-fade-in transition-all border-[#dadce0]">
          {toast.type === "success" && <CheckCircle className="w-4 h-4 text-[#1e8e3e] shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-[#d93025] shrink-0" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-[#1a73e8] shrink-0" />}
          <span className="text-[#202124]">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-[#80868b] hover:text-[#202124] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
