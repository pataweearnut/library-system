import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity()
@Index(['createdAt']) // for findAllFromDb order and pagination
@Index(['title']) // for search ILIKE on title
@Index(['author']) // for search ILIKE on author
export class Book extends BaseEntity {
  @Column({ length: 500 })
  title: string;

  @Column({ length: 300 })
  author: string;

  @Column({ unique: true, length: 20 }) // unique creates index (ensureIsbnUnique, create, update)
  isbn: string;

  @Column({ type: 'int4' })
  publicationYear: number;

  @Column({ type: 'int4', default: 0 })
  totalQuantity: number;

  @Column({ type: 'int4', default: 0 })
  availableQuantity: number;

  @Column({ nullable: true, length: 2048 }) // URLs or long paths
  coverImagePath?: string;
}
