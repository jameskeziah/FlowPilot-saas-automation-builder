"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";

type NodeInputType = "string" | "number" | "select";
type FlowNodeType = "manual.trigger" | "logic.delay" | "debug.log";
type NodeStatus = "idle" | "queued" | "running" | "success" | "failed" | "skipped";

type FlowNodeData = {
  triggerName?: string;
  sampleInput?: string;
  durationValue?: number;
  durationUnit?: "seconds" | "minutes";
  durationMs?: number;
  message?: string;
  bodySelector?: "input" | "previousOutput" | "custom";
  runStatus?: NodeStatus;
};

type FlowNode = Node<FlowNodeData, FlowNodeType>;
type FlowEdge = Edge;

type RegistryNode = {
  type: FlowNodeType;
  label: string;
  category: "Trigger" | "Logic" | "Debug";
  description: string;
  inputs: Partial<Record<keyof FlowNodeData, NodeInputType>>;
};

type WorkflowListItem = {
  id: string;
  name: string;
  versions?: Array<{
    nodes: Array<{
      nodeKey: string;
      type: string;
      positionX: number;
      positionY: number;
      config: FlowNodeData | null;
    }>;
    edges: Array<{
      edgeKey: string;
      sourceNode: { nodeKey: string };
      targetNode: { nodeKey: string };
      sourceHandle: string | null;
      targetHandle: string | null;
    }>;
  }>;
};

type WorkflowResponse = {
  success: boolean;
  workflow?: WorkflowListItem;
  workflows?: WorkflowListItem[];
  error?: string;
};

type RunWorkflowResponse = {
  queued: boolean;
  jobId?: string | number;
  workflowRunId?: string;
  error?: string;
};

type RunDetails = {
  id: string;
  status: string;
  error: string | null;
  createdAt?: string;
  finishedAt?: string | null;
  stepRuns: Array<{
    id: string;
    nodeKey: string;
    nodeType: string;
    status: string;
  }>;
  logs: Array<{
    id: string;
    level: string;
    message: string;
  }>;
};

type RunDetailsResponse = {
  success: boolean;
  run?: RunDetails;
  error?: string;
};

type DirectRunResponse = {
  success: boolean;
  run?: RunDetails;
  error?: string;
};

type RunHistoryResponse = {
  success: boolean;
  runs?: RunDetails[];
  error?: string;
};

const dashboardNav = [
  { label: "Overview", href: "/workflows", active: false },
  { label: "Workflows", href: "/workflows", active: true },
  { label: "Runs", href: "/workflows", active: false },
  { label: "Credentials", href: "/workflows", active: false },
  { label: "Logs", href: "/workflows", active: false },
  { label: "Settings", href: "/settings", active: false },
];

const NODE_REGISTRY: RegistryNode[] = [
  {
    type: "manual.trigger",
    label: "Manual Trigger",
    category: "Trigger",
    description: "Starts the workflow manually.",
    inputs: {
      triggerName: "string",
      sampleInput: "string",
    },
  },
  {
    type: "logic.delay",
    label: "Delay",
    category: "Logic",
    description: "Waits before moving to the next node.",
    inputs: {
      durationValue: "number",
      durationUnit: "select",
    },
  },
  {
    type: "debug.log",
    label: "Debug Log",
    category: "Debug",
    description: "Writes a message to execution logs.",
    inputs: {
      bodySelector: "select",
      message: "string",
    },
  },
];

const defaultNodes: FlowNode[] = [
  {
    id: "trigger-1",
    type: "manual.trigger",
    position: { x: 80, y: 120 },
    data: {
      triggerName: "Manual run",
      sampleInput: '{"source":"manual"}',
      runStatus: "idle",
    },
  },
  {
    id: "log-1",
    type: "debug.log",
    position: { x: 420, y: 120 },
    data: {
      bodySelector: "input",
      message: "Hello FlowPilot",
      runStatus: "idle",
    },
  },
];

const defaultEdges: FlowEdge[] = [{ id: "e-trigger-log", source: "trigger-1", target: "log-1" }];

function isFlowNodeType(type: string): type is FlowNodeType {
  return NODE_REGISTRY.some((node) => node.type === type);
}

function getNodeDefinition(type?: string) {
  return NODE_REGISTRY.find((node) => node.type === type);
}

