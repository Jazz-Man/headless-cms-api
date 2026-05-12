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

  @Column({ enum: SeoEntityType, name: 'entity_type', type: 'enum' })
  entityType: SeoEntityType

  @Column({ name: 'entity_id' })
  entityId: string

  @Column({ length: '60', name: 'meta_title', nullable: true })
  metaTitle: string

  @Column({ length: '160', name: 'meta_description', nullable: true })
  metaDescription: string

  @Column({ length: '100', name: 'og_title', nullable: true })
  ogTitle: string

  @Column({ length: '200', name: 'og_description', nullable: true })
  ogDescription: string

  @Column({ length: '500', name: 'og_image', nullable: true })
  ogImage: string

  @Column({ length: '500', name: 'canonical_url', nullable: true })
  canonicalUrl: string

  @Column({ default: true, name: 'robots_index' })
  robotsIndex: boolean

  @Column({ default: true, name: 'robots_follow' })
  robotsFollow: boolean

  @Column({ length: '200', name: 'focus_keyword', nullable: true })
  focusKeyword: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
