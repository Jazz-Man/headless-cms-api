import { createHmac } from 'node:crypto'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { Webhook } from '../entities/webhook.entity'
import { CreateWebhookDto, VALID_EVENTS } from './dto/create-webhook.dto'
import { UpdateWebhookDto } from './dto/update-webhook.dto'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  async create(userId: string, dto: CreateWebhookDto): Promise<Webhook> {
    this.validateEvents(dto.events)

    const webhook = this.webhookRepo.create({
      createdById: userId,
      events: dto.events,
      isActive: dto.isActive ?? true,
      secret: uuidv4(),
      url: dto.url,
    })

    return await this.webhookRepo.save(webhook)
  }

  async findAll(): Promise<Webhook[]> {
    return await this.webhookRepo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepo.findOne({ where: { id } })
    if (!webhook) {
      throw new NotFoundException(`Webhook with id "${id}" not found`)
    }
    return webhook
  }

  async update(id: string, dto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(id)

    if (dto.events) {
      this.validateEvents(dto.events)
    }

    Object.assign(webhook, {
      ...(dto.url !== undefined && { url: dto.url }),
      ...(dto.events !== undefined && { events: dto.events }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    })

    return await this.webhookRepo.save(webhook)
  }

  async remove(id: string): Promise<void> {
    const webhook = await this.findOne(id)
    await this.webhookRepo.remove(webhook)
  }

  async fireEvent(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.webhookRepo.find({
      where: { isActive: true },
    })

    const matching = webhooks.filter((w) => w.events.includes(event))

    if (matching.length === 0) return

    const results = await Promise.allSettled(
      matching.map((webhook) => this.deliver(webhook, event, payload)),
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Webhook delivery failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        )
      }
    }
  }

  private async deliver(
    webhook: Webhook,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify({
      data: payload,
      event,
      timestamp: new Date().toISOString(),
    })

    const signature = createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex')

    try {
      const response = await fetch(webhook.url, {
        body,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': `sha256=${signature}`,
        },
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        throw new Error(`Webhook ${webhook.id} returned ${response.status}`)
      }

      this.logger.log(
        `Webhook ${webhook.id} delivered event "${event}" successfully`,
      )
    } catch (error) {
      this.logger.warn(
        `Webhook ${webhook.id} delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  private validateEvents(events: string[]): void {
    const invalid = events.filter((e) => !VALID_EVENTS.includes(e))
    if (invalid.length > 0) {
      throw new NotFoundException(
        `Invalid events: ${invalid.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
      )
    }
  }
}
