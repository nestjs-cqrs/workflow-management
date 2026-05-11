export class GetPendingTasksQuery {
  constructor(
    public readonly userRoles: string[],
    public readonly app?: string,
  ) {}
}
