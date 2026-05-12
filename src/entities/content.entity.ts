import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ContentType } from './content-type.entity'
import { User } from './user.entity'

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('contents')
@Index(['slug', 'typeId'], { unique: true })
@Index(['status', 'publishedAt'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'type_id' })
  typeId: string

  @ManyToOne('ContentType', 'contents')
  @JoinColumn({ name: 'type_id' })
  contentType: ContentType

  @Column()
  title: string

  @Column({ unique: false })
  slug: string

  @Column({ type: 'text', nullable: true })
  excerpt: string

  @Column({ name: 'body_jsonb', type: 'jsonb', nullable: true })
  bodyJsonb: Record<string, unknown>

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus

  @Column({ name: 'author_id', nullable: true })
  authorId: string

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author: User

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
