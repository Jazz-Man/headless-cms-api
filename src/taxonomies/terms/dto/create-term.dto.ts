import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateTermDto {
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
