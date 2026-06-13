export declare const QUEUE_NAMES: {
    readonly workflowRuns: "workflow.runs";
};
export type NodeCategory = "trigger" | "condition" | "ai" | "action" | "delay" | "crm" | "communication" | "payment" | "document";
export type IntegrationProvider = "openai" | "gemini" | "whatsapp" | "exotel" | "twilio" | "s3" | "r2" | "stripe" | "razorpay" | "custom";
export type NodeDefinition = {
    type: string;
    label: string;
    category: NodeCategory;
    provider?: IntegrationProvider;
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
};
export type WorkflowNodeDefinition = {
    id: string;
    type: string;
    position: {
        x: number;
        y: number;
    };
    config: Record<string, unknown>;
    credentialKey?: string;
};
export type WorkflowEdgeDefinition = {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    condition?: Record<string, unknown>;
};
export type WorkflowDefinition = {
    nodes: WorkflowNodeDefinition[];
    edges: WorkflowEdgeDefinition[];
};
export type WorkflowRunJob = {
    workflowId: string;
    workflowVersionId?: string;
    workflowRunId?: string;
    workspaceId?: string;
    input: unknown;
};
export type NodeExecutionContext = {
    workflowId: string;
    workflowVersionId?: string;
    runId: string;
    nodeId: string;
    workspaceId?: string;
    credentials?: Record<string, unknown>;
};
export type NodeExecuteArgs = {
    input: unknown;
    context: NodeExecutionContext;
};
export type NodeExecuteResult = {
    output: unknown;
    status: "success" | "failed" | "skipped";
};
export type NodeHandler = NodeDefinition & {
    execute(args: NodeExecuteArgs): Promise<NodeExecuteResult>;
};
export declare const isWorkflowDefinition: (value: unknown) => value is WorkflowDefinition;
