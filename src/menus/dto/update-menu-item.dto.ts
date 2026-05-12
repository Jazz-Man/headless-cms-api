import { IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  url?: string

  @IsOptional()
  @IsString()
  cssClass?: string

  @IsOptional()
  @IsString()
  targetAttr?: string

  @IsOptional()
  @IsUUID()
  parentId?: string
}
