import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  url: string

  @Column({ type: 'simple-array' })
  events: string[]

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @Column()
  secret: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User

  @Column({ name: 'created_by' })
  createdById: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
