import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser = {
    id: 'user-id-123',
    username: 'testuser',
    password: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('15m') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should hash password with bcrypt and create user', async () => {
      usersService.findByUsername!.mockResolvedValue(null);
      usersService.create!.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');

      const result = await service.register({
        username: 'testuser',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith(
        'testuser',
        '$2b$10$hashedpassword',
      );
      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
    });

    it('should sign JWT with user id and username', async () => {
      usersService.findByUsername!.mockResolvedValue(null);
      usersService.create!.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.register({
        username: 'testuser',
        password: 'password123',
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-id-123', username: 'testuser' },
        { expiresIn: '15m' },
      );
    });

    it('should throw ConflictException for duplicate username', async () => {
      usersService.findByUsername!.mockResolvedValue(mockUser);

      await expect(
        service.register({ username: 'testuser', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return accessToken for valid credentials', async () => {
      usersService.findByUsername!.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByUsername!.mockResolvedValue(null);

      await expect(
        service.login({ username: 'ghost', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByUsername!.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'testuser', password: 'wrongpw' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return id and username without password', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-id-123');

      expect(result).toEqual({ id: 'user-id-123', username: 'testuser' });
      expect(result).not.toHaveProperty('password');
    });
  });
});
