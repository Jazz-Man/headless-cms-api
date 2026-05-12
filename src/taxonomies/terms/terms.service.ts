import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, TreeRepository } from 'typeorm'
import { Term } from '../../entities/term.entity'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term)
    private readonly repo: TreeRepository<Term>,
  ) {}

  async create(taxonomyId: string, dto: CreateTermDto): Promise<Term> {
    const existing = await this.repo.findOne({
      where: { slug: dto.slug, taxonomyId },
    })
    if (existing) {
      throw new ConflictException(
        `Term with slug "${dto.slug}" already exists in this taxonomy`,
      )
    }

    const term = this.repo.create({ ...dto, taxonomyId })
    return this.repo.save(term)
  }

  async findFlat(taxonomyId: string): Promise<Term[]> {
    return await this.repo.find({
      order: { name: 'ASC', sortOrder: 'ASC' },
      where: { taxonomyId },
    })
  }

  async findTree(taxonomyId: string): Promise<Term[]> {
    const roots = await this.repo.findRoots()
    const filtered = roots.filter((t) => t.taxonomyId === taxonomyId)

    return Promise.all(
      filtered.map((term) => this.repo.findDescendantsTree(term)),
    )
  }

  async findOne(taxonomyId: string, slug: string): Promise<Term> {
    const term = await this.repo.findOne({ where: { slug, taxonomyId } })
    if (!term) {
      throw new NotFoundException(`Term "${slug}" not found in this taxonomy`)
    }
    return term
  }

  async update(
    taxonomyId: string,
    slug: string,
    dto: UpdateTermDto,
  ): Promise<Term> {
    const term = await this.findOne(taxonomyId, slug)
    Object.assign(term, dto)
    return this.repo.save(term)
  }

  async remove(taxonomyId: string, slug: string): Promise<void> {
    const term = await this.findOne(taxonomyId, slug)
    await this.repo.remove(term)
  }
}
