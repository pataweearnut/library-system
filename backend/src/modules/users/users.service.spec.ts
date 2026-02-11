import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { Role } from '../../common/enums/role.enum';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: Role.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    usersRepo = module.get(getRepositoryToken(User));
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail(mockUser.email);
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('nope@example.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('hashes password and saves user', async () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        password: 'secret',
        role: Role.LIBRARIAN,
      };
      const created = { ...mockUser, ...dto, passwordHash: 'hashed' };
      usersRepo.create.mockReturnValue(created as User);
      usersRepo.save.mockResolvedValue(created as User);
      const result = await service.create(dto);
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(usersRepo.create).toHaveBeenCalledWith({
        email: dto.email,
        passwordHash: 'hashed',
        role: dto.role,
      });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('returns users ordered by createdAt DESC', async () => {
      usersRepo.find.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(usersRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('throws when user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing')).rejects.toThrow('User not found');
    });

    it('returns user when found', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('updates role when provided', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const updated = { ...mockUser, role: Role.ADMIN };
      usersRepo.save.mockResolvedValue(updated as User);
      const dto: UpdateUserDto = { role: Role.ADMIN };
      const result = await service.update(mockUser.id, dto);
      expect(mockUser.role).toBe(Role.ADMIN);
      expect(usersRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(updated);
    });

    it('does not change role when dto.role is undefined', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      usersRepo.save.mockResolvedValue(mockUser);
      const result = await service.update(mockUser.id, {});
      expect(usersRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });
});
