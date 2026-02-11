import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity()
@Index(['createdAt']) // for findAllFromDb order and pagination
@Index(['title']) // for search ILIKE on title
@Index(['author']) // for search ILIKE on author
export class Book extends BaseEntity {
  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ unique: true }) // unique creates index (ensureIsbnUnique, create, update)
  isbn: string;

  @Column()
  publicationYear: number;

  @Column({ default: 0 })
  totalQuantity: number;

  @Column({ default: 0 })
  availableQuantity: number;

  @Column({ nullable: true })
  coverImagePath?: string;
}
