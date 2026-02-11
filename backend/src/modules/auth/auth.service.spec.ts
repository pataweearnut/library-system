import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Role } from '../../common/enums/role.enum';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashed',
    role: Role.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('nope@example.com', 'pass');
      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('nope@example.com');
    });

    it('returns null when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser(mockUser.email, 'wrong');
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong', mockUser.passwordHash);
    });

    it('returns user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser(mockUser.email, 'correct');
      expect(result).toEqual(mockUser);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct',
        mockUser.passwordHash,
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when credentials are invalid', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const dto: LoginDto = { email: 'nope@example.com', password: 'pass' };
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('throws when user exists but password wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const dto: LoginDto = { email: mockUser.email, password: 'wrong' };
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('returns access token when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const dto: LoginDto = { email: mockUser.email, password: 'secret' };
      const result = await service.login(dto);
      expect(result).toEqual({ accessToken: 'jwt-token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });
});
