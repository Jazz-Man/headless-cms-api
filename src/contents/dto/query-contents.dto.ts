import { Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ContentStatus } from '../../entities/content.entity'

export class QueryContentsDto {
  @Type(() => Number)
  @IsOptional()
  page?: number = 1

  @Type(() => Number)
  @IsOptional()
  limit?: number = 20

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus

  @IsOptional()
  @IsString()
  taxonomy?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  sort?: string = '-publishedAt'
}
