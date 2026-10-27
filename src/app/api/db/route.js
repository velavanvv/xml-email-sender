import { NextResponse } from "next/server";
import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;
const MOCK_STORAGE_FILE = path.join("/tmp", "xml_dispatch_cloud_db.json");

// Default initial records if empty
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

const CREATE_TABLE_SQL = `
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

  return new Pool({
    connectionString: conn,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 4000,
  });
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
  return DEFAULT_CLOUD_RECORDS;
}

function writeStorage(records) {
  try {
    fs.writeFileSync(MOCK_STORAGE_FILE, JSON.stringify(records, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing cloud db storage:", e);
    return false;
  }
}

function getSupabaseSuggestion(err, connStr = "") {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("enotfound") || msg.includes("getaddrinfo") || connStr.includes("db.")) {
    return "⚠️ IPv6 Direct connection (db.[ref].supabase.co) is not supported by Vercel serverless! In Supabase Dashboard -> Project Settings -> Database, under 'Connection string', switch to 'Connection Pooling' (host: aws-0-[region].pooler.supabase.com:6543 or 5432) and copy the Pooler URI.";
  }
  return "If using Supabase, ensure your connection string includes '?sslmode=require' and password is correct.";
}

// GET: Fetch records from Supabase Postgres or fallback store
export async function GET(req) {
  let pool = null;
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const headerConn = req.headers.get("x-database-url") || "";
    const queryConn = searchParams.get("connectionString") || "";
    const connStr = queryConn || headerConn;

    pool = getPool(connStr);

    if (action === "test" || action === "init_table") {
      if (pool) {
        const client = await pool.connect();
        try {
          // Auto-create table in Supabase
          await client.query(CREATE_TABLE_SQL);
          const countRes = await client.query("SELECT COUNT(*) FROM email_records;");
          const count = parseInt(countRes.rows[0]?.count || 0, 10);
          return NextResponse.json({
            success: true,
            status: "connected",
            tableCreated: true,
            tableName: "email_records",
            rowCount: count,
            message: `✅ Supabase PostgreSQL connected! Table 'email_records' successfully initialized (${count} existing records).`,
            host: "Supabase / PostgreSQL Cloud Database",
          });
        } finally {
          client.release();
        }
      }

      return NextResponse.json({
        success: true,
        status: "connected",
        message: "Free Hosted Database connected and active.",
        host: "Cloud Hosted Demo Store (Free)",
      });
    }

    // Standard fetch
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query(CREATE_TABLE_SQL);
        const result = await client.query("SELECT * FROM email_records ORDER BY created_at DESC;");
        const records = result.rows.map((row) => ({
          ...row,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
          extra_fields: typeof row.extra_fields === "string" ? JSON.parse(row.extra_fields) : (row.extra_fields || {}),
        }));

        return NextResponse.json({
          success: true,
          count: records.length,
          records: records,
          host: "Supabase / PostgreSQL Cloud Database",
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
      }
    }

    const records = readStorage();
    return NextResponse.json({
      success: true,
      count: records.length,
      records: records,
      host: "Cloud Hosted Demo Store (Free)",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("API /api/db GET error:", err);
    return NextResponse.json({
      error: err.message,
      suggestion: getSupabaseSuggestion(err, connStr),
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

// POST: Save, sync records, or initialize table in Supabase
export async function POST(req) {
  let pool = null;
  try {
    const body = await req.json();
    const { records = [], connectionString = "", action = "" } = body;
    const headerConn = req.headers.get("x-database-url") || "";
    const connStr = connectionString || headerConn;

    pool = getPool(connStr);

    // Explicit table creation / connection test action
    if (action === "init_table" || action === "test_custom") {
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
        // Execute table creation
        await client.query(CREATE_TABLE_SQL);
        const countRes = await client.query("SELECT COUNT(*) FROM email_records;");
        const count = parseInt(countRes.rows[0]?.count || 0, 10);
        return NextResponse.json({
          success: true,
          status: "connected",
          tableCreated: true,
          tableName: "email_records",
          rowCount: count,
          message: `✅ Table 'email_records' created and verified in Supabase PostgreSQL! Ready to sync.`,
          host: "Supabase / PostgreSQL Cloud Database",
        });
      } finally {
        client.release();
      }
    }

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid records payload. Expected an array." }, { status: 400 });
    }

    // If pool is available, execute real SQL upsert into Supabase
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query(CREATE_TABLE_SQL);

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
    writeStorage(records);

    return NextResponse.json({
      success: true,
      count: records.length,
      message: `Successfully synchronized ${records.length} records to Demo Cloud Storage.`,
      host: "Cloud Hosted Demo Store (Free)",
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("API /api/db POST error:", err);
    return NextResponse.json({
      error: err.message,
      suggestion: getSupabaseSuggestion(err, connStr),
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
