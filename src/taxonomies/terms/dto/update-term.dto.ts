import { IsOptional, IsString } from 'class-validator'

export class UpdateTermDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  parentId?: string
}
