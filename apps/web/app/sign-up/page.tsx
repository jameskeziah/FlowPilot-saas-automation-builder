import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">FlowPilot Pro</p>
        <h1>Sign up</h1>
        <p>Account creation is ready to be wired to Clerk. Start with the builder while auth is connected.</p>
        <div className="hero-actions">
          <Link href="/workflows" className="primary-link">
            Start building
          </Link>
          <Link href="/sign-in" className="secondary-link">
            Already have an account?
          </Link>
        </div>
      </section>
    </main>
  );
}
