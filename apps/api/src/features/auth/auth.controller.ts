import { Public } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';
import {
  MessageResponse,
  RefreshTokenResponse,
  SessionResponse,
  SessionsResponse,
  SignInResponse,
} from '@/common/interfaces';
import {
  ChangePasswordDto,
  CompleteProfileDto,
  ConfirmEmailDto,
  CreateUserDto,
  DeleteUserDto,
  ForgotPasswordDto,
  GoogleSignInDto,
  RefreshTokenDto,
  ResendOtpDto,
  ResetPasswordDto,
  SignInUserDto,
  SignOutUserDto,
  SupabaseSyncDto,
} from '@/features/auth/dto';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

/**
 * Controller for handling authentication and user account related endpoints.
 */
@Controller('auth')
export class AuthController {
  /**
   * Creates an instance of AuthController.
   *
   * @param {AuthService} authService - The authentication service.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user.
   *
   * @param {CreateUserDto} createUserDto - Data for creating a new user.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('sign-up')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<MessageResponse> {
    await this.authService.register(createUserDto);
    return { message: 'User registered successfully' };
  }

  /**
   * Signs in a user.
   *
   * @param {SignInUserDto} signInUserDto - User credentials for sign in.
   * @returns {Promise<SignInResponse>} Sign-in response with tokens and user data.
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('sign-in')
  async signIn(@Body() signInUserDto: SignInUserDto): Promise<SignInResponse> {
    const data = await this.authService.signIn(signInUserDto);
    return {
      message: 'User signed in successfully',
      data: data.data,
      tokens: data.tokens,
    };
  }

  /**
   * Signs in a user with Google OAuth.
   *
   * @param {GoogleSignInDto} dto - Google user info.
   * @returns {Promise<SignInResponse>} Sign-in response with tokens and user data.
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('google-sign-in')
  async googleSignIn(@Body() dto: GoogleSignInDto): Promise<SignInResponse> {
    const data = await this.authService.googleSignIn(dto);
    return {
      message: 'User signed in successfully',
      data: data.data,
      tokens: data.tokens,
    };
  }

  /**
   * Syncs user from Supabase Auth (after OAuth) with our backend.
   *
   * @param {SupabaseSyncDto} dto - Supabase user info.
   * @returns {Promise<SignInResponse>} Sign-in response with tokens and user data.
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('supabase-sync')
  async supabaseSync(@Body() dto: SupabaseSyncDto): Promise<SignInResponse> {
    const data = await this.authService.supabaseSync(dto);
    return {
      message: 'User synced successfully',
      data: data.data,
      tokens: data.tokens,
    };
  }

  /**
   * Completes the user profile after Google sign-in.
   *
   * @param {CompleteProfileDto} dto - Profile completion data.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Patch('complete-profile')
  async completeProfile(@Req() req: any, @Body() dto: CompleteProfileDto): Promise<MessageResponse> {
    await this.authService.completeProfile(req.user.id, dto);
    return { message: 'Profile completed successfully' };
  }

  /**
   * Signs out the user from the current session.
   *
   * @param {SignOutUserDto} signOutUserDto - Data for signing out.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Public()
  @Post('sign-out')
  async signOut(
    @Body() signOutUserDto: SignOutUserDto,
  ): Promise<MessageResponse> {
    await this.authService.signOut(signOutUserDto);
    return { message: 'User signed out successfully' };
  }

  /**
   * Retrieves all sessions for a user.
   *
   * @param {string} userId - ID of the user.
   * @returns {Promise<SessionsResponse>} List of user sessions.
   */
  @Get('sessions/:userId')
  async sessions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: any,
  ): Promise<SessionsResponse> {
    if (
      req.user.id !== userId &&
      (req.user.role ?? '').toUpperCase() !== 'ADMIN'
    ) {
      throw new ForbiddenException('Cannot access other users sessions');
    }
    const data = await this.authService.getSessions(userId);
    return { data };
  }

  /**
   * Retrieves a session by ID.
   *
   * @param {string} id - Session ID.
   * @returns {Promise<SessionResponse>} Session details.
   */
  @Get('session/:id')
  async session(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<SessionResponse> {
    const data = await this.authService.getSession(id);
    if (
      data.user_id !== req.user.id &&
      (req.user.role ?? '').toUpperCase() !== 'ADMIN'
    ) {
      throw new ForbiddenException('Cannot access this session');
    }
    return { data };
  }

  /**
   * Confirms the user's email.
   *
   * @param {ConfirmEmailDto} confirmEmailDto - Email confirmation data.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Public()
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto): Promise<MessageResponse> {
    await this.authService.resendOtp(dto.email);
    return { message: 'OTP sent successfully' };
  }

  @Public()
  @Patch('confirm-email')
  async confirmEmail(
    @Body() confirmEmailDto: ConfirmEmailDto,
  ): Promise<MessageResponse> {
    await this.authService.confirmEmail(confirmEmailDto);
    return { message: 'Email confirmed successfully' };
  }

  /**
   * Sends a password reset email.
   *
   * @param {ForgotPasswordDto} forgotPasswordDto - Data for password reset request.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Patch('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponse> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { message: 'Password reset token sent to your email' };
  }

  /**
   * Resets the user's password using a token.
   *
   * @param {ResetPasswordDto} dto - Data for resetting password.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Public()
  @Patch('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    await this.authService.resetPassword(dto);
    return { message: 'Password changed successfully' };
  }

  /**
   * Changes the user's password.
   *
   * @param {ChangePasswordDto} dto - Data for changing password.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Patch('change-password')
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponse> {
    await this.authService.changePassword({ ...dto, identifier: req.user.email });
    return { message: 'Password changed successfully' };
  }

  /**
   * Refreshes the access token using a refresh token.
   *
   * @param {RefreshTokenDto} dto - Data for refreshing the token.
   * @returns {Promise<RefreshTokenResponse>} Refresh token response.
   */
  @UseGuards(JwtRefreshGuard)
  @Patch('refresh-token')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    const data = await this.authService.refreshToken(dto);
    return {
      message: 'Refresh token generated successfully',
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      access_token_refresh_time: data.access_token_refresh_time,
      session_token: data.session_token,
    };
  }

  /**
   * Deletes the user account.
   *
   * @param {DeleteUserDto} deleteUserDto - Data for deleting the user.
   * @returns {Promise<MessageResponse>} Response message.
   */
  @Delete('delete-account')
  async deleteUser(
    @Body() deleteUserDto: DeleteUserDto,
  ): Promise<MessageResponse> {
    await this.authService.deleteAccount(deleteUserDto);
    return { message: 'User deleted successfully' };
  }
}
