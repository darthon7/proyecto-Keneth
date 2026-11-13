import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import {
  type AuthResponse,
  type SafeUser,
  sanitizeUser,
} from './auth.types.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.util.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        username: true,
        countryCode: true,
        isActive: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { valid, needsRehash } = await verifyPassword(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Cuenta de usuario inactiva');
    }

    if (needsRehash) {
      user.password = await hashPassword(password);
      await this.userRepository.save(user);
    }

    const accessToken = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: sanitizeUser(user),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await hashPassword(registerDto.password);
    const newUser = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      username: registerDto.username.trim(),
      countryCode: registerDto.countryCode ?? 'MX',
      isActive: true,
      role: UserRole.CUSTOMER,
    });

    const savedUser = await this.userRepository.save(newUser);
    const accessToken = this.tokenService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    });

    return {
      accessToken,
      user: sanitizeUser(savedUser),
    };
  }

  async getProfile(userId: number): Promise<SafeUser> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Cuenta de usuario inactiva');
    }

    return sanitizeUser(user);
  }
}

