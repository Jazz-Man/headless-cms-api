import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class BulkTermItemDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  parentId?: string
}

export class BulkTermsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTermItemDto)
  items: BulkTermItemDto[]
}
