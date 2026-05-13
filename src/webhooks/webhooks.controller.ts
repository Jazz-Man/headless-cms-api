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
import { Permissions } from '../common/decorators/permissions.decorator'
import { CreateWebhookDto } from './dto/create-webhook.dto'
import { UpdateWebhookDto } from './dto/update-webhook.dto'
import { WebhooksService } from './webhooks.service'

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Permissions('webhooks:manage')
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Permissions('webhooks:manage')
  @Post()
  // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard
  create(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.service.create(req.user.id, dto)
  }

  @Permissions('webhooks:manage')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.update(id, dto)
  }

  @Permissions('webhooks:manage')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id)
    return { message: `Webhook ${id} deleted` }
  }
}
