import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KogitoProcessInstance {
  id: string;
  processId: string;
  processName?: string;
  state: string;
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

type RawGraphQLInstance = Omit<KogitoProcessInstance, 'variables'> & {
  variables?: unknown;
};

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

  private async graphql<T>(query: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`Kogito GraphQL error: ${response.status}`);
    }
    const result = (await response.json()) as { data: T; errors?: unknown[] };
    if (result.errors?.length) {
      throw new Error(
        `Kogito GraphQL error: ${JSON.stringify(result.errors)}`,
      );
    }
    return result.data;
  }

  private readonly instanceFields =
    'id processId processName state start end variables nodes { id name type enter exit definitionId }';

  private mapInstance(raw: RawGraphQLInstance): KogitoProcessInstance {
    const vars = (raw.variables as Record<string, unknown>) ?? {};
    return {
      ...raw,
      variables: (vars['workflowdata'] as Record<string, unknown>) ?? vars,
    };
  }

  async listInstances(processId: string): Promise<KogitoProcessInstance[]> {
    const data = await this.graphql<{
      ProcessInstances: RawGraphQLInstance[];
    }>(
      `{ ProcessInstances(where: { processId: { equal: "${processId}" } }) { ${this.instanceFields} } }`,
    );
    return data.ProcessInstances.map((i) => this.mapInstance(i));
  }

  async getInstance(
    processId: string,
    instanceId: string,
  ): Promise<KogitoProcessInstance> {
    const data = await this.graphql<{
      ProcessInstances: RawGraphQLInstance[];
    }>(
      `{ ProcessInstances(where: { id: { equal: "${instanceId}" } }) { ${this.instanceFields} } }`,
    );
    if (!data.ProcessInstances.length) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    return this.mapInstance(data.ProcessInstances[0]);
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
    const processIds = this.config
      .get<string>('KOGITO_PROCESS_IDS', 'pipeline_orchestrator')
      .split(',')
      .map((id) => id.trim());

    const allInstances: KogitoProcessInstance[] = [];

    for (const processId of processIds) {
      try {
        const instances = await this.listInstances(processId);
        allInstances.push(
          ...instances.filter((i) => i.state === 'ACTIVE'),
        );
      } catch {
        this.logger.warn(
          { processId },
          'Failed to fetch instances for process',
        );
      }
    }

    return allInstances;
  }
}
