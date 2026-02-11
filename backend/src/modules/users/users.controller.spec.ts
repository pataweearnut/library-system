import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Role } from '../../common/enums/role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: Role.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UsersController);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('returns users without passwordHash', async () => {
      usersService.findAll.mockResolvedValue([mockUser]);
      const result = await controller.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findOne', () => {
    it('returns safe user by id', async () => {
      usersService.findOne.mockResolvedValue(mockUser);
      const result = await controller.findOne('user-1');
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });
  });

  describe('create', () => {
    it('creates user and returns safe shape', async () => {
      usersService.create.mockResolvedValue(mockUser);
      const dto = {
        email: 'new@example.com',
        password: 'secret',
        role: Role.LIBRARIAN,
      };
      const result = await controller.create(dto as any);
      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('update', () => {
    it('updates user and returns safe shape', async () => {
      const updated = { ...mockUser, role: Role.ADMIN };
      usersService.update.mockResolvedValue(updated as User);
      const result = await controller.update('user-1', { role: Role.ADMIN });
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        role: Role.ADMIN,
      });
      expect(result.role).toBe(Role.ADMIN);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
