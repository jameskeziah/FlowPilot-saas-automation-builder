import type { Metadata } from "next";
import Link from "next/link";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowPilot Pro",
  description: "AI workflow automation platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="app-navbar">
          <Link href="/" className="brand" aria-label="FlowPilot home">
            <span>FlowPilot</span>
            <strong>Pro</strong>
          </Link>

          <nav className="nav-links" aria-label="Main navigation">
            <Link href="/#features">Features</Link>
            <Link href="/workflows">Builder</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/sign-in" className="profile-link" aria-label="Open profile">
              <span className="profile-copy">
                <strong>Demo User</strong>
                <small>Profile</small>
              </span>
              <span className="profile-avatar" aria-hidden="true">
                DU
              </span>
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
