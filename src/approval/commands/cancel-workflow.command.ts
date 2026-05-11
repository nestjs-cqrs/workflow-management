export class CancelWorkflowCommand {
  constructor(
    public readonly processInstanceId: string,
    public readonly processId: string,
    public readonly cancelledById: string,
    public readonly reason?: string,
  ) {}
}
