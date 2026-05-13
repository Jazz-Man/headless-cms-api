import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { CreateWebhookDto } from './dto/create-webhook.dto'
import { UpdateWebhookDto } from './dto/update-webhook.dto'
import { WebhooksService } from './webhooks.service'

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Roles(UserRole.ADMIN)
  @Post()
  // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard
  create(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.service.create(req.user.id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.update(id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id)
    return { message: `Webhook ${id} deleted` }
  }
}
