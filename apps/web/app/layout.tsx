import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowPilot Pro",
  description: "AI workflow automation platform"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
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
              {!userId ? (
                <Link href="/sign-in" className="profile-link" aria-label="Sign in">
                  <span className="profile-copy">
                    <strong>Sign in</strong>
                    <small>Account</small>
                  </span>
                  <span className="profile-avatar" aria-hidden="true">
                    SI
                  </span>
                </Link>
              ) : (
                <UserButton />
              )}
            </nav>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
