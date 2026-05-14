import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetFileVersionsQuery } from './get-file-versions.query';
import { FileVersionsResponseDto } from '../dtos/file-response.dto';
import { MinioStorageService } from '../services/minio-storage.service';

@QueryHandler(GetFileVersionsQuery)
export class GetFileVersionsHandler
  implements IQueryHandler<GetFileVersionsQuery>
{
  constructor(private readonly minio: MinioStorageService) {}

  async execute(
    query: GetFileVersionsQuery,
  ): Promise<Result<FileVersionsResponseDto>> {
    if (!query.path) {
      return Result.notFound('File path is required');
    }

    try {
      const versions = await this.minio.listObjectVersions(query.path);
      return Result.success({
        versions: versions.map((v) => ({
          versionId: v.versionId,
          lastModified: v.lastModified.toISOString(),
          size: v.size,
          isLatest: v.isLatest,
        })),
      });
    } catch {
      return Result.notFound(`File not found: ${query.path}`);
    }
  }
}
