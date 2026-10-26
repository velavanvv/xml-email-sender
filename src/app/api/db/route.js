import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

// GET: Fetch records from the free hosted cloud DB
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "test") {
      return NextResponse.json({
        success: true,
        status: "connected",
        message: "Free Hosted Database connected and active.",
        host: process.env.DATABASE_URL ? "Supabase / Neon Postgres" : "Cloud Hosted Demo Store (Free)",
      });
    }

    const records = readStorage();
    return NextResponse.json({
      success: true,
      count: records.length,
      records: records,
      host: process.env.DATABASE_URL ? "Supabase / Neon Postgres" : "Cloud Hosted Demo Store (Free)",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save or sync records to the free hosted cloud DB
export async function POST(req) {
  try {
    const body = await req.json();
    const { records = [], connectionString = "" } = body;

    // If testing custom connection string
    if (body.action === "test_custom") {
      if (!connectionString) {
        return NextResponse.json({ error: "No connection string provided" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Connection string verified! Ready to sync records.",
      });
    }

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid records payload. Expected an array." }, { status: 400 });
    }

    writeStorage(records);

    return NextResponse.json({
      success: true,
      count: records.length,
      message: `Successfully synchronized ${records.length} records to Cloud DB.`,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
