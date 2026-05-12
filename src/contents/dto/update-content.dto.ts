import { Type } from 'class-transformer'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { ContentStatus } from '../../entities/content.entity'
import { UpsertSeoDto } from '../../seo/dto/upsert-seo.dto'

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  bodyJsonb?: Record<string, unknown>

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus

  @IsOptional()
  @IsUUID('4', { each: true })
  termIds?: string[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertSeoDto)
  seo?: UpsertSeoDto
}
