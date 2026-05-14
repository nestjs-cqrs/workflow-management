import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY', 'autoflux'),
      secretKey: this.config.get('MINIO_SECRET_KEY', 'autoflux123'),
    });
    this.bucket = this.config.get('MINIO_BUCKET', 'autoflux');
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        this.logger.warn({ bucket: this.bucket }, 'MinIO bucket not found');
        return;
      }
      await this.enableBucketVersioning();
    } catch (err) {
      this.logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        'MinIO not reachable — step output preview will be unavailable',
      );
    }
  }

  async getObject(key: string): Promise<string> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  async putObject(
    key: string,
    content: string,
  ): Promise<{ versionId: string; etag: string }> {
    const buffer = Buffer.from(content, 'utf-8');
    const result = await this.client.putObject(
      this.bucket,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': 'text/markdown; charset=utf-8' },
    );
    return {
      versionId: result.versionId ?? '',
      etag: result.etag,
    };
  }

  async getObjectWithMeta(key: string): Promise<{
    content: string;
    etag: string;
    versionId: string;
    lastModified: Date;
  }> {
    const stat = await this.client.statObject(this.bucket, key);
    const content = await this.getObject(key);
    return {
      content,
      etag: stat.etag,
      versionId: stat.versionId ?? '',
      lastModified: stat.lastModified,
    };
  }

  async statObject(key: string): Promise<{
    etag: string;
    versionId: string;
    lastModified: Date;
  }> {
    const stat = await this.client.statObject(this.bucket, key);
    return {
      etag: stat.etag,
      versionId: stat.versionId ?? '',
      lastModified: stat.lastModified,
    };
  }

  async listObjectVersions(key: string): Promise<
    Array<{
      versionId: string;
      lastModified: Date;
      size: number;
      isLatest: boolean;
    }>
  > {
    return new Promise((resolve, reject) => {
      const versions: Array<{
        versionId: string;
        lastModified: Date;
        size: number;
        isLatest: boolean;
      }> = [];
      const stream = this.client.listObjects(this.bucket, key, false, {
        IncludeVersion: true,
      });
      stream.on('data', (obj: Record<string, unknown>) => {
        if (obj.name === key && !obj.isDeleteMarker) {
          versions.push({
            versionId: (obj.versionId as string) ?? '',
            lastModified: obj.lastModified as Date,
            size: obj.size as number,
            isLatest: (obj.isLatest as boolean) ?? false,
          });
        }
      });
      stream.on('error', reject);
      stream.on('end', () => {
        versions.sort(
          (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
        );
        resolve(versions);
      });
    });
  }

  async getObjectVersion(
    key: string,
    versionId: string,
  ): Promise<{
    content: string;
    versionId: string;
    lastModified: Date;
  }> {
    const stream = await this.client.getObject(this.bucket, key, {
      versionId,
    });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const stat = await this.client.statObject(this.bucket, key, { versionId });
    return {
      content: Buffer.concat(chunks).toString('utf-8'),
      versionId,
      lastModified: stat.lastModified,
    };
  }

  private async enableBucketVersioning(): Promise<void> {
    try {
      await this.client.setBucketVersioning(this.bucket, {
        Status: 'Enabled',
      });
      this.logger.log({ bucket: this.bucket }, 'Bucket versioning enabled');
    } catch (err) {
      this.logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Failed to enable bucket versioning — version history will be unavailable',
      );
    }
  }
}
