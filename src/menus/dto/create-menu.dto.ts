import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  @IsString()
  location?: string
}
