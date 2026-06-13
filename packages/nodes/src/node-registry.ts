import type { NodeHandler } from "@flowpilot/shared";

const handlers: NodeHandler[] = [
  {
    type: "manual.trigger",
    label: "Manual Trigger",
    category: "trigger",
    description: "Starts a workflow manually from the API or dashboard.",
    async execute({ input, config }) {
      return {
        status: "success",
        output: {
          received: input,
          triggerName: String(config?.triggerName ?? "Manual run"),
          triggeredAt: new Date().toISOString()
        }
      };
    }
  },
  {
    type: "logic.delay",
    label: "Delay",
    category: "delay",
    description: "Pauses a workflow before the next node.",
    async execute({ input, config, context }) {
      const configuredMs = Number(config?.durationMs ?? 0);
      const durationValue = Number(config?.durationValue ?? 0);
      const durationUnit = config?.durationUnit === "minutes" ? "minutes" : "seconds";
      const requestedMs = configuredMs > 0 ? configuredMs : durationUnit === "minutes" ? durationValue * 60_000 : durationValue * 1000;
      const maxDelayMs = typeof context.maxDelayMs === "number" ? context.maxDelayMs : Number.POSITIVE_INFINITY;
      const appliedMs = Math.max(0, Math.min(requestedMs, maxDelayMs));

      if (appliedMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, appliedMs));
      }

      return {
        status: "success",
        output: {
          delayed: true,
          requestedMs,
          appliedMs,
          input
        }
      };
    }
  },
  {
    type: "debug.log",
    label: "Debug Log",
    category: "action",
    description: "Writes workflow data to execution logs for debugging.",
    async execute({ input, config, context }) {
      const bodySelector = config?.bodySelector === "custom" ? "custom" : config?.bodySelector === "previousOutput" ? "previousOutput" : "input";
      const message = String(config?.message ?? "Debug log");

      return {
        status: "success",
        output: {
          logged: true,
          message,
          bodySelector,
          body: bodySelector === "custom" ? message : input,
          workflowId: context.workflowId,
          workflowVersionId: context.workflowVersionId,
          runId: context.runId,
          nodeId: context.nodeId,
          input
        }
      };
    }
  }
];

export const nodeRegistry = handlers;
export const nodeRegistryMap = new Map(handlers.map((handler) => [handler.type, handler]));
export const nodeDefinitions = handlers.map(({ execute: _execute, ...definition }) => definition);

export function getNodeHandler(type: string) {
  return nodeRegistryMap.get(type);
}

export function getNodeDefinition(type: string) {
  const handler = getNodeHandler(type);
  if (!handler) return undefined;
  const { execute: _execute, ...definition } = handler;
  return definition;
}
