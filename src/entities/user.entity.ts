import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Role } from './role.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ name: 'password_hash' })
  passwordHash: string

  @Column({ name: 'display_name', nullable: true })
  displayName: string

  @Column({ default: 'viewer', length: 50 })
  role: string

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role', referencedColumnName: 'name' })
  roleEntity: Role

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
