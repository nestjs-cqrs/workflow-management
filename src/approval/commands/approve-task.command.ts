export class ApproveTaskCommand {
  constructor(
    public readonly processInstanceId: string,
    public readonly processId: string,
    public readonly userId: string,
    public readonly userRoles: string[],
    public readonly comment?: string,
  ) {}
}
