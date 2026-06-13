import Link from "next/link";

const workflowNodes = [
  {
    icon: "1",
    title: "Trigger",
    code: "manual.trigger",
    description: "Start a workflow from a form, schedule, webhook, or manual run.",
  },
  {
    icon: "2",
    title: "AI Decision",
    code: "ai.classify_lead",
    description: "Use AI to qualify leads, write replies, summarize, and decide next steps.",
  },
  {
    icon: "3",
    title: "Action",
    code: "communication.send_message",
    description: "Send WhatsApp, email, CRM updates, payment reminders, and alerts.",
  },
];

const features = [
  "Visual workflow builder",
  "Trigger, action, delay and AI nodes",
  "Save workflow as JSON",
  "Ready for API + worker execution",
];

export default function Home() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">FlowPilot Automation Platform</p>

          <h1>Automate your business workflows visually</h1>

          <p>
            Build powerful automations using triggers, AI nodes, delays,
            actions, CRM updates, payment events, and communication workflows.
          </p>

          <div className="hero-actions">
            <Link href="/sign-up" className="primary-link">
              Sign up
            </Link>

            <Link href="/sign-in" className="secondary-link">
              Sign in
            </Link>

            <Link href="/workflows" className="secondary-link">
              Open Workflow Builder
            </Link>
          </div>
        </div>

        <div className="hero-workflow" aria-label="Workflow preview">
          {workflowNodes.map((node) => (
            <article key={node.code} className="hero-node">
              <span>{node.icon}</span>

              <div>
                <strong>{node.title}</strong>
                <code>{node.code}</code>
                <p>{node.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="landing-band">
        {features.map((feature) => (
          <div key={feature}>{feature}</div>
        ))}
      </section>
    </main>
  );
}
