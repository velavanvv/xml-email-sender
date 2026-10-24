import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Resend } from "resend";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      records = [],
      provider = "simulation", // "simulation", "resend", "smtp"
      resendApiKey = process.env.RESEND_API_KEY || "",
      fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev",
      fromName = process.env.FROM_NAME || "Dispatch Demo",
      smtpConfig = null,
      useCommonBody = false,
      commonSubject = "",
      commonBodyTemplate = "",
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
      res = res.replace(/\{attachment\}/gi, item.attachment_path || "");
      if (item.extra_fields) {
        for (const [key, val] of Object.entries(item.extra_fields)) {
          const regex = new RegExp(`\\{${key}\\}`, "gi");
          res = res.replace(regex, String(val));
        }
      }
      return res;
    };

    // 1. SIMULATION / DEMO MODE (Ideal for customer showcase without API setup)
    if (provider === "simulation") {
      for (const record of records) {
        // Basic email syntax validation
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.recipient_email);
        
        // Artificial micro-delay for realistic live batch feel
        await new Promise((r) => setTimeout(r, 250));

        if (!isValidEmail) {
          results.push({
            id: record.id,
            status: "failed",
            status_message: "Invalid recipient email address format.",
          });
        } else {
          results.push({
            id: record.id,
            status: "sent",
            status_message: `Sent successfully via Simulator (Simulated Attachment: ${record.attachment_path ? record.attachment_path.split("/").pop() || record.attachment_path : "None"})`,
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

          // Attachments handling (if accessible via URL or base64)
          if (record.attachment_path && record.attachment_path.startsWith("http")) {
            emailPayload.attachments = [
              {
                path: record.attachment_path,
                filename: record.attachment_path.split("/").pop() || "attachment.pdf",
              }
            ];
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
            errorMsg = "403 Forbidden: Resend's free onboarding@resend.dev only allows sending to your own registered Resend email. To send to any email, verify your domain in Resend, or switch to Gmail SMTP.";
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

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port || "587", 10),
        secure: smtpConfig.port === "465",
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      for (const record of records) {
        try {
          const subject = useCommonBody && commonSubject ? interpolate(commonSubject, record) : (record.subject || "Notification");
          const emailContent = useCommonBody && commonBodyTemplate ? interpolate(commonBodyTemplate, record) : record.message;

          const mailOptions = {
            from: `"${fromName}" <${smtpConfig.user}>`,
            to: record.recipient_email,
            subject: subject,
            text: emailContent,
            html: `<p>${emailContent.replace(/\n/g, "<br/>")}</p>`,
          };

          if (record.attachment_path && record.attachment_path.startsWith("http")) {
            mailOptions.attachments = [
              {
                path: record.attachment_path,
              }
            ];
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

      // Mandrill (Mailchimp Transactional) SMTP relay
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

          if (record.attachment_path && record.attachment_path.startsWith("http")) {
            mailOptions.attachments = [
              {
                path: record.attachment_path,
                filename: record.attachment_path.split("/").pop() || "document.pdf",
              }
            ];
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
