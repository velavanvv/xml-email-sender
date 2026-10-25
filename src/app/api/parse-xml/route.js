import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// RFC 4180 compliant CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
        rows.push(row);
      }
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
    rows.push(row);
  }
  return rows;
}

function parseCSVToRecords(content) {
  const rows = parseCSV(content);
  if (rows.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());

  const findCol = (candidates) => headers.findIndex((h) => candidates.includes(h));

  const emailIdx = findCol(["email", "recipient_email", "recipient", "to", "mail", "email_address", "client_email"]);
  const subjectIdx = findCol(["subject", "title", "email_subject"]);
  const messageIdx = findCol(["message", "body", "msg", "content", "text", "description"]);
  const attachmentIdx = findCol(["attachment_path", "attachment", "file", "filepath", "path", "attachment_url"]);

  if (emailIdx === -1) {
    throw new Error(
      `CSV is missing an email column. Found headers: [${rawHeaders.join(", ")}]. Expected a column named 'email', 'recipient_email', or 'to'.`
    );
  }

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((cell) => !cell || cell.trim() === "")) continue;

    const email = (row[emailIdx] || "").trim();
    if (!email) continue;

    const subject = subjectIdx !== -1 ? (row[subjectIdx] || "").trim() : "";
    const message = messageIdx !== -1 ? (row[messageIdx] || "").trim() : "";
    const attachment_path = attachmentIdx !== -1 ? (row[attachmentIdx] || "").trim() : "";

    const extra_fields = {};
    headers.forEach((h, colIdx) => {
      if (colIdx !== emailIdx && colIdx !== subjectIdx && colIdx !== messageIdx && colIdx !== attachmentIdx) {
        const key = rawHeaders[colIdx].trim();
        const val = (row[colIdx] || "").trim();
        if (key && val) {
          extra_fields[key] = val;
        }
      }
    });

    records.push({
      id: `rec_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      recipient_email: email,
      subject: subject || "No Subject",
      message: message,
      attachment_path: attachment_path,
      extra_fields,
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    });
  }

  return records;
}

function parseJSONToRecords(content) {
  let data = JSON.parse(content);
  if (!Array.isArray(data)) {
    if (Array.isArray(data.records)) data = data.records;
    else if (Array.isArray(data.emails)) data = data.emails;
    else if (Array.isArray(data.data)) data = data.data;
    else if (data.email || data.recipient_email) data = [data];
    else throw new Error("JSON must be an array of records or contain a 'records' or 'emails' array.");
  }

  return data.map((item, idx) => {
    const email = item.email || item.recipient_email || item.recipient || item.to || item.mail || "";
    const subject = item.subject || item.title || "";
    const message = item.message || item.body || item.msg || item.content || item.text || "";
    const attachment_path = item.attachment_path || item.attachment || item.file || item.path || "";

    const extra_fields = {};
    for (const [k, v] of Object.entries(item)) {
      if (!['email', 'recipient_email', 'recipient', 'to', 'mail', 'subject', 'title', 'message', 'body', 'msg', 'content', 'text', 'attachment_path', 'attachment', 'file', 'path'].includes(k.toLowerCase())) {
        extra_fields[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    return {
      id: `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      recipient_email: String(email).trim(),
      subject: String(subject).trim() || "No Subject",
      message: String(message).trim(),
      attachment_path: String(attachment_path).trim(),
      extra_fields,
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    };
  });
}

function parseXMLToRecords(content) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });

  const parsed = parser.parse(content);
  if (!parsed) {
    throw new Error("Failed to parse XML content.");
  }

  let records = [];
  const rootKeys = Object.keys(parsed);
  const rootKey = rootKeys[0];
  const root = parsed[rootKey];

  if (!root) {
    throw new Error("XML root is empty.");
  }

  const candidateKeys = Object.keys(root);
  for (const key of candidateKeys) {
    if (Array.isArray(root[key])) {
      records = root[key];
      break;
    } else if (typeof root[key] === "object" && root[key] !== null) {
      records = [root[key]];
      break;
    }
  }

  if (records.length === 0 && Array.isArray(root)) {
    records = root;
  }

  if (records.length === 0 && (root.email || root.recipient || root.to)) {
    records = [root];
  }

  if (records.length === 0) {
    throw new Error("Could not find any repeatable record items in XML. Format should be: <emails><record><email>...</email><message>...</message></record></emails>");
  }

  return records.map((item, idx) => {
    const email = item.email || item.recipient || item.to || item.mail || "";
    const message = item.message || item.body || item.msg || item.content || item.text || "";
    const attachment_path = item.attachment_path || item.attachment || item.path || item.file || item.filepath || "";
    const subject = item.subject || item.title || "";

    const extra_fields = {};
    for (const [k, v] of Object.entries(item)) {
      if (!['email', 'recipient', 'to', 'mail', 'message', 'body', 'msg', 'content', 'text', 'attachment_path', 'attachment', 'path', 'file', 'filepath', 'subject', 'title'].includes(k.toLowerCase()) && !k.startsWith('@_')) {
        extra_fields[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    return {
      id: `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      recipient_email: String(email).trim(),
      subject: String(subject).trim() || "No Subject",
      message: String(message).trim(),
      attachment_path: String(attachment_path).trim(),
      extra_fields,
      status: "pending",
      status_message: "",
      created_at: new Date().toISOString(),
    };
  });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawText = formData.get("xmlText") || formData.get("text") || formData.get("content");

    let content = "";
    let fileName = "";

    if (file && typeof file === "object") {
      content = await file.text();
      fileName = file.name || "";
    } else if (rawText) {
      content = rawText;
    } else {
      return NextResponse.json({ error: "No file or data provided." }, { status: 400 });
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    let records = [];
    const lowerName = fileName.toLowerCase();

    // Determine format by file extension or content signature
    if (lowerName.endsWith(".csv") || (!trimmed.startsWith("<") && !trimmed.startsWith("{") && !trimmed.startsWith("[") && trimmed.includes(","))) {
      records = parseCSVToRecords(trimmed);
    } else if (lowerName.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
      records = parseJSONToRecords(trimmed);
    } else {
      records = parseXMLToRecords(trimmed);
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      records: records,
    });
  } catch (err) {
    console.error("File parse error:", err);
    return NextResponse.json({ error: `File Parse Error: ${err.message}` }, { status: 422 });
  }
}
