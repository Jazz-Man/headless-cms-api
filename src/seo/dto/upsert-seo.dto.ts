import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpsertSeoDto {
  @IsOptional()
  @IsString()
  metaTitle?: string

  @IsOptional()
  @IsString()
  metaDescription?: string

  @IsOptional()
  @IsString()
  ogTitle?: string

  @IsOptional()
  @IsString()
  ogDescription?: string

  @IsOptional()
  @IsString()
  ogImage?: string

  @IsOptional()
  @IsString()
  canonicalUrl?: string

  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean

  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean

  @IsOptional()
  @IsString()
  focusKeyword?: string
}
