import { Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetStepOutputQuery } from './get-step-output.query';
import { MinioStorageService } from '../services/minio-storage.service';

@QueryHandler(GetStepOutputQuery)
export class GetStepOutputHandler
  implements IQueryHandler<GetStepOutputQuery>
{
  private readonly logger = new Logger(GetStepOutputHandler.name);

  constructor(private readonly minio: MinioStorageService) {}

  async execute(
    query: GetStepOutputQuery,
  ): Promise<Result<{ url: string }>> {
    if (!query.objectKey) {
      return Result.notFound('objectKey is required');
    }

    try {
      await this.minio.statObject(query.objectKey);
      const url = await this.minio.presignedGetUrl(query.objectKey);
      this.logger.log({ url, objectKey: query.objectKey }, 'Pre-signed URL generated');
      return Result.success({ url });
    } catch {
      return Result.notFound(
        `Step output not found: ${query.objectKey}`,
      );
    }
  }
}
