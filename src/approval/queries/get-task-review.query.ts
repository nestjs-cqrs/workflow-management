export class GetTaskReviewQuery {
  constructor(
    public readonly processInstanceId: string,
    public readonly processId: string,
    public readonly userRoles: string[],
  ) {}
}
