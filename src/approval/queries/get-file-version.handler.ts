import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetFileVersionQuery } from './get-file-version.query';
import { FileVersionContentDto } from '../dtos/file-response.dto';
import { MinioStorageService } from '../services/minio-storage.service';

@QueryHandler(GetFileVersionQuery)
export class GetFileVersionHandler
  implements IQueryHandler<GetFileVersionQuery>
{
  constructor(private readonly minio: MinioStorageService) {}

  async execute(
    query: GetFileVersionQuery,
  ): Promise<Result<FileVersionContentDto>> {
    if (!query.path || !query.versionId) {
      return Result.notFound('File path and version ID are required');
    }

    try {
      const version = await this.minio.getObjectVersion(
        query.path,
        query.versionId,
      );
      return Result.success({
        content: version.content,
        versionId: version.versionId,
        lastModified: version.lastModified.toISOString(),
      });
    } catch {
      return Result.notFound(`Version not found: ${query.versionId}`);
    }
  }
}
