export class ApproveTaskCommand {
  constructor(
    public readonly workflowInstanceId: string,
    public readonly approvedById: string,
    public readonly role: string,
    public readonly comment?: string,
  ) {}
}
