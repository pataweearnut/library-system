import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';

@Entity()
@Index(['book', 'borrowedAt']) // historyForBook: where bookId, order by borrowedAt DESC
@Index(['user', 'book', 'returnedAt']) // myActiveBorrowingsForBook: filter by user, book, returnedAt IS NULL
export class Borrowing extends BaseEntity {
  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Book, { eager: true })
  book: Book;

  @Column()
  borrowedAt: Date;

  @Column({ nullable: true })
  returnedAt?: Date;
}
