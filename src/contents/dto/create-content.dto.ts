import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { UpsertSeoDto } from '../../seo/dto/upsert-seo.dto'

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsString()
  @IsNotEmpty()
  typeSlug: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  bodyJsonb?: Record<string, unknown>

  @IsOptional()
  @IsUUID('4', { each: true })
  termIds?: string[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertSeoDto)
  seo?: UpsertSeoDto
}
