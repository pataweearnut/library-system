import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/enums/role.enum';

@Entity()
@Index(['createdAt']) // for findAll() order: { createdAt: 'DESC' }
export class User extends BaseEntity {
  @Column({ unique: true, length: 255 }) // unique constraint creates an index on email (login, findByEmail)
  email: string;

  @Column({ length: 255 }) // bcrypt hashes are 60; 255 allows other algorithms
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;
}
