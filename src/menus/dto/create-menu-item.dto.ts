import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'
import { MenuItemType } from '../../entities/menu-item.entity'

export class CreateMenuItemDto {
  @IsEnum(MenuItemType)
  type: MenuItemType

  @IsOptional()
  @IsUUID()
  targetId?: string

  @IsOptional()
  @IsString()
  url?: string

  @IsString()
  @IsNotEmpty()
  label: string

  @IsOptional()
  @IsUUID()
  parentId?: string

  @IsOptional()
  @IsString()
  cssClass?: string

  @IsOptional()
  @IsString()
  targetAttr?: string
}
