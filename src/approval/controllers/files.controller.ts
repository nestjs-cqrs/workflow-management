import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  Headers,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { GetFileQuery } from '../queries/get-file.query';
import { GetFileVersionsQuery } from '../queries/get-file-versions.query';
import { GetFileVersionQuery } from '../queries/get-file-version.query';
import { SaveFileCommand } from '../commands/save-file.command';
import { SaveFileDto } from '../dtos/save-file.dto';
import {
  FileContentResponseDto,
  FileSaveResponseDto,
  FileVersionsResponseDto,
  FileVersionContentDto,
} from '../dtos/file-response.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../bff/decorators/current-user.decorator';

@ApiTags('files')
@Controller('api/files')
export class FilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('versions')
  @ApiOperation({ summary: 'List file versions' })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'MinIO object key for the file',
  })
  @ApiResponse({ status: 200, type: FileVersionsResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  listVersions(@Query('path') path: string) {
    return this.queryBus.execute(new GetFileVersionsQuery(path));
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get specific file version content' })
  @ApiParam({ name: 'versionId', description: 'MinIO version ID' })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'MinIO object key for the file',
  })
  @ApiResponse({ status: 200, type: FileVersionContentDto })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getVersion(
    @Param('versionId') versionId: string,
    @Query('path') path: string,
  ) {
    return this.queryBus.execute(new GetFileVersionQuery(path, versionId));
  }

  @Get()
  @ApiOperation({ summary: 'Get file content with metadata for editing' })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'MinIO object key for the file',
  })
  @ApiResponse({ status: 200, type: FileContentResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  getFile(@Query('path') path: string) {
    return this.queryBus.execute(new GetFileQuery(path));
  }

  @Put()
  @ApiOperation({ summary: 'Save file content (creates a new version)' })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'MinIO object key for the file',
  })
  @ApiQuery({
    name: 'requiredRole',
    required: false,
    description: 'Role required to edit this file',
  })
  @ApiResponse({ status: 200, type: FileSaveResponseDto })
  @ApiResponse({ status: 400, description: 'Empty content or invalid path' })
  @ApiResponse({ status: 403, description: 'User lacks required role' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'Concurrent edit detected' })
  saveFile(
    @Query('path') path: string,
    @Body() dto: SaveFileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('if-match') ifMatch?: string,
    @Query('requiredRole') requiredRole?: string,
  ) {
    return this.commandBus.execute(
      new SaveFileCommand(
        path,
        dto.content,
        user.roles,
        ifMatch,
        requiredRole,
      ),
    );
  }
}
