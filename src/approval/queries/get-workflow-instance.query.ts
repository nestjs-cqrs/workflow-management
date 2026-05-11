export class GetWorkflowInstanceQuery {
  constructor(
    public readonly processId: string,
    public readonly instanceId: string,
  ) {}
}
