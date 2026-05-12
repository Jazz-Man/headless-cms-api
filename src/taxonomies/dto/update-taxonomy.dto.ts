import { IsOptional, IsString } from 'class-validator'

export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  name?: string
}
