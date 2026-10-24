import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const xmlText = formData.get("xmlText");

    let content = "";
    if (file && typeof file === "object") {
      content = await file.text();
    } else if (xmlText) {
      content = xmlText;
    } else {
      return NextResponse.json({ error: "No XML file or text provided." }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "Uploaded XML is empty." }, { status: 400 });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      trimValues: true,
    });

    const parsed = parser.parse(content);
    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse XML content." }, { status: 400 });
    }

    // Find the array of records inside the root element
    let records = [];
    const rootKeys = Object.keys(parsed);
    const rootKey = rootKeys[0];
    const root = parsed[rootKey];

    if (!root) {
      return NextResponse.json({ error: "XML root is empty." }, { status: 400 });
    }

    // Check common patterns: <records><record>... or <emails><email>... or <root><item>...
    const candidateKeys = Object.keys(root);
    for (const key of candidateKeys) {
      if (Array.isArray(root[key])) {
        records = root[key];
        break;
      } else if (typeof root[key] === "object" && root[key] !== null) {
        // Single item wrapped as object
        records = [root[key]];
        break;
      }
    }

    // If still empty and root is an array
    if (records.length === 0 && Array.isArray(root)) {
      records = root;
    }

    // If root itself has email fields
    if (records.length === 0 && (root.email || root.recipient || root.to)) {
      records = [root];
    }

    if (records.length === 0) {
      return NextResponse.json({
        error: "Could not find any repeatable record items in XML. Format should be: <emails><record><email>...</email><message>...</message><attachment_path>...</attachment_path></record></emails>"
      }, { status: 422 });
    }

    const normalizedRecords = records.map((item, idx) => {
      // Find email
      const email = item.email || item.recipient || item.to || item.mail || "";
      // Find message/body
      const message = item.message || item.body || item.msg || item.content || item.text || "";
      // Find attachment path
      const attachment_path = item.attachment_path || item.attachment || item.path || item.file || item.filepath || "";
      // Find subject
      const subject = item.subject || item.title || "";
      
      // Collect extra fields
      const extra_fields = {};
      for (const [k, v] of Object.entries(item)) {
        if (!['email', 'recipient', 'to', 'mail', 'message', 'body', 'msg', 'content', 'text', 'attachment_path', 'attachment', 'path', 'file', 'filepath', 'subject', 'title'].includes(k.toLowerCase()) && !k.startsWith('@_')) {
          extra_fields[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      }

      return {
        id: `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        recipient_email: String(email).trim(),
        subject: String(subject).trim(),
        message: String(message).trim(),
        attachment_path: String(attachment_path).trim(),
        extra_fields,
        status: "pending", // pending, sending, sent, failed
        status_message: "",
        created_at: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      count: normalizedRecords.length,
      records: normalizedRecords,
    });
  } catch (err) {
    console.error("XML parse error:", err);
    return NextResponse.json({ error: `XML Parse Error: ${err.message}` }, { status: 500 });
  }
}
