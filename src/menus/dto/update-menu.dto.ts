import { IsOptional, IsString } from 'class-validator'

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  location?: string
}
