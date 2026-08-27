import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '@app/common/guards/jwt-refresh.guard';
import { Public } from '@app/common/decorators/public.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ── POST /v1/auth/login ───────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Tokens de acceso y refresh' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos. Espera 1 minuto.' })
  async login(@Body() dto: LoginDto, @Req() req: { ip?: string }) {
    return this.authService.login(dto, req.ip);
  }

  // ── POST /v1/auth/refresh ─────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 30, ttl: 60_000 } })
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  async refresh(@Req() req: Express.Request & { user: { id: string; tokenId: string } }) {
    return this.authService.refresh(req.user.id, req.user.tokenId);
  }

  // ── GET /v1/auth/me ───────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdWithProfile(user.id);
  }

  // ── PATCH /v1/auth/me ─────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos del perfil' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ── PATCH /v1/auth/change-password ────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña' })
  @ApiResponse({ status: 204, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto);
  }

  // ── POST /v1/auth/forgot-password ─────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Siempre retorna 200 (no revela si el email existe).',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Si el correo existe, recibirás un enlace de recuperación.' };
  }

  // ── POST /v1/auth/reset-password ──────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  // ── DELETE /v1/auth/logout ────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión (invalida refresh token)' })
  async logout(@Req() req: Express.Request & { user: AuthenticatedUser }) {
    // El tokenId viene del claim `jti` del refresh token asociado a esta sesión.
    // En la práctica, el cliente debe enviar el refresh_token en el body.
    const user = req.user;
    await this.authService.logoutAll(user.id);
  }
}
