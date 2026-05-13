import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Permission } from './permission.entity'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 50, unique: true })
  name: string

  @Column({ default: false, name: 'is_builtin' })
  isBuiltin: boolean

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    inverseJoinColumn: { name: 'permission_id' },
    joinColumn: { name: 'role_id' },
    name: 'role_permissions',
  })
  permissions: Permission[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
