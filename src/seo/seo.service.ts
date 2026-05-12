import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SeoEntityType, SeoMeta } from '../entities/seo-meta.entity'
import { UpsertSeoDto } from './dto/upsert-seo.dto'

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoMeta)
    private readonly repo: Repository<SeoMeta>,
  ) {}

  async upsert(
    entityType: SeoEntityType,
    entityId: string,
    dto: UpsertSeoDto,
  ): Promise<SeoMeta | null> {
    const hasValues = Object.values(dto).some(
      (v) => v !== undefined && v !== null,
    )
    if (!hasValues) return null

    let seo = await this.repo.findOne({ where: { entityId, entityType } })
    if (!seo) {
      seo = this.repo.create({ entityId, entityType })
    }
    Object.assign(seo, dto)
    return this.repo.save(seo)
  }

  find(entityType: SeoEntityType, entityId: string): Promise<SeoMeta | null> {
    return this.repo.findOne({ where: { entityId, entityType } })
  }

  async remove(entityType: SeoEntityType, entityId: string): Promise<void> {
    await this.repo.delete({ entityId, entityType })
  }
}
