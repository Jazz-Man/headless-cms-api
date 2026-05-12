import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  filename: string

  @Column({ name: 'original_name' })
  originalName: string

  @Column({ name: 'mime_type' })
  mimeType: string

  @Column({ name: 'size_bytes' })
  sizeBytes: number

  @Column()
  path: string

  @Column({ name: 'alt_text', nullable: true })
  altText: string

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string

  @ManyToOne('User')
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
