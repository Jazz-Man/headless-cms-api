import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Content } from './content.entity'
import { User } from './user.entity'

@Entity('revisions')
export class Revision {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>

  @Column({ name: 'revision_number', type: 'int' })
  revisionNumber: number

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: Content

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
