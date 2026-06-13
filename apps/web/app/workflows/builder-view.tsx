import { Button } from "@flowpilot/ui";
import type { NodeDefinition } from "@flowpilot/shared";

const dashboardNav = [
  { label: "Overview", href: "/workflows", active: false },
  { label: "Workflows", href: "/workflows", active: true },
  { label: "Runs", href: "/workflows", active: false },
  { label: "Credentials", href: "/workflows", active: false },
  { label: "Logs", href: "/workflows", active: false },
  { label: "Settings", href: "/settings", active: false }
];

const nodePalette: NodeDefinition[] = [
  {
    type: "manual.trigger",
    label: "Manual Trigger",
    category: "trigger",
    description: "Starts a workflow from the dashboard or API with a JSON input payload."
  },
  {
    type: "logic.delay",
    label: "Delay",
    category: "delay",
    description: "Pauses execution before the next step. Start with immediate pass-through."
  },
  {
    type: "debug.log",
    label: "Debug Log",
    category: "action",
    description: "Records the current payload and context in execution logs for inspection."
  }
];

const canvasNodes = [
  { label: "Manual Trigger", detail: "Input: { source: manual }", type: "manual.trigger", left: 18, top: 48, tone: "green" },
  { label: "Delay", detail: "Wait before next step", type: "logic.delay", left: 50, top: 48, tone: "stone" },
  { label: "Debug Log", detail: "Write payload to logs", type: "debug.log", left: 82, top: 48, tone: "blue" }
];

const stats = [
  { label: "Node types", value: "3" },
  { label: "Starter path", value: "Linear" },
  { label: "External APIs", value: "0" }
];

const lanes = ["manual.trigger", "logic.delay", "debug.log"];

export function WorkflowBuilderView() {
  return (
    <main className="shell">
      <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Demo</h1>
        </div>

        <nav className="dashboard-nav">
          {dashboardNav.map((item) => (
            <a className={item.active ? "active" : undefined} href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-status">
          <span>Starter plan</span>
          <strong>3 node types</strong>
        </div>
      </aside>

      <aside className="sidebar" aria-label="Node palette">
        <div>
          <p className="eyebrow">FlowPilot Pro</p>
          <h1>Workflow Builder</h1>
        </div>

        <div className="palette">
          {nodePalette.map((node) => (
            <article className="node-card" key={node.type}>
              <div>
                <span>{node.category}</span>
                <h2>{node.label}</h2>
              </div>
              <code>{node.type}</code>
              <p>{node.description}</p>
            </article>
          ))}
        </div>
      </aside>

      <section className="workspace" aria-label="Workflow builder">
        <header className="toolbar">
          <div>
            <p className="eyebrow">Draft workflow</p>
            <h2>Starter workflow</h2>
          </div>
          <div className="actions">
            <Button style={{ background: "#ffffff", color: "#1c1917", border: "1px solid #d6d3d1" }}>
              Test run
            </Button>
            <Button>Publish</Button>
          </div>
        </header>

        <div className="canvas">
          <div className="lane-labels">
            {lanes.map((lane) => (
              <span key={lane}>{lane}</span>
            ))}
          </div>
          <svg className="edges" viewBox="0 0 100 100" role="img" aria-label="Workflow connections">
            <path d="M27 48 C 36 48, 41 48, 46 48" />
            <path d="M55 48 C 64 48, 69 48, 75 48" />
          </svg>
          {canvasNodes.map((node) => (
            <article
              className={`canvas-node ${node.tone}`}
              key={node.type}
              style={{ left: `${node.left}%`, top: `${node.top}%` }}
            >
              <span>{node.type}</span>
              <strong>{node.label}</strong>
              <small>{node.detail}</small>
            </article>
          ))}
        </div>

        <section className="bottom-grid">
          <div className="panel">
            <h3>Execution</h3>
            <div className="metrics">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3>Outcomes</h3>
            <ul className="integrations">
              <li>Manual trigger accepts input from the API or dashboard</li>
              <li>Delay keeps execution sequencing explicit before real scheduling is added</li>
              <li>Debug log makes every payload visible during early workflow testing</li>
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}
