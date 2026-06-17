import { BadRequestException, Injectable } from "@nestjs/common";
import type { WorkflowFlowEdgeDto, WorkflowFlowNodeDto } from "./dto/create-workflow.dto";

@Injectable()
export class WorkflowValidationService {
  validateDraft(workflow: { nodes: WorkflowFlowNodeDto[]; edges: WorkflowFlowEdgeDto[] }) {
    if (!Array.isArray(workflow.nodes)) {
      throw new BadRequestException("nodes must be an array");
    }

    if (!Array.isArray(workflow.edges)) {
      throw new BadRequestException("edges must be an array");
    }

    const triggerNodes = workflow.nodes.filter((node) => node.type === "manual.trigger");

    if (triggerNodes.length !== 1) {
      throw new BadRequestException("Workflow must have exactly one manual.trigger node.");
    }

    const nodeIds = new Set<string>();

    for (const node of workflow.nodes) {
      if (!node.id || !node.type || !node.position) {
        throw new BadRequestException("Workflow contains an invalid node.");
      }

      if (nodeIds.has(node.id)) {
        throw new BadRequestException(`Workflow contains duplicate node ${node.id}.`);
      }

      nodeIds.add(node.id);
    }

    for (const edge of workflow.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        throw new BadRequestException("Workflow contains an invalid edge.");
      }

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new BadRequestException(`Edge ${edge.id} references a missing node.`);
      }
    }

    if (this.hasCycle(workflow.nodes, workflow.edges)) {
      throw new BadRequestException("Workflow graph cannot contain cycles.");
    }

    const trigger = triggerNodes[0];
    for (const node of workflow.nodes) {
      if (node.id !== trigger.id && !this.hasPath(trigger.id, node.id, workflow.edges)) {
        throw new BadRequestException(`Node ${node.type} is not reachable from manual.trigger.`);
      }
    }
  }

  private hasPath(start: string, target: string, edges: WorkflowFlowEdgeDto[]) {
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

  private hasCycle(nodes: WorkflowFlowNodeDto[], edges: WorkflowFlowEdgeDto[]) {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visiting.add(nodeId);
      for (const edge of edges.filter((item) => item.source === nodeId)) {
        if (visit(edge.target)) return true;
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    return nodes.some((node) => visit(node.id));
  }
}
