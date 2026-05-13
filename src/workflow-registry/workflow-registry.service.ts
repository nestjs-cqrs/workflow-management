import { Injectable } from '@nestjs/common';
import {
  WORKFLOW_REGISTRY,
  type WorkflowTypeConfig,
} from './workflow-registry.config';

@Injectable()
export class WorkflowRegistryService {
  private readonly configsByProcessId: Map<string, WorkflowTypeConfig>;

  constructor() {
    this.configsByProcessId = new Map(
      WORKFLOW_REGISTRY.map((cfg) => [cfg.processId, cfg]),
    );
  }

  getAll(): WorkflowTypeConfig[] {
    return WORKFLOW_REGISTRY;
  }

  getByProcessId(processId: string): WorkflowTypeConfig | undefined {
    return this.configsByProcessId.get(processId);
  }

  getStepLabel(processId: string, stepNumber: number): string {
    const config = this.configsByProcessId.get(processId);
    return config?.stepLabels[stepNumber] ?? `Step ${stepNumber}`;
  }

  getDisplayName(processId: string): string {
    const config = this.configsByProcessId.get(processId);
    return config?.displayName ?? processId;
  }

  getHighlightedVariables(
    processId: string,
    variables: Record<string, unknown>,
  ): Record<string, string> {
    const config = this.configsByProcessId.get(processId);
    if (!config) return {};

    const highlighted: Record<string, string> = {};
    for (const field of config.variableSchema) {
      if (field.isHighlighted && variables[field.key] != null) {
        highlighted[field.key] = String(variables[field.key]);
      }
    }
    return highlighted;
  }
}