function getDefaultData(type: FlowNodeType): FlowNodeData {
  if (type === "manual.trigger") {
    return { triggerName: "Manual run", sampleInput: '{"source":"manual"}', runStatus: "idle" };
  }
  if (type === "logic.delay") {
    return { durationValue: 1, durationUnit: "seconds", durationMs: 1000, runStatus: "idle" };
  }
  return { bodySelector: "input", message: "Hello FlowPilot", runStatus: "idle" };
}

function toDurationMs(data: FlowNodeData) {
  const value = Number(data.durationValue ?? 1);
  return data.durationUnit === "minutes" ? value * 60_000 : value * 1000;
}

function FlowPilotNode(props: NodeProps<FlowNode>) {
  const definition = getNodeDefinition(props.type);
  const status = props.data.runStatus ?? "idle";

  return (
    <div className={`flow-node ${status}`}>
      <Handle type="target" position={Position.Left} />
      <span>{props.type}</span>
      <strong>{definition?.label ?? props.type}</strong>
      <small>{definition?.description ?? "Workflow node"}</small>
      {status !== "idle" && <em>{status}</em>}
      {props.type === "debug.log" && <code>{String(props.data.message ?? "")}</code>}
      {props.type === "logic.delay" && (
        <code>
          {String(props.data.durationValue ?? 1)} {String(props.data.durationUnit ?? "seconds")}
        </code>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function groupedNodes() {
  return NODE_REGISTRY.reduce<Record<string, RegistryNode[]>>((groups, node) => {
    groups[node.category] = [...(groups[node.category] ?? []), node];
    return groups;
  }, {});
}

function hasPath(start: string, target: string, edges: FlowEdge[]) {
  const visited = new Set<string>();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === target) return true;
    visited.add(current);
    queue.push(...edges.filter((edge) => edge.source === current).map((edge) => edge.target));
  }

  return false;
}

function hasCycle(nodes: FlowNode[], edges: FlowEdge[]) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visiting.add(nodeId);
    for (const edge of edges.filter((item) => item.source === nodeId)) {
      if (visit(edge.target)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return nodes.some((node) => visit(node.id));
}

function validateGraph(nodes: FlowNode[], edges: FlowEdge[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const triggerNodes = nodes.filter((node) => node.type === "manual.trigger");
  const nodeIds = new Set(nodes.map((node) => node.id));

  if (triggerNodes.length !== 1) errors.push("Workflow must have exactly one manual.trigger node.");
  if (hasCycle(nodes, edges)) errors.push("Workflow graph cannot contain cycles.");

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references a missing node.`);
    }
  }

  const trigger = triggerNodes[0];
  if (trigger) {
    for (const node of nodes) {
      if (node.id !== trigger.id && !hasPath(trigger.id, node.id, edges)) {
        errors.push(`Node ${node.type} is not reachable from manual.trigger.`);
      }
    }
  }

  for (const node of nodes) {
    const hasAnyEdge = edges.some((edge) => edge.source === node.id || edge.target === node.id);
    if (!hasAnyEdge && nodes.length > 1) warnings.push(`${node.type} is disconnected.`);
  }

  return { errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)) };
}

function formatRunTime(value?: string) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(defaultEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [savedWorkflowId, setSavedWorkflowId] = useState("");
  const [workflowName, setWorkflowName] = useState("Starter workflow");
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowListItem[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const [runInput, setRunInput] = useState('{"source":"manual"}');
  const [latestRun, setLatestRun] = useState<RunWorkflowResponse | null>(null);
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null);
  const [runHistory, setRunHistory] = useState<RunDetails[]>([]);
  const [historyStatus, setHistoryStatus] = useState("");

  const { screenToFlowPosition } = useReactFlow();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedDefinition = getNodeDefinition(selectedNode?.type);
  const validation = validateGraph(nodes, edges);
  const groupedPalette = groupedNodes();
  const hasManualTrigger = nodes.some((node) => node.type === "manual.trigger");

  const nodeTypes = useMemo(
    () =>
      ({
        "manual.trigger": FlowPilotNode,
        "logic.delay": FlowPilotNode,
        "debug.log": FlowPilotNode,
      }) satisfies NodeTypes,
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((currentEdges) => addEdge(connection, currentEdges)),
    [setEdges]
  );

  const addNode = (nodeType: FlowNodeType) => {
    if (nodeType === "manual.trigger" && hasManualTrigger) return;
    const offset = nodes.length * 42;
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: crypto.randomUUID(),
        type: nodeType,
        position: { x: 120 + offset, y: 120 + offset },
        data: getDefaultData(nodeType),
      },
    ]);
  };

  const onDragStart = (event: React.DragEvent<HTMLElement>, nodeType: FlowNodeType) => {
    if (nodeType === "manual.trigger" && hasManualTrigger) return;
    event.dataTransfer.setData("application/flowpilot-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const draggedType = event.dataTransfer.getData("application/flowpilot-node");
      if (!draggedType || !isFlowNodeType(draggedType)) return;
      if (draggedType === "manual.trigger" && nodes.some((node) => node.type === "manual.trigger")) return;

      setNodes((currentNodes) => [
        ...currentNodes,
        {
          id: crypto.randomUUID(),
          type: draggedType,
          position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
          data: getDefaultData(draggedType),
        },
      ]);
    },
    [nodes, screenToFlowPosition, setNodes]
  );

  const updateSelectedNodeData = (key: keyof FlowNodeData, value: unknown) => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const nextData = { ...node.data, [key]: value };
        if (node.type === "logic.delay") nextData.durationMs = toDurationMs(nextData);
        return { ...node, data: nextData };
      })
    );
  };

  const clearRunState = () => {
    setLatestRun(null);
    setRunDetails(null);
    setRunStatus("");
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          runStatus: "idle",
        },
      }))
    );
  };

  const resetWorkflow = () => {
    setNodes(defaultNodes.map((node) => ({ ...node, data: { ...node.data } })));
    setEdges(defaultEdges.map((edge) => ({ ...edge })));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSavedJson("");
    setSavedWorkflowId("");
    setWorkflowName("Untitled workflow");
    setSaveStatus("New workflow draft");
    setRunHistory([]);
    setHistoryStatus("");
    clearRunState();
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setSaveStatus("Deleted edge");
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const manualTriggerCount = nodes.filter((node) => node.type === "manual.trigger").length;

    if (selectedNode.type === "manual.trigger" && manualTriggerCount <= 1) {
      setSaveStatus("Cannot delete the only manual.trigger node.");
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    );
    setSelectedNodeId(null);
    setSaveStatus("Deleted node");
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) return;

    if (selectedNode.type === "manual.trigger" && hasManualTrigger) {
      setSaveStatus("Only one manual.trigger node is allowed.");
      return;
    }

    const duplicateId = crypto.randomUUID();
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        ...selectedNode,
        id: duplicateId,
        position: {
          x: selectedNode.position.x + 48,
          y: selectedNode.position.y + 48,
        },
        data: {
          ...selectedNode.data,
          runStatus: "idle",
        },
      },
    ]);
    setSelectedNodeId(duplicateId);
    setSelectedEdgeId(null);
    setSaveStatus("Duplicated node");
  };

  const deleteSelection = () => {
    if (selectedNode) {
      deleteSelectedNode();
      return;
    }
    deleteSelectedEdge();
  };

  const applyRunDetailsToNodes = (details: RunDetails | null) => {
    const statuses = new Map<string, NodeStatus>();
    for (const step of details?.stepRuns ?? []) {
      statuses.set(step.nodeKey, step.status.toLowerCase() as NodeStatus);
    }
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          runStatus: statuses.get(node.id) ?? (details ? "queued" : "idle"),
        },
      }))
    );
  };

  const buildWorkflowJson = () => ({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.type === "logic.delay" ? { ...node.data, durationMs: toDurationMs(node.data) } : node.data ?? {},
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  });

  const loadWorkflowIntoEditor = (workflow: WorkflowListItem) => {
    const version = workflow.versions?.[0];
    if (!version) return;

    setWorkflowName(workflow.name);
    setSavedWorkflowId(workflow.id);
    setNodes(
      version.nodes.map((node) => ({
        id: node.nodeKey,
        type: isFlowNodeType(node.type) ? node.type : "debug.log",
        position: { x: node.positionX, y: node.positionY },
        data: { ...(node.config ?? {}), runStatus: "idle" },
      }))
    );
    setEdges(
      version.edges.map((edge) => ({
        id: edge.edgeKey,
        source: edge.sourceNode.nodeKey,
        target: edge.targetNode.nodeKey,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      }))
    );
    setSaveStatus("Loaded workflow");
    setRunDetails(null);
    setLatestRun(null);
    void refreshRunHistory(workflow.id);
  };

  const refreshWorkflowList = async () => {
    const response = await fetch("/api/workflows");
    const result = (await response.json()) as WorkflowResponse;
    if (!response.ok || !result.success) throw new Error(result.error ?? "Failed to load workflows");
    setSavedWorkflows(result.workflows ?? []);
  };

  const refreshRunHistory = async (workflowId = savedWorkflowId) => {
    if (!workflowId) {
      setRunHistory([]);
      return;
    }

    setHistoryStatus("Loading run history...");
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs`);
      const result = (await response.json()) as RunHistoryResponse;
      if (!response.ok || !result.success) throw new Error(result.error ?? "Failed to load run history");
      setRunHistory(result.runs ?? []);
      setHistoryStatus(result.runs?.length ? "" : "No runs yet.");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "Failed to load run history");
    }
  };

  useEffect(() => {
    void refreshWorkflowList().catch((error) => {
      setSaveStatus(error instanceof Error ? error.message : "Failed to load workflows");
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const tagName = target instanceof HTMLElement ? target.tagName : "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (!selectedNode && !selectedEdge) return;

      event.preventDefault();
      deleteSelection();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNode, selectedEdge]);

  const saveWorkflow = async () => {
    const workflow = buildWorkflowJson();
    const currentValidation = validateGraph(nodes, edges);
    setSavedJson(JSON.stringify(workflow, null, 2));

    if (currentValidation.errors.length > 0) {
      setSaveStatus(currentValidation.errors[0]);
      return;
    }

    setSaveStatus("Saving...");
    setRunDetails(null);

    try {
      const response = await fetch(savedWorkflowId ? `/api/workflows/${savedWorkflowId}` : "/api/workflows", {
        method: savedWorkflowId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, ...workflow }),
      });
      const result = (await response.json()) as WorkflowResponse;
      if (!response.ok || !result.success || !result.workflow?.id) {
        throw new Error(result.error ?? "Failed to save workflow");
      }
      setSavedWorkflowId(result.workflow.id);
      setSaveStatus(savedWorkflowId ? "Updated workflow" : "Saved workflow");
      await refreshWorkflowList();
      await refreshRunHistory(result.workflow.id);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Failed to save workflow");
    }
  };

  const loadLatestWorkflow = async () => {
    setSaveStatus("Loading...");
    try {
      await refreshWorkflowList();
      const response = await fetch("/api/workflows");
      const result = (await response.json()) as WorkflowResponse;
      const workflow = result.workflows?.[0];
      if (!workflow) {
        setSaveStatus("No saved workflow found");
        return;
      }
      loadWorkflowIntoEditor(workflow);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Failed to load workflow");
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
    const result = (await response.json()) as WorkflowResponse;
    if (!response.ok || !result.success) throw new Error(result.error ?? "Failed to delete workflow");
    if (savedWorkflowId === workflowId) {
      setSavedWorkflowId("");
      setRunHistory([]);
      setRunDetails(null);
      setLatestRun(null);
    }
    await refreshWorkflowList();
    setSaveStatus("Deleted workflow");
  };

  const duplicateWorkflow = async (workflowId: string) => {
    const response = await fetch(`/api/workflows/${workflowId}/duplicate`, { method: "POST" });
    const result = (await response.json()) as WorkflowResponse;
    if (!response.ok || !result.success || !result.workflow) throw new Error(result.error ?? "Failed to duplicate workflow");
    await refreshWorkflowList();
    loadWorkflowIntoEditor(result.workflow);
    setSaveStatus("Duplicated workflow");
  };

  const refreshRunDetails = async (workflowRunId: string) => {
    const response = await fetch(`/api/runs/${workflowRunId}`);
    const result = (await response.json()) as RunDetailsResponse;
    if (!response.ok || !result.success || !result.run) throw new Error(result.error ?? "Failed to load workflow run");
    setRunDetails(result.run);
    setRunStatus(`Run ${result.run.status.toLowerCase()}`);
    applyRunDetailsToNodes(result.run);
    if (savedWorkflowId) void refreshRunHistory(savedWorkflowId);
    return result.run;
  };

  const runSavedWorkflow = async () => {
    if (!savedWorkflowId) {
      setRunStatus("Save a workflow before running it.");
      return;
    }

    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(runInput);
    } catch {
      setRunStatus("Run input must be valid JSON.");
      return;
    }

    setRunStatus("Queueing run...");
    setLatestRun(null);
    setRunDetails(null);
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, data: { ...node.data, runStatus: "queued" } }))
    );

    try {
      const response = await fetch(`/api/workflows/${savedWorkflowId}/run-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput }),
      });
      const result = (await response.json()) as DirectRunResponse;
      if (!result.run) throw new Error(result.error ?? "Failed to run workflow");
      setLatestRun({ queued: true, workflowRunId: result.run.id });
      setRunDetails(result.run);
      setRunStatus(result.success ? `Run ${result.run.status.toLowerCase()}` : result.error ?? `Run ${result.run.status.toLowerCase()}`);
      applyRunDetailsToNodes(result.run);
      await refreshRunHistory(savedWorkflowId);
    } catch (error) {
      setRunStatus(error instanceof Error ? error.message : "Failed to run workflow");
    }
  };

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
          {Object.entries(groupedPalette).map(([category, items]) => (
            <section className="palette-group" key={category}>
              <h3>{category}</h3>
              {items.map((node) => {
                const disabled = node.type === "manual.trigger" && hasManualTrigger;
                return (
                  <article
                    className={`node-card ${disabled ? "disabled" : ""}`}
                    draggable={!disabled}
                    key={node.type}
                    onDragStart={(event) => onDragStart(event, node.type)}
                  >
                    <div>
                      <span>{node.type}</span>
                      <h2>{node.label}</h2>
                    </div>
                    <p>{node.description}</p>
                    <button className="small-button" disabled={disabled} onClick={() => addNode(node.type)} type="button">
                      {disabled ? "Already added" : "Add node"}
                    </button>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </aside>

      <section className="workspace" aria-label="Workflow builder">
        <header className="toolbar">
          <div>
            <p className="eyebrow">Draft workflow</p>
            <h2>{workflowName}</h2>
          </div>
          <div className="actions">
            <button className="secondary-button" onClick={resetWorkflow} type="button">
              New workflow
            </button>
            <button className="secondary-button" onClick={loadLatestWorkflow} type="button">
              Load latest
            </button>
            <button className="secondary-button" onClick={refreshWorkflowList} type="button">
              List saved
            </button>
            <button className="secondary-button" onClick={saveWorkflow} type="button">
              Save
            </button>
            <button className="primary-button" disabled={!savedWorkflowId} onClick={runSavedWorkflow} type="button">
              Run local
            </button>
          </div>
        </header>

        <div className="flow-editor-grid">
          <div className="flow-canvas" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow<FlowNode, FlowEdge>
              deleteKeyCode={null}
              edges={edges}
              fitView
              nodes={nodes}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onNodesChange={onNodesChange}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          <aside className="inspector-panel" aria-label="Workflow inspector">
            <h3>Workflow</h3>
            <label className="field">
              <span>Name</span>
              <input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} />
            </label>

            <div className="inspector-section">
              <h3>Canvas Actions</h3>
              {selectedEdge && (
                <div className="info-box">
                  <strong>Selected edge</strong>
                  <code>{`${selectedEdge.source} -> ${selectedEdge.target}`}</code>
                </div>
              )}
              <div className="inspector-actions">
                <button className="small-button" disabled={!selectedNode} onClick={deleteSelectedNode} type="button">
                  Delete node
                </button>
                <button
                  className="small-button"
                  disabled={!selectedNode || selectedNode.type === "manual.trigger"}
                  onClick={duplicateSelectedNode}
                  type="button"
                >
                  Duplicate node
                </button>
                <button className="small-button" disabled={!selectedEdge} onClick={deleteSelectedEdge} type="button">
                  Delete edge
                </button>
                <button className="small-button" onClick={clearRunState} type="button">
                  Clear run status
                </button>
              </div>
            </div>

            <div className="inspector-section">
              <h3>Validation</h3>
              {validation.errors.length === 0 && validation.warnings.length === 0 && <p>Ready to save.</p>}
              {validation.errors.map((error) => (
                <p className="error-text" key={error}>{error}</p>
              ))}
              {validation.warnings.map((warning) => (
                <p className="warning-text" key={warning}>{warning}</p>
              ))}
            </div>

            <div className="inspector-section">
              <h3>Node Settings</h3>
              {!selectedNode && <p>Select a node from the canvas to edit its settings.</p>}
              {selectedNode && selectedDefinition && (
                <div className="inspector-stack">
                  <strong>{selectedDefinition.label}</strong>
                  <code>{selectedDefinition.type}</code>

                  {(Object.entries(selectedDefinition.inputs) as Array<[keyof FlowNodeData, NodeInputType]>).map(([key, inputType]) => (
                    <label className="field" key={key}>
                      <span>{key}</span>
                      {key === "durationUnit" ? (
                        <select
                          value={String(selectedNode.data.durationUnit ?? "seconds")}
                          onChange={(event) => updateSelectedNodeData(key, event.target.value)}
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                        </select>
                      ) : key === "bodySelector" ? (
                        <select
                          value={String(selectedNode.data.bodySelector ?? "input")}
                          onChange={(event) => updateSelectedNodeData(key, event.target.value)}
                        >
                          <option value="input">Input</option>
                          <option value="previousOutput">Previous output</option>
                          <option value="custom">Custom message</option>
                        </select>
                      ) : key === "sampleInput" ? (
                        <textarea
                          value={String(selectedNode.data?.[key] ?? "")}
                          onChange={(event) => updateSelectedNodeData(key, event.target.value)}
                        />
                      ) : (
                        <input
                          type={inputType === "number" ? "number" : "text"}
                          value={String(selectedNode.data?.[key] ?? "")}
                          onChange={(event) =>
                            updateSelectedNodeData(
                              key,
                              inputType === "number" ? Number(event.target.value) : event.target.value
                            )
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="inspector-section">
              <h3>Saved Workflows</h3>
              {savedWorkflowId && (
                <div className="success-box">
                  <strong>Current Workflow ID</strong>
                  <code>{savedWorkflowId}</code>
                </div>
              )}
              {saveStatus && <p>{saveStatus}</p>}
              {savedWorkflows.length === 0 && <p>No saved workflow list loaded.</p>}
              {savedWorkflows.map((workflow) => (
                <div className="saved-workflow-row" key={workflow.id}>
                  <button type="button" onClick={() => loadWorkflowIntoEditor(workflow)}>
                    {workflow.name}
                  </button>
                  <div>
                    <button type="button" onClick={() => duplicateWorkflow(workflow.id)}>Duplicate</button>
                    <button type="button" onClick={() => deleteWorkflow(workflow.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="inspector-section">
              <h3>Run Input</h3>
              <textarea value={runInput} onChange={(event) => setRunInput(event.target.value)} />
            </div>

            {(runStatus || latestRun || runDetails) && (
              <div className="inspector-section logs-panel">
                <h3>Run Logs</h3>
                {runStatus && <p>{runStatus}</p>}
                {latestRun?.workflowRunId && (
                  <div className="info-box">
                    <strong>Workflow Run ID</strong>
                    <code>{latestRun.workflowRunId}</code>
                    {latestRun.jobId && <code>Job {latestRun.jobId}</code>}
                    <button className="small-button" onClick={() => refreshRunDetails(latestRun.workflowRunId!)} type="button">
                      Refresh run status
                    </button>
                  </div>
                )}

                {runDetails && (
                  <div className="run-details">
                    <div className="status-row">
                      <span>Status</span>
                      <code>{runDetails.status}</code>
                    </div>
                    {runDetails.error && <p className="error-text">{runDetails.error}</p>}
                    <strong>Steps</strong>
                    {runDetails.stepRuns.map((step) => (
                      <div className="mini-record" key={step.id}>
                        <span>{step.nodeType}</span>
                        <code>{step.status}</code>
                      </div>
                    ))}
                    <strong>Logs</strong>
                    {runDetails.logs.map((log) => (
                      <div className="mini-record dark" key={log.id}>
                        <span>{log.level}</span>
                        <code>{log.message}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="inspector-section">
              <div className="section-heading-row">
                <h3>Run History</h3>
                <button
                  className="small-button"
                  disabled={!savedWorkflowId}
                  onClick={() => refreshRunHistory()}
                  type="button"
                >
                  Refresh
                </button>
              </div>
              {!savedWorkflowId && <p>Save or load a workflow to view run history.</p>}
              {historyStatus && <p>{historyStatus}</p>}
              {runHistory.map((run) => (
                <button
                  className={`run-history-row ${runDetails?.id === run.id ? "active" : ""}`}
                  key={run.id}
                  onClick={() => {
                    setRunDetails(run);
                    setLatestRun({ queued: true, workflowRunId: run.id });
                    setRunStatus(`Run ${run.status.toLowerCase()}`);
                    applyRunDetailsToNodes(run);
                  }}
                  type="button"
                >
                  <span>
                    <strong>{run.status}</strong>
                    <small>{formatRunTime(run.createdAt)}</small>
                  </span>
                  <code>{run.id}</code>
                </button>
              ))}
            </div>

            {savedJson && (
              <details className="inspector-section">
                <summary>Saved JSON</summary>
                <pre>{savedJson}</pre>
              </details>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder />
    </ReactFlowProvider>
  );
}
