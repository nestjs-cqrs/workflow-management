import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import { SaveFileCommand } from './save-file.command';
import { FileSaveResponseDto } from '../dtos/file-response.dto';
import { MinioStorageService } from '../services/minio-storage.service';

@CommandHandler(SaveFileCommand)
export class SaveFileHandler implements ICommandHandler<SaveFileCommand> {
  private readonly logger = new Logger(SaveFileHandler.name);

  constructor(private readonly minio: MinioStorageService) {}

  async execute(command: SaveFileCommand): Promise<Result<FileSaveResponseDto>> {
    if (command.requiredRole) {
      const isAdmin = command.userRoles.includes('admin');
      const role = command.requiredRole.toLowerCase();
      if (!isAdmin && !command.userRoles.includes(role)) {
        return Result.forbidden(
          `Role '${command.requiredRole}' is required to edit this file`,
        );
      }
    }

    if (command.ifMatch) {
      try {
        const stat = await this.minio.statObject(command.path);
        if (stat.etag !== command.ifMatch) {
          return Result.conflict(
            'File was modified by someone else. Reload to see the latest version.',
          );
        }
      } catch {
        return Result.notFound(`File not found: ${command.path}`);
      }
    }

    const result = await this.minio.putObject(command.path, command.content);
    const stat = await this.minio.statObject(command.path);

    this.logger.log({
      msg: 'File saved',
      path: command.path,
      versionId: result.versionId,
    });

    return Result.success({
      path: command.path,
      versionId: result.versionId,
      etag: stat.etag,
      lastModified: stat.lastModified.toISOString(),
    });
  }
}
