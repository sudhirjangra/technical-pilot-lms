import {
  AuthTokensInterface,
  LoginUserInterface,
  RefreshTokenInterface,
  RegisterUserInterface,
} from '@/common/interfaces';
import { SUPABASE_ADMIN, SUPABASE_ANON } from '@/common/modules/supabase.module';
import { Env, generateRefreshTime } from '@/common/utils';
import {
  ChangePasswordDto,
  ConfirmEmailDto,
  CreateUserDto,
  DeleteUserDto,
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInUserDto,
  SignOutAllDeviceUserDto,
  SignOutUserDto,
} from '@/features/auth/dto';
import { MailService } from '@/features/mail/mail.service';
import {
  ChangePasswordSuccessMail,
  ConfirmEmailSuccessMail,
  RegisterSuccessMail,
  ResetPasswordMail,
  SignInSuccessMail,
} from '@/features/mail/templates';
import {
  BadRequestException,
  Inject,
  Injectable,
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
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.getUserById(data.id);
    if (authError) throw new Error(authError.message);
    return authData.user;
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
    const { data: authData, error } = await this.supabase.auth.admin.createUser(
      {
        email: dto.email,
        password: dto.password,
        email_confirm: false,
      },
    );
    if (error) {
      if (error.message.includes('already'))
        throw new BadRequestException('Email already exists.');
      throw new BadRequestException(error.message);
    }

    const userId = authData.user.id;
    const { error: profileError } = await this.supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: dto.email,
          role: 'student',
          full_name: dto.email.split('@')[0],
        },
        { onConflict: 'id' },
      );
    if (profileError) {
      this.logger.error({ profileError }, 'Profile upsert failed');
      await this.supabase.auth.admin.deleteUser(userId);
      throw new BadRequestException('Registration failed.');
    }

    // Generate OTP for email verification using magiclink type (works for existing users)
    const { data: linkData, error: linkError } =
      await this.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: dto.email,
      });
    if (linkError) {
      this.logger.warn({ linkError }, 'Failed to generate OTP link');
    }

    const otp = linkData?.properties?.email_otp ?? '';

    try {
      await this.mailService.sendEmail({
        to: [dto.email],
        subject: 'Confirm your email',
        html: RegisterSuccessMail({ name: dto.email.split('@')[0], otp }),
      });
    } catch (mailError) {
      this.logger.warn(
        { mailError },
        'Mail delivery failed during registration',
      );
    }

    return { data: { id: userId, email: dto.email } };
  }

  async signIn(dto: SignInUserDto): Promise<LoginUserInterface> {
    const emailToUse = dto.identifier;
    const authUser = await this.getUserByEmail(emailToUse);
    if (!authUser) throw new NotFoundException('User not found');

    // Verify password using anon client
    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: authUser.email!,
        password: dto.password,
      });

    // If error is NOT "Email not confirmed", password is wrong
    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
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

    // Check device limit — return sessions if limit reached
    const { data: existingDevices } = await this.supabase
      .from('devices')
      .select('id, device_name, platform, last_active_at, created_at')
      .eq('user_id', authUser.id);

    if ((existingDevices?.length ?? 0) >= 2) {
      throw new BadRequestException({
        code: 'DEVICE_LIMIT_REACHED',
        message: 'Max device limit reached (2). Remove a session to continue.',
        sessions: existingDevices,
      });
    }

    const tokens = await this.generateTokens(authUser.id, authUser.email!, profile.role ?? 'student');

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

    const session_refresh_time = await generateRefreshTime();

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

  async resendOtp(email: string): Promise<void> {
    const authUser = await this.getUserByEmail(email);
    if (!authUser) throw new NotFoundException('User not found');

    if (authUser.email_confirmed_at) {
      throw new BadRequestException('Email already confirmed');
    }

    const { data: linkData, error: linkError } =
      await this.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
    if (linkError) {
      throw new BadRequestException('Failed to generate OTP');
    }

    const otp = linkData?.properties?.email_otp ?? '';

    await this.mailService.sendEmail({
      to: [email],
      subject: 'Your verification code',
      html: RegisterSuccessMail({ name: email.split('@')[0], otp }),
    });
  }

  async confirmEmail(dto: ConfirmEmailDto): Promise<void> {
    const { error } = await this.supabaseAnon.auth.verifyOtp({
      email: dto.email,
      token: dto.token,
      type: 'magiclink',
    });
    if (error) {
      this.logger.error(
        { error: error.message, email: dto.email },
        'OTP verification failed',
      );
      throw new BadRequestException('Invalid or expired OTP');
    }

    const authUser = await this.getUserByEmail(dto.email);
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser?.id ?? '')
      .single();

    await this.mailService.sendEmail({
      to: [dto.email],
      subject: 'Confirmation Successful',
      html: ConfirmEmailSuccessMail({ name: profile?.full_name ?? dto.email }),
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error } = await this.supabase.auth.resetPasswordForEmail(
      dto.identifier,
    );
    if (error) throw new BadRequestException(error.message);

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    await this.mailService.sendEmail({
      to: [dto.identifier],
      subject: 'Reset your password',
      html: ResetPasswordMail({
        name: profile?.full_name ?? dto.identifier,
        code: '',
      }),
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error } = await this.supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: dto.newPassword,
      },
    );
    if (error) throw new BadRequestException(error.message);

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    await this.mailService.sendEmail({
      to: [dto.identifier],
      subject: 'Password Reset Successful',
      html: ChangePasswordSuccessMail({
        name: profile?.full_name ?? dto.identifier,
      }),
    });
  }

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    const authUser = await this.getUserByEmail(dto.identifier);
    if (!authUser) throw new NotFoundException('User not found');

    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: authUser.email!,
        password: dto.password,
      });
    if (signInError && !signInError.message.includes('Email not confirmed')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { error } = await this.supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: dto.newPassword,
      },
    );
    if (error) throw new BadRequestException(error.message);

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    await this.mailService.sendEmail({
      to: [authUser.email!],
      subject: 'Password Changed Successfully',
      html: ChangePasswordSuccessMail({
        name: profile?.full_name ?? authUser.email!,
      }),
    });
  }

  async signOut(dto: SignOutUserDto): Promise<void> {
    const { error } = await this.supabase
      .from('devices')
      .delete()
      .eq('id', dto.session_token);
    if (error) throw new NotFoundException('Session not found');
  }

  async signOutAllDevices(dto: SignOutAllDeviceUserDto): Promise<void> {
    await this.supabase.from('devices').delete().eq('user_id', dto.userId);
    await this.supabase.auth.admin.signOut(dto.userId);
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
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getSession(id: string) {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Session not found!');
    return data;
  }

  async deleteAccount(dto: DeleteUserDto): Promise<void> {
    const { data, error } = await this.supabase.auth.admin.getUserById(
      dto.user_id,
    );
    if (error || !data.user) throw new NotFoundException('User not found');

    // Verify password before allowing deletion
    const { error: signInError } =
      await this.supabaseAnon.auth.signInWithPassword({
        email: data.user.email!,
        password: dto.password,
      });
    if (signInError && !signInError.message.includes('Email not confirmed')) {
      throw new UnauthorizedException('Invalid password');
    }

    // Clean up devices first
    await this.supabase.from('devices').delete().eq('user_id', dto.user_id);

    const { error: deleteError } = await this.supabase.auth.admin.deleteUser(
      dto.user_id,
    );
    if (deleteError) throw new BadRequestException(deleteError.message);
  }
}
