import { IsOptional, IsString } from 'class-validator'

export class UpdateContentTypeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  schemaJsonb?: Record<string, unknown>
}
