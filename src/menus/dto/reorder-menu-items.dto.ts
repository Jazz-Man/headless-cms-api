import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator'

class ReorderItem {
  @IsUUID()
  id: string

  @IsInt()
  sortOrder: number

  @IsOptional()
  @IsUUID()
  parentId?: string
}

export class ReorderMenuItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[]
}
