import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KogitoProcessInstance {
  id: string;
  processId: string;
  processName?: string;
  state: string;
  variables: Record<string, unknown>;
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
  definitionId?: string;
}

export interface KogitoTask {
  id: string;
  name: string;
  state: string;
  processInstanceId: string;
  processId: string;
  parameters?: Record<string, unknown>;
}

interface KogitoRestInstance {
  id: string;
  [key: string]: unknown;
}

@Injectable()
export class KogitoApiService {
  private readonly logger = new Logger(KogitoApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'KOGITO_URL',
      'http://localhost:8180',
    );
  }

  private mapRestInstance(
    raw: KogitoRestInstance,
    processId: string,
  ): KogitoProcessInstance {
    const { id, ...variables } = raw;
    const stepStatus = variables['stepStatus'] as string | undefined;

    return {
      id: String(id),
      processId,
      state: stepStatus === 'completed' ? 'COMPLETED' : 'ACTIVE',
      variables,
    };
  }

  async listInstances(
    processId: string,
    state?: string,
  ): Promise<KogitoProcessInstance[]> {
    const response = await fetch(`${this.baseUrl}/${processId}`);
    if (!response.ok) {
      throw new Error(`Kogito REST error: ${response.status}`);
    }
    const rawList = (await response.json()) as KogitoRestInstance[];
    let instances = rawList.map((r) => this.mapRestInstance(r, processId));

    if (state) {
      instances = instances.filter((i) => i.state === state);
    }

    return instances;
  }

  async getInstance(
    processId: string,
    instanceId: string,
  ): Promise<KogitoProcessInstance> {
    const response = await fetch(`${this.baseUrl}/${processId}/${instanceId}`);
    if (!response.ok) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    const raw = (await response.json()) as KogitoRestInstance;
    return this.mapRestInstance(raw, processId);
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

  async abortInstance(processId: string, instanceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${processId}/${instanceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Kogito abort failed: ${response.status}`);
    }
  }

  async listAllActiveInstances(): Promise<KogitoProcessInstance[]> {
    const processIds = this.config
      .get<string>('KOGITO_PROCESS_IDS', 'ProjectPlanningOrchestrator')
      .split(',')
      .map((id) => id.trim());

    const allInstances: KogitoProcessInstance[] = [];

    for (const processId of processIds) {
      try {
        const instances = await this.listInstances(processId);
        allInstances.push(...instances);
      } catch (err) {
        this.logger.warn(
          {
            processId,
            error: err instanceof Error ? err.message : String(err),
          },
          'Failed to fetch instances for process',
        );
      }
    }

    return allInstances;
  }
}
