import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Content } from './content.entity'

@Entity('content_types')
export class ContentType {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ name: 'schema_jsonb', type: 'jsonb', default: '{}' })
  schemaJsonb: Record<string, unknown>

  @Column({ name: 'is_builtin', default: false })
  isBuiltin: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany('Content', 'contentType')
  contents: Content[]
}
