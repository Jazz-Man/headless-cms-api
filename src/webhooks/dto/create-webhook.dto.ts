import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator'

const VALID_EVENTS = [
  'content.created',
  'content.published',
  'content.updated',
  'content.deleted',
]

export class CreateWebhookDto {
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsNotEmpty()
  url: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  events: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export { VALID_EVENTS }
