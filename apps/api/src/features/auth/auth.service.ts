import {
  AuthTokensInterface,
  LoginUserInterface,
  RefreshTokenInterface,
  RegisterUserInterface,
} from '@/common/interfaces';
import {
  SUPABASE_ADMIN,
  SUPABASE_ANON,
} from '@/common/modules/supabase.module';
import { Env, generateRefreshTime } from '@/common/utils';
import {
  ChangePasswordDto,
  CompleteProfileDto,
  ConfirmEmailDto,
  CreateUserDto,
  DeleteUserDto,
  ForgotPasswordDto,
  GoogleSignInDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInUserDto,
  SignOutUserDto,
  SupabaseSyncDto,
} from '@/features/auth/dto';
import { MailService } from '@/features/mail/mail.service';
import {
  ChangePasswordSuccessMail,
  ConfirmEmailSuccessMail,
  SignInSuccessMail,
} from '@/features/mail/templates';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env>,
    @Inject(SUPABASE_ADMIN)
    private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_ANON)
    private readonly supabaseAnon: SupabaseClient,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}

  private async getUserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      this.logger.error(
        { error: error.message, email },
        'Failed to query profile by email',
      );
      throw new InternalServerErrorException(
        'Database error while fetching user',
      );
    }

    if (!data) return null;

    const { data: authData, error: authError } =
      await this.supabase.auth.admin.getUserById(data.id);
    if (authError) {
      this.logger.error(
        { error: authError.message, userId: data.id },
        'Failed to fetch auth user by ID',
      );
      throw new InternalServerErrorException(
        'Failed to fetch user from auth provider',
      );
    }

    return authData.user;
  }

  private async getUserById(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error) {
      this.logger.error(
        { error: error.message, userId },
        'Failed to fetch auth user by ID',
      );
      throw new InternalServerErrorException(
        'Failed to fetch user from auth provider',
      );
    }
    return data.user;
  }

  async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokensInterface> {
    const payload = { id: userId, email, role };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('ACCESS_TOKEN_SECRET'),
        expiresIn: this.config.get('ACCESS_TOKEN_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.config.get('REFRESH_TOKEN_EXPIRATION'),
      }),
    ]);
    return { access_token, refresh_token };
  }

  async register(dto: CreateUserDto): Promise<RegisterUserInterface> {
    let authUser = await this.getUserByEmail(dto.email);

    if (authUser) {
      if (!authUser.email_confirmed_at) {
        const { error } = await this.supabaseAnon.auth.resend({
          type: 'signup',
          email: dto.email,
        });
        if (error) {
          this.logger.warn(
            { email: dto.email, error: error.message },
            'Failed to resend verification code',
          );
          throw new BadRequestException(
            'Failed to resend verification code. Please try again.',
          );
        }
        return { data: { id: authUser.id, email: dto.email } };
      }
      throw new BadRequestException(
        'Email already registered. Please sign in.',
      );
    }

    const { data: authData, error } = await this.supabase.auth.admin.createUser(
      {
        email: dto.email,
        password: dto.password,
        email_confirm: false,
      },
    );

    if (error) {
      this.logger.error(
        { error: error.message, email: dto.email },
        'Failed to create auth user',
      );
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists')
      ) {
        throw new BadRequestException(
          'Email already registered. Please sign in.',
        );
      }
      throw new BadRequestException(error.message);
    }

    const userId = authData.user.id;
    authUser = authData.user;

    const { error: profileError } = await this.supabase.from('profiles').upsert(
      {
        id: userId,
        email: dto.email,
        role: 'student',
        full_name: dto.full_name,
        date_of_birth: dto.date_of_birth,
        phone: dto.phone,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      this.logger.error(
        { profileError: profileError.message, userId },
        'Profile upsert failed, rolling back auth user',
      );
      await this.supabase.auth.admin.deleteUser(userId);
      throw new BadRequestException('Registration failed. Please try again.');
    }

    const { error: resendError } = await this.supabaseAnon.auth.resend({
      type: 'signup',
      email: dto.email,
    });

    if (resendError) {
      this.logger.warn(
        { resendError: resendError.message, email: dto.email },
        'Failed to trigger signup confirmation email',
      );
    }

    return { data: { id: userId, email: dto.email } };
  }

  async signIn(dto: SignInUserDto): Promise<LoginUserInterface> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: authUser.email!,
        password: dto.password,
      });

    if (signInError) {
      if (
        signInError.code === 'email_not_confirmed' ||
        signInError.message.includes('Email not confirmed')
      ) {
        throw new UnauthorizedException('EMAIL_NOT_CONFIRMED');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile)
      throw new NotFoundException('Profile not found');

    const { data: existingDevices } = await this.supabase
      .from('devices')
      .select('id, device_name, platform, last_active_at, created_at')
      .eq('user_id', authUser.id);

    const maxDevices = this.config.get<number>('MAX_DEVICES_PER_USER', 2);
    if ((existingDevices?.length ?? 0) >= maxDevices) {
      throw new BadRequestException({
        code: 'DEVICE_LIMIT_REACHED',
        message: `Max device limit reached (${maxDevices}). Remove a session to continue.`,
        sessions: existingDevices,
      });
    }

    const tokens = await this.generateTokens(
      authUser.id,
      authUser.email!,
      profile.role ?? 'student',
    );

    const { data: device } = await this.supabase
      .from('devices')
      .insert({
        user_id: authUser.id,
        device_fingerprint: tokens.refresh_token,
        device_name: dto.device_name ?? 'unknown',
        platform: 'web',
      })
      .select('id')
      .single();

    const session_refresh_time = await generateRefreshTime(
      this.config.get<number>('SESSION_TIMEOUT_DAYS', 3),
    );

    try {
      await this.mailService.sendEmail({
        to: [authUser.email!],
        subject: 'New sign-in detected',
        html: SignInSuccessMail({
          username: profile.full_name ?? profile.email,
          loginTime: new Date(),
          ipAddress: dto.ip ?? 'unknown',
          location: dto.location ?? 'unknown',
          device: dto.device_name ?? 'unknown',
        }),
      });
    } catch (mailError) {
      this.logger.warn({ mailError }, 'Mail delivery failed during sign-in');
    }

    return {
      data: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        session_token: device?.id ?? authUser.id,
        session_refresh_time,
      },
    };
  }

  async googleSignIn(dto: GoogleSignInDto): Promise<LoginUserInterface> {
    // Check if user exists by email
    let authUser = await this.getUserByEmail(dto.email);

    if (!authUser) {
      // Create new user in Supabase Auth
      const { data: authData, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        email_confirm: true, // Google emails are pre-verified
        user_metadata: {
          full_name: dto.name,
          avatar_url: dto.image,
          provider: 'google',
          provider_id: dto.sub,
        },
      });

      if (error) {
        this.logger.error(
          { error: error.message, email: dto.email },
          'Failed to create auth user for Google sign-in',
        );
        throw new BadRequestException(error.message);
      }

      authUser = authData.user;

      // Create profile with Google info
      const { error: profileError } = await this.supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: dto.email,
          role: 'student',
          full_name: dto.name,
          avatar_url: dto.image,
          phone: null,
          date_of_birth: null,
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        this.logger.error(
          { profileError: profileError.message, userId: authUser.id },
          'Profile upsert failed for Google sign-in, rolling back auth user',
        );
        await this.supabase.auth.admin.deleteUser(authUser.id);
        throw new BadRequestException('Google sign-in failed. Please try again.');
      }
    } else {
      // User exists, update profile with Google info if missing
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile && (!profile.full_name || !profile.avatar_url)) {
        await this.supabase.from('profiles').update({
          full_name: profile.full_name ?? dto.name,
          avatar_url: profile.avatar_url ?? dto.image,
        }).eq('id', authUser.id);
      }
    }

    // Get profile data
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check device limit
    const { data: existingDevices } = await this.supabase
      .from('devices')
      .select('id, device_name, platform, last_active_at, created_at')
      .eq('user_id', authUser.id);

    const maxDevices = this.config.get<number>('MAX_DEVICES_PER_USER', 2);
    if ((existingDevices?.length ?? 0) >= maxDevices) {
      throw new BadRequestException({
        code: 'DEVICE_LIMIT_REACHED',
        message: `Max device limit reached (${maxDevices}). Remove a session to continue.`,
        sessions: existingDevices,
      });
    }

    const deviceName = dto.device_info?.device_name ?? 'unknown';
    const tokens = await this.generateTokens(
      authUser.id,
      authUser.email!,
      profile.role ?? 'student',
    );

    const { data: device } = await this.supabase
      .from('devices')
      .insert({
        user_id: authUser.id,
        device_fingerprint: tokens.refresh_token,
        device_name: deviceName,
        platform: 'web',
      })
      .select('id')
      .single();

    const session_refresh_time = await generateRefreshTime(
      this.config.get<number>('SESSION_TIMEOUT_DAYS', 3),
    );

    try {
      await this.mailService.sendEmail({
        to: [authUser.email!],
        subject: 'New sign-in detected',
        html: SignInSuccessMail({
          username: profile.full_name ?? profile.email,
          loginTime: new Date(),
          ipAddress: dto.device_info?.platform ?? 'unknown',
          location: 'unknown',
          device: deviceName,
        }),
      });
    } catch (mailError) {
      this.logger.warn({ mailError }, 'Mail delivery failed during Google sign-in');
    }

    return {
      data: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        session_token: device?.id ?? authUser.id,
        session_refresh_time,
      },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({
        full_name: dto.full_name,
        date_of_birth: dto.date_of_birth,
        phone: dto.phone,
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(
        { error: error.message, userId },
        'Failed to complete profile',
      );
      throw new BadRequestException('Failed to update profile. Please try again.');
    }
  }

  async resendOtp(email: string): Promise<void> {
    const authUser = await this.getUserByEmail(email);
    if (!authUser) throw new NotFoundException('User not found');

    if (authUser.email_confirmed_at) {
      throw new BadRequestException(
        'Email is already confirmed. Please sign in.',
      );
    }

    const { error } = await this.supabaseAnon.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      this.logger.warn(
        { email, error: error.message },
        'Failed to resend verification code',
      );
      throw new BadRequestException(
        'Failed to resend verification code. Please try again.',
      );
    }
  }

  async confirmEmail(dto: ConfirmEmailDto): Promise<void> {
    const { error } = await this.supabaseAnon.auth.verifyOtp({
      email: dto.email,
      token: dto.token,
      type: 'signup',
    });

    if (error) {
      this.logger.error(
        { error: error.message, email: dto.email },
        'OTP verification failed',
      );
      throw new BadRequestException(
        'Invalid or expired OTP. Please request a new one.',
      );
    }

    const authUser = await this.getUserByEmail(dto.email);
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser?.id ?? '')
      .single();

    try {
      await this.mailService.sendEmail({
        to: [dto.email],
        subject: 'Confirmation Successful',
        html: ConfirmEmailSuccessMail({
          name: profile?.full_name ?? dto.email,
        }),
      });
    } catch (mailError) {
      this.logger.warn(
        { mailError },
        'Failed to send confirmation success email',
      );
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error } = await this.supabase.auth.resetPasswordForEmail(
      dto.identifier,
      {
        redirectTo: this.config.get('PASSWORD_RESET_REDIRECT_URL'),
      },
    );

    if (error) {
      this.logger.error(
        { error: error.message, email: dto.identifier },
        'Failed to send password reset email',
      );
      throw new BadRequestException(
        'Failed to send password reset email. Please try again.',
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error: verifyError } = await this.supabaseAnon.auth.verifyOtp({
      email: dto.identifier,
      token: dto.resetToken,
      type: 'recovery',
    });

    if (verifyError) {
      this.logger.warn(
        { email: dto.identifier, error: verifyError.message },
        'Password reset OTP verification failed',
      );
      throw new BadRequestException(
        'Invalid or expired reset code. Please request a new one.',
      );
    }

    const { error } = await this.supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: dto.newPassword,
      },
    );

    if (error) {
      this.logger.error(
        { error: error.message, userId: authUser.id },
        'Failed to update password',
      );
      throw new BadRequestException(
        'Failed to reset password. Please try again.',
      );
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    try {
      await this.mailService.sendEmail({
        to: [dto.identifier],
        subject: 'Password Reset Successful',
        html: ChangePasswordSuccessMail({
          name: profile?.full_name ?? dto.identifier,
        }),
      });
    } catch (mailError) {
      this.logger.warn(
        { mailError },
        'Failed to send password reset success email',
      );
    }
  }

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    if (!dto.identifier) throw new BadRequestException('Identifier is required');
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: authUser.email!,
        password: dto.password,
      });

    if (
      signInError &&
      signInError.code !== 'email_not_confirmed' &&
      !signInError.message.includes('Email not confirmed')
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const { error } = await this.supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: dto.newPassword,
      },
    );

    if (error) {
      this.logger.error(
        { error: error.message, userId: authUser.id },
        'Failed to change password',
      );
      throw new BadRequestException(
        'Failed to change password. Please try again.',
      );
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    try {
      await this.mailService.sendEmail({
        to: [authUser.email!],
        subject: 'Password Changed Successfully',
        html: ChangePasswordSuccessMail({
          name: profile?.full_name ?? authUser.email!,
        }),
      });
    } catch (mailError) {
      this.logger.warn(
        { mailError },
        'Failed to send password change success email',
      );
    }
  }

  async signOut(dto: SignOutUserDto): Promise<void> {
    const { error } = await this.supabase
      .from('devices')
      .delete()
      .eq('id', dto.session_token);
    if (error) throw new NotFoundException('Session not found');
  }

  async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenInterface> {
    const { data: userData, error } =
      await this.supabase.auth.admin.getUserById(dto.user_id);
    if (error || !userData.user) throw new NotFoundException('User not found');

    const { data: device } = await this.supabase
      .from('devices')
      .select('id')
      .eq('id', dto.session_token)
      .eq('user_id', dto.user_id)
      .maybeSingle();

    if (!device) throw new NotFoundException('Session not found');

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', dto.user_id)
      .single();

    const tokens = await this.generateTokens(
      userData.user.id,
      userData.user.email!,
      profile?.role ?? 'student',
    );

    await this.supabase
      .from('devices')
      .update({
        device_fingerprint: tokens.refresh_token,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', dto.session_token);

    const access_token_refresh_time = await generateRefreshTime();

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      session_token: dto.session_token,
      access_token_refresh_time,
    };
  }

  async getSessions(userId: string) {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      this.logger.error(
        { error: error.message, userId },
        'Failed to fetch sessions',
      );
      throw new InternalServerErrorException('Failed to fetch sessions');
    }

    return data ?? [];
  }

  async getSession(id: string) {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(
        { error: error.message, sessionId: id },
        'Failed to fetch session',
      );
      throw new InternalServerErrorException('Failed to fetch session');
    }

    if (!data) throw new NotFoundException('Session not found');
    return data;
  }

  async deleteAccount(dto: DeleteUserDto): Promise<void> {
    const { data, error } = await this.supabase.auth.admin.getUserById(
      dto.user_id,
    );
    if (error || !data.user) throw new NotFoundException('User not found');

    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: data.user.email!,
        password: dto.password,
      });

    if (
      signInError &&
      signInError.code !== 'email_not_confirmed' &&
      !signInError.message.includes('Email not confirmed')
    ) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.supabase.from('devices').delete().eq('user_id', dto.user_id);

    await this.supabase.from('courses').delete().eq('created_by', dto.user_id);
    await this.supabase
      .from('doubt_slots')
      .delete()
      .eq('created_by', dto.user_id);
    await this.supabase
      .from('sub_admin_permissions')
      .delete()
      .eq('granted_by', dto.user_id);

    const { error: profileError } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', dto.user_id);
    if (profileError) {
      this.logger.error(
        { error: profileError.message, userId: dto.user_id },
        'Failed to delete profile',
      );
      throw new BadRequestException(
        `Failed to delete user profile: ${profileError.message}`,
      );
    }

    const { error: deleteError } = await this.supabase.auth.admin.deleteUser(
      dto.user_id,
    );
    if (deleteError) {
      this.logger.error(
        { error: deleteError.message, userId: dto.user_id },
        'Failed to delete auth user',
      );
      throw new BadRequestException(
        `Failed to delete user: ${deleteError.message}`,
      );
    }
  }

  async supabaseSync(dto: SupabaseSyncDto): Promise<LoginUserInterface> {
    // Check if user exists by email
    let authUser = await this.getUserByEmail(dto.email);

    if (!authUser) {
      // Create new user in Supabase Auth (they already exist in Supabase Auth via OAuth)
      // We just need to create the profile
      const { data: supabaseUsers, error: listError } = await this.supabase.auth.admin.listUsers();
      if (listError) {
        throw new InternalServerErrorException('Failed to find user in Supabase Auth');
      }
      
      const foundUser = supabaseUsers.users.find(u => u.email === dto.email);
      
      if (!foundUser) {
        throw new NotFoundException('User not found in Supabase Auth');
      }
      authUser = foundUser;

      // Create profile with Supabase OAuth info
      const { error: profileError } = await this.supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: dto.email,
          role: 'student',
          full_name: dto.name,
          avatar_url: dto.avatar_url,
          phone: null,
          date_of_birth: null,
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        this.logger.error(
          { profileError: profileError.message, userId: authUser.id },
          'Profile upsert failed for Supabase sync',
        );
        throw new BadRequestException('Failed to create profile. Please try again.');
      }
    } else {
      // User exists, update profile with OAuth info if missing
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile && (!profile.full_name || !profile.avatar_url)) {
        await this.supabase.from('profiles').update({
          full_name: profile.full_name ?? dto.name,
          avatar_url: profile.avatar_url ?? dto.avatar_url,
        }).eq('id', authUser.id);
      }
    }

    // Get profile data
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check device limit
    const { data: existingDevices } = await this.supabase
      .from('devices')
      .select('id, device_name, platform, last_active_at, created_at')
      .eq('user_id', authUser.id);

    const maxDevices = this.config.get<number>('MAX_DEVICES_PER_USER', 2);
    if ((existingDevices?.length ?? 0) >= maxDevices) {
      throw new BadRequestException({
        code: 'DEVICE_LIMIT_REACHED',
        message: `Max device limit reached (${maxDevices}). Remove a session to continue.`,
        sessions: existingDevices,
      });
    }

    const tokens = await this.generateTokens(
      authUser.id,
      authUser.email!,
      profile.role ?? 'student',
    );

    const { data: device } = await this.supabase
      .from('devices')
      .insert({
        user_id: authUser.id,
        device_fingerprint: tokens.refresh_token,
        device_name: 'web',
        platform: 'web',
      })
      .select('id')
      .single();

    const session_refresh_time = await generateRefreshTime(
      this.config.get<number>('SESSION_TIMEOUT_DAYS', 3),
    );

    try {
      await this.mailService.sendEmail({
        to: [authUser.email!],
        subject: 'New sign-in detected',
        html: SignInSuccessMail({
          username: profile.full_name ?? profile.email,
          loginTime: new Date(),
          ipAddress: 'unknown',
          location: 'unknown',
          device: 'web',
        }),
      });
    } catch (mailError) {
      this.logger.warn({ mailError }, 'Mail delivery failed during Supabase sync sign-in');
    }

    return {
      data: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        session_token: device?.id ?? authUser.id,
        session_refresh_time,
      },
    };
  }
}
