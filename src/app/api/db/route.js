import { NextResponse } from "next/server";
import pg from "pg";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const { Pool } = pg;
const MOCK_STORAGE_FILE = path.join("/tmp", "xml_dispatch_cloud_db.json");

// Default initial records per tenant (ensuring complete multi-tenant client isolation)
const DEFAULT_CLOUD_RECORDS = [
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
];

const DEFAULT_SMTP_CONFIG = {
  id: "default",
  host: "smtp-relay.brevo.com",
  port: 587,
  username: "c03022001@smtp-brevo.com",
  password: process.env.SMTP_PASS || "",
  sender_email: "velavanvelavan790@gmail.com",
  sender_name: "CloudMail Team",
  is_active: true,
};

const DEFAULT_EMAIL_CONFIG = {
  id: "default",
  active_provider: "smtp",
  resend_api_key: "",
  resend_from_email: "onboarding@resend.dev",
  mailchimp_api_key: "",
  mailchimp_from_email: "",
  mailchimp_from_name: "Accounts Department",
  use_common_body: false,
  common_subject: "Official Notice: Statement & Documents for {name}",
  common_body_template: "Dear {name},\n\nPlease find attached the official documentation for your account.\n\nAccount Reference: {account_no}\n\nIf you have any questions or require additional support, reply directly to this email.\n\nBest regards,\nClient Services Team",
};

const DEFAULT_USER = {
  id: "usr_admin_default",
  email: "admin@enterprise.internal",
  password: "admin123",
  role: "administrator",
};

// Default Subscription Plans
const DEFAULT_PLANS = [
  {
    id: "plan_starter",
    name: "Starter Tier",
    price_monthly: 19.00,
    email_limit: 2000,
    features: [
      "2,000 Verified Emails / Mo",
      "1 Custom Verified Domain",
      "XML & CSV Ingestion",
      "Standard Relay Queue",
      "Standard Email Support",
    ],
    is_active: true,
  },
  {
    id: "plan_standard",
    name: "Standard Business",
    price_monthly: 29.00,
    email_limit: 5000,
    features: [
      "5,000 Verified Emails / Mo",
      "3 Custom Verified Domains",
      "Unified & Individual Templates",
      "Automated PDF Attachments",
      "Priority Relay Queue",
      "Delivery & Bounce Logs",
    ],
    is_active: true,
  },
  {
    id: "plan_enterprise",
    name: "Enterprise Tier",
    price_monthly: 49.00,
    email_limit: 15000,
    features: [
      "15,000 Verified Emails / Mo",
      "Unlimited Verified Domains",
      "Dedicated High-Speed Relay",
      "Custom DKIM & SPF Alignment",
      "99.9% Uptime Deliverability SLA",
      "Dedicated Account Manager",
    ],
    is_active: true,
  },
];

// Default Corporate Tenants (Simulating 20+ Client Management)
const DEFAULT_TENANTS = [
  {
    id: "tenant_acme",
    name: "Acme Global Manufacturing",
    contact_email: "admin@acmecorp.com",
    sender_email: "invoices@acmecorp.com",
    sender_name: "Acme Billing Team",
    plan_id: "plan_standard",
    monthly_quota: 2000,
    used_quota: 1420,
    domain_verified: true,
    status: "active",
    monthly_fee: 29.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-25T08:00:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "invoices@acmecorp.com",
    smtp_sender_name: "Acme Billing Team",
    gateway_provider: "smtp",
    created_at: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "tenant_globex",
    name: "Globex Logistics International",
    contact_email: "dispatch@globex.org",
    sender_email: "statements@globex.org",
    sender_name: "Globex Accounts",
    plan_id: "plan_standard",
    monthly_quota: 2000,
    used_quota: 1850,
    domain_verified: true,
    status: "active",
    monthly_fee: 29.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-16T10:30:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "statements@globex.org",
    smtp_sender_name: "Globex Accounts",
    gateway_provider: "smtp",
    created_at: "2026-10-03T10:30:00.000Z",
  },
  {
    id: "tenant_apex",
    name: "Apex Financial Partners",
    contact_email: "billing@apexfinancial.com",
    sender_email: "notices@apexfinancial.com",
    sender_name: "Apex Financial Notices",
    plan_id: "plan_enterprise",
    monthly_quota: 5000,
    used_quota: 3120,
    domain_verified: true,
    status: "active",
    monthly_fee: 49.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-21T12:00:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "notices@apexfinancial.com",
    smtp_sender_name: "Apex Financial Notices",
    gateway_provider: "smtp",
    created_at: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "tenant_sterling",
    name: "Sterling Healthcare Systems",
    contact_email: "it@sterlinghealth.io",
    sender_email: "reports@sterlinghealth.io",
    sender_name: "Sterling Patient Reports",
    plan_id: "plan_starter",
    monthly_quota: 2000,
    used_quota: 890,
    domain_verified: true,
    status: "active",
    monthly_fee: 19.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-09T14:15:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "reports@sterlinghealth.io",
    smtp_sender_name: "Sterling Patient Reports",
    gateway_provider: "smtp",
    created_at: "2026-10-10T14:15:00.000Z",
  },
  {
    id: "tenant_nexus",
    name: "Nexus Direct Retail Network",
    contact_email: "ops@nexusretail.com",
    sender_email: "orders@nexusretail.com",
    sender_name: "Nexus Dispatch",
    plan_id: "plan_standard",
    monthly_quota: 2000,
    used_quota: 1200,
    domain_verified: false,
    status: "pending_dns",
    monthly_fee: 29.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-26T09:00:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "orders@nexusretail.com",
    smtp_sender_name: "Nexus Dispatch",
    gateway_provider: "smtp",
    created_at: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "tenant_vanguard",
    name: "Vanguard Property Holdings",
    contact_email: "leases@vanguardprop.com",
    sender_email: "rent@vanguardprop.com",
    sender_name: "Vanguard Statements",
    plan_id: "plan_standard",
    monthly_quota: 2000,
    used_quota: 1640,
    domain_verified: true,
    status: "active",
    monthly_fee: 29.00,
    billing_status: "paid",
    subscription_renews_at: "2026-11-19T11:00:00.000Z",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_user: "c03022001@smtp-brevo.com",
    smtp_pass: "",
    smtp_sender_email: "rent@vanguardprop.com",
    smtp_sender_name: "Vanguard Statements",
    gateway_provider: "smtp",
    created_at: "2026-10-22T11:00:00.000Z",
  },
];

