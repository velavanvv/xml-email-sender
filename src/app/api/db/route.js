import { NextResponse } from "next/server";
import pg from "pg";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const { Pool } = pg;
const MOCK_STORAGE_FILE = path.join("/tmp", "xml_dispatch_cloud_db.json");

// Default initial records if database is empty
const DEFAULT_CLOUD_RECORDS = [
  {
    id: "rec_cloud_demo_1",
    recipient_email: "alex.turner@example.com",
    subject: "Monthly Statement - October 2026",
    message: "Hi Alex, please find your monthly summary statement attached. Contact our accounts team if you have any questions.",
    attachment_path: "/invoices/2026/alex_october_invoice.pdf",
    attachment_name: "alex_october_invoice.pdf",
    extra_fields: { name: "Alex Turner", account_no: "ACC-8921", balance: "$450.00" },
    status: "pending",
    status_message: "",
    batch_name: "Cloud_Hosted_Demo",
    created_at: new Date().toISOString(),
  },
  {
    id: "rec_cloud_demo_2",
    recipient_email: "sarah.jenkins@acmecorp.io",
    subject: "Contract Agreement & Verification",
    message: "Dear Sarah, attached is the revised NDA and enterprise service contract for your review and execution.",
    attachment_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    attachment_name: "enterprise_contract.pdf",
    extra_fields: { name: "Sarah Jenkins", company: "Acme Corp", dept: "Procurement" },
    status: "pending",
    status_message: "",
    batch_name: "Cloud_Hosted_Demo",
    created_at: new Date().toISOString(),
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

// Full DDL schema for all 4 distinct Supabase tables
export const FULL_SCHEMA_SQL = `
-- 1. Table: email_records
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

-- 2. Table: smtp_configurations
CREATE TABLE IF NOT EXISTS smtp_configurations (
  id TEXT PRIMARY KEY DEFAULT 'default',
  host TEXT NOT NULL,
  port INTEGER DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  sender_email TEXT,
  sender_name TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: email_configurations
CREATE TABLE IF NOT EXISTS email_configurations (
  id TEXT PRIMARY KEY DEFAULT 'default',
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

-- 4. Table: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const SEED_DATA_SQL = `
-- Seed default SMTP config if empty
INSERT INTO smtp_configurations (id, host, port, username, password, sender_email, sender_name, is_active, updated_at)
VALUES (
  'default',
  'smtp-relay.brevo.com',
  587,
  'c03022001@smtp-brevo.com',
  '',
  'velavanvelavan790@gmail.com',
  'CloudMail Team',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed default Email Gateway config if empty
INSERT INTO email_configurations (id, active_provider, resend_api_key, resend_from_email, mailchimp_api_key, mailchimp_from_email, mailchimp_from_name, use_common_body, common_subject, common_body_template, updated_at)
VALUES (
  'default',
  'smtp',
  '',
  'onboarding@resend.dev',
  '',
  '',
  'Accounts Department',
  false,
  'Official Notice: Statement & Documents for {name}',
  'Dear {name},\n\nPlease find attached the official documentation for your account.\n\nAccount Reference: {account_no}\n\nIf you have any questions or require additional support, reply directly to this email.\n\nBest regards,\nClient Services Team',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed default Admin User if empty
INSERT INTO users (id, email, password, role, created_at)
VALUES (
  'usr_admin_default',
  'admin@enterprise.internal',
  'admin123',
  'administrator',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
`;

function getPool(customConnStr = "") {
  const conn = (customConnStr || process.env.DATABASE_URL || "").trim();
  if (!conn) return null;

  // Direct Supabase host check: db.[ref].supabase.co is IPv6-only and cannot be reached from Vercel
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

// GET: Fetch all tables or initialize tables in Supabase Postgres
export async function GET(req) {
  let pool = null;
  let connStr = "";

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const headerConn = req.headers.get("x-database-url") || "";
    const queryConn = searchParams.get("connectionString") || "";
    connStr = (queryConn || headerConn).trim();

    pool = getPool(connStr);

    // Initialize all 4 tables in Supabase
    if (action === "test" || action === "init_table" || action === "init_all_tables") {
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query(FULL_SCHEMA_SQL);
          await client.query(SEED_DATA_SQL);

          // Get counts of each table
          const recordsCount = await client.query("SELECT COUNT(*) FROM email_records;");
          const smtpCount = await client.query("SELECT COUNT(*) FROM smtp_configurations;");
          const emailConfigCount = await client.query("SELECT COUNT(*) FROM email_configurations;");
          const usersCount = await client.query("SELECT COUNT(*) FROM users;");

          return NextResponse.json({
            success: true,
            status: "connected",
            tableCreated: true,
            tables: {
              email_records: parseInt(recordsCount.rows[0]?.count || 0, 10),
              smtp_configurations: parseInt(smtpCount.rows[0]?.count || 0, 10),
              email_configurations: parseInt(emailConfigCount.rows[0]?.count || 0, 10),
              users: parseInt(usersCount.rows[0]?.count || 0, 10),
            },
            message: `✅ All 4 Supabase tables initialized! (email_records, smtp_configurations, email_configurations, users)`,
            host: "Supabase / PostgreSQL Cloud Database",
          });
        } finally {
          client.release();
        }
      }

      return NextResponse.json({
        success: true,
        status: "connected",
        message: "Free Mock Storage connected and active.",
        tables: { email_records: 2, smtp_configurations: 1, email_configurations: 1, users: 1 },
        host: "Cloud Hosted Demo Store (Free)",
      });
    }

    // Load everything from Supabase (or fallback storage)
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query(FULL_SCHEMA_SQL);

        // 1. Fetch records
        const recResult = await client.query("SELECT * FROM email_records ORDER BY created_at DESC;");
        const records = recResult.rows.map((row) => ({
          ...row,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
          extra_fields: typeof row.extra_fields === "string" ? JSON.parse(row.extra_fields) : (row.extra_fields || {}),
        }));

        // 2. Fetch active SMTP config
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

        // 3. Fetch Email gateway & template config
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

        // 4. Fetch Users (safe fields)
        const userResult = await client.query("SELECT id, email, role, last_login_at, created_at FROM users ORDER BY created_at ASC;");
        const users = userResult.rows;

        return NextResponse.json({
          success: true,
          count: records.length,
          records,
          smtpConfig,
          emailConfig,
          users,
          host: "Supabase / PostgreSQL Cloud Database",
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    }

    const storage = readStorage();
    return NextResponse.json({
      success: true,
      count: storage.records?.length || 0,
      records: storage.records || [],
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

// POST: Save records, save SMTP config, save email config, or authenticate against Supabase
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
        await client.query(FULL_SCHEMA_SQL);
        await client.query(SEED_DATA_SQL);

        const recordsCount = await client.query("SELECT COUNT(*) FROM email_records;");
        const smtpCount = await client.query("SELECT COUNT(*) FROM smtp_configurations;");
        const emailConfigCount = await client.query("SELECT COUNT(*) FROM email_configurations;");
        const usersCount = await client.query("SELECT COUNT(*) FROM users;");

        return NextResponse.json({
          success: true,
          status: "connected",
          tableCreated: true,
          tables: {
            email_records: parseInt(recordsCount.rows[0]?.count || 0, 10),
            smtp_configurations: parseInt(smtpCount.rows[0]?.count || 0, 10),
            email_configurations: parseInt(emailConfigCount.rows[0]?.count || 0, 10),
            users: parseInt(usersCount.rows[0]?.count || 0, 10),
          },
          message: `✅ All 4 Supabase tables initialized! (email_records, smtp_configurations, email_configurations, users)`,
          host: "Supabase / PostgreSQL Cloud Database",
        });
      } finally {
        client.release();
      }
    }

    // 2. ACTION: Save / Update SMTP Configuration in Supabase
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
          await client.query(FULL_SCHEMA_SQL);
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

    // 3. ACTION: Save / Update Email Gateway & Template Configurations in Supabase
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
          await client.query(FULL_SCHEMA_SQL);
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

    // 4. ACTION: Authenticate against Supabase users table
    if (action === "authenticate_user" && authCredentials) {
      const email = (authCredentials.email || "").trim();
      const password = (authCredentials.password || "").trim();

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query(FULL_SCHEMA_SQL);
          const userRes = await client.query("SELECT * FROM users WHERE email = $1 LIMIT 1;", [email]);
          const user = userRes.rows[0];

          if (user && user.password === password) {
            await client.query("UPDATE users SET last_login_at = NOW() WHERE id = $1;", [user.id]);
            return NextResponse.json({
              success: true,
              user: { id: user.id, email: user.email, role: user.role },
            });
          }

          // Fallback master password for console access
          if (password === "admin123") {
            return NextResponse.json({
              success: true,
              user: { id: "usr_admin", email: email || "admin@enterprise.internal", role: "administrator" },
            });
          }

          return NextResponse.json({ error: "Invalid operator credentials." }, { status: 401 });
        } finally {
          client.release();
        }
      }

      if (password === "admin123") {
        return NextResponse.json({
          success: true,
          user: { id: "usr_admin_default", email, role: "administrator" },
        });
      }

      return NextResponse.json({ error: "Invalid operator credentials." }, { status: 401 });
    }

    // 5. ACTION: Synchronize Recipient Records into 'email_records'
    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid records payload. Expected an array." }, { status: 400 });
    }

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query(FULL_SCHEMA_SQL);

        for (const rec of records) {
          const recId = rec.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const extraFields = rec.extra_fields ? JSON.stringify(rec.extra_fields) : "{}";
          const sentAt = rec.sent_at ? new Date(rec.sent_at) : null;
          const createdAt = rec.created_at ? new Date(rec.created_at) : new Date();

          await client.query(
            `INSERT INTO email_records (
              id, recipient_email, subject, message, attachment_path, attachment_name, attachment_data, attachment_size, extra_fields, status, status_message, batch_name, sent_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
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

    // Fallback to local storage if no database connection string configured
    writeStorage({ records });

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
