import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { ContentStatus } from '../../entities/content.entity'
import { UpsertSeoDto } from '../../seo/dto/upsert-seo.dto'

export enum BulkContentAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export class BulkCreateItemDto {
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

export class BulkUpdateItemDto {
  @IsUUID()
  id: string

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

export class BulkDeleteItemDto {
  @IsUUID()
  id: string
}

export class BulkContentsDto {
  @IsEnum(BulkContentAction)
  action: BulkContentAction

  @IsArray()
  @ValidateNested({ each: true })
  @Type((options) => {
    const dto = options?.object as BulkContentsDto
    if (dto?.action === BulkContentAction.CREATE) return BulkCreateItemDto
    if (dto?.action === BulkContentAction.UPDATE) return BulkUpdateItemDto
    if (dto?.action === BulkContentAction.DELETE) return BulkDeleteItemDto
    return BulkCreateItemDto
  })
  items: BulkCreateItemDto[] | BulkUpdateItemDto[] | BulkDeleteItemDto[]
}
