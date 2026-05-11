export class CancelWorkflowCommand {
  constructor(
    public readonly workflowInstanceId: string,
    public readonly cancelledById: string,
    public readonly reason?: string,
  ) {}
}
