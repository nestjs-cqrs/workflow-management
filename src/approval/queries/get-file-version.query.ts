export class GetFileVersionQuery {
  constructor(
    public readonly path: string,
    public readonly versionId: string,
  ) {}
}
