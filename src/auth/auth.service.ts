import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { RefreshToken } from '../entities/refresh-token.entity'
import { User } from '../entities/user.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: { email: string; password: string }) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated')
    }

    const tokens = await this.generateTokens(user)
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
        role: user.role,
      },
    }
  }

  async refresh(token: string) {
    const refreshToken = await this.findTokenByPlain(token)

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (refreshToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked')
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired')
    }

    refreshToken.isRevoked = true
    await this.refreshTokenRepo.save(refreshToken)

    const tokens = await this.generateTokens(refreshToken.user)
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  async logout(userId: string, token: string) {
    const refreshToken = await this.findTokenByPlain(token, userId)

    if (refreshToken) {
      refreshToken.isRevoked = true
      await this.refreshTokenRepo.save(refreshToken)
    }
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return {
      createdAt: user.createdAt,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      isActive: user.isActive,
      role: user.role,
    }
  }

  private async generateTokens(user: User) {
    const payload = { email: user.email, role: user.role, sub: user.id }

    const accessToken = this.jwtService.sign(payload)

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    )

    const rawRefreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiresIn as unknown as number,
      secret: refreshSecret,
    })

    const tokenHash = await this.hashToken(rawRefreshToken)

    const expiresAt = this.parseExpiry(refreshExpiresIn)

    const refreshToken = this.refreshTokenRepo.create({
      expiresAt,
      tokenHash,
      userId: user.id,
    })
    await this.refreshTokenRepo.save(refreshToken)

    return { accessToken, refreshToken: rawRefreshToken }
  }

  private async hashToken(token: string): Promise<string> {
    return await bcrypt.hash(token, 10)
  }

  private async findTokenByPlain(
    plainToken: string,
    userId?: string,
  ): Promise<RefreshToken | null> {
    const payload = this.jwtService.decode(plainToken) as {
      sub?: string
    } | null
    if (!payload?.sub) {
      return null
    }

    const queryUserId = userId ?? payload.sub

    const tokens = await this.refreshTokenRepo.find({
      relations: ['user'],
      where: { userId: queryUserId },
    })

    for (const t of tokens) {
      if (await bcrypt.compare(plainToken, t.tokenHash)) {
        return t
      }
    }

    return null
  }

  private parseExpiry(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    const value = Number.parseInt(match[1], 10)
    const unit = match[2]

    const ms: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    }

    return new Date(Date.now() + value * (ms[unit] ?? ms.d))
  }
}
