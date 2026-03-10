import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.username, hashedPassword);

    const payload = { sub: user.id, username: user.username };
    const expiresIn =
      this.configService.get<string>('JWT_EXPIRATION') ?? '15m';
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: expiresIn as any,
    });

    return { accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };
    const expiresIn =
      this.configService.get<string>('JWT_EXPIRATION') ?? '15m';
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: expiresIn as any,
    });

    return { accessToken };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return { id: user!.id, username: user!.username };
  }
}
