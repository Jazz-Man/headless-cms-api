import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IStorageProvider } from './storage.interface'

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicUrl: string | undefined

  constructor(private readonly configService: ConfigService) {
    const endpoint = configService.get<string>('S3_ENDPOINT')
    const region = configService.get<string>('S3_REGION', 'us-east-1')

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
      region,
      ...(endpoint ? { endpoint } : {}),
    })

    this.bucket = configService.getOrThrow<string>('S3_BUCKET')
    this.publicUrl = configService.get<string>('S3_PUBLIC_URL')
  }

  async upload(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Body: file,
        Bucket: this.bucket,
        ContentType: contentType,
        Key: key,
      }),
    )

    return key
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      )
    } catch {
      // silently ignore — object may already be gone
    }
  }

  getUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`
    }

    const region = this.configService.get<string>('S3_REGION', 'us-east-1')
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`
  }
}
