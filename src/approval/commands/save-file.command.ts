export class SaveFileCommand {
  constructor(
    public readonly path: string,
    public readonly content: string,
    public readonly userRoles: string[],
    public readonly ifMatch?: string,
    public readonly requiredRole?: string,
  ) {}
}
