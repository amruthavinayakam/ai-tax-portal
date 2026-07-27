import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Tessera — AI tax platform prototype",
  description:
    "Case study prototype: source traceability, AI trust, and an actionable CPA dashboard for a tax platform built from scratch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the theme before first paint so there is no flash of the wrong one.
  // Stored choice wins; otherwise fall back to the OS preference.
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

  return (
    // The theme attribute is injected by the pre-paint script below, so the
    // server markup (no attribute) intentionally differs from the hydrated
    // client. Suppressing the warning on this one element is the documented
    // pattern for a no-flash theme; it does not affect children.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
