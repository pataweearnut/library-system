import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/enums/role.enum';

@Entity()
@Index(['createdAt']) // for findAll() order: { createdAt: 'DESC' }
export class User extends BaseEntity {
  @Column({ unique: true }) // unique constraint creates an index on email (login, findByEmail)
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;
}
