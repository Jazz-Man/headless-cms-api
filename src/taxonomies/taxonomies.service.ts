import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Taxonomy } from '../entities/taxonomy.entity'
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto'
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto'

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private readonly repo: Repository<Taxonomy>,
  ) {}

  async create(dto: CreateTaxonomyDto): Promise<Taxonomy> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(
        `Taxonomy with slug "${dto.slug}" already exists`,
      )
    }

    const taxonomy = this.repo.create(dto)
    return this.repo.save(taxonomy)
  }

  async findAll(): Promise<Taxonomy[]> {
    return await this.repo.find({ order: { name: 'ASC' } })
  }

  async findOne(slug: string): Promise<Taxonomy> {
    const taxonomy = await this.repo.findOne({ where: { slug } })
    if (!taxonomy) {
      throw new NotFoundException(`Taxonomy "${slug}" not found`)
    }
    return taxonomy
  }

  async update(slug: string, dto: UpdateTaxonomyDto): Promise<Taxonomy> {
    const taxonomy = await this.findOne(slug)
    Object.assign(taxonomy, dto)
    return this.repo.save(taxonomy)
  }

  async remove(slug: string): Promise<void> {
    const taxonomy = await this.findOne(slug)
    await this.repo.remove(taxonomy)
  }
}
