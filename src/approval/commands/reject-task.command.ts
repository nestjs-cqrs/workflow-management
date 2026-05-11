export class RejectTaskCommand {
  constructor(
    public readonly processInstanceId: string,
    public readonly processId: string,
    public readonly rejectedById: string,
    public readonly role: string,
    public readonly feedback: string,
  ) {}
}
