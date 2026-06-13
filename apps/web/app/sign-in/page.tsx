import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">FlowPilot Pro</p>
        <h1>Sign in</h1>
        <p>Authentication is ready to be wired to Clerk. Continue to the builder for now.</p>
        <div className="hero-actions">
          <Link href="/workflows" className="primary-link">
            Open builder
          </Link>
          <Link href="/sign-up" className="secondary-link">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
