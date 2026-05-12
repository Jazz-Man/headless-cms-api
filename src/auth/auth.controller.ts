import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Public } from '../common/decorators/public.decorator'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.login(dto)

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
    })

    return {
      accessToken: result.accessToken,
      user: result.user,
    }
  }

  @Public()
  @Post('refresh')
  async refresh(
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Req() req: any,
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Res({ passthrough: true }) res: any,
  ) {
    const token = req.cookies?.refresh_token
    if (!token) {
      throw new Error('No refresh token provided')
    }

    const result = await this.authService.refresh(token)

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
    })

    return { accessToken: result.accessToken }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Req() req: any,
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Res({ passthrough: true }) res: any,
  ) {
    const token = req.cookies?.refresh_token
    const userId = req.user?.id

    if (token) {
      await this.authService.logout(userId, token)
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
    })
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(
    // biome-ignore lint/suspicious/noExplicitAny: TS1272 requires no type annotation with isolatedModules+emitDecoratorMetadata
    @Req() req: any,
  ) {
    const userId = req.user?.id
    return await this.authService.me(userId)
  }
}
