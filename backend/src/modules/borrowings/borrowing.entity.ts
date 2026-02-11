import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';

@Entity()
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
