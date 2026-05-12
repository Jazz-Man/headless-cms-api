import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MenuItem } from './menu-item.entity'

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ nullable: true })
  location: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany('MenuItem', 'menu')
  items: MenuItem[]
}