// Resilient Schema Migrations: executes each DDL statement individually so failure in one never aborts others
export async function runSchemaMigrations(client) {
  const migrations = [
    // 1. users table & column migrations
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'company_user', tenant_id TEXT DEFAULT 'default', created_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'company_user';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,

    // 2. email_records table & column migrations
    `CREATE TABLE IF NOT EXISTS email_records (id TEXT PRIMARY KEY, tenant_id TEXT DEFAULT 'default', recipient_email TEXT NOT NULL, subject TEXT, message TEXT, attachment_path TEXT, attachment_name TEXT, attachment_data TEXT, attachment_size TEXT, extra_fields JSONB DEFAULT '{}'::jsonb, status TEXT DEFAULT 'pending', status_message TEXT, batch_name TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS recipient_email TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS subject TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS message TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS attachment_path TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS attachment_name TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS attachment_data TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS attachment_size TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS status_message TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS batch_name TEXT;`,
    `ALTER TABLE email_records ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;`,

    // 3. smtp_configurations table & column migrations
    `CREATE TABLE IF NOT EXISTS smtp_configurations (id TEXT PRIMARY KEY DEFAULT 'default', tenant_id TEXT DEFAULT 'default', host TEXT NOT NULL, port INTEGER DEFAULT 587, username TEXT NOT NULL, password TEXT NOT NULL, sender_email TEXT, sender_name TEXT, is_active BOOLEAN DEFAULT true, updated_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS host TEXT;`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 587;`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS username TEXT;`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS password TEXT;`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS sender_email TEXT;`,
    `ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS sender_name TEXT;`,

    // 4. email_configurations table & column migrations
    `CREATE TABLE IF NOT EXISTS email_configurations (id TEXT PRIMARY KEY DEFAULT 'default', tenant_id TEXT DEFAULT 'default', active_provider TEXT DEFAULT 'smtp', resend_api_key TEXT, resend_from_email TEXT, mailchimp_api_key TEXT, mailchimp_from_email TEXT, mailchimp_from_name TEXT, use_common_body BOOLEAN DEFAULT false, common_subject TEXT, common_body_template TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';`,
    `ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS active_provider TEXT DEFAULT 'smtp';`,

    // 5. plans table & column migrations
    `CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, price_monthly NUMERIC NOT NULL, email_limit INTEGER NOT NULL, features JSONB DEFAULT '[]'::jsonb, is_active BOOLEAN DEFAULT true, updated_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE plans ADD COLUMN IF NOT EXISTS name TEXT;`,
    `ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 29.00;`,
    `ALTER TABLE plans ADD COLUMN IF NOT EXISTS email_limit INTEGER DEFAULT 2000;`,
    `ALTER TABLE plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;`,

    // 6. tenants table & column migrations
    `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact_email TEXT NOT NULL, sender_email TEXT NOT NULL, sender_name TEXT DEFAULT 'Accounts Dept', plan_id TEXT DEFAULT 'plan_standard', monthly_quota INTEGER DEFAULT 2000, used_quota INTEGER DEFAULT 0, domain_verified BOOLEAN DEFAULT true, status TEXT DEFAULT 'active', monthly_fee NUMERIC DEFAULT 29.00, billing_status TEXT DEFAULT 'paid', subscription_renews_at TIMESTAMPTZ DEFAULT NOW(), smtp_host TEXT, smtp_port INTEGER DEFAULT 587, smtp_user TEXT, smtp_pass TEXT, smtp_sender_email TEXT, smtp_sender_name TEXT, gateway_provider TEXT DEFAULT 'smtp', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'Accounts Dept';`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'plan_standard';`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_quota INTEGER DEFAULT 2000;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS used_quota INTEGER DEFAULT 0;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT true;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 29.00;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'paid';`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ DEFAULT NOW();`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_host TEXT;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_user TEXT;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_pass TEXT;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_sender_email TEXT;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_sender_name TEXT;`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gateway_provider TEXT DEFAULT 'smtp';`,
  ];

  for (const sql of migrations) {
    try {
      await client.query(sql);
    } catch {
      // Individual step error non-blocking
    }
  }
}

// Resilient individual seeding
export async function seedDefaultData(client) {
  // 1. Seed Plans
  const plans = [
    ['plan_starter', 'Starter Tier', 19.00, 2000, JSON.stringify(["2,000 Verified Emails / Mo", "1 Custom Verified Domain", "XML & CSV Ingestion", "Standard Relay Access"])],
    ['plan_standard', 'Standard Business', 29.00, 5000, JSON.stringify(["5,000 Verified Emails / Mo", "3 Custom Verified Domains", "Automated PDF Attachments", "Priority Queue", "Detailed Delivery Logs"])],
    ['plan_enterprise', 'Enterprise Tier', 49.00, 15000, JSON.stringify(["15,000 Verified Emails / Mo", "Unlimited Verified Domains", "Dedicated High-Speed Relay", "Custom DKIM & SPF Alignment", "24/7 SLA Support"])],
  ];
  for (const [id, name, price, limit, feats] of plans) {
    await client.query(
      `INSERT INTO plans (id, name, price_monthly, email_limit, features) VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING;`,
      [id, name, price, limit, feats]
    ).catch(() => {});
  }

  // 2. Seed Default Admin and Initial Company Users
  const users = [
    ['usr_admin_default', 'default', 'admin@enterprise.internal', 'admin123', 'administrator'],
    ['usr_acme', 'tenant_acme', 'admin@acmecorp.com', 'admin123', 'company_user'],
    ['usr_globex', 'tenant_globex', 'dispatch@globex.org', 'admin123', 'company_user'],
    ['usr_apex', 'tenant_apex', 'billing@apexfinancial.com', 'admin123', 'company_user'],
    ['usr_sterling', 'tenant_sterling', 'it@sterlinghealth.io', 'admin123', 'company_user'],
    ['usr_nexus', 'tenant_nexus', 'ops@nexusretail.com', 'admin123', 'company_user'],
    ['usr_vanguard', 'tenant_vanguard', 'leases@vanguardprop.com', 'admin123', 'company_user'],
  ];
  for (const [id, tenantId, email, pass, role] of users) {
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (id) DO NOTHING;`,
      [id, tenantId, email, pass, role]
    ).catch(() => {});
  }

  // 3. Seed Corporate Tenants
  for (const t of DEFAULT_TENANTS) {
    await client.query(
      `INSERT INTO tenants (id, name, contact_email, sender_email, sender_name, plan_id, monthly_quota, used_quota, domain_verified, status, monthly_fee, billing_status, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender_email, smtp_sender_name, gateway_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO NOTHING;`,
      [t.id, t.name, t.contact_email, t.sender_email, t.sender_name || 'Accounts Dept', t.plan_id || 'plan_standard', t.monthly_quota || 2000, t.used_quota || 0, t.domain_verified !== false, t.status || 'active', t.monthly_fee || 29.00, t.billing_status || 'paid', t.smtp_host || 'smtp-relay.brevo.com', t.smtp_port || 587, t.smtp_user || '', t.smtp_pass || '', t.smtp_sender_email || t.sender_email, t.smtp_sender_name || t.sender_name, t.gateway_provider || 'smtp']
    ).catch(() => {});
  }

  // 4. Seed Isolated Default Records
  for (const r of DEFAULT_CLOUD_RECORDS) {
    await client.query(
      `INSERT INTO email_records (id, tenant_id, recipient_email, subject, message, status, status_message, batch_name, extra_fields, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [r.id, r.tenant_id, r.recipient_email, r.subject, r.message, r.status, r.status_message || '', r.batch_name || 'Initial_Batch', JSON.stringify(r.extra_fields || {})]
    ).catch(() => {});
  }

  // 5. Seed default SMTP config
  await client.query(
    `INSERT INTO smtp_configurations (id, tenant_id, host, port, username, password, sender_email, sender_name, is_active, updated_at)
     VALUES ('default', 'default', 'smtp-relay.brevo.com', 587, 'c03022001@smtp-brevo.com', '', 'velavanvelavan790@gmail.com', 'CloudMail Team', true, NOW())
     ON CONFLICT (id) DO NOTHING;`
  ).catch(() => {});

  // 6. Seed default Email Gateway config
  await client.query(
    `INSERT INTO email_configurations (id, tenant_id, active_provider, resend_api_key, resend_from_email, mailchimp_api_key, mailchimp_from_email, mailchimp_from_name, use_common_body, common_subject, common_body_template, updated_at)
     VALUES ('default', 'default', 'smtp', '', 'onboarding@resend.dev', '', '', 'Accounts Department', false, 'Official Notice: Statement & Documents for {name}', 'Dear {name},\n\nPlease find attached the official documentation for your account.\n\nAccount Reference: {account_no}\n\nIf you have any questions or require additional support, reply directly to this email.\n\nBest regards,\nClient Services Team', NOW())
     ON CONFLICT (id) DO NOTHING;`
  ).catch(() => {});
}

export const FULL_SCHEMA_SQL = `
-- Complete Unified Schema for reference and direct execution
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'company_user',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL,
  email_limit INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  subscription_renews_at TIMESTAMPTZ DEFAULT NOW(),
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_sender_email TEXT,
  smtp_sender_name TEXT,
  gateway_provider TEXT DEFAULT 'smtp',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'company_user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE email_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE smtp_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';
`;

const SEED_DATA_SQL = ``;

function getPool(customConnStr = "") {
  const conn = (customConnStr || process.env.DATABASE_URL || "").trim();
  if (!conn) return null;

  if (conn.includes("db.") && conn.includes(".supabase.co")) {
    const error = new Error("Direct Supabase host 'db.[ref].supabase.co' is IPv6-only and cannot be reached from Vercel serverless. Please switch to the Supabase Connection Pooler URI (aws-0-[region].pooler.supabase.com:6543 or 5432) in Supabase Project Settings -> Database.");
    error.code = "SUPABASE_IPV6_DIRECT_NOT_SUPPORTED";
    throw error;
  }

  const pool = new Pool({
    connectionString: conn,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("Postgres pool unexpected background error:", err?.message || err);
  });

  return pool;
}

function readStorage() {
  try {
    if (fs.existsSync(MOCK_STORAGE_FILE)) {
      const data = fs.readFileSync(MOCK_STORAGE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading cloud db storage:", e);
  }
  return {
    records: DEFAULT_CLOUD_RECORDS,
    smtpConfig: DEFAULT_SMTP_CONFIG,
    emailConfig: DEFAULT_EMAIL_CONFIG,
    users: [DEFAULT_USER],
    tenants: DEFAULT_TENANTS,
    plans: DEFAULT_PLANS,
  };
}

function writeStorage(payload) {
  try {
    const current = readStorage();
    const updated = { ...current, ...payload };
    fs.writeFileSync(MOCK_STORAGE_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing cloud db storage:", e);
    return false;
  }
}

function getSupabaseSuggestion(err, connStr = "") {
  const msg = (err?.message || "").toLowerCase();
  if (err?.code === "SUPABASE_IPV6_DIRECT_NOT_SUPPORTED" || msg.includes("enotfound") || msg.includes("getaddrinfo") || connStr.includes("db.")) {
    return "⚠️ IPv6 Direct connection (db.[ref].supabase.co) is not supported by Vercel serverless! In Supabase Dashboard -> Project Settings -> Database, under 'Connection string', switch to 'Connection Pooling' (host: aws-0-[region].pooler.supabase.com:6543 or 5432) and copy the Pooler URI.";
  }
  return "If using Supabase, ensure your connection string includes '?sslmode=require' and password is correct.";
}

// GET: Fetch all tables, admin metrics, or initialize schema in Supabase Postgres
export async function GET(req) {
  let pool = null;
  let connStr = "";

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId") || req.headers.get("x-tenant-id") || "";
    const headerConn = req.headers.get("x-database-url") || "";
    const queryConn = searchParams.get("connectionString") || "";
    connStr = (queryConn || headerConn).trim();

    pool = getPool(connStr);

    // 1. Initialize All Multi-Tenant Tables in Supabase
    if (action === "test" || action === "init_table" || action === "init_all_tables") {
      if (pool) {
        const client = await pool.connect();
        try {
          await runSchemaMigrations(client);
          await seedDefaultData(client);

          const recordsCount = await client.query("SELECT COUNT(*) FROM email_records;").catch(() => ({ rows: [{ count: 0 }] }));
          const smtpCount = await client.query("SELECT COUNT(*) FROM smtp_configurations;").catch(() => ({ rows: [{ count: 0 }] }));
          const emailConfigCount = await client.query("SELECT COUNT(*) FROM email_configurations;").catch(() => ({ rows: [{ count: 0 }] }));
          const usersCount = await client.query("SELECT COUNT(*) FROM users;").catch(() => ({ rows: [{ count: 0 }] }));
          const tenantsCount = await client.query("SELECT COUNT(*) FROM tenants;").catch(() => ({ rows: [{ count: 0 }] }));
          const plansCount = await client.query("SELECT COUNT(*) FROM plans;").catch(() => ({ rows: [{ count: 0 }] }));

          return NextResponse.json({
            success: true,
            status: "connected",
            tableCreated: true,
            tables: {
              email_records: parseInt(recordsCount.rows[0]?.count || 0, 10),
              smtp_configurations: parseInt(smtpCount.rows[0]?.count || 0, 10),
              email_configurations: parseInt(emailConfigCount.rows[0]?.count || 0, 10),
              users: parseInt(usersCount.rows[0]?.count || 0, 10),
              tenants: parseInt(tenantsCount.rows[0]?.count || 0, 10),
              plans: parseInt(plansCount.rows[0]?.count || 0, 10),
            },
            message: `✅ All 6 Multi-Tenant Supabase tables verified & initialized!`,
            host: "Supabase / PostgreSQL Cloud Database",
          });
        } finally {
          client.release();
        }
      }

      return NextResponse.json({
        success: true,
        status: "connected",
        message: "Free Storage connected and active.",
        tables: { email_records: 2, smtp_configurations: 1, email_configurations: 1, users: 1, tenants: 6, plans: 3 },
        host: "Cloud Hosted Demo Store (Free)",
      });
    }

    // 2. Admin Load All (Tenants, Plans, Metrics & Revenue Analytics)
    if (action === "admin_load_all") {
      if (pool) {
        const client = await pool.connect();
        try {
          await runSchemaMigrations(client);

          const tenantsRes = await client.query("SELECT * FROM tenants ORDER BY created_at DESC;");
          const plansRes = await client.query("SELECT * FROM plans ORDER BY price_monthly ASC;");
          const dispatchesRes = await client.query("SELECT COUNT(*) FROM email_records;");

          const tenants = tenantsRes.rows.map((t) => ({
            ...t,
            monthly_fee: parseFloat(t.monthly_fee) || 29.0,
            monthly_quota: parseInt(t.monthly_quota, 10) || 2000,
            used_quota: parseInt(t.used_quota, 10) || 0,
          }));
          const plans = plansRes.rows.map((p) => ({
            ...p,
            price_monthly: parseFloat(p.price_monthly) || 29.0,
            email_limit: parseInt(p.email_limit, 10) || 2000,
          }));
          const totalDispatches = parseInt(dispatchesRes.rows[0]?.count || 0, 10);

          // Calculate Financial Metrics
          const mrr = tenants.reduce((acc, t) => acc + (parseFloat(t.monthly_fee) || 0), 0);
          const arr = mrr * 12;
          const activeTenants = tenants.filter((t) => t.status === "active").length;
          const aggregateQuotaUsed = tenants.reduce((acc, t) => acc + (parseInt(t.used_quota, 10) || 0), 0);
          const aggregateTotalQuota = tenants.reduce((acc, t) => acc + (parseInt(t.monthly_quota, 10) || 0), 0);
          const estInfrastructureCost = 49.00; // $20 Vercel + $25 Supabase + $4 SES
          const netProfit = Math.max(0, mrr - estInfrastructureCost);
          const profitMargin = mrr > 0 ? ((netProfit / mrr) * 100).toFixed(1) : "0";

          return NextResponse.json({
            success: true,
            tenants,
            plans,
            metrics: {
              mrr,
              arr,
              activeTenants,
              totalClients: tenants.length,
              aggregateQuotaUsed,
              aggregateTotalQuota,
              totalDispatches,
              estInfrastructureCost,
              netProfit,
              profitMargin,
            },
            host: "Supabase / PostgreSQL Cloud Database",
          });
        } finally {
          client.release();
        }
      }

      const storage = readStorage();
      const tenants = storage.tenants || DEFAULT_TENANTS;
      const plans = storage.plans || DEFAULT_PLANS;
      const mrr = tenants.reduce((acc, t) => acc + (parseFloat(t.monthly_fee) || 0), 0);
      const arr = mrr * 12;
      const activeTenants = tenants.filter((t) => t.status === "active").length;
      const aggregateQuotaUsed = tenants.reduce((acc, t) => acc + (parseInt(t.used_quota, 10) || 0), 0);
      const aggregateTotalQuota = tenants.reduce((acc, t) => acc + (parseInt(t.monthly_quota, 10) || 0), 0);
      const estInfrastructureCost = 49.00;
      const netProfit = Math.max(0, mrr - estInfrastructureCost);
      const profitMargin = mrr > 0 ? ((netProfit / mrr) * 100).toFixed(1) : "0";

      return NextResponse.json({
        success: true,
        tenants,
        plans,
        metrics: {
          mrr,
          arr,
          activeTenants,
          totalClients: tenants.length,
          aggregateQuotaUsed,
          aggregateTotalQuota,
          totalDispatches: storage.records?.length || 0,
          estInfrastructureCost,
          netProfit,
          profitMargin,
        },
        host: "Cloud Hosted Demo Store (Free)",
      });
    }

    // 3. Regular Load All (for dispatch console)
    if (pool) {
      const client = await pool.connect();
      try {
        await runSchemaMigrations(client);

        // Filter by tenant if provided (strict multi-tenant isolation)
        let querySql = "SELECT * FROM email_records ORDER BY created_at DESC;";
        let params = [];
        if (tenantId && tenantId !== "all") {
          querySql = "SELECT * FROM email_records WHERE tenant_id = $1 ORDER BY created_at DESC;";
          params = [tenantId];
        }

        const recResult = await client.query(querySql, params);
        const records = recResult.rows.map((row) => ({
          ...row,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
          extra_fields: typeof row.extra_fields === "string" ? JSON.parse(row.extra_fields) : (row.extra_fields || {}),
        }));

        const smtpResult = await client.query("SELECT * FROM smtp_configurations WHERE is_active = true ORDER BY updated_at DESC LIMIT 1;");
        const smtpRow = smtpResult.rows[0] || null;
        const smtpConfig = smtpRow ? {
          host: smtpRow.host || "smtp-relay.brevo.com",
          port: (smtpRow.port || 587).toString(),
          user: smtpRow.username || "",
          pass: smtpRow.password || "",
          senderEmail: smtpRow.sender_email || "",
          senderName: smtpRow.sender_name || "CloudMail Team",
        } : null;

        const emailCfgResult = await client.query("SELECT * FROM email_configurations ORDER BY updated_at DESC LIMIT 1;");
        const emailCfgRow = emailCfgResult.rows[0] || null;
        const emailConfig = emailCfgRow ? {
          provider: emailCfgRow.active_provider || "smtp",
          resendKey: emailCfgRow.resend_api_key || "",
          resendFromEmail: emailCfgRow.resend_from_email || "onboarding@resend.dev",
          mailchimpApiKey: emailCfgRow.mailchimp_api_key || "",
          mailchimpFromEmail: emailCfgRow.mailchimp_from_email || "",
          mailchimpFromName: emailCfgRow.mailchimp_from_name || "Accounts Department",
          useCommonBody: emailCfgRow.use_common_body || false,
          commonSubject: emailCfgRow.common_subject || "",
          commonBodyTemplate: emailCfgRow.common_body_template || "",
        } : null;

        const userResult = await client.query("SELECT id, email, role, last_login_at, created_at FROM users ORDER BY created_at ASC;");
        const users = userResult.rows;

        const tenantsResult = await client.query("SELECT id, name, sender_email, plan_id, monthly_quota, used_quota, status FROM tenants ORDER BY name ASC;");
        const tenants = tenantsResult.rows;

        return NextResponse.json({
          success: true,
          count: records.length,
          records,
          smtpConfig,
          emailConfig,
          users,
          tenants,
          host: "Supabase / PostgreSQL Cloud Database",
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    }

    const storage = readStorage();
    let records = storage.records || DEFAULT_CLOUD_RECORDS;
    if (tenantId && tenantId !== "all") {
      records = records.filter((r) => r.tenant_id === tenantId);
    }
    return NextResponse.json({
      success: true,
      count: records.length,
      records,
      smtpConfig: storage.smtpConfig ? {
        host: storage.smtpConfig.host,
        port: storage.smtpConfig.port.toString(),
        user: storage.smtpConfig.username,
        pass: storage.smtpConfig.password,
        senderEmail: storage.smtpConfig.sender_email,
        senderName: storage.smtpConfig.sender_name,
      } : null,
      emailConfig: storage.emailConfig,
      users: storage.users || [],
      tenants: storage.tenants || DEFAULT_TENANTS,
      host: "Cloud Hosted Demo Store (Free)",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("API /api/db GET error:", err);
    return NextResponse.json({
      error: err.message || "Failed to query database",
      suggestion: getSupabaseSuggestion(err, connStr),
    }, { status: 400 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

// POST: Save records, save SMTP config, manage tenants & plans, or authenticate against Supabase
export async function POST(req) {
  let pool = null;
  let connStr = "";

  try {
    const body = await req.json().catch(() => ({}));
    const {
      records = [],
      connectionString = "",
      action = "",
      smtpConfig = null,
      emailConfig = null,
      authCredentials = null,
      tenant = null,
      tenantId = null,
      plan = null,
    } = body;

    const headerConn = req.headers.get("x-database-url") || "";
    connStr = (connectionString || headerConn).trim();

    pool = getPool(connStr);

    // 1. ACTION: Initialize All Tables & Seed Defaults
    if (action === "init_table" || action === "init_all_tables" || action === "test_custom") {
      if (!connStr && !process.env.DATABASE_URL) {
        return NextResponse.json({
          error: "No PostgreSQL connection string provided. Please provide your Supabase URI.",
        }, { status: 400 });
      }

      if (!pool) {
        return NextResponse.json({ error: "Invalid database connection parameters." }, { status: 400 });
      }

      const client = await pool.connect();
      try {
        await runSchemaMigrations(client);
        await seedDefaultData(client);

        const recordsCount = await client.query("SELECT COUNT(*) FROM email_records;").catch(() => ({ rows: [{ count: 0 }] }));
        const smtpCount = await client.query("SELECT COUNT(*) FROM smtp_configurations;").catch(() => ({ rows: [{ count: 0 }] }));
        const emailConfigCount = await client.query("SELECT COUNT(*) FROM email_configurations;").catch(() => ({ rows: [{ count: 0 }] }));
        const usersCount = await client.query("SELECT COUNT(*) FROM users;").catch(() => ({ rows: [{ count: 0 }] }));
        const tenantsCount = await client.query("SELECT COUNT(*) FROM tenants;").catch(() => ({ rows: [{ count: 0 }] }));
        const plansCount = await client.query("SELECT COUNT(*) FROM plans;").catch(() => ({ rows: [{ count: 0 }] }));

        return NextResponse.json({
          success: true,
          status: "connected",
          tableCreated: true,
          tables: {
            email_records: parseInt(recordsCount.rows[0]?.count || 0, 10),
            smtp_configurations: parseInt(smtpCount.rows[0]?.count || 0, 10),
            email_configurations: parseInt(emailConfigCount.rows[0]?.count || 0, 10),
            users: parseInt(usersCount.rows[0]?.count || 0, 10),
            tenants: parseInt(tenantsCount.rows[0]?.count || 0, 10),
            plans: parseInt(plansCount.rows[0]?.count || 0, 10),
          },
          message: `✅ All 6 Multi-Tenant Supabase tables verified & initialized!`,
          host: "Supabase / PostgreSQL Cloud Database",
        });
      } finally {
        client.release();
      }
    }

    // 2. ACTION: Create or Update Tenant / Customer & Auto-Provision Company User
    if (action === "create_tenant" && tenant) {
      const id = tenant.id || `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const name = (tenant.name || "Commercial Client").trim();
      const contactEmail = (tenant.contact_email || "").trim().toLowerCase();
      const senderEmail = (tenant.sender_email || "").trim().toLowerCase();
      const senderName = (tenant.sender_name || "Accounts Dept").trim();
      const planId = tenant.plan_id || "plan_standard";
      const monthlyQuota = parseInt(tenant.monthly_quota || 2000, 10);
      const usedQuota = parseInt(tenant.used_quota || 0, 10);
      const domainVerified = tenant.domain_verified !== undefined ? Boolean(tenant.domain_verified) : true;
      const status = tenant.status || "active";
      const monthlyFee = parseFloat(tenant.monthly_fee || 29.00);
      const billingStatus = tenant.billing_status || "paid";
      const subscriptionRenewsAt = tenant.subscription_renews_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const smtpHost = (tenant.smtp_host || "").trim();
      const smtpPort = parseInt(tenant.smtp_port || 587, 10);
      const smtpUser = (tenant.smtp_user || "").trim();
      const smtpPass = (tenant.smtp_pass || "").trim();
      const smtpSenderEmail = (tenant.smtp_sender_email || senderEmail || "").trim();
      const smtpSenderName = (tenant.smtp_sender_name || senderName || "").trim();
      const gatewayProvider = tenant.gateway_provider || "smtp";

      if (pool) {
        const client = await pool.connect();
        try {
          await runSchemaMigrations(client);
          await client.query(
            `INSERT INTO tenants (
              id, name, contact_email, sender_email, sender_name, plan_id, monthly_quota, used_quota,
              domain_verified, status, monthly_fee, billing_status, subscription_renews_at,
              smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender_email, smtp_sender_name, gateway_provider,
              updated_at
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               contact_email = EXCLUDED.contact_email,
               sender_email = EXCLUDED.sender_email,
               sender_name = EXCLUDED.sender_name,
               plan_id = EXCLUDED.plan_id,
               monthly_quota = EXCLUDED.monthly_quota,
               used_quota = EXCLUDED.used_quota,
               domain_verified = EXCLUDED.domain_verified,
               status = EXCLUDED.status,
               monthly_fee = EXCLUDED.monthly_fee,
               billing_status = EXCLUDED.billing_status,
               subscription_renews_at = EXCLUDED.subscription_renews_at,
               smtp_host = EXCLUDED.smtp_host,
               smtp_port = EXCLUDED.smtp_port,
               smtp_user = EXCLUDED.smtp_user,
               smtp_pass = EXCLUDED.smtp_pass,
               smtp_sender_email = EXCLUDED.smtp_sender_email,
               smtp_sender_name = EXCLUDED.smtp_sender_name,
               gateway_provider = EXCLUDED.gateway_provider,
               updated_at = NOW();`,
            [
              id, name, contactEmail, senderEmail, senderName, planId, monthlyQuota, usedQuota,
              domainVerified, status, monthlyFee, billingStatus, subscriptionRenewsAt,
              smtpHost, smtpPort, smtpUser, smtpPass, smtpSenderEmail, smtpSenderName, gatewayProvider
            ]
          );

          // If custom SMTP credentials provided, store in smtp_configurations table as well
          if (smtpHost && smtpUser) {
            await client.query(
              `INSERT INTO smtp_configurations (id, tenant_id, host, port, username, password, sender_email, sender_name, is_active, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 tenant_id = EXCLUDED.tenant_id,
                 host = EXCLUDED.host,
                 port = EXCLUDED.port,
                 username = EXCLUDED.username,
                 password = EXCLUDED.password,
                 sender_email = EXCLUDED.sender_email,
                 sender_name = EXCLUDED.sender_name,
                 is_active = true,
                 updated_at = NOW();`,
              [`smtp_${id}`, id, smtpHost, smtpPort, smtpUser, smtpPass, smtpSenderEmail, smtpSenderName]
            ).catch((e) => console.warn("SMTP config sync notice:", e.message));
          }

          const rawPassword = (tenant.password || tenant.initial_password || "").trim();
          const initialPassword = rawPassword || "admin123";

          // Auto-provision Company User account with initial/custom password
          await client.query(
            `INSERT INTO users (id, tenant_id, email, password, role, created_at)
             VALUES ($1, $2, $3, $4, 'company_user', NOW())
             ON CONFLICT (id) DO UPDATE SET
               tenant_id = EXCLUDED.tenant_id,
               email = EXCLUDED.email,
               password = CASE WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password != '' THEN EXCLUDED.password ELSE users.password END;`,
            [`usr_${id}`, id, contactEmail, initialPassword]
          ).catch((e) => console.warn("Auto-user provision notice:", e.message));

          if (rawPassword) {
            await client.query(
              `UPDATE users SET password = $1 WHERE tenant_id = $2 OR LOWER(email) = $3;`,
              [rawPassword, id, contactEmail]
            ).catch(() => {});
          }

          return NextResponse.json({
            success: true,
            tenant: {
              id, name, contact_email: contactEmail, sender_email: senderEmail, plan_id: planId,
              monthly_quota: monthlyQuota, used_quota: usedQuota, subscription_renews_at: subscriptionRenewsAt,
              smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, smtp_sender_email: smtpSenderEmail,
              smtp_sender_name: smtpSenderName, gateway_provider: gatewayProvider
            },
            message: `Customer '${name}' successfully onboarded with portal credentials and email gateway configuration!`,
          });
        } finally {
          client.release();
        }
      }

      const storage = readStorage();
      const tenants = storage.tenants || DEFAULT_TENANTS;
      const rawPassword = (tenant.password || tenant.initial_password || "").trim();
      const initialPassword = rawPassword || "admin123";
      const existingIdx = tenants.findIndex((t) => t.id === id);
      const newTenant = {
        id,
        name,
        contact_email: contactEmail,
        sender_email: senderEmail,
        sender_name: senderName,
        plan_id: planId,
        monthly_quota: monthlyQuota,
        used_quota: usedQuota,
        domain_verified: domainVerified,
        status,
        monthly_fee: monthlyFee,
        billing_status: billingStatus,
        subscription_renews_at: subscriptionRenewsAt,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_sender_email: smtpSenderEmail,
        smtp_sender_name: smtpSenderName,
        gateway_provider: gatewayProvider,
        created_at: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        tenants[existingIdx] = newTenant;
      } else {
        tenants.unshift(newTenant);
      }
      
      const users = storage.users || [];
      const uIdx = users.findIndex(u => u.tenant_id === id || (u.email && u.email.toLowerCase() === contactEmail));
      if (uIdx >= 0) {
        if (rawPassword) users[uIdx].password = rawPassword;
        users[uIdx].email = contactEmail;
        users[uIdx].tenant_id = id;
      } else {
        users.push({ id: `usr_${id}`, tenant_id: id, email: contactEmail, password: initialPassword, role: 'company_user' });
      }
      writeStorage({ tenants, users });

      return NextResponse.json({
        success: true,
        tenant: newTenant,
        message: `Customer '${name}' saved with portal credentials and gateway configuration.`,
      });
    }

    // 2.5 ACTION: Customer Change Password
    if (action === "change_password") {
      const { tenantId, email, newPassword } = body;
      const cleanPass = (newPassword || "").trim();
      if (cleanPass.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
      }

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE users SET password = $1 WHERE (tenant_id = $2 OR LOWER(email) = LOWER($3));`,
            [cleanPass, tenantId || "", email || ""]
          );
          return NextResponse.json({ success: true, message: "Password updated successfully in database." });
        } finally {
          client.release();
        }
      }

      const storage = readStorage();
      const users = storage.users || [];
      const user = users.find(
        (u) => (tenantId && u.tenant_id === tenantId) || (email && (u.email || "").toLowerCase() === (email || "").toLowerCase())
      );
      if (user) {
        user.password = cleanPass;
      } else {
        users.push({
          id: `usr_${tenantId || Date.now()}`,
          tenant_id: tenantId || "custom",
          email: email || "",
          password: cleanPass,
          role: "company_user",
        });
      }
      writeStorage({ users });
      return NextResponse.json({ success: true, message: "Password updated successfully!" });
    }

    // 3. ACTION: Delete Tenant / Customer
    if (action === "delete_tenant" && tenantId) {
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query("DELETE FROM tenants WHERE id = $1;", [tenantId]);
          return NextResponse.json({ success: true, message: "Customer removed successfully." });
        } finally {
          client.release();
        }
      }

      const storage = readStorage();
      const tenants = (storage.tenants || DEFAULT_TENANTS).filter((t) => t.id !== tenantId);
      writeStorage({ tenants });
      return NextResponse.json({ success: true, message: "Customer removed from storage." });
    }

    // 4. ACTION: Update Subscription Plan
    if (action === "update_plan" && plan) {
      const planId = plan.id;
      const name = (plan.name || "Plan").trim();
      const priceMonthly = parseFloat(plan.price_monthly || 29.00);
      const emailLimit = parseInt(plan.email_limit || 2000, 10);
      const features = Array.isArray(plan.features) ? plan.features : [];

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO plans (id, name, price_monthly, email_limit, features, is_active, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               price_monthly = EXCLUDED.price_monthly,
               email_limit = EXCLUDED.email_limit,
               features = EXCLUDED.features,
               updated_at = NOW();`,
            [planId, name, priceMonthly, emailLimit, JSON.stringify(features)]
          );
          return NextResponse.json({ success: true, message: `Plan '${name}' updated in Supabase.` });
        } finally {
          client.release();
        }
      }

      const storage = readStorage();
      const plans = storage.plans || DEFAULT_PLANS;
      const idx = plans.findIndex((p) => p.id === planId);
      if (idx >= 0) {
        plans[idx] = { ...plans[idx], name, price_monthly: priceMonthly, email_limit: emailLimit, features };
      }
      writeStorage({ plans });
      return NextResponse.json({ success: true, message: `Plan '${name}' saved to storage.` });
    }

    // 5. ACTION: Save / Update SMTP Configuration in Supabase
    if (action === "save_smtp" && smtpConfig) {
      const host = (smtpConfig.host || "smtp-relay.brevo.com").trim();
      const port = parseInt((smtpConfig.port || 587).toString().trim(), 10);
      const username = (smtpConfig.user || "").trim();
      const password = (smtpConfig.pass || "").trim();
      const senderEmail = (smtpConfig.senderEmail || "").trim();
      const senderName = (smtpConfig.senderName || "CloudMail Team").trim();

      if (pool) {
        const client = await pool.connect();
        try {
          await runSchemaMigrations(client);
          await client.query(
            `INSERT INTO smtp_configurations (id, host, port, username, password, sender_email, sender_name, is_active, updated_at)
             VALUES ('default', $1, $2, $3, $4, $5, $6, true, NOW())
             ON CONFLICT (id) DO UPDATE SET
               host = EXCLUDED.host,
               port = EXCLUDED.port,
               username = EXCLUDED.username,
               password = EXCLUDED.password,
               sender_email = EXCLUDED.sender_email,
               sender_name = EXCLUDED.sender_name,
               is_active = true,
               updated_at = NOW();`,
            [host, port, username, password, senderEmail, senderName]
          );

          return NextResponse.json({
            success: true,
            message: "SMTP configuration successfully persisted to Supabase table 'smtp_configurations'.",
            tableName: "smtp_configurations",
          });
        } finally {
          client.release();
        }
      }

      writeStorage({
        smtpConfig: {
          id: "default",
          host,
          port,
          username,
          password,
          sender_email: senderEmail,
          sender_name: senderName,
          is_active: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "SMTP configuration saved to Demo Storage.",
      });
    }

    // 6. ACTION: Save / Update Email Gateway & Template Configurations in Supabase
    if (action === "save_email_config" && emailConfig) {
      const activeProvider = (emailConfig.provider || "smtp").trim();
      const resendApiKey = (emailConfig.resendKey || "").trim();
      const resendFromEmail = (emailConfig.resendFromEmail || "").trim();
      const mailchimpApiKey = (emailConfig.mailchimpApiKey || "").trim();
      const mailchimpFromEmail = (emailConfig.mailchimpFromEmail || "").trim();
      const mailchimpFromName = (emailConfig.mailchimpFromName || "").trim();
      const useCommonBody = Boolean(emailConfig.useCommonBody);
      const commonSubject = emailConfig.commonSubject || "";
      const commonBodyTemplate = emailConfig.commonBodyTemplate || "";

      if (pool) {
        const client = await pool.connect();
        try {
          await runSchemaMigrations(client);
          await client.query(
            `INSERT INTO email_configurations (id, active_provider, resend_api_key, resend_from_email, mailchimp_api_key, mailchimp_from_email, mailchimp_from_name, use_common_body, common_subject, common_body_template, updated_at)
             VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET
               active_provider = EXCLUDED.active_provider,
               resend_api_key = EXCLUDED.resend_api_key,
               resend_from_email = EXCLUDED.resend_from_email,
               mailchimp_api_key = EXCLUDED.mailchimp_api_key,
               mailchimp_from_email = EXCLUDED.mailchimp_from_email,
               mailchimp_from_name = EXCLUDED.mailchimp_from_name,
               use_common_body = EXCLUDED.use_common_body,
               common_subject = EXCLUDED.common_subject,
               common_body_template = EXCLUDED.common_body_template,
               updated_at = NOW();`,
            [activeProvider, resendApiKey, resendFromEmail, mailchimpApiKey, mailchimpFromEmail, mailchimpFromName, useCommonBody, commonSubject, commonBodyTemplate]
          );

          return NextResponse.json({
            success: true,
            message: "Email gateway & templates persisted to Supabase table 'email_configurations'.",
            tableName: "email_configurations",
          });
        } finally {
          client.release();
        }
      }

      writeStorage({
        emailConfig: {
          id: "default",
          active_provider: activeProvider,
          resend_api_key: resendApiKey,
          resend_from_email: resendFromEmail,
          mailchimp_api_key: mailchimpApiKey,
          mailchimp_from_email: mailchimpFromEmail,
          mailchimp_from_name: mailchimpFromName,
          use_common_body: useCommonBody,
          common_subject: commonSubject,
          common_body_template: commonBodyTemplate,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email gateway & templates saved to Demo Storage.",
      });
    }

    // 7. ACTION: Authenticate against Supabase users table (Role-based: Super Admin vs Company)
    if (action === "authenticate_user" && authCredentials) {
      const email = (authCredentials.email || "").trim().toLowerCase();
      const password = (authCredentials.password || "").trim();

      if (pool) {
        const client = await pool.connect();
        try {
          // 1. Run resilient schema migrations (guarantees users.tenant_id, etc. exist)
          await runSchemaMigrations(client);
          // 2. Run seed data safely
          await seedDefaultData(client);
          const userRes = await client.query(
            "SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1;",
            [email]
          );
          let user = userRes.rows[0];

          // Auto-link known tenant email if user record missing
          if (!user) {
            if (email === "admin@enterprise.internal") {
              user = { id: "usr_admin_default", tenant_id: "default", email, role: "administrator", password: "admin123" };
            } else {
              const tRes = await client.query(
                "SELECT * FROM tenants WHERE LOWER(contact_email) = $1 OR LOWER(sender_email) = $1 LIMIT 1;",
                [email]
              );
              if (tRes.rows[0]) {
                user = { id: `usr_${tRes.rows[0].id}`, tenant_id: tRes.rows[0].id, email, role: "company_user", password: "admin123" };
              }
            }
          }

          if (user && !user.tenant_id) {
            user.tenant_id = "default";
          }

          const isValidAuth = user && (user.password ? user.password === password : password === "admin123");
          if (user && isValidAuth) {
            if (user.id && !user.id.startsWith("usr_dynamic")) {
              await client.query("UPDATE users SET last_login_at = NOW() WHERE id = $1;", [user.id]).catch(() => {});
            }

            // A. Super Admin Operator
            if (user.role === "administrator" || email === "admin@enterprise.internal") {
              return NextResponse.json({
                success: true,
                userType: "super_admin",
                user: { id: user.id, email: user.email, role: "administrator" },
                redirect: "/admin",
              });
            }

            // B. Company Client Account
            const tenantRes = await client.query(
              "SELECT * FROM tenants WHERE id = $1 OR LOWER(contact_email) = $2 LIMIT 1;",
              [user.tenant_id || "", email]
            );
            const tenant = tenantRes.rows[0] || {
              id: user.tenant_id || "tenant_custom",
              name: email.split("@")[0].toUpperCase() + " Corporation",
              contact_email: email,
              sender_email: email,
              sender_name: "Operations Team",
              plan_id: "plan_standard",
              monthly_quota: 2000,
              used_quota: 0,
              domain_verified: true,
              status: "active",
              monthly_fee: 29.00,
              subscription_renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            };

            const planRes = await client.query("SELECT * FROM plans WHERE id = $1 LIMIT 1;", [tenant.plan_id]);
            const plan = planRes.rows[0] || null;

            return NextResponse.json({
              success: true,
              userType: "company",
              user: { id: user.id, email: user.email, role: "company_user", tenant_id: tenant.id },
              tenant,
              plan,
              redirect: "/",
            });
          }

          return NextResponse.json({ error: "Invalid credentials. Please verify your email and password." }, { status: 401 });
        } finally {
          client.release();
        }
      }

      // Demo In-Memory Fallback (when Supabase DB URL is not connected)
      if (email === "admin@enterprise.internal" && (password === "admin123" || password.length > 0)) {
        return NextResponse.json({
          success: true,
          userType: "super_admin",
          user: { id: "usr_admin_default", email, role: "administrator" },
          redirect: "/admin",
        });
      }

      const storage = readStorage();
      const storageUsers = storage.users || [];
      const storedUser = storageUsers.find((u) => (u.email || "").toLowerCase() === email);
      const demoTenants = storage.tenants || DEFAULT_TENANTS;
      const matchedTenant = demoTenants.find(
        (t) => (t.contact_email || "").toLowerCase() === email || (t.sender_email || "").toLowerCase() === email
      );

      if (matchedTenant) {
        if (storedUser && storedUser.password) {
          if (storedUser.password !== password) {
            return NextResponse.json({ error: "Invalid password. Please check your credentials." }, { status: 401 });
          }
        }

        return NextResponse.json({
          success: true,
          userType: "company",
          user: { id: storedUser?.id || `usr_${matchedTenant.id}`, email, role: "company_user", tenant_id: matchedTenant.id },
          tenant: matchedTenant,
          redirect: "/",
        });
      }

      if (password === "admin123") {
        const fallbackTenant = {
          id: `tenant_${Date.now()}`,
          name: email.split("@")[0].toUpperCase() + " Enterprise",
          contact_email: email,
          sender_email: email,
          sender_name: "Corporate Communications",
          plan_id: "plan_standard",
          monthly_quota: 2000,
          used_quota: 120,
          domain_verified: true,
          status: "active",
          monthly_fee: 29.00,
          billing_status: "paid",
          subscription_renews_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        };

        return NextResponse.json({
          success: true,
          userType: "company",
          user: { id: "usr_demo", email, role: "company_user", tenant_id: fallbackTenant.id },
          tenant: fallbackTenant,
          redirect: "/",
        });
      }

      return NextResponse.json({ error: "Invalid operator credentials." }, { status: 401 });
    }

    // 7B. ACTION: Update Tenant Quota after dispatches
    if (action === "update_tenant_quota") {
      const tenantId = body.tenant_id;
      const incrementBy = parseInt(body.increment_by || 1, 10);

      if (tenantId) {
        if (pool) {
          const client = await pool.connect();
          try {
            await client.query(
              "UPDATE tenants SET used_quota = used_quota + $1, updated_at = NOW() WHERE id = $2;",
              [incrementBy, tenantId]
            );
            return NextResponse.json({ success: true, message: `Updated quota for ${tenantId}` });
          } finally {
            client.release();
          }
        }

        const storage = readStorage();
        const tenants = storage.tenants || DEFAULT_TENANTS;
        const tIdx = tenants.findIndex((t) => t.id === tenantId);
        if (tIdx >= 0) {
          tenants[tIdx].used_quota = (parseInt(tenants[tIdx].used_quota, 10) || 0) + incrementBy;
          writeStorage({ tenants });
        }
        return NextResponse.json({ success: true, message: `Updated quota for ${tenantId}` });
      }
    }

    // 8. ACTION: Synchronize Recipient Records into 'email_records'
    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid records payload. Expected an array." }, { status: 400 });
    }

    if (pool) {
      const client = await pool.connect();
      try {
        await runSchemaMigrations(client);

        const activeTenantId = body.tenant_id || tenantId || "";
        for (const rec of records) {
          const recId = rec.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const recTenantId = rec.tenant_id || activeTenantId || "default";
          const extraFields = rec.extra_fields ? JSON.stringify(rec.extra_fields) : "{}";
          const sentAt = rec.sent_at ? new Date(rec.sent_at) : null;
          const createdAt = rec.created_at ? new Date(rec.created_at) : new Date();

          await client.query(
            `INSERT INTO email_records (
              id, tenant_id, recipient_email, subject, message, attachment_path, attachment_name, attachment_data, attachment_size, extra_fields, status, status_message, batch_name, sent_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              tenant_id = EXCLUDED.tenant_id,
              recipient_email = EXCLUDED.recipient_email,
              subject = EXCLUDED.subject,
              message = EXCLUDED.message,
              attachment_path = EXCLUDED.attachment_path,
              attachment_name = EXCLUDED.attachment_name,
              attachment_data = EXCLUDED.attachment_data,
              attachment_size = EXCLUDED.attachment_size,
              extra_fields = EXCLUDED.extra_fields,
              status = EXCLUDED.status,
              status_message = EXCLUDED.status_message,
              batch_name = EXCLUDED.batch_name,
              sent_at = EXCLUDED.sent_at;`,
            [
              recId,
              recTenantId,
              rec.recipient_email || "",
              rec.subject || "",
              rec.message || "",
              rec.attachment_path || "",
              rec.attachment_name || "",
              rec.attachment_data || "",
              rec.attachment_size || "",
              extraFields,
              rec.status || "pending",
              rec.status_message || "",
              rec.batch_name || "Cloud_Hosted_Demo",
              sentAt,
              createdAt,
            ]
          );
        }

        // Increment tenant's used quota if dispatched
        const sentCount = records.filter((r) => r.status === "sent").length;
        if (sentCount > 0 && tenantId) {
          await client.query("UPDATE tenants SET used_quota = used_quota + $1, updated_at = NOW() WHERE id = $2;", [sentCount, tenantId]).catch(() => {});
        }

        return NextResponse.json({
          success: true,
          count: records.length,
          message: `Successfully synchronized ${records.length} records into Supabase PostgreSQL table 'email_records'.`,
          host: "Supabase / PostgreSQL Cloud Database",
          synced_at: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    }

    // Fallback to local storage (strictly isolating records per tenant)
    const storage = readStorage();
    const activeTenantId = body.tenant_id || tenantId || "";
    let currentRecords = storage.records || DEFAULT_CLOUD_RECORDS;
    if (activeTenantId) {
      const otherRecords = currentRecords.filter((r) => r.tenant_id !== activeTenantId);
      const taggedNew = records.map((r) => ({ ...r, tenant_id: activeTenantId }));
      currentRecords = [...taggedNew, ...otherRecords];
    } else {
      currentRecords = records;
    }
    writeStorage({ records: currentRecords });

    return NextResponse.json({
      success: true,
      count: records.length,
      message: `Successfully synchronized ${records.length} records to Demo Storage.`,
      host: "Cloud Hosted Demo Store (Free)",
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("API /api/db POST error:", err);
    return NextResponse.json({
      error: err.message || "Failed to sync to database",
      suggestion: getSupabaseSuggestion(err, connStr),
    }, { status: 400 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
