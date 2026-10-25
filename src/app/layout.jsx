import "./globals.css";

export const metadata = {
  title: "CloudMail XML Dispatcher — Enterprise Batch Email Platform",
  description: "Enterprise-grade XML batch email dispatch platform. Upload XML data, manage recipients, customize dynamic message templates, and send high-deliverability emails with attachments.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased selection:bg-blue-100 selection:text-blue-900 bg-[#f8f9fa] text-[#202124]">
        {children}
      </body>
    </html>
  );
}
