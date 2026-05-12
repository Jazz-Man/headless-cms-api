export const STORAGE_PROVIDER = 'IStorageProvider'

export interface IStorageProvider {
  delete(key: string): Promise<void>
  getUrl(key: string): string
  upload(file: Buffer, key: string, contentType: string): Promise<string>
}
