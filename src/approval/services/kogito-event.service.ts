import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class KogitoEventService {
  private readonly logger = new Logger(KogitoEventService.name);
  private readonly kogitoUrl: string;

  constructor(private readonly config: ConfigService) {
    this.kogitoUrl = this.config.get<string>(
      'KOGITO_URL',
      'http://localhost:8180',
    );
  }

  async publishApprovalDecision(
    processInstanceId: string,
    data: {
      approved: boolean;
      approvedById: string;
      role: string;
      feedback?: string;
    },
  ): Promise<void> {
    const event = {
      specversion: '1.0',
      id: randomUUID(),
      type: 'approval_decision',
      source: '/workflow-management',
      kogitoprocinstanceid: processInstanceId,
      data,
    };

    this.logger.log({
      msg: 'Publishing approval decision CloudEvent to Kogito',
      processInstanceId,
      approved: data.approved,
    });

    const response = await fetch(`${this.kogitoUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/cloudevents+json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error({
        msg: 'Kogito CloudEvent publish failed',
        status: response.status,
        body,
      });
      throw new Error(`Kogito CloudEvent publish failed: ${response.status}`);
    }

    this.logger.log({
      msg: 'Approval decision CloudEvent published',
      processInstanceId,
      eventId: event.id,
    });
  }
}
