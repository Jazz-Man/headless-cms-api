import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm'
import { Taxonomy } from './taxonomy.entity'

@Entity('terms')
@Tree('materialized-path')
@Index(['slug', 'taxonomyId'], { unique: true })
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'taxonomy_id' })
  taxonomyId: string

  @ManyToOne('Taxonomy', 'terms')
  @JoinColumn({ name: 'taxonomy_id' })
  taxonomy: Taxonomy

  @Column()
  name: string

  @Column()
  slug: string

  @Column({ nullable: true, type: 'text' })
  description: string

  @Column({ name: 'parent_id', nullable: true })
  parentId: string

  @ManyToOne('Term')
  @JoinColumn({ name: 'parent_id' })
  @TreeParent()
  parent: Term

  @OneToMany('Term', 'parent')
  @TreeChildren()
  children: Term[]

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
