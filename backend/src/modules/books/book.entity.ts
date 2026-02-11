import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity()
export class Book extends BaseEntity {
  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ unique: true })
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
