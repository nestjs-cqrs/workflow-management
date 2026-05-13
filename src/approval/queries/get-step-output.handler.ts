import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetStepOutputQuery } from './get-step-output.query';
import { MinioStorageService } from '../services/minio-storage.service';

@QueryHandler(GetStepOutputQuery)
export class GetStepOutputHandler
  implements IQueryHandler<GetStepOutputQuery>
{
  constructor(private readonly minio: MinioStorageService) {}

  async execute(query: GetStepOutputQuery): Promise<Result<string>> {
    if (!query.objectKey) {
      return Result.notFound('objectKey is required');
    }

    try {
      const content = await this.minio.getObject(query.objectKey);
      return Result.success(content);
    } catch {
      return Result.notFound(
        `Step output not found: ${query.objectKey}`,
      );
    }
  }
}
