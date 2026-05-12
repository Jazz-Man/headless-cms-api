import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

export enum SeoEntityType {
  CONTENT = 'content',
  TERM = 'term',
}

@Entity('seo_meta')
@Unique(['entityType', 'entityId'])
export class SeoMeta {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'entity_type', type: 'enum', enum: SeoEntityType })
  entityType: SeoEntityType

  @Column({ name: 'entity_id' })
  entityId: string

  @Column({ name: 'meta_title', length: '60', nullable: true })
  metaTitle: string

  @Column({ name: 'meta_description', length: '160', nullable: true })
  metaDescription: string

  @Column({ name: 'og_title', length: '100', nullable: true })
  ogTitle: string

  @Column({ name: 'og_description', length: '200', nullable: true })
  ogDescription: string

  @Column({ name: 'og_image', length: '500', nullable: true })
  ogImage: string

  @Column({ name: 'canonical_url', length: '500', nullable: true })
  canonicalUrl: string

  @Column({ name: 'robots_index', default: true })
  robotsIndex: boolean

  @Column({ name: 'robots_follow', default: true })
  robotsFollow: boolean

  @Column({ name: 'focus_keyword', length: '200', nullable: true })
  focusKeyword: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
