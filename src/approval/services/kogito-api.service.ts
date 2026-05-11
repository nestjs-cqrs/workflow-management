import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KogitoProcessInstance {
  id: string;
  processId: string;
  processName?: string;
  state: number; // 1=ACTIVE, 2=COMPLETED, 3=ABORTED, 4=SUSPENDED, 5=PENDING, 6=ERROR
  variables?: Record<string, unknown>;
  start?: string;
  end?: string;
  nodes?: KogitoNodeInstance[];
}

export interface KogitoNodeInstance {
  id: string;
  name: string;
  type: string;
  enter: string;
  exit?: string;
  definitionId: string;
}

export interface KogitoTask {
  id: string;
  name: string;
  state: string; // Ready, Reserved, InProgress, Completed, etc.
  processInstanceId: string;
  processId: string;
  parameters?: Record<string, unknown>;
}

@Injectable()
export class KogitoApiService {
  private readonly logger = new Logger(KogitoApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('KOGITO_URL', 'http://localhost:8180');
  }

  async listInstances(processId: string): Promise<KogitoProcessInstance[]> {
    const response = await fetch(`${this.baseUrl}/${processId}`);
    if (!response.ok) {
      throw new Error(`Kogito API error: ${response.status}`);
    }
    return response.json() as Promise<KogitoProcessInstance[]>;
  }

  async getInstance(
    processId: string,
    instanceId: string,
  ): Promise<KogitoProcessInstance> {
    const response = await fetch(
      `${this.baseUrl}/${processId}/${instanceId}`,
    );
    if (!response.ok) {
      throw new Error(`Kogito API error: ${response.status}`);
    }
    return response.json() as Promise<KogitoProcessInstance>;
  }

  async getInstanceTasks(
    processId: string,
    instanceId: string,
  ): Promise<KogitoTask[]> {
    const response = await fetch(
      `${this.baseUrl}/${processId}/${instanceId}/tasks`,
    );
    if (!response.ok) {
      throw new Error(`Kogito API error: ${response.status}`);
    }
    return response.json() as Promise<KogitoTask[]>;
  }

  async abortInstance(
    processId: string,
    instanceId: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${processId}/${instanceId}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      throw new Error(`Kogito abort failed: ${response.status}`);
    }
  }

  async listAllActiveInstances(): Promise<KogitoProcessInstance[]> {
    // Query all known workflow definitions
    // This could be made configurable via KOGITO_PROCESS_IDS env var
    const processIds = this.config
      .get<string>('KOGITO_PROCESS_IDS', 'pipeline_orchestrator')
      .split(',')
      .map((id) => id.trim());

    const allInstances: KogitoProcessInstance[] = [];

    for (const processId of processIds) {
      try {
        const instances = await this.listInstances(processId);
        allInstances.push(...instances.filter((i) => i.state === 1));
      } catch {
        this.logger.warn({ processId }, 'Failed to fetch instances for process');
      }
    }

    return allInstances;
  }
}
