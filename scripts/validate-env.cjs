const validators = {
  api: () => require("@flowpilot/env/api").apiEnv,
  web: () => require("@flowpilot/env/web").webEnv,
  worker: () => require("@flowpilot/env/worker").workerEnv,
};

const target = process.argv[2] ?? "all";
const appNames = target === "all" ? Object.keys(validators) : [target];

for (const appName of appNames) {
  const validate = validators[appName];
  if (!validate) {
    console.error(`Unknown env target: ${appName}`);
    console.error(`Expected one of: all, ${Object.keys(validators).join(", ")}`);
    process.exit(1);
  }

  try {
    validate();
    console.log(`${appName} environment validation passed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
