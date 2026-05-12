import { PipeTransform, Injectable } from '@nestjs/common'

@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
