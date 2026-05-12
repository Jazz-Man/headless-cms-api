import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IStorageProvider } from './storage.interface'

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly uploadDir: string

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads')
  }

  async upload(
    file: Buffer,
    key: string,
    _contentType: string,
  ): Promise<string> {
    const fullPath = path.join(this.uploadDir, key)
    const dir = path.dirname(fullPath)

    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, file)

    return key
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(fullPath)
    } catch {
      // silently ignore — file may already be gone
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`
  }
}
