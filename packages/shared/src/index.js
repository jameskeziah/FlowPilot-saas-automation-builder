"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWorkflowDefinition = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    workflowRuns: "workflow.runs"
};
const isWorkflowDefinition = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const definition = value;
    return Array.isArray(definition.nodes) && Array.isArray(definition.edges);
};
exports.isWorkflowDefinition = isWorkflowDefinition;
//# sourceMappingURL=index.js.map