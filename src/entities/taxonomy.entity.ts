import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Term } from './term.entity'

export enum TaxonomyType {
  HIERARCHICAL = 'hierarchical',
  FLAT = 'flat',
}

@Entity('taxonomies')
export class Taxonomy {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: TaxonomyType })
  type: TaxonomyType

  @Column({ name: 'is_builtin', default: false })
  isBuiltin: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany('Term', 'taxonomy')
  terms: Term[]
}
