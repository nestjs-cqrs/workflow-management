export class ApproveTaskCommand {
  constructor(
    public readonly processInstanceId: string,
    public readonly processId: string,
    public readonly approvedById: string,
    public readonly role: string,
    public readonly comment?: string,
  ) {}
}
