import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateContentTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  schemaJsonb?: Record<string, unknown>
}
