import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

interface JwtPayload {
  email: string
  permissions: string[]
  role: string
  sub: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    })
  }

  validate(payload: JwtPayload) {
    return {
      email: payload.email,
      id: payload.sub,
      permissions: payload.permissions,
      role: payload.role,
    }
  }
}
