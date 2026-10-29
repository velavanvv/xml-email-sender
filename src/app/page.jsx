"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
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
  Building2,
} from "lucide-react";
import confetti from "canvas-confetti";

const SUPABASE_SQL_SCHEMA = `-- CloudMail XML Multi-Tenant Enterprise Database Schema for Supabase

-- 1. Table: email_records (Recipients, Dispatches & Logs)
CREATE TABLE IF NOT EXISTS email_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
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

-- 2. Table: smtp_configurations (Relay credentials & Verified Senders)
CREATE TABLE IF NOT EXISTS smtp_configurations (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tenant_id TEXT DEFAULT 'default',
  host TEXT NOT NULL,
  port INTEGER DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  sender_email TEXT,
  sender_name TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: email_configurations (Gateway selections, API Keys & Common Templates)
CREATE TABLE IF NOT EXISTS email_configurations (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tenant_id TEXT DEFAULT 'default',
  active_provider TEXT DEFAULT 'smtp',
  resend_api_key TEXT,
  resend_from_email TEXT,
  mailchimp_api_key TEXT,
  mailchimp_from_email TEXT,
  mailchimp_from_name TEXT,
  use_common_body BOOLEAN DEFAULT false,
  common_subject TEXT,
  common_body_template TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: users (Operator Authentication & Access Control)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'company_user',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: tenants (Commercial Client Companies)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT DEFAULT 'Accounts Dept',
  plan_id TEXT DEFAULT 'plan_standard',
  monthly_quota INTEGER DEFAULT 2000,
  used_quota INTEGER DEFAULT 0,
  domain_verified BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  monthly_fee NUMERIC DEFAULT 29.00,
  billing_status TEXT DEFAULT 'paid',
  subscription_renews_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: plans (SaaS Subscription Monetization)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL,
  email_limit INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Migrations / Backward Compatibility (Guarantees missing columns exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'company_user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE email_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'Accounts Dept';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'plan_standard';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_quota INTEGER DEFAULT 2000;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS used_quota INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 29.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'paid';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- Enable Row Level Security (RLS) & default access
ALTER TABLE email_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON email_records;
CREATE POLICY "Allow all access" ON email_records FOR ALL USING (true);`;

