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

  @Column({ nullable: true, type: 'text' })
  excerpt: string

  @Column({ name: 'body_jsonb', nullable: true, type: 'jsonb' })
  bodyJsonb: Record<string, unknown>

  @Column({
    default: ContentStatus.DRAFT,
    enum: ContentStatus,
    type: 'enum',
  })
  status: ContentStatus

  @Column({ name: 'author_id', nullable: true })
  authorId: string

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author: User

  @Column({ name: 'published_at', nullable: true, type: 'timestamptz' })
  publishedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
