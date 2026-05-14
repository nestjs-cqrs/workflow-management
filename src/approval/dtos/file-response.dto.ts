import { ApiProperty } from '@nestjs/swagger';

export class FileContentResponseDto {
  @ApiProperty({ description: 'File content as markdown string' })
  content!: string;

  @ApiProperty({ description: 'ETag for optimistic locking' })
  etag!: string;

  @ApiProperty({ description: 'MinIO version ID' })
  versionId!: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  lastModified!: string;
}

export class FileSaveResponseDto {
  @ApiProperty({ description: 'MinIO object key' })
  path!: string;

  @ApiProperty({ description: 'New version ID' })
  versionId!: string;

  @ApiProperty({ description: 'New ETag' })
  etag!: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  lastModified!: string;
}

export class FileVersionDto {
  @ApiProperty({ description: 'MinIO version ID' })
  versionId!: string;

  @ApiProperty({ description: 'Version timestamp' })
  lastModified!: string;

  @ApiProperty({ description: 'File size in bytes' })
  size!: number;

  @ApiProperty({ description: 'Whether this is the latest version' })
  isLatest!: boolean;
}

export class FileVersionsResponseDto {
  @ApiProperty({ type: [FileVersionDto], description: 'List of file versions' })
  versions!: FileVersionDto[];
}

export class FileVersionContentDto {
  @ApiProperty({ description: 'File content at this version' })
  content!: string;

  @ApiProperty({ description: 'Version ID' })
  versionId!: string;

  @ApiProperty({ description: 'Version timestamp' })
  lastModified!: string;
}
