import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { GetFileQuery } from './get-file.query';
import { FileContentResponseDto } from '../dtos/file-response.dto';
import { MinioStorageService } from '../services/minio-storage.service';

@QueryHandler(GetFileQuery)
export class GetFileHandler implements IQueryHandler<GetFileQuery> {
  constructor(private readonly minio: MinioStorageService) {}

  async execute(query: GetFileQuery): Promise<Result<FileContentResponseDto>> {
    if (!query.path) {
      return Result.notFound('File path is required');
    }

    try {
      const file = await this.minio.getObjectWithMeta(query.path);
      return Result.success({
        content: file.content,
        etag: file.etag,
        versionId: file.versionId,
        lastModified: file.lastModified.toISOString(),
      });
    } catch {
      return Result.notFound(`File not found: ${query.path}`);
    }
  }
}
