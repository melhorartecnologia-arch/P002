import * as Minio from 'minio';

export function createMinioClient(config?: {
  endPoint?: string;
  port?: number;
  accessKey?: string;
  secretKey?: string;
  useSSL?: boolean;
}): Minio.Client {
  return new Minio.Client({
    endPoint: config?.endPoint ?? process.env.MINIO_ENDPOINT ?? 'localhost',
    port: config?.port ?? parseInt(process.env.MINIO_PORT ?? '9000', 10),
    accessKey: config?.accessKey ?? process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: config?.secretKey ?? process.env.MINIO_SECRET_KEY ?? '',
    useSSL: config?.useSSL ?? process.env.MINIO_USE_SSL === 'true' ?? false,
  });
}

export class MinioStorage {
  constructor(
    private readonly client: Minio.Client,
    private readonly bucket: string,
  ) {}

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(
    path: string,
    data: Buffer | NodeJS.ReadableStream,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.client.putObject(this.bucket, path, data, undefined, metadata);
    return path;
  }

  async download(path: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getPresignedUrl(path: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, path, expirySeconds);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, path);
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string): Promise<void> {
    await this.client.removeObject(this.bucket, path);
  }

  async list(prefix: string): Promise<string[]> {
    const objects: string[] = [];
    const stream = this.client.listObjects(this.bucket, prefix, true);
    for await (const obj of stream) {
      if (obj.name) {
        objects.push(obj.name);
      }
    }
    return objects;
  }
}
