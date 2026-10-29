"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Mail,
  Server,
  RefreshCw,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  Search,
  Check,
  Copy,
  Globe,
  Activity,
  Layers,
  Database,
  Calendar,
  Lock,
  LogOut,
  PauseCircle,
  Play,
  BookOpen,
  Sliders,
  X,
  Eye,
  EyeOff,
  Send,
} from "lucide-react";

export default function SaaSAdminPortal() {
  const [activeTab, setActiveTab] = useState("tenants"); // 'tenants' | 'plans' | 'revenue' | 'system'
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState("");
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState({
    mrr: 580,
    arr: 6960,
    activeTenants: 6,
    totalClients: 6,
    aggregateQuotaUsed: 10120,
    aggregateTotalQuota: 15000,
    totalDispatches: 24,
    estInfrastructureCost: 49.0,
    netProfit: 531.0,
    profitMargin: "91.5",
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Onboard / Edit Tenant Modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantPass, setShowTenantPass] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    id: "",
    name: "",
    contact_email: "",
    password: "",
    sender_email: "",
    sender_name: "Accounts Department",
    plan_id: "plan_standard",
    monthly_quota: 2000,
    monthly_fee: 29.0,
    domain_verified: true,
    status: "active",
  });

  // DNS Guide Modal
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [selectedTenantDns, setSelectedTenantDns] = useState(null);
  const [copiedKey, setCopiedKey] = useState("");

  // Deliverability & DNS Architecture Guide Modal
  const [showDeliverabilityModal, setShowDeliverabilityModal] = useState(false);
  const [deliverabilityTab, setDeliverabilityTab] = useState("overview");

  // Per-Customer Email Gateway Configuration Modal
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [selectedTenantGateway, setSelectedTenantGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    host: "smtp-relay.brevo.com",
    port: "587",
    user: "c03022001@smtp-brevo.com",
    pass: "",
    senderEmail: "",
    senderName: "",
    provider: "smtp",
  });
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState(null);
  const [showGatewayPass, setShowGatewayPass] = useState(false);

  // Edit Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Role Gate & Access Control
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isClientAuthChecked, setIsClientAuthChecked] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);
  const notify = (message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const copyToClipboard = (text, keyName) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  // Load Admin Data from Backend
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const savedDb = localStorage.getItem("xml_dispatch_db_url") || "";
      if (savedDb) setCustomDbUrl(savedDb);

      let url = "/api/db?action=admin_load_all";
      const headers = {};
      if (savedDb) {
        headers["x-database-url"] = savedDb;
        url += `&connectionString=${encodeURIComponent(savedDb)}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setTenants(data.tenants || []);
        setPlans(data.plans || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.warn("Failed to load admin data:", err);
      notify("Failed to load admin analytics from database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("xml_dispatch_role") || sessionStorage.getItem("xml_dispatch_role");
    setCurrentUserRole(role);
    setIsClientAuthChecked(true);
    loadAdminData();
  }, []);

  // Save / Update Tenant Handler
  const handleSaveTenant = async (e) => {
    e?.preventDefault();
    if (!tenantForm.name || !tenantForm.contact_email || !tenantForm.sender_email) {
      notify("Please fill in company name, contact email, and sender email.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const selectedPlan = plans.find((p) => p.id === tenantForm.plan_id);
      const monthlyFee = selectedPlan ? parseFloat(selectedPlan.price_monthly) : parseFloat(tenantForm.monthly_fee || 29);
      const monthlyQuota = selectedPlan ? parseInt(selectedPlan.email_limit, 10) : parseInt(tenantForm.monthly_quota || 2000, 10);

      const payload = {
        ...tenantForm,
        id: tenantForm.id || `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        monthly_fee: monthlyFee,
        monthly_quota: monthlyQuota,
      };

      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_tenant",
          connectionString: customDbUrl.trim() || undefined,
          tenant: payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(data.message || `Client '${payload.name}' saved successfully!`, "success");
        setShowTenantModal(false);
        loadAdminData();
      } else {
        notify(data.error || "Failed to save customer.", "error");
      }
    } catch {
      notify("Error connecting to server.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove customer '${name}'? This cannot be undone.`)) {
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "delete_tenant",
          connectionString: customDbUrl.trim() || undefined,
          tenantId: id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(`Customer '${name}' removed.`, "info");
        loadAdminData();
      } else {
        notify(data.error || "Failed to delete customer.", "error");
      }
    } catch {
      notify("Network error while deleting customer.", "error");
    }
  };

  // Suspend / Activate Tenant Toggle
  const handleToggleSuspendTenant = async (tenant) => {
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    setIsSaving(true);
    try {
      const payload = {
        ...tenant,
        status: nextStatus,
      };

      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_tenant",
          connectionString: customDbUrl.trim() || undefined,
          tenant: payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(`Customer '${tenant.name}' is now ${nextStatus}.`, "success");
        loadAdminData();
      } else {
        notify(data.error || "Failed to update customer status.", "error");
      }
    } catch {
      notify("Network error while updating status.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Gateway Configuration Modal for Specific Customer
  const handleOpenGatewayModal = (tenant) => {
    setSelectedTenantGateway(tenant);
    setGatewayForm({
      host: tenant.smtp_host || "smtp-relay.brevo.com",
      port: (tenant.smtp_port || 587).toString(),
      user: tenant.smtp_user || "c03022001@smtp-brevo.com",
      pass: tenant.smtp_pass || "",
      senderEmail: tenant.smtp_sender_email || tenant.sender_email || "",
      senderName: tenant.smtp_sender_name || tenant.sender_name || "Accounts Dept",
      provider: tenant.gateway_provider || "smtp",
    });
    setGatewayTestResult(null);
    setShowGatewayModal(true);
  };

  // Test Customer Gateway Connection (Live SMTP handshake via /api/send)
  const handleTestGateway = async () => {
    if (!gatewayForm.host || !gatewayForm.user || !gatewayForm.pass) {
      notify("Please provide SMTP Host, Username and Password to test connection.", "error");
      return;
    }
    setIsTestingGateway(true);
    setGatewayTestResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_smtp",
          smtpConfig: {
            host: gatewayForm.host.trim(),
            port: gatewayForm.port.trim(),
            user: gatewayForm.user.trim(),
            pass: gatewayForm.pass.trim(),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGatewayTestResult({ success: true, message: data.message });
        notify("✅ Gateway connection verified successfully!", "success");
      } else {
        setGatewayTestResult({ success: false, message: data.error, suggestion: data.suggestion });
        notify(data.error || "Gateway verification failed", "error");
      }
    } catch (err) {
      setGatewayTestResult({ success: false, message: err.message });
      notify("Gateway connection error: " + err.message, "error");
    } finally {
      setIsTestingGateway(false);
    }
  };

  // Save Gateway Directly to Supabase for this Customer
  const handleSaveCustomerGateway = async (e) => {
    e?.preventDefault();
    if (!selectedTenantGateway) return;
    setIsSaving(true);
    try {
      const updatedTenant = {
        ...selectedTenantGateway,
        smtp_host: gatewayForm.host.trim(),
        smtp_port: parseInt(gatewayForm.port || 587, 10),
        smtp_user: gatewayForm.user.trim(),
        smtp_pass: gatewayForm.pass.trim(),
        smtp_sender_email: gatewayForm.senderEmail.trim() || selectedTenantGateway.sender_email,
        smtp_sender_name: gatewayForm.senderName.trim() || selectedTenantGateway.sender_name,
        gateway_provider: gatewayForm.provider,
      };

      const headers = { "Content-Type": "application/json" };
      if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();

      const res = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_tenant",
          connectionString: customDbUrl.trim() || undefined,
          tenant: updatedTenant,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify(`Email Gateway saved to Supabase for '${selectedTenantGateway.name}'!`, "success");
        setShowGatewayModal(false);
        loadAdminData();
      } else {
        notify(data.error || "Failed to persist gateway settings.", "error");
      }
    } catch (err) {
      notify("Network error saving gateway: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.contact_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.sender_email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // RESTRICT ACCESS IF LOGGED IN AS A COMPANY USER
  if (isClientAuthChecked && currentUserRole === "company_user") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#dadce0] rounded-xl shadow-lg p-8 animate-fade-in text-center">
          <div className="w-12 h-12 rounded-xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-[#202124]">Super Admin Access Restricted</h1>
          <p className="text-xs text-[#5f6368] mt-2 leading-relaxed">
            Your active session is authenticated as a <strong>Company Client User</strong>. Platform administration features (customer onboarding, SMTP relays, DNS mapping, and revenue analytics) are strictly reserved for SaaS platform operators.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Company Console</span>
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem("xml_dispatch_auth");
                sessionStorage.removeItem("xml_dispatch_auth");
                localStorage.removeItem("xml_dispatch_role");
                sessionStorage.removeItem("xml_dispatch_role");
                localStorage.removeItem("xml_dispatch_active_tenant");
                window.location.href = "/";
              }}
              className="w-full py-2 px-4 bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-[#5f6368] hover:text-[#202124] rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Sign Out &amp; Switch to Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] flex flex-col font-sans">
      {/* Toast Notification Layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border text-xs font-medium flex items-center gap-2 animate-fade-in ${
              t.type === "success"
                ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6]"
                : t.type === "error"
                ? "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]"
                : "bg-white text-[#202124] border-[#dadce0]"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-[#1e8e3e]" />
            ) : t.type === "error" ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#d93025]" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#1a73e8]" />
            )}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* TOP CORPORATE ADMIN BAR */}
      <header className="bg-white border-b border-[#dadce0] sticky top-0 z-40 px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a73e8] text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#202124]">CloudMail SaaS Admin Console</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  20+ Commercial Tenant Edition
                </span>
              </div>
              <p className="text-[11px] text-[#5f6368]">
                Tenant Onboarding, Domain Deliverability, Subscription Plans &amp; MRR Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Deliverability & DNS Authentication Guide */}
            <button
              onClick={() => setShowDeliverabilityModal(true)}
              className="px-3 py-1.5 bg-[#e8f0fe] border border-[#d2e3fc] hover:bg-[#d2e3fc] text-[#1a73e8] rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Deliverability, SPF, DKIM, DMARC & IP Warming Guide"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deliverability Guide</span>
            </button>

            <button
              onClick={loadAdminData}
              disabled={loading}
              className="px-3 py-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] rounded text-xs font-medium text-[#3c4043] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f3f4] text-[#3c4043] rounded-md text-xs font-medium border border-[#dadce0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span className="font-semibold text-[#202124]">Superadmin Console</span>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("xml_dispatch_auth");
                sessionStorage.removeItem("xml_dispatch_auth");
                localStorage.removeItem("xml_dispatch_role");
                sessionStorage.removeItem("xml_dispatch_role");
                localStorage.removeItem("xml_dispatch_active_tenant");
                window.location.href = "/";
              }}
              className="px-3 py-1.5 bg-white border border-[#dadce0] hover:bg-[#fce8e6] text-[#5f6368] hover:text-[#c5221f] rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out of Super Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* EXECUTIVE REVENUE & WORKLOAD CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: MRR */}
          <div className="bg-white p-4 rounded-xl border border-[#dadce0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Monthly Recurring Revenue</span>
              <DollarSign className="w-4 h-4 text-[#1e8e3e]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-[#202124]">${Number(metrics.mrr || 0).toFixed(2)}</div>
              <div className="text-[11px] text-[#137333] font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>ARR Run-Rate: ${(Number(metrics.mrr || 0) * 12).toLocaleString()} / yr</span>
              </div>
            </div>
            <div className="text-[10px] text-[#70757a] pt-2 border-t border-[#f1f3f4]">
              Across {tenants.length} commercial client accounts
            </div>
          </div>

          {/* Card 2: Active Clients */}
          <div className="bg-white p-4 rounded-xl border border-[#dadce0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Active Paying Clients</span>
              <Building2 className="w-4 h-4 text-[#1a73e8]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-[#202124]">{tenants.length} Accounts</div>
              <div className="text-[11px] text-[#1a73e8] font-medium mt-0.5">
                {metrics.activeTenants} Active &bull; {tenants.length - metrics.activeTenants} Onboarding / DNS
              </div>
            </div>
            <div className="text-[10px] text-[#70757a] pt-2 border-t border-[#f1f3f4]">
              Target: Scaling smoothly to 20+ customers
            </div>
          </div>

          {/* Card 3: Total Monthly Dispatches */}
          <div className="bg-white p-4 rounded-xl border border-[#dadce0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Aggregate System Volume</span>
              <Mail className="w-4 h-4 text-[#e37400]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-[#202124]">
                {Number(metrics.aggregateQuotaUsed || 0).toLocaleString()} <span className="text-xs font-normal text-[#5f6368]">/ {Number(metrics.aggregateTotalQuota || 0).toLocaleString()}</span>
              </div>
              <div className="w-full bg-[#f1f3f4] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#1a73e8] h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (Number(metrics.aggregateQuotaUsed || 0) / Math.max(1, Number(metrics.aggregateTotalQuota || 1))) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-[10px] text-[#70757a] pt-2 border-t border-[#f1f3f4] flex justify-between">
              <span>Avg 2,000 emails/client</span>
              <span>{((Number(metrics.aggregateQuotaUsed || 0) / Math.max(1, Number(metrics.aggregateTotalQuota || 1))) * 100).toFixed(0)}% Utilized</span>
            </div>
          </div>

          {/* Card 4: Operating Margin */}
          <div className="bg-white p-4 rounded-xl border border-[#dadce0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#5f6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Net Operating Margin</span>
              <Activity className="w-4 h-4 text-[#1e8e3e]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-[#1e8e3e]">{Number(metrics.profitMargin || 0).toFixed(1)}%</div>
              <div className="text-[11px] text-[#5f6368] font-medium mt-0.5">
                Net Profit: <strong className="text-[#137333]">${Number(metrics.netProfit || 0).toFixed(2)}/mo</strong>
              </div>
            </div>
            <div className="text-[10px] text-[#70757a] pt-2 border-t border-[#f1f3f4]">
              Est. Infra Cost: ${Number(metrics.estInfrastructureCost || 49).toFixed(2)}/mo (SES + DB + Vercel)
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between border-b border-[#dadce0] bg-white px-4 rounded-t-lg">
          <div className="flex items-center gap-1">
            {[
              { id: "tenants", label: "Customer Accounts (20+ Tenants)", icon: Users, count: tenants.length },
              { id: "plans", label: "Subscription Plans & Pricing", icon: CreditCard, count: plans.length },
              { id: "revenue", label: "Revenue & Financial Breakdown", icon: DollarSign },
              { id: "system", label: "Multi-Tenant Supabase Infrastructure", icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? "border-[#1a73e8] text-[#1a73e8] bg-[#f8fafd]"
                      : "border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-[#1a73e8] text-white" : "bg-[#f1f3f4] text-[#5f6368]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === "tenants" && (
            <button
              onClick={() => {
                setEditingTenant(null);
                setTenantForm({
                  id: "",
                  name: "",
                  contact_email: "",
                  password: "admin123",
                  sender_email: "",
                  sender_name: "Accounts Department",
                  plan_id: "plan_standard",
                  monthly_quota: 2000,
                  monthly_fee: 29.0,
                  domain_verified: true,
                  status: "active",
                });
                setShowTenantModal(true);
              }}
              className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Onboard New Customer</span>
            </button>
          )}
        </div>

        {/* TAB 1: CUSTOMERS / TENANTS MANAGEMENT */}
        {activeTab === "tenants" && (
          <div className="bg-white rounded-b-lg border border-t-0 border-[#dadce0] p-5 space-y-4">
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#80868b] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company name or email..."
                  className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-[#5f6368]">Filter Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-[#dadce0] rounded px-2.5 py-1 text-xs text-[#202124] focus:outline-none"
                >
                  <option value="all">All Statuses ({tenants.length})</option>
                  <option value="active">Active Only</option>
                  <option value="pending_dns">Pending DNS Verification</option>
                </select>
              </div>
            </div>

            {/* Customers Table */}
            <div className="border border-[#dadce0] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Company &amp; Tenant ID</th>
                    <th className="py-2.5 px-3.5">Assigned Plan</th>
                    <th className="py-2.5 px-3.5">Verified Sender Domain</th>
                    <th className="py-2.5 px-3.5">Email Gateway</th>
                    <th className="py-2.5 px-3.5">Monthly Quota Meter</th>
                    <th className="py-2.5 px-3.5">Monthly Fee</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0]">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-xs text-[#5f6368]">
                        No customers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const quotaPercent = Math.min(
                        100,
                        ((tenant.used_quota || 0) / Math.max(1, tenant.monthly_quota || 2000)) * 100
                      );
                      const planObj = plans.find((p) => p.id === tenant.plan_id);

                      return (
                        <tr key={tenant.id} className="hover:bg-[#f8fafd] transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-[#202124]">{tenant.name}</div>
                            <div className="text-[11px] text-[#5f6368] font-mono mt-0.5">{tenant.id}</div>
                            <div className="text-[10px] text-[#70757a]">{tenant.contact_email}</div>
                          </td>

                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                              {planObj?.name || "Standard Business"}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-mono text-[#202124] text-[11px]">{tenant.sender_email}</div>
                            <div className="text-[10px] text-[#5f6368]">From Name: {tenant.sender_name}</div>
                            {tenant.domain_verified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#137333] font-medium mt-0.5">
                                <CheckCircle className="w-3 h-3 text-[#1e8e3e]" />
                                <span>100% Inbox Verified (DKIM Pass)</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTenantDns(tenant);
                                  setShowDnsModal(true);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-[#b06000] font-medium hover:underline mt-0.5"
                              >
                                <AlertTriangle className="w-3 h-3 text-[#e37400]" />
                                <span>DNS Setup Needed &rarr;</span>
                              </button>
                            )}
                          </td>

                          {/* Email Gateway Relay Status */}
                          <td className="py-3 px-3.5">
                            {tenant.smtp_host && tenant.smtp_user ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#137333]">
                                  <CheckCircle className="w-3 h-3 text-[#1e8e3e]" />
                                  <span>Dedicated Relay</span>
                                </span>
                                <span className="text-[10px] text-[#5f6368] font-mono mt-0.5 truncate max-w-[140px]" title={`${tenant.smtp_host}:${tenant.smtp_port || 587}`}>
                                  {tenant.smtp_host}:{tenant.smtp_port || 587}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
                                  <span>Platform Shared</span>
                                </span>
                                <span className="text-[10px] text-[#5f6368]">Brevo High-Speed</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3.5 min-w-[160px]">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-semibold text-[#202124]">
                                {tenant.used_quota?.toLocaleString() || 0}
                              </span>
                              <span className="text-[#5f6368]">/ {tenant.monthly_quota?.toLocaleString() || 2000}</span>
                            </div>
                            <div className="w-full bg-[#f1f3f4] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  quotaPercent > 90 ? "bg-[#d93025]" : quotaPercent > 75 ? "bg-[#f29900]" : "bg-[#1e8e3e]"
                                }`}
                                style={{ width: `${quotaPercent}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-[#5f6368] mt-1">{Number(quotaPercent || 0).toFixed(0)}% Dispatched</div>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-bold text-[#202124]">${(Number(tenant.monthly_fee) || 29).toFixed(2)}/mo</div>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#e6f4ea] text-[#137333]">
                              {tenant.billing_status?.toUpperCase() || "PAID"}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                                tenant.status === "active"
                                  ? "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"
                                  : "bg-[#fef7e0] text-[#b06000] border border-[#f9ab00]/30"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span className="capitalize">{tenant.status?.replace("_", " ")}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1. Toggle Suspend / Reactivate Customer */}
                              <button
                                onClick={() => handleToggleSuspendTenant(tenant)}
                                title={tenant.status === "active" ? "Suspend Customer Account" : "Reactivate Customer Account"}
                                className={`p-1.5 rounded text-xs transition-colors ${
                                  tenant.status === "active"
                                    ? "text-[#e37400] hover:bg-[#fef7e0]"
                                    : "text-[#1e8e3e] hover:bg-[#e6f4ea]"
                                }`}
                              >
                                {tenant.status === "active" ? <PauseCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>

                              {/* 2. DNS Verification Modal */}
                              <button
                                onClick={() => {
                                  setSelectedTenantDns(tenant);
                                  setShowDnsModal(true);
                                }}
                                title="View Customer DNS Setup Records (DKIM/SPF)"
                                className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded transition-colors"
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </button>

                              {/* 3. Setup Customer Email Relay / Gateway */}
                              <button
                                onClick={() => handleOpenGatewayModal(tenant)}
                                title="Configure Dedicated Email Relay / SMTP Gateway for this Customer"
                                className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded transition-colors"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {/* 4. Edit Customer Details & Plan */}
                              <button
                                onClick={() => {
                                  setEditingTenant(tenant);
                                  setTenantForm({
                                    id: tenant.id,
                                    name: tenant.name,
                                    contact_email: tenant.contact_email,
                                    password: "",
                                    sender_email: tenant.sender_email,
                                    sender_name: tenant.sender_name || "Accounts Dept",
                                    plan_id: tenant.plan_id || "plan_standard",
                                    monthly_quota: tenant.monthly_quota || 2000,
                                    monthly_fee: tenant.monthly_fee || 29.0,
                                    domain_verified: tenant.domain_verified !== false,
                                    status: tenant.status || "active",
                                  });
                                  setShowTenantModal(true);
                                }}
                                title="Edit Customer Account & Plan"
                                className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                                title="Delete Customer"
                                className="p-1 text-[#80868b] hover:text-[#d93025] hover:bg-[#fce8e6] rounded"
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
        )}

        {/* TAB 2: SUBSCRIPTION PLANS & PRICING */}
        {activeTab === "plans" && (
          <div className="bg-white rounded-b-lg border border-t-0 border-[#dadce0] p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#202124]">Subscription Tiers &amp; Pricing Matrix</h3>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Define the plans and monthly quotas offered to your 20+ commercial customers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((p) => {
                const isPopular = p.id === "plan_standard";
                const features = Array.isArray(p.features) ? p.features : [];

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between relative bg-white transition-all ${
                      isPopular
                        ? "border-[#1a73e8] shadow-md ring-1 ring-[#1a73e8]"
                        : "border-[#dadce0] shadow-xs"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-2.5 right-4 bg-[#1a73e8] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Most Popular (Standard)
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base text-[#202124]">{p.name}</h4>
                        <span className="text-xs font-mono text-[#5f6368]">{p.id}</span>
                      </div>

                      <div className="mt-3 mb-4">
                        <span className="text-3xl font-extrabold text-[#202124]">${Number(p.price_monthly || 29).toFixed(0)}</span>
                        <span className="text-xs text-[#5f6368] font-medium"> / month</span>
                        <div className="text-[11px] text-[#137333] font-semibold mt-1">
                          {Number(p.email_limit || 2000).toLocaleString()} Dispatches Included
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#f1f3f4] space-y-2">
                        <span className="text-[11px] font-semibold text-[#5f6368] block">Included Features:</span>
                        {features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-[#3c4043]">
                            <Check className="w-3.5 h-3.5 text-[#1e8e3e] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#f1f3f4] flex justify-between items-center">
                      <span className="text-[11px] text-[#5f6368]">
                        Cost / 1k overage: <strong>$0.15</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingPlan(p);
                          setShowPlanModal(true);
                        }}
                        className="px-3 py-1 bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-[#202124] rounded text-xs font-medium cursor-pointer"
                      >
                        Edit Plan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: REVENUE & FINANCIAL BREAKDOWN */}
        {activeTab === "revenue" && (
          <div className="bg-white rounded-b-lg border border-t-0 border-[#dadce0] p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#202124]">Financial Analysis &amp; Growth Projections</h3>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Detailed unit economics for delivering 40,000–100,000 dispatches across commercial customers.
              </p>
            </div>

            {/* Growth Scaling Table */}
            <div className="border border-[#dadce0] rounded-xl p-5 bg-[#f8fafd] space-y-3">
              <h4 className="font-semibold text-xs text-[#1a73e8] uppercase tracking-wider">
                Scalability Revenue Matrix (At $29/mo Average Plan)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-[#dadce0]">
                  <div className="text-xs text-[#5f6368]">20 Clients (Current Target)</div>
                  <div className="text-xl font-bold text-[#202124] mt-1">$580.00 / mo</div>
                  <div className="text-[11px] text-[#137333] font-medium mt-1">Net Profit: $531/mo (91.5%)</div>
                  <div className="text-[10px] text-[#70757a] mt-0.5">Annual Profit: $6,372 / yr</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#dadce0]">
                  <div className="text-xs text-[#5f6368]">50 Clients</div>
                  <div className="text-xl font-bold text-[#202124] mt-1">$1,450.00 / mo</div>
                  <div className="text-[11px] text-[#137333] font-medium mt-1">Net Profit: $1,375/mo (94.8%)</div>
                  <div className="text-[10px] text-[#70757a] mt-0.5">Annual Profit: $16,500 / yr</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#dadce0]">
                  <div className="text-xs text-[#5f6368]">100 Clients</div>
                  <div className="text-xl font-bold text-[#202124] mt-1">$2,900.00 / mo</div>
                  <div className="text-[11px] text-[#137333] font-medium mt-1">Net Profit: $2,780/mo (95.8%)</div>
                  <div className="text-[10px] text-[#70757a] mt-0.5">Annual Profit: $33,360 / yr</div>
                </div>
              </div>
            </div>

            {/* Infrastructure Cost Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-[#202124]">Monthly Fixed Infrastructure Cost Breakdown</h4>
              <div className="border border-[#dadce0] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368]">
                    <tr>
                      <th className="py-2.5 px-3.5">Component</th>
                      <th className="py-2.5 px-3.5">Provider</th>
                      <th className="py-2.5 px-3.5">Capacity Provided</th>
                      <th className="py-2.5 px-3.5 text-right">Cost / Month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dadce0]">
                    <tr>
                      <td className="py-2 px-3.5 font-medium">Serverless Compute &amp; Hosting</td>
                      <td className="py-2 px-3.5">Vercel Pro</td>
                      <td className="py-2 px-3.5 text-[#5f6368]">Global Edge Network, Unlimited Subdomains</td>
                      <td className="py-2 px-3.5 text-right font-mono">$20.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3.5 font-medium">Managed PostgreSQL Database</td>
                      <td className="py-2 px-3.5">Supabase Pro</td>
                      <td className="py-2 px-3.5 text-[#5f6368]">8GB Disk, Connection Pooling, Daily Backups</td>
                      <td className="py-2 px-3.5 text-right font-mono">$25.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3.5 font-medium">Outbound Relay Dispatches</td>
                      <td className="py-2 px-3.5">Amazon SES</td>
                      <td className="py-2 px-3.5 text-[#5f6368]">40,000 Emails ($0.10 per 1,000 dispatches)</td>
                      <td className="py-2 px-3.5 text-right font-mono">$4.00</td>
                    </tr>
                    <tr className="bg-[#e6f4ea] font-semibold text-[#137333]">
                      <td className="py-2 px-3.5" colSpan="3">Total Monthly Infrastructure Cost (20 Customers)</td>
                      <td className="py-2 px-3.5 text-right font-mono">$49.00 / mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM & SUPABASE MULTI-TENANCY */}
        {activeTab === "system" && (
          <div className="bg-white rounded-b-lg border border-t-0 border-[#dadce0] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202124]">Supabase Multi-Tenant Database Schema</h3>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  Verify and initialize all 6 tables required for full tenant isolation and commercial scaling.
                </p>
              </div>

              <button
                onClick={async () => {
                  try {
                    const headers = { "Content-Type": "application/json" };
                    if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();
                    const res = await fetch("/api/db", {
                      method: "POST",
                      headers,
                      body: JSON.stringify({ action: "init_all_tables", connectionString: customDbUrl.trim() || undefined }),
                    });
                    const d = await res.json();
                    if (res.ok) {
                      notify("All 6 Supabase tables initialized and verified!", "success");
                      loadAdminData();
                    } else {
                      notify(d.error || "Initialization failed", "error");
                    }
                  } catch {
                    notify("Failed to connect to database", "error");
                  }
                }}
                className="px-3.5 py-1.5 bg-[#1e8e3e] hover:bg-[#188038] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Initialize All 6 Tables in Supabase</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { name: "tenants", desc: "Customer accounts, monthly quotas & fees" },
                { name: "plans", desc: "Subscription tiers, pricing & feature sets" },
                { name: "email_records", desc: "Recipient dispatches with tenant_id isolation" },
                { name: "smtp_configurations", desc: "Centralized & per-client relay credentials" },
                { name: "email_configurations", desc: "Gateway preferences & template defaults" },
                { name: "users", desc: "Operator credentials & role-based authentication" },
              ].map((tbl) => (
                <div key={tbl.name} className="p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-lg">
                  <div className="font-mono font-bold text-xs text-[#1a73e8] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#1e8e3e]" />
                    <span>{tbl.name}</span>
                  </div>
                  <div className="text-[11px] text-[#5f6368] mt-1">{tbl.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 1: ONBOARD / EDIT CUSTOMER MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <h3 className="text-sm font-bold text-[#202124]">
                {editingTenant ? `Edit Customer: ${editingTenant.name}` : "Onboard New Commercial Customer"}
              </h3>
              <button onClick={() => setShowTenantModal(false)} className="text-[#5f6368] hover:text-[#202124]">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[#202124] font-medium mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  placeholder="e.g. Acme Global Manufacturing"
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#202124] font-medium mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={tenantForm.contact_email}
                    onChange={(e) => setTenantForm({ ...tenantForm, contact_email: e.target.value })}
                    placeholder="admin@company.com"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">Assigned Plan</label>
                  <select
                    value={tenantForm.plan_id}
                    onChange={(e) => {
                      const sel = plans.find((p) => p.id === e.target.value);
                      setTenantForm({
                        ...tenantForm,
                        plan_id: e.target.value,
                        monthly_fee: sel ? sel.price_monthly : 29.0,
                        monthly_quota: sel ? sel.email_limit : 2000,
                      });
                    }}
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.price_monthly}/mo - {p.email_limit?.toLocaleString()} emails)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#202124] font-medium mb-1">Custom Sender Email (From Address) *</label>
                  <input
                    type="email"
                    required
                    value={tenantForm.sender_email}
                    onChange={(e) => setTenantForm({ ...tenantForm, sender_email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                  <p className="text-[10px] text-[#5f6368] mt-0.5">Their business sending domain</p>
                </div>

                <div>
                  <label className="block text-[#202124] font-medium mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={tenantForm.sender_name}
                    onChange={(e) => setTenantForm({ ...tenantForm, sender_name: e.target.value })}
                    placeholder="Acme Billing Team"
                    className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Customer Portal Login Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#202124] font-medium text-xs">Customer Portal Login Password</label>
                  <span className="text-[10px] text-[#5f6368]">{editingTenant ? "(Leave empty to keep existing password)" : "(Default: admin123)"}</span>
                </div>
                <div className="relative">
                  <input
                    type={showTenantPass ? "text" : "password"}
                    value={tenantForm.password || ""}
                    onChange={(e) => setTenantForm({ ...tenantForm, password: e.target.value })}
                    placeholder={editingTenant ? "Enter new password to update..." : "Set initial customer portal password (e.g. admin123)"}
                    className="w-full bg-white border border-[#dadce0] rounded-md pl-3 pr-10 py-2 text-xs text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTenantPass(!showTenantPass)}
                    className="absolute right-2.5 top-2 text-[#5f6368] hover:text-[#202124]"
                    title={showTenantPass ? "Hide password" : "Show password"}
                  >
                    {showTenantPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#5f6368] mt-1">
                  The customer will use their Contact Email (<strong className="text-[#202124]">{tenantForm.contact_email || "contact@email"}</strong>) and this password to sign into their company console.
                </p>
              </div>

              <div className="p-3 bg-[#e8f0fe] rounded-lg border border-[#d2e3fc] space-y-1">
                <span className="font-semibold text-[#174ea6] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Automated Deliverability Guarantee</span>
                </span>
                <p className="text-[11px] text-[#5f6368]">
                  This customer will receive dedicated DKIM/SPF DNS records so their 2,000 monthly emails route directly to recipient Primary Inboxes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dadce0]">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="px-3 py-1.5 border border-[#dadce0] rounded text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded text-xs font-semibold shadow-xs inline-flex items-center gap-1"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingTenant ? "Save Changes" : "Onboard Customer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 2: CUSTOMER DNS ONBOARDING INSTRUCTIONS (DKIM / SPF)
      ────────────────────────────────────────────────────────────────────────── */}
      {showDnsModal && selectedTenantDns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div>
                <h3 className="text-sm font-bold text-[#202124]">
                  DKIM &amp; SPF Setup for {selectedTenantDns.name}
                </h3>
                <p className="text-[11px] text-[#5f6368]">
                  Give these 2 DNS records to the client to paste into GoDaddy, Cloudflare, or Namecheap.
                </p>
              </div>
              <button onClick={() => setShowDnsModal(false)} className="text-[#5f6368] hover:text-[#202124]">
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#dadce0] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#202124]">1. DKIM CNAME Record (Email Digital Signature)</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Type: CNAME\nName: cloudmail._domainkey\nValue: dkim.relay.brevo.com`,
                        "dkim"
                      )
                    }
                    className="text-[10px] text-[#1a73e8] hover:underline flex items-center gap-1"
                  >
                    {copiedKey === "dkim" ? <Check className="w-3 h-3 text-[#1e8e3e]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "dkim" ? "Copied" : "Copy Record"}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-[#3c4043] bg-white p-2 rounded border border-[#dadce0]">
                  Name: <code>cloudmail._domainkey</code><br />
                  Target: <code>dkim.relay.brevo.com</code>
                </div>
              </div>

              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#dadce0] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#202124]">2. SPF TXT Record (Sender Policy Framework)</span>
                  <button
                    onClick={() =>
                      copyToClipboard(`Type: TXT\nName: @\nValue: v=spf1 include:spf.brevo.com ~all`, "spf")
                    }
                    className="text-[10px] text-[#1a73e8] hover:underline flex items-center gap-1"
                  >
                    {copiedKey === "spf" ? <Check className="w-3 h-3 text-[#1e8e3e]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "spf" ? "Copied" : "Copy Record"}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-[#3c4043] bg-white p-2 rounded border border-[#dadce0]">
                  Name: <code>@</code><br />
                  Value: <code>v=spf1 include:spf.brevo.com ~all</code>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#dadce0]">
              <button
                onClick={() => setShowDnsModal(false)}
                className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 3: EDIT PLAN MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showPlanModal && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <h3 className="text-sm font-bold text-[#202124]">Edit Plan: {editingPlan.name}</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-[#5f6368] hover:text-[#202124]">
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[#202124] font-medium mb-1">Monthly Fee (USD)</label>
                <input
                  type="number"
                  value={editingPlan.price_monthly}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-[#202124] font-medium mb-1">Monthly Email Dispatches Limit</label>
                <input
                  type="number"
                  value={editingPlan.email_limit}
                  onChange={(e) => setEditingPlan({ ...editingPlan, email_limit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-white border border-[#dadce0] rounded-md px-3 py-1.5 text-xs text-[#202124]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#dadce0]">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-3 py-1.5 border border-[#dadce0] rounded text-xs text-[#5f6368]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const headers = { "Content-Type": "application/json" };
                    if (customDbUrl.trim()) headers["x-database-url"] = customDbUrl.trim();
                    const res = await fetch("/api/db", {
                      method: "POST",
                      headers,
                      body: JSON.stringify({
                        action: "update_plan",
                        connectionString: customDbUrl.trim() || undefined,
                        plan: editingPlan,
                      }),
                    });
                    if (res.ok) {
                      notify("Plan updated successfully!", "success");
                      setShowPlanModal(false);
                      loadAdminData();
                    }
                  } catch {
                    notify("Failed to update plan", "error");
                  }
                }}
                className="px-4 py-1.5 bg-[#1a73e8] text-white rounded text-xs font-semibold"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 4: DELIVERABILITY & DNS ARCHITECTURE GUIDE (SUPER ADMIN)
      ────────────────────────────────────────────────────────────────────────── */}
      {showDeliverabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#202124]">Enterprise Deliverability &amp; DNS Protocol Guide</h3>
                  <p className="text-[11px] text-[#5f6368]">Authentication architecture to guarantee 100% Primary Inbox placement (SPF, DKIM, DMARC, IP Warming)</p>
                </div>
              </div>
              <button onClick={() => setShowDeliverabilityModal(false)} className="text-[#5f6368] hover:text-[#202124] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#dadce0] pt-3 pb-2">
              <button
                onClick={() => setDeliverabilityTab("overview")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  deliverabilityTab === "overview" ? "bg-[#1a73e8] text-white" : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                Deliverability Rules
              </button>
              <button
                onClick={() => setDeliverabilityTab("dns")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  deliverabilityTab === "dns" ? "bg-[#1a73e8] text-white" : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                DNS Records (SPF/DKIM/DMARC)
              </button>
              <button
                onClick={() => setDeliverabilityTab("warming")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  deliverabilityTab === "warming" ? "bg-[#1a73e8] text-white" : "text-[#5f6368] hover:bg-[#f1f3f4]"
                }`}
              >
                IP &amp; Domain Warming Curve
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-[#3c4043] leading-relaxed">
              {deliverabilityTab === "overview" && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg">
                    <h4 className="font-semibold text-[#1a73e8] text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Google &amp; Yahoo 2024 Bulk Sender Compliance Standard</span>
                    </h4>
                    <p className="text-[11px] text-[#202124] mt-1">
                      As an email infrastructure SaaS provider, all customer outgoing emails must comply with RFC standards to prevent spam folder relegation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-1">
                      <div className="font-bold text-[#202124] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#1e8e3e]" />
                        <span>1. Spam Rate &lt; 0.1%</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Keep user spam complaint rate below 0.10% (1 per 1,000 sent). Rates above 0.3% cause immediate domain throttling.
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-1">
                      <div className="font-bold text-[#202124] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#1e8e3e]" />
                        <span>2. TLS Encryption</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        All SMTP relay connections must enforce TLS 1.2 or 1.3 encryption on ports 587 or 465.
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-1">
                      <div className="font-bold text-[#202124] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#1e8e3e]" />
                        <span>3. Forward DNS (PTR)</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368]">
                        Sending IP must match valid forward and reverse PTR records pointing to the relay hostname.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {deliverabilityTab === "dns" && (
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202124]">1. SPF Record (Sender Policy Framework)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">TXT</span>
                    </div>
                    <p className="text-[11px] text-[#5f6368]">Authorizes Brevo and CloudMail relays to dispatch emails from the customer domain:</p>
                    <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                      <div><strong>Host:</strong> @ (or customerdomain.com)</div>
                      <div><strong>Value:</strong> <span className="text-[#1e8e3e]">v=spf1 include:spf.brevo.com ~all</span></div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202124]">2. DKIM Record (DomainKeys Identified Mail)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">TXT / CNAME</span>
                    </div>
                    <p className="text-[11px] text-[#5f6368]">Cryptographic signature verified by Gmail and Outlook:</p>
                    <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                      <div><strong>Host:</strong> mail._domainkey.customerdomain.com</div>
                      <div><strong>Value:</strong> <span className="text-[#1a73e8]">k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...</span></div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#dadce0] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202124]">3. DMARC Policy</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f1f3f4] text-[#202124] rounded font-semibold">TXT</span>
                    </div>
                    <div className="bg-[#f8f9fa] p-2.5 rounded font-mono text-[11px] space-y-1 border border-[#e8eaed]">
                      <div><strong>Host:</strong> _dmarc.customerdomain.com</div>
                      <div><strong>Value:</strong> <span className="text-[#1e8e3e]">v=DMARC1; p=reject; rua=mailto:dmarc-reports@customerdomain.com</span></div>
                    </div>
                  </div>
                </div>
              )}

              {deliverabilityTab === "warming" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#5f6368]">
                    New customer domains or dedicated IPs must follow a progressive warm-up schedule to establish reputation with mailbox providers:
                  </p>
                  <table className="w-full text-left border-collapse border border-[#dadce0] rounded-lg overflow-hidden text-[11px]">
                    <thead className="bg-[#f8f9fa] text-[#5f6368] font-semibold border-b border-[#dadce0]">
                      <tr>
                        <th className="py-2 px-3">Timeline</th>
                        <th className="py-2 px-3">Max Emails / Day</th>
                        <th className="py-2 px-3">Batch Pace</th>
                        <th className="py-2 px-3">Target Inbox Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dadce0]">
                      <tr>
                        <td className="py-2 px-3 font-semibold">Day 1 - 2</td>
                        <td className="py-2 px-3 font-mono text-[#1a73e8]">50 emails</td>
                        <td className="py-2 px-3">5 emails / min</td>
                        <td className="py-2 px-3 text-[#1e8e3e]">Domain Handshake Initiated</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Day 3 - 5</td>
                        <td className="py-2 px-3 font-mono text-[#1a73e8]">200 emails</td>
                        <td className="py-2 px-3">15 emails / min</td>
                        <td className="py-2 px-3 text-[#1e8e3e]">Building ESP Trust</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Day 6 - 9</td>
                        <td className="py-2 px-3 font-mono text-[#1a73e8]">500 emails</td>
                        <td className="py-2 px-3">30 emails / min</td>
                        <td className="py-2 px-3 text-[#1e8e3e]">Standard Volume Enabled</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Day 10 - 14</td>
                        <td className="py-2 px-3 font-mono text-[#1a73e8]">1,000+ emails</td>
                        <td className="py-2 px-3">60 emails / min</td>
                        <td className="py-2 px-3 text-[#1e8e3e]">High Reputation Primary Placement</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Day 15+</td>
                        <td className="py-2 px-3 font-mono text-[#1e8e3e]">Full 2,000 - 15,000 Quota</td>
                        <td className="py-2 px-3">Full Relay Burst</td>
                        <td className="py-2 px-3 font-bold text-[#1e8e3e]">100% Primary Inbox Delivery</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#dadce0] flex justify-end">
              <button
                onClick={() => setShowDeliverabilityModal(false)}
                className="px-4 py-1.5 bg-[#1a73e8] text-white rounded text-xs font-semibold hover:bg-[#1557b0] transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 5: PER-CUSTOMER EMAIL GATEWAY CONFIGURATION (SUPER ADMIN)
      ────────────────────────────────────────────────────────────────────────── */}
      {showGatewayModal && selectedTenantGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-xl border border-[#dadce0] shadow-2xl p-6 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#dadce0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#202124]">
                    Customer Email Gateway Setup
                  </h3>
                  <p className="text-[11px] text-[#5f6368]">
                    Configuring dedicated SMTP relay for <strong className="text-[#202124]">{selectedTenantGateway.name}</strong> ({selectedTenantGateway.id})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGatewayModal(false)} className="text-[#5f6368] hover:text-[#202124] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerGateway} className="mt-4 space-y-4">
              {/* Relay Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  Select Relay Infrastructure
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayForm((prev) => ({
                        ...prev,
                        host: "smtp-relay.brevo.com",
                        port: "587",
                        provider: "smtp",
                      }));
                    }}
                    className={`p-2 rounded border text-left transition-colors ${
                      gatewayForm.host.includes("brevo") ? "border-[#1a73e8] bg-[#e8f0fe] font-semibold text-[#1a73e8]" : "border-[#dadce0] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="text-xs">Brevo Relay</div>
                    <div className="text-[10px] text-[#5f6368]">Default Multi-Tenant</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGatewayForm((prev) => ({
                        ...prev,
                        host: "email-smtp.us-east-1.amazonaws.com",
                        port: "587",
                        provider: "ses",
                      }));
                    }}
                    className={`p-2 rounded border text-left transition-colors ${
                      gatewayForm.host.includes("amazonaws") ? "border-[#1a73e8] bg-[#e8f0fe] font-semibold text-[#1a73e8]" : "border-[#dadce0] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="text-xs">Amazon SES</div>
                    <div className="text-[10px] text-[#5f6368]">$0.10 / 1k emails</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGatewayForm((prev) => ({
                        ...prev,
                        host: "smtp.sendgrid.net",
                        port: "587",
                        provider: "sendgrid",
                      }));
                    }}
                    className={`p-2 rounded border text-left transition-colors ${
                      gatewayForm.host.includes("sendgrid") ? "border-[#1a73e8] bg-[#e8f0fe] font-semibold text-[#1a73e8]" : "border-[#dadce0] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="text-xs">SendGrid</div>
                    <div className="text-[10px] text-[#5f6368]">Custom Enterprise</div>
                  </button>
                </div>
              </div>

              {/* Host and Port */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    SMTP Host URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.host}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, host: e.target.value })}
                    placeholder="smtp-relay.brevo.com"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded px-2.5 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    Port *
                  </label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.port}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, port: e.target.value })}
                    placeholder="587"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded px-2.5 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Username and Password */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    SMTP Username / API User *
                  </label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.user}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, user: e.target.value })}
                    placeholder="c03022001@smtp-brevo.com"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded px-2.5 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    SMTP Secret Key / Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showGatewayPass ? "text" : "password"}
                      required
                      value={gatewayForm.pass}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, pass: e.target.value })}
                      placeholder="SMTP Master Key"
                      className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded pl-2.5 pr-8 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGatewayPass(!showGatewayPass)}
                      className="absolute right-2 top-2 text-[#5f6368] hover:text-[#202124]"
                    >
                      {showGatewayPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sender Email & Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    Verified Sender Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={gatewayForm.senderEmail}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, senderEmail: e.target.value })}
                    placeholder="invoices@acmecorp.com"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded px-2.5 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3c4043] mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={gatewayForm.senderName}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, senderName: e.target.value })}
                    placeholder="Acme Billing Team"
                    className="w-full bg-[#f8f9fa] border border-[#dadce0] rounded px-2.5 py-1.5 text-xs text-[#202124] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Live Gateway Test Feedback */}
              {gatewayTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    gatewayTestResult.success
                      ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6]"
                      : "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]"
                  }`}
                >
                  {gatewayTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-[#1e8e3e] mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#d93025] mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{gatewayTestResult.message}</div>
                    {gatewayTestResult.suggestion && (
                      <div className="text-[11px] mt-0.5 opacity-90">{gatewayTestResult.suggestion}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#dadce0]">
                {/* Test Gateway */}
                <button
                  type="button"
                  onClick={handleTestGateway}
                  disabled={isTestingGateway}
                  className="px-3 py-1.5 bg-white border border-[#1a73e8] hover:bg-[#e8f0fe] text-[#1a73e8] rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGateway ? "animate-spin" : ""}`} />
                  <span>{isTestingGateway ? "Testing Handshake..." : "⚡ Test Gateway Connection"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(false)}
                    className="px-3 py-1.5 border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] rounded text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{isSaving ? "Saving..." : "💾 Save Gateway to Supabase"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

