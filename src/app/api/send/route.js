import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Resend } from "resend";

// Helper to prepare real attachments for Nodemailer and Resend
function prepareAttachments(record, commonAttachment) {
  const attachments = [];

  const addAttachment = (pathOrData, filename) => {
    if (!pathOrData) return;
    if (pathOrData.startsWith("data:")) {
      const match = pathOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        attachments.push({
          filename: filename || "attachment.pdf",
          content: Buffer.from(match[2], "base64"),
          contentType: match[1],
        });
      }
    } else if (pathOrData.startsWith("http")) {
      attachments.push({
        path: pathOrData,
        filename: filename || pathOrData.split("/").pop() || "attachment.pdf",
      });
    }
  };

  // 1. Record-level attachment
  if (record.attachment_data) {
    addAttachment(record.attachment_data, record.attachment_name || "attachment.pdf");
  } else if (record.attachment_path) {
    addAttachment(record.attachment_path, record.attachment_name || record.attachment_path.split("/").pop() || "attachment.pdf");
  }

  // 2. Global batch common attachment
  if (commonAttachment && commonAttachment.data) {
    addAttachment(commonAttachment.data, commonAttachment.name || "common_document.pdf");
  }

  return attachments;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      records = [],
      provider = "simulation", // "simulation", "resend", "smtp", "mailchimp"
      resendApiKey = process.env.RESEND_API_KEY || "",
      fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev",
      fromName = process.env.FROM_NAME || "Dispatch Demo",
      smtpConfig = null,
      useCommonBody = false,
      commonSubject = "",
      commonBodyTemplate = "",
      commonAttachment = null,
    } = body;

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No records provided to send." }, { status: 400 });
    }

    const results = [];

    // Helper for variable interpolation
    const interpolate = (template, item) => {
      if (!template) return "";
      let res = template;
      res = res.replace(/\{email\}/gi, item.recipient_email || "");
      res = res.replace(/\{attachment\}/gi, item.attachment_name || (item.attachment_path ? item.attachment_path.split("/").pop() : "") || "");
      if (item.extra_fields) {
        for (const [key, val] of Object.entries(item.extra_fields)) {
          const regex = new RegExp(`\\{${key}\\}`, "gi");
          res = res.replace(regex, String(val));
        }
      }
      return res;
    };

    // 1. SIMULATION / DEMO MODE
    if (provider === "simulation") {
      for (const record of records) {
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.recipient_email);
        
        await new Promise((r) => setTimeout(r, 200));

        if (!isValidEmail) {
          results.push({
            id: record.id,
            status: "failed",
            status_message: "Invalid recipient email address format.",
          });
        } else {
          const attached = prepareAttachments(record, commonAttachment);
          const attachNames = attached.map((a) => a.filename).join(", ") || "None";

          results.push({
            id: record.id,
            status: "sent",
            status_message: `Sent via Simulator (Attachments: ${attachNames})`,
            sent_at: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({ success: true, provider: "simulation", results });
    }

    // 2. RESEND API
    if (provider === "resend") {
      const apiKey = resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          error: "Resend API key missing. Please provide a key in Gateway Settings or switch to Simulator/SMTP."
        }, { status: 400 });
      }

      const resend = new Resend(apiKey);
      const senderEmail = fromEmail && fromEmail.trim() ? fromEmail.trim() : "onboarding@resend.dev";

      for (const record of records) {
        try {
          const subject = useCommonBody && commonSubject ? interpolate(commonSubject, record) : (record.subject || "Notification");
          const emailContent = useCommonBody && commonBodyTemplate ? interpolate(commonBodyTemplate, record) : record.message;

          const emailPayload = {
            from: `${fromName} <${senderEmail}>`,
            to: record.recipient_email,
            subject: subject,
            html: `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">${emailContent.replace(/\n/g, "<br/>")}</div>`,
          };

          const attached = prepareAttachments(record, commonAttachment);
          if (attached.length > 0) {
            emailPayload.attachments = attached.map((att) => ({
              filename: att.filename,
              content: att.content ? att.content.toString("base64") : undefined,
              path: att.path,
            }));
          }

          const response = await resend.emails.send(emailPayload);
          if (response.error) {
            let errorMsg = response.error.message || "Resend dispatch failed.";
            if (response.error.statusCode === 403 || errorMsg.includes("testing emails to your own email")) {
              errorMsg = "403 Forbidden: Resend's free onboarding@resend.dev only allows sending to your own registered Resend email. To send to any email address, verify a custom domain in Resend, or use Gmail SMTP.";
            }
            results.push({
              id: record.id,
              status: "failed",
              status_message: errorMsg,
            });
          } else {
            results.push({
              id: record.id,
              status: "sent",
              status_message: `Delivered (Resend ID: ${response.data?.id})`,
              sent_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          let errorMsg = err.message;
          if (err.statusCode === 403 || errorMsg.includes("403")) {
            errorMsg = "403 Forbidden: Resend's free onboarding@resend.dev only allows sending to your own registered email. Verify your domain in Resend or switch to Gmail SMTP.";
          }
          results.push({
            id: record.id,
            status: "failed",
            status_message: errorMsg,
          });
        }
      }

      return NextResponse.json({ success: true, provider: "resend", results });
    }

    // 3. SMTP (Nodemailer - Gmail / Brevo / Custom)
    if (provider === "smtp") {
      if (!smtpConfig || !smtpConfig.host || !smtpConfig.user) {
        return NextResponse.json({ error: "Incomplete SMTP configuration." }, { status: 400 });
      }

      const hostClean = (smtpConfig.host || "").trim();
      const portClean = parseInt((smtpConfig.port || "587").toString().trim(), 10);
      const userClean = (smtpConfig.user || "").trim();
      const passClean = (smtpConfig.pass || "").trim();

      const transporter = nodemailer.createTransport({
        host: hostClean,
        port: portClean,
        secure: portClean === 465,
        auth: {
          user: userClean,
          pass: passClean,
        },
      });

      for (const record of records) {
        try {
          const subject = useCommonBody && commonSubject ? interpolate(commonSubject, record) : (record.subject || "Notification");
          const emailContent = useCommonBody && commonBodyTemplate ? interpolate(commonBodyTemplate, record) : record.message;

          const mailOptions = {
            from: `"${fromName}" <${userClean}>`,
            to: record.recipient_email,
            subject: subject,
            text: emailContent,
            html: `<p>${emailContent.replace(/\n/g, "<br/>")}</p>`,
          };

          const attached = prepareAttachments(record, commonAttachment);
          if (attached.length > 0) {
            mailOptions.attachments = attached;
          }

          const info = await transporter.sendMail(mailOptions);
          results.push({
            id: record.id,
            status: "sent",
            status_message: `Delivered (MessageID: ${info.messageId})`,
            sent_at: new Date().toISOString(),
          });
        } catch (err) {
          results.push({
            id: record.id,
            status: "failed",
            status_message: err.message,
          });
        }
      }

      return NextResponse.json({ success: true, provider: "smtp", results });
    }

    // 4. MAILCHIMP TRANSACTIONAL (MANDRILL) with Private Domain
    if (provider === "mailchimp") {
      const apiKey = body.mailchimpApiKey || process.env.MAILCHIMP_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          error: "Mailchimp Transactional API Key is missing. Please enter your key in Gateway Settings."
        }, { status: 400 });
      }

      const senderEmail = fromEmail && fromEmail.trim() ? fromEmail.trim() : "";
      if (!senderEmail || !senderEmail.includes("@")) {
        return NextResponse.json({
          error: "A verified Private Domain Sender Email is required for Mailchimp (e.g. billing@yourprivatedomain.com)."
        }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.mandrillapp.com",
        port: 587,
        secure: false,
        auth: {
          user: "mandrill_relay",
          pass: apiKey.trim(),
        },
      });

      for (const record of records) {
        try {
          const subject = useCommonBody && commonSubject ? interpolate(commonSubject, record) : (record.subject || "Notification");
          const emailContent = useCommonBody && commonBodyTemplate ? interpolate(commonBodyTemplate, record) : record.message;

          const mailOptions = {
            from: `"${fromName}" <${senderEmail}>`,
            to: record.recipient_email,
            subject: subject,
            text: emailContent,
            html: `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">${emailContent.replace(/\n/g, "<br/>")}</div>`,
          };

          const attached = prepareAttachments(record, commonAttachment);
          if (attached.length > 0) {
            mailOptions.attachments = attached;
          }

          const info = await transporter.sendMail(mailOptions);
          results.push({
            id: record.id,
            status: "sent",
            status_message: `Delivered via Mailchimp (${info.messageId})`,
            sent_at: new Date().toISOString(),
          });
        } catch (err) {
          results.push({
            id: record.id,
            status: "failed",
            status_message: `Mailchimp error: ${err.message}`,
          });
        }
      }

      return NextResponse.json({ success: true, provider: "mailchimp", results });
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err) {
    console.error("Send route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