// Isolated Tenant Default Records (Ensuring each customer only sees their own client emails)
const TENANT_DEFAULT_RECORDS = {
  tenant_acme: [
    {
      id: "rec_acme_1",
      tenant_id: "tenant_acme",
      recipient_email: "sarah.jenkins@acmecorp.com",
      subject: "Acme Global - October Commercial Invoice #ACM-891",
      message: "Dear Sarah, please find your Acme Global monthly commercial invoice attached for settlement.",
      attachment_path: "/invoices/2026/acme_invoice_891.pdf",
      attachment_name: "acme_invoice_891.pdf",
      extra_fields: { name: "Sarah Jenkins", company: "Acme Corp", dept: "Procurement", invoice_id: "ACM-891" },
      status: "sent",
      status_message: "Delivered to Primary Inbox",
      batch_name: "Acme_Oct_Batch",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      sent_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "rec_acme_2",
      tenant_id: "tenant_acme",
      recipient_email: "david.lee@acmeglobal.com",
      subject: "Acme Assembly - Industrial Parts Supply Statement",
      message: "Hi David, parts delivery and assembly inventory statement attached for your review.",
      attachment_path: "/invoices/2026/acme_parts_statement.pdf",
      attachment_name: "acme_parts_statement.pdf",
      extra_fields: { name: "David Lee", company: "Acme Global", dept: "Assembly", invoice_id: "ACM-892" },
      status: "pending",
      status_message: "",
      batch_name: "Acme_Oct_Batch",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  tenant_globex: [
    {
      id: "rec_globex_1",
      tenant_id: "tenant_globex",
      recipient_email: "dispatch@globex.org",
      subject: "Globex Freight - Shipping Manifest #GLX-99",
      message: "Clearance airway bill, air freight cargo details and customs documentation attached.",
      attachment_path: "/manifests/globex_airway_bill.pdf",
      attachment_name: "globex_airway_bill.pdf",
      extra_fields: { name: "Globex Shipping", tracking: "GLX-99201", origin: "Frankfurt", dest: "Chicago" },
      status: "sent",
      status_message: "Delivered to Primary Inbox",
      batch_name: "Globex_Dispatch_Oct",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      sent_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "rec_globex_2",
      tenant_id: "tenant_globex",
      recipient_email: "elena.rostova@globex-freight.com",
      subject: "Globex Demurrage & Terminal Surcharge Advice",
      message: "Carrier payment advice, terminal storage breakdown and customs invoice attached.",
      attachment_path: "/receipts/globex_carrier_payment.pdf",
      attachment_name: "globex_carrier_payment.pdf",
      extra_fields: { name: "Elena Rostova", route: "Pacific-Northwest", settlement_id: "SET-4412" },
      status: "pending",
      status_message: "",
      batch_name: "Globex_Dispatch_Oct",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  tenant_apex: [
    {
      id: "rec_apex_1",
      tenant_id: "tenant_apex",
      recipient_email: "jennifer@apexclients.com",
      subject: "Apex Financial - Quarterly Dividend Advice",
      message: "Dear Jennifer, your private portfolio dividend notice and tax withholding summary are attached.",
      attachment_path: "/statements/apex_q3_dividend.pdf",
      attachment_name: "apex_q3_dividend.pdf",
      extra_fields: { name: "Jennifer Hayes", portfolio_no: "APX-90021", dividend: "$1,450.00" },
      status: "sent",
      status_message: "Delivered to Primary Inbox",
      batch_name: "Apex_Quarterly_Oct",
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      sent_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ],
  tenant_sterling: [
    {
      id: "rec_sterling_1",
      tenant_id: "tenant_sterling",
      recipient_email: "rchen@sterlinghealth.io",
      subject: "Sterling Health - Diagnostic Pathology Report #SH-7712",
      message: "Dr. Chen, verified patient diagnostic lab results and histology reports are encrypted and attached.",
      attachment_path: "/lab_reports/sterling_7712.pdf",
      attachment_name: "sterling_7712.pdf",
      extra_fields: { name: "Dr. Robert Chen", patient_ref: "PT-88124", clinic: "Cardiology" },
      status: "sent",
      status_message: "Delivered to Primary Inbox",
      batch_name: "Sterling_Lab_Oct",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      sent_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ],
};

export default function EnterpriseEmailDashboard() {
  const [records, setRecords] = useState([]);
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
  const [loginTab, setLoginTab] = useState("company"); // "company" | "admin"
  const [userRole, setUserRole] = useState("company_user"); // "company_user" | "administrator"
  const [authUser, setAuthUser] = useState("admin@acmecorp.com");
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
  const [activeTenant, setActiveTenant] = useState(null);

  // Customer Self-Service Password Security Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
    showPass: false,
    isLoading: false,
  });

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
    host: "smtp-relay.brevo.com",
    port: "587",
    user: "",
    pass: "",
    senderEmail: "",
    senderName: "CloudMail Team",
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
      const savedRole = localStorage.getItem("xml_dispatch_role") || sessionStorage.getItem("xml_dispatch_role") || "company_user";

      // Super Admin direct navigation: if admin is already authenticated, go directly to /admin
      if ((sessionAuth === "true" || localAuth === "true") && savedRole === "administrator") {
        window.location.replace("/admin");
        return;
      }

      if (sessionAuth === "true" || localAuth === "true") {
        setIsAuthenticated(true);
      }

      setUserRole(savedRole);

      const savedUser = localStorage.getItem("xml_dispatch_user") || sessionStorage.getItem("xml_dispatch_user") || (savedRole === "administrator" ? "admin@enterprise.internal" : "admin@acmecorp.com");
      setAuthUser(savedUser);

      const savedDbUrl = localStorage.getItem("xml_dispatch_db_url") || "";
      if (savedDbUrl) setCustomDbUrl(savedDbUrl);

      // Check if launched as specific commercial client from SaaS Admin
      const storedTenant = localStorage.getItem("xml_dispatch_active_tenant");
      if (storedTenant) {
        try {
          const t = JSON.parse(storedTenant);
          setActiveTenant(t);

          // Strictly load isolated client records for this specific customer
          const tenantKey = `xml_dispatch_records_${t.id}`;
          const savedTenantRecs = localStorage.getItem(tenantKey);
          if (savedTenantRecs) {
            const parsed = JSON.parse(savedTenantRecs);
            if (Array.isArray(parsed)) setRecords(parsed);
          } else if (TENANT_DEFAULT_RECORDS[t.id]) {
            setRecords(TENANT_DEFAULT_RECORDS[t.id]);
          } else {
            setRecords([]);
          }

          if (t.smtp_host) {
            setSmtpSettings({
              host: t.smtp_host,
              port: (t.smtp_port || 587).toString(),
              user: t.smtp_user || "",
              pass: t.smtp_pass || "",
              senderEmail: t.smtp_sender_email || t.sender_email || "",
              senderName: t.smtp_sender_name || t.sender_name || "",
            });
          } else if (t.sender_email) {
            setSmtpSettings((prev) => ({
              ...prev,
              senderEmail: t.sender_email,
              senderName: t.sender_name || prev.senderName,
            }));
          }
        } catch (err) {
          console.warn("Tenant read error", err);
        }
      }
    } catch (e) {
      console.warn("Could not read from local storage", e);
    }
  }, []);

  // Save isolated records to LocalStorage strictly per tenant
  useEffect(() => {
    if (!isClientLoaded || !activeTenant?.id) return;
    try {
      localStorage.setItem(`xml_dispatch_records_${activeTenant.id}`, JSON.stringify(records));
    } catch (e) {
      console.warn("Could not save records to local storage", e);
    }
  }, [records, isClientLoaded, activeTenant?.id]);

  // Authentication Handlers (Separate Company Login vs Admin Login)
  const handleLogin = async (e) => {
    e?.preventDefault();
    const cleanPass = authPasscode.trim();
    const cleanUser = authUser.trim() || (loginTab === "admin" ? "admin@enterprise.internal" : "admin@acmecorp.com");
    const isSuperAdminIntent = loginTab === "admin" || cleanUser.toLowerCase().includes("admin@enterprise");

    // 1. Check Supabase / Cloud DB via backend authenticate_user action
    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();
      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "authenticate_user",
          connectionString: customDbUrl.trim() || undefined,
          authCredentials: {
            email: cleanUser,
            password: cleanPass,
            expectedRole: isSuperAdminIntent ? "administrator" : "company_user",
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthError("");
        const role = data.userType === "super_admin" ? "administrator" : "company_user";

        const storageTarget = rememberMe ? localStorage : sessionStorage;
        storageTarget.setItem("xml_dispatch_auth", "true");
        storageTarget.setItem("xml_dispatch_user", cleanUser);
        storageTarget.setItem("xml_dispatch_role", role);

        // Super Admin: IMMEDIATELY navigate to /admin - NO customer UI flash
        if (data.userType === "super_admin" || role === "administrator" || isSuperAdminIntent) {
          localStorage.setItem("xml_dispatch_role", "administrator");
          window.location.replace("/admin");
          return;
        }

        // Company Client Login: render customer console
        setIsAuthenticated(true);
        setUserRole(role);

        if (data.tenant) {
          setActiveTenant(data.tenant);
          localStorage.setItem("xml_dispatch_active_tenant", JSON.stringify(data.tenant));

          // Strictly load isolated customer records
          const tenantKey = `xml_dispatch_records_${data.tenant.id}`;
          const savedRecs = localStorage.getItem(tenantKey);
          if (savedRecs) {
            try {
              const parsed = JSON.parse(savedRecs);
              if (Array.isArray(parsed)) setRecords(parsed);
            } catch {
              setRecords(TENANT_DEFAULT_RECORDS[data.tenant.id] || []);
            }
          } else if (TENANT_DEFAULT_RECORDS[data.tenant.id]) {
            setRecords(TENANT_DEFAULT_RECORDS[data.tenant.id]);
          } else {
            setRecords([]);
          }

          if (data.tenant.smtp_host) {
            setSmtpSettings({
              host: data.tenant.smtp_host,
              port: (data.tenant.smtp_port || 587).toString(),
              user: data.tenant.smtp_user || "",
              pass: data.tenant.smtp_pass || "",
              senderEmail: data.tenant.smtp_sender_email || data.tenant.sender_email || "",
              senderName: data.tenant.smtp_sender_name || data.tenant.sender_name || "",
            });
          } else if (data.tenant.sender_email) {
            setSmtpSettings((prev) => ({
              ...prev,
              senderEmail: data.tenant.sender_email,
              senderName: data.tenant.sender_name || prev.senderName,
            }));
          }
          notify(`Welcome ${data.tenant.name}. Signed into Company Dispatch Console.`, "success");
        }
        return;
      } else if (data.error) {
        setAuthError(data.error);
        return;
      }
    } catch {
      // Fallback if network or DB offline
    }

    // 2. Master Fallback Authentication
    if (cleanPass === systemPasscode.trim() || cleanPass === "admin123") {
      setAuthError("");
      const isSuperAdmin = isSuperAdminIntent;
      const role = isSuperAdmin ? "administrator" : "company_user";

      const storageTarget = rememberMe ? localStorage : sessionStorage;
      storageTarget.setItem("xml_dispatch_auth", "true");
      storageTarget.setItem("xml_dispatch_user", cleanUser);
      storageTarget.setItem("xml_dispatch_role", role);

      if (isSuperAdmin) {
        localStorage.setItem("xml_dispatch_role", "administrator");
        window.location.replace("/admin");
        return;
      }

      setIsAuthenticated(true);
      setUserRole(role);

      const demoTenant = {
        id: "tenant_acme",
        name: "Acme Global Manufacturing",
        contact_email: cleanUser,
        sender_email: "invoices@acmecorp.com",
        sender_name: "Acme Billing Team",
        plan_id: "plan_standard",
        monthly_quota: 2000,
        used_quota: 1420,
        domain_verified: true,
        status: "active",
        monthly_fee: 29.00,
        subscription_renews_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      };
      setActiveTenant(demoTenant);
      localStorage.setItem("xml_dispatch_active_tenant", JSON.stringify(demoTenant));

      const tenantKey = `xml_dispatch_records_${demoTenant.id}`;
      const savedRecs = localStorage.getItem(tenantKey);
      if (savedRecs) {
        try {
          const parsed = JSON.parse(savedRecs);
          if (Array.isArray(parsed)) setRecords(parsed);
        } catch {
          setRecords(TENANT_DEFAULT_RECORDS[demoTenant.id] || []);
        }
      } else {
        setRecords(TENANT_DEFAULT_RECORDS[demoTenant.id] || []);
      }

      notify(`Welcome ${demoTenant.name}. Signed into Company Console.`, "success");
    } else {
      setAuthError("Invalid credentials. Please verify your password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("xml_dispatch_auth");
    sessionStorage.removeItem("xml_dispatch_auth");
    localStorage.removeItem("xml_dispatch_role");
    sessionStorage.removeItem("xml_dispatch_role");
    localStorage.removeItem("xml_dispatch_active_tenant");
    setIsAuthenticated(false);
    setActiveTenant(null);
    setRecords([]);
    setAuthPasscode("");
    notify("Workspace session locked.", "info");
  };

  // Change Customer Password Handler
  const handleChangePassword = async (e) => {
    e?.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.trim().length < 6) {
      notify("New password must be at least 6 characters.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify("Passwords do not match. Please re-type identical passwords.", "error");
      return;
    }

    setPasswordForm((p) => ({ ...p, isLoading: true }));
    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "change_password",
          tenantId: activeTenant?.id || "",
          email: activeTenant?.contact_email || authUser || "",
          newPassword: passwordForm.newPassword.trim(),
          connectionString: customDbUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify("Password updated successfully! Please use your new password on next login.", "success");
        setShowPasswordModal(false);
        setPasswordForm({ newPassword: "", confirmPassword: "", showPass: false, isLoading: false });
      } else {
        notify(data.error || "Failed to update password.", "error");
      }
    } catch {
      notify("Network error while communicating with server.", "error");
    } finally {
      setPasswordForm((p) => ({ ...p, isLoading: false }));
    }
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

  const saveBackendConfiguration = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      // 1. Save SMTP settings to 'smtp_configurations' table
      await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "save_smtp",
          connectionString: customDbUrl.trim() || undefined,
          smtpConfig: smtpSettings,
        }),
      });

      // 2. Save Gateway & Template settings to 'email_configurations' table
      await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "save_email_config",
          connectionString: customDbUrl.trim() || undefined,
          emailConfig: {
            provider,
            resendKey,
            resendFromEmail,
            mailchimpApiKey,
            mailchimpFromEmail,
            mailchimpFromName,
            useCommonBody,
            commonSubject,
            commonBodyTemplate: commonBody,
          },
        }),
      });
      return true;
    } catch (e) {
      console.warn("Failed to sync config to Supabase:", e);
      return false;
    }
  };

  const handleInitSupabaseTable = async () => {
    if (!customDbUrl.trim()) {
      notify("Please provide a database connection string in settings.", "error");
      return;
    }
    if (customDbUrl.includes("db.") && customDbUrl.includes(".supabase.co")) {
      notify("Supabase Direct host 'db.*' is IPv6-only. Use Connection Pooler URI (port 6543) instead.", "error");
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
          action: "init_all_tables",
          connectionString: customDbUrl.trim(),
        }),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.success) {
        setDbConnectionStatus({
          success: true,
          message: data.message || "All 4 Supabase tables initialized and verified.",
          tables: data.tables,
          host: "Supabase PostgreSQL Database",
        });
        setCloudDbStatus("Connected");
        notify("All 4 Supabase tables verified and synchronized!", "success");

        // Immediately seed current active settings to the newly created Supabase tables
        saveBackendConfiguration();
      } else {
        setDbConnectionStatus({
          success: false,
          message: data.error || "Failed to initialize tables",
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
    if (customDbUrl.includes("db.") && customDbUrl.includes(".supabase.co")) {
      notify("Direct host 'db.*' is IPv6-only. Switch to Connection Pooler URI (port 6543) in Settings.", "error");
      return;
    }
    setIsSyncingDb(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) {
        headers["x-database-url"] = customDbUrl.trim();
      }

      // Also persist latest configs alongside records
      await saveBackendConfiguration();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          records,
          tenant_id: activeTenant?.id || undefined,
          connectionString: customDbUrl.trim() || undefined,
        }),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.success) {
        setLastSyncedTime(new Date().toLocaleTimeString());
        notify(`Storage synchronized: ${data.count} records, SMTP & templates saved to Supabase!`, "success");
      } else {
        notify(data.error || "Storage sync pending. Recheck database configuration.", "error");
      }
    } catch {
      notify("Storage sync encountered a network issue. Retrying later.", "error");
    } finally {
      setIsSyncingDb(false);
    }
  };

  const loadFromCloudDb = async (targetTenantId) => {
    const tid = targetTenantId || activeTenant?.id;
    if (customDbUrl.includes("db.") && customDbUrl.includes(".supabase.co")) {
      notify("Direct host 'db.*' is IPv6-only. Switch to Connection Pooler URI (port 6543) in Settings.", "error");
      return;
    }
    setIsSyncingDb(true);
    try {
      const headers = {};
      let url = "/api/db?action=load_all";
      if (tid) {
        url += `&tenantId=${encodeURIComponent(tid)}`;
        headers["x-tenant-id"] = tid;
      }
      if (customDbUrl.trim()) {
        headers["x-database-url"] = customDbUrl.trim();
        url += `&connectionString=${encodeURIComponent(customDbUrl.trim())}`;
      }
      const res = await fetch(url, { headers });
      const data = await parseApiResponse(res);
      if (res.ok) {
        if (data.records && Array.isArray(data.records)) {
          setRecords(data.records);
        }
        if (data.smtpConfig) {
          setSmtpSettings(data.smtpConfig);
        }
        if (data.emailConfig) {
          if (data.emailConfig.provider) setProvider(data.emailConfig.provider);
          if (data.emailConfig.resendKey) setResendKey(data.emailConfig.resendKey);
          if (data.emailConfig.resendFromEmail) setResendFromEmail(data.emailConfig.resendFromEmail);
          if (data.emailConfig.mailchimpApiKey) setMailchimpApiKey(data.emailConfig.mailchimpApiKey);
          if (data.emailConfig.mailchimpFromEmail) setMailchimpFromEmail(data.emailConfig.mailchimpFromEmail);
          if (data.emailConfig.mailchimpFromName) setMailchimpFromName(data.emailConfig.mailchimpFromName);
          if (data.emailConfig.useCommonBody !== undefined) setUseCommonBody(data.emailConfig.useCommonBody);
          if (data.emailConfig.commonSubject) setCommonSubject(data.emailConfig.commonSubject);
          if (data.emailConfig.commonBodyTemplate) setCommonBody(data.emailConfig.commonBodyTemplate);
        }
        setLastSyncedTime(new Date().toLocaleTimeString());
        notify(`Loaded from Supabase: ${data.records?.length || 0} records, SMTP & Gateway configurations active.`, "success");
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
      if (!r) return false;
      const q = (searchQuery || "").trim().toLowerCase();
      const recEmail = (r.recipient_email || "").toLowerCase();
      const recSub = (r.subject || "").toLowerCase();
      const recMsg = (r.message || "").toLowerCase();
      const recAtt = (r.attachment_path ? String(r.attachment_path) : "").toLowerCase();

      const matchesSearch =
        !q ||
        recEmail.includes(q) ||
        recSub.includes(q) ||
        recMsg.includes(q) ||
        recAtt.includes(q);

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

    // SaaS Quota enforcement: Prevent send if company quota is exhausted
    if (activeTenant && (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000)) {
      notify("Monthly dispatch quota exhausted (100% allocation used). Please upgrade your plan in Admin.", "error");
      return;
    }

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
          fromEmail: provider === "mailchimp" ? mailchimpFromEmail : (provider === "smtp" ? (smtpSettings.senderEmail || smtpSettings.user) : resendFromEmail),
          fromName: provider === "mailchimp" ? mailchimpFromName : (provider === "smtp" ? (smtpSettings.senderName || "CloudMail Dispatcher") : "Dispatch Team"),
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

      // Update tenant quota if dispatching under a company account
      if (activeTenant && successfulCount > 0) {
        const updatedQuota = (parseInt(activeTenant.used_quota, 10) || 0) + successfulCount;
        const updatedTenant = { ...activeTenant, used_quota: updatedQuota };
        setActiveTenant(updatedTenant);
        try {
          localStorage.setItem("xml_dispatch_active_tenant", JSON.stringify(updatedTenant));
          fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_tenant_quota",
              tenant_id: activeTenant.id,
              increment_by: successfulCount,
            }),
          }).catch(() => {});
        } catch (e) {
          console.warn("Could not persist quota update:", e);
        }
      }

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
  // SECURITY AUTHENTICATION GATE (Role Separation: Company vs Super Admin)
  // ──────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-lg bg-white border border-[#dadce0] rounded-xl shadow-lg p-8 animate-fade-in">
          {/* Logo & Platform Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center mb-3 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#202124]">CloudMail SaaS Platform</h1>
            <p className="text-xs text-[#5f6368] mt-1">Multi-Tenant Email Infrastructure &amp; Dispatch Console</p>
          </div>

          {/* DUAL LOGIN ROLE TABS */}
          <div className="grid grid-cols-2 p-1 bg-[#f1f3f4] rounded-lg mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setLoginTab("company");
                setAuthUser("admin@acmecorp.com");
                setAuthPasscode("admin123");
                setAuthError("");
              }}
              className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginTab === "company"
                  ? "bg-white text-[#1a73e8] shadow-xs font-bold"
                  : "text-[#5f6368] hover:text-[#202124]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 Company Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginTab("admin");
                setAuthUser("admin@enterprise.internal");
                setAuthPasscode("admin123");
                setAuthError("");
              }}
              className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginTab === "admin"
                  ? "bg-white text-[#1a73e8] shadow-xs font-bold"
                  : "text-[#5f6368] hover:text-[#202124]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🛡️ Super Admin</span>
            </button>
          </div>

          {/* TAB EXPLANATION BANNER */}
          {loginTab === "company" ? (
            <div className="bg-[#e8f0fe] border border-[#d2e3fc] text-[#174ea6] rounded-md p-3 mb-5 text-[11px] leading-relaxed">
              <strong>Company Portal:</strong> Client workspace for XML batch uploads, recipient parsing, personalized sending, and real-time subscription &amp; quota tracking.
            </div>
          ) : (
            <div className="bg-[#fef7e0] border border-[#fdd663] text-[#b06000] rounded-md p-3 mb-5 text-[11px] leading-relaxed">
              <strong>Master Operator Console:</strong> Super Admin access to customer onboarding, sender email mapping, SMTP vendor credentials, pricing plans, and platform MRR.
            </div>
          )}

          {/* 1-CLICK DEMO ACCOUNTS BAR */}
          <div className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#70757a] mb-1.5 flex items-center justify-between">
              <span>Quick Demo Accounts (1-Click Fill)</span>
              <span className="text-[#1e8e3e]">Default: admin123</span>
            </div>
            {loginTab === "company" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthUser("admin@acmecorp.com");
                    setAuthPasscode("admin123");
                    setAuthError("");
                  }}
                  className="px-2 py-1.5 bg-[#f8f9fa] hover:bg-[#e8f0fe] hover:border-[#1a73e8] border border-[#dadce0] rounded text-[11px] font-medium text-left truncate transition-colors text-[#202124]"
                  title="Acme Global Manufacturing (Standard Tier)"
                >
                  <div className="font-semibold truncate">Acme Global</div>
                  <div className="text-[10px] text-[#5f6368] truncate">admin@acmecorp.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthUser("dispatch@globex.org");
                    setAuthPasscode("admin123");
                    setAuthError("");
                  }}
                  className="px-2 py-1.5 bg-[#f8f9fa] hover:bg-[#e8f0fe] hover:border-[#1a73e8] border border-[#dadce0] rounded text-[11px] font-medium text-left truncate transition-colors text-[#202124]"
                  title="Globex Logistics International"
                >
                  <div className="font-semibold truncate">Globex Logistics</div>
                  <div className="text-[10px] text-[#5f6368] truncate">dispatch@globex.org</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthUser("billing@apexfinancial.com");
                    setAuthPasscode("admin123");
                    setAuthError("");
                  }}
                  className="px-2 py-1.5 bg-[#f8f9fa] hover:bg-[#e8f0fe] hover:border-[#1a73e8] border border-[#dadce0] rounded text-[11px] font-medium text-left truncate transition-colors text-[#202124]"
                  title="Apex Financial Partners (Enterprise Tier)"
                >
                  <div className="font-semibold truncate">Apex Financial</div>
                  <div className="text-[10px] text-[#5f6368] truncate">billing@apexfin...</div>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthUser("admin@enterprise.internal");
                    setAuthPasscode("admin123");
                    setAuthError("");
                  }}
                  className="px-3 py-2 bg-[#f8f9fa] hover:bg-[#e8f0fe] hover:border-[#1a73e8] border border-[#dadce0] rounded text-[11px] font-medium text-left transition-colors flex items-center justify-between text-[#202124]"
                >
                  <div>
                    <div className="font-bold text-[#1a73e8]">Platform Super Admin</div>
                    <div className="text-[10px] text-[#5f6368]">admin@enterprise.internal</div>
                  </div>
                  <span className="text-[10px] bg-[#e8f0fe] text-[#1a73e8] font-bold px-2 py-0.5 rounded">All Permissions</span>
                </button>
              </div>
            )}
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                {loginTab === "company" ? "Company Account Email / ID" : "Platform Master Administrator Email"}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={authUser}
                  onChange={(e) => setAuthUser(e.target.value)}
                  placeholder={loginTab === "company" ? "company@business.com" : "admin@enterprise.internal"}
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  required
                />
                {loginTab === "company" ? (
                  <Building2 className="w-4 h-4 text-[#80868b] absolute right-3 top-2.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-[#80868b] absolute right-3 top-2.5" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                {loginTab === "company" ? "Company Password" : "Master Security Passcode"}
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={authPasscode}
                  onChange={(e) => {
                    setAuthPasscode(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="Enter password..."
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3.5 py-2.5 text-xs text-[#202124] pr-10 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
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
              <span className="text-[11px] text-[#70757a]">SSL 256-Bit Encrypted</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {loginTab === "company" ? "Sign In to Company Console" : "Authenticate & Open SaaS Admin"}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#f1f3f4] text-center text-[11px] text-[#70757a] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#1e8e3e] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Tenant Supabase &amp; Relay Isolation Active</span>
            </div>
            <p className="text-[10px]">Corporate Email Dispatch Platform &bull; Authorized Accounts Only</p>
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
                    {userRole === "administrator" ? "Master Console" : "Company Console"}
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
            {/* SaaS Admin Portal Button (ONLY accessible/visible to Super Admin) */}
            {userRole === "administrator" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1a73e8] bg-[#1a73e8] hover:bg-[#1557b0] text-xs font-semibold text-white shadow-xs transition-colors"
                title="Open Multi-Tenant SaaS Administration Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SaaS Admin Portal</span>
              </Link>
            )}

            {/* Customer Verified Sender Info */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#dadce0] bg-[#f8f9fa] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
              <span className="text-[#5f6368]">Verified Sender:</span>
              <span className="font-semibold text-[#202124]">
                {activeTenant?.sender_email || smtpSettings.senderEmail || "invoices@acmecorp.com"}
              </span>
            </div>

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
              {userRole === "administrator" ? (
                <ShieldCheck className="w-3 h-3 text-[#1a73e8]" />
              ) : (
                <Building2 className="w-3 h-3 text-[#1e8e3e]" />
              )}
              <span className="truncate max-w-[150px]">{authUser}</span>
            </div>

            {/* Change Portal Password */}
            <button
              onClick={() => {
                setPasswordForm({ newPassword: "", confirmPassword: "", showPass: false, isLoading: false });
                setShowPasswordModal(true);
              }}
              title="Change your customer portal login password"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#3c4043] hover:text-[#1a73e8] transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-[#5f6368]" />
              <span className="hidden sm:inline">Change Password</span>
            </button>

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

      {/* SAAS COMPANY LICENSE, EXPIRY & QUOTA BANNER */}
      {activeTenant && (
        <div className="bg-white border-b border-[#dadce0] px-4 sm:px-6 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Company Profile & Verified Sender */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] shrink-0 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#202124]">{activeTenant.name}</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e] animate-pulse"></span>
                    Active SaaS License
                  </span>
                </div>
                <div className="text-xs text-[#5f6368] flex items-center gap-2 mt-0.5">
                  <span>Verified Sender: <strong className="text-[#202124]">{activeTenant.sender_email || "Not Configured"}</strong></span>
                  <span>&bull;</span>
                  <span className="capitalize">Plan: <strong className="text-[#1a73e8]">{activeTenant.plan_id ? activeTenant.plan_id.replace('plan_', '').replace('_', ' ') : 'Standard'} (${activeTenant.monthly_fee || 29}/mo)</strong></span>
                </div>
              </div>
            </div>

            {/* Quota Progress & Expiry Countdown */}
            <div className="flex flex-wrap items-center gap-5 text-xs">
              {/* Quota Meter */}
              <div className="min-w-[210px]">
                <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                  <span className="text-[#5f6368]">Monthly Dispatch Quota</span>
                  <span className="font-semibold text-[#202124]">
                    {activeTenant.used_quota?.toLocaleString() || 0} / {activeTenant.monthly_quota?.toLocaleString() || 2000} ({Math.round(((activeTenant.used_quota || 0) / (activeTenant.monthly_quota || 2000)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#e8eaed] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000)
                        ? "bg-[#d93025]"
                        : ((activeTenant.used_quota || 0) / (activeTenant.monthly_quota || 2000)) > 0.8
                        ? "bg-[#f29900]"
                        : "bg-[#1a73e8]"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round(((activeTenant.used_quota || 0) / (activeTenant.monthly_quota || 2000)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* License Expiry / Renewal Countdown */}
              <div className="border-l border-[#dadce0] pl-4 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#1a73e8]" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#5f6368] tracking-wider">Subscription Renewal</div>
                  <div className="text-xs font-semibold text-[#202124]">
                    {(() => {
                      if (!activeTenant.subscription_renews_at) return "Active (Renews in 30 days)";
                      const renewDate = new Date(activeTenant.subscription_renews_at);
                      const daysRemaining = Math.max(0, Math.ceil((renewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      return (
                        <span className={daysRemaining <= 5 ? "text-[#d93025] font-bold" : "text-[#137333]"}>
                          Renews in {daysRemaining} days ({renewDate.toLocaleDateString()})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Context Switcher for Admin only */}
              {userRole === "administrator" && (
                <div className="border-l border-[#dadce0] pl-4 flex items-center gap-2">
                  <Link href="/admin" className="text-xs text-[#1a73e8] hover:underline font-semibold flex items-center gap-1">
                    Admin &rarr;
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem("xml_dispatch_active_tenant");
                      setActiveTenant(null);
                      notify("Exited company context. Returned to general view.", "info");
                    }}
                    className="text-xs text-[#d93025] hover:underline cursor-pointer"
                  >
                    Exit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quota Exhaustion Warning */}
          {(activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000) && (
            <div className="mt-3 text-xs bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] px-3.5 py-2 rounded-md flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Monthly email allocation reached ({activeTenant.used_quota} / {activeTenant.monthly_quota}). Additional dispatches are paused until monthly renewal or SaaS plan upgrade.
              </span>
            </div>
          )}
        </div>
      )}

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

            {/* Main Dispatch CTA with Quota Enforcement */}
            <button
              onClick={() => {
                const target =
                  selectedIds.size > 0
                    ? records.filter((r) => selectedIds.has(r.id))
                    : records.filter((r) => r.status === "pending");
                triggerSend(target);
              }}
              disabled={
                isSending ||
                records.length === 0 ||
                Boolean(activeTenant && (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000))
              }
              title={
                activeTenant && (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000)
                  ? "Monthly dispatch quota exhausted (100% used). Contact administrator to upgrade plan."
                  : ""
              }
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                activeTenant && (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000)
                  ? "bg-[#80868b] opacity-60 cursor-not-allowed"
                  : "bg-[#1e8e3e] hover:bg-[#187532] disabled:opacity-50"
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
              <span>
                {isSending
                  ? "Transmitting Batch..."
                  : activeTenant && (activeTenant.used_quota || 0) >= (activeTenant.monthly_quota || 2000)
                  ? "Quota Exhausted (Paused)"
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
                              title={String(r.attachment_path)}
                            >
                              <Paperclip className="w-3 h-3 text-[#5f6368] shrink-0" />
                              <span className="truncate">{String(r.attachment_path).split("/").pop()}</span>
                            </div>
                          ) : (
                            <span className="text-[#80868b] text-xs">None</span>
                          )}
                        </td>

                        {/* Custom Fields */}
                        <td>
                          {(() => {
                            let fields = r.extra_fields;
                            if (typeof fields === "string") {
                              try { fields = JSON.parse(fields); } catch { fields = null; }
                            }
                            if (fields && typeof fields === "object" && Object.keys(fields).length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {Object.entries(fields).map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="text-[11px] px-1.5 py-0.5 rounded bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0]"
                                    >
                                      {k}: <strong className="text-[#202124] font-medium">{String(v)}</strong>
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return <span className="text-[#80868b] text-xs">—</span>;
                          })()}
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
          CUSTOMER CHANGE PASSWORD SECURITY MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#202124]">Update Portal Password</h3>
                  <p className="text-[11px] text-[#5f6368]">
                    Account: <strong className="text-[#202124]">{activeTenant?.contact_email || authUser}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-[#202124] font-medium text-xs mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={passwordForm.showPass ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters..."
                    required
                    minLength={6}
                    className="w-full bg-white border border-[#dadce0] rounded-md pl-3 pr-10 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordForm({ ...passwordForm, showPass: !passwordForm.showPass })}
                    className="absolute right-2.5 top-2 text-[#5f6368] hover:text-[#202124]"
                  >
                    {passwordForm.showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#202124] font-medium text-xs mb-1">Confirm New Password</label>
                <input
                  type={passwordForm.showPass ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-type new password..."
                  required
                  minLength={6}
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#dadce0] text-[11px] text-[#5f6368] space-y-1">
                <span className="font-semibold text-[#202124] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1e8e3e]" />
                  Password Security Rules
                </span>
                <p>Changing your password immediately updates your database login credentials in Supabase.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dadce0]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-medium text-[#5f6368]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordForm.isLoading}
                  className="px-4 py-2 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {passwordForm.isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
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
