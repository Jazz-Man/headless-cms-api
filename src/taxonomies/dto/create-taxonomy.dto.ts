import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { TaxonomyType } from '../../entities/taxonomy.entity'

export class CreateTaxonomyDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsEnum(TaxonomyType)
  type: TaxonomyType
}
