import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Webhook } from '../entities/webhook.entity'
import { WebhooksController } from './webhooks.controller'
import { WebhooksService } from './webhooks.service'

@Module({
  controllers: [WebhooksController],
  exports: [WebhooksService],
  imports: [TypeOrmModule.forFeature([Webhook])],
  providers: [WebhooksService],
})
export class WebhooksModule {}
