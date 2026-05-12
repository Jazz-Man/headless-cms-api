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
import { Menu } from './menu.entity'

export enum MenuItemType {
  CONTENT = 'content',
  TERM = 'term',
  CUSTOM = 'custom',
}

@Entity('menu_items')
@Index(['menuId', 'sortOrder'])
@Index(['parentId'])
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'menu_id' })
  menuId: string

  @ManyToOne('Menu', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu

  @Column({ name: 'parent_id', nullable: true })
  parentId: string

  @ManyToOne('MenuItem', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuItem

  @Column({ enum: MenuItemType, type: 'enum' })
  type: MenuItemType

  @Column({ name: 'target_id', nullable: true })
  targetId: string

  @Column({ nullable: true })
  url: string

  @Column()
  label: string

  @Column({ name: 'css_class', nullable: true })
  cssClass: string

  @Column({ default: '_self', name: 'target_attr' })
  targetAttr: string

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
