import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 100, unique: true })
  name: string

  @Column({ nullable: true })
  description: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
