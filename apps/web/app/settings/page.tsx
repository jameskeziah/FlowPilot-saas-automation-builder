const settingsNav = [
  { label: "Overview", href: "/workflows", active: false },
  { label: "Workflows", href: "/workflows", active: false },
  { label: "Runs", href: "/workflows", active: false },
  { label: "Credentials", href: "/workflows", active: false },
  { label: "Logs", href: "/workflows", active: false },
  { label: "Settings", href: "/settings", active: true }
];

const settingsSections = [
  {
    title: "Workspace",
    description: "Manage workspace name, slug, timezone, and default execution policy."
  },
  {
    title: "Members",
    description: "Invite admins, operators, and viewers once authentication is connected."
  },
  {
    title: "Execution",
    description: "Configure retry attempts, queue behavior, log retention, and run limits."
  },
  {
    title: "Credentials",
    description: "Store API keys and provider accounts in the credential vault."
  }
];

export default function SettingsPage() {
  return (
    <main className="settings-shell">
      <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Demo</h1>
        </div>

        <nav className="dashboard-nav">
          {settingsNav.map((item) => (
            <a className={item.active ? "active" : undefined} href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-status">
          <span>Environment</span>
          <strong>Development</strong>
        </div>
      </aside>

      <section className="settings-content">
        <header className="toolbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Settings</h2>
          </div>
        </header>

        <div className="settings-grid">
          {settingsSections.map((section) => (
            <article className="panel" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
