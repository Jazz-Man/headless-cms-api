import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Content } from './content.entity'
import { Term } from './term.entity'

@Entity('content_terms')
export class ContentTerm {
  @PrimaryColumn({ name: 'content_id' })
  contentId: string

  @PrimaryColumn({ name: 'term_id' })
  termId: string

  @ManyToOne('Content', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: Content

  @ManyToOne('Term', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'term_id' })
  term: Term
}
