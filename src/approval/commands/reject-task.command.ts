export class RejectTaskCommand {
  constructor(
    public readonly workflowInstanceId: string,
    public readonly rejectedById: string,
    public readonly role: string,
    public readonly feedback: string,
  ) {}
}
