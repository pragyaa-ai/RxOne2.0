import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
// The polyfill import is removed as we are injecting the script directly.

export const metadata: Metadata = {
  title: "RxOne Voice Agent",
  description: "Advanced voice agents with multilingual support.",
  icons: {
    icon: '/pragyaa-logo.svg',
    shortcut: '/pragyaa-logo.svg',
    apple: '/pragyaa-logo.svg',
  },
};

// This is the raw JavaScript for the polyfill.
const cryptoPolyfill = `
  if (typeof window !== 'undefined' && typeof window.crypto === 'undefined') {
    window.crypto = {};
  }
  if (typeof window !== 'undefined' && typeof window.crypto.randomUUID !== 'function') {
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          This script tag injects the polyfill directly into the HTML head.
          It will execute before any Next.js or React scripts are loaded,
          guaranteeing that crypto.randomUUID is available globally.
        */}
        <script dangerouslySetInnerHTML={{ __html: cryptoPolyfill }} />
      </head>
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
