import { Injectable } from '@nestjs/common';
import { AuthCrudService } from './services/auth-crud.service';
import { AuthValidationService } from './services/auth-validation.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthEmailService } from './services/auth-email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAccessPayload } from './strategies/jwt-access.strategy';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { InvalidTokenException } from './exceptions/invalid-token.exception';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCrudService: AuthCrudService,
    private readonly authValidationService: AuthValidationService,
    private readonly authTokenService: AuthTokenService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // 1. Validate university domain → returns University for its id
    const university = await this.authValidationService.checkUniversityDomain(
      dto.email,
    );

    // 2. Ensure email not already taken
    await this.authValidationService.checkEmailNotTaken(dto.email);

    // 3. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 4. Create user (isVerified: false, role: PARTICIPANT by default)
    const user = await this.authCrudService.createUser({
      universityId: university.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
    });

    // 5. Send verification email
    await this.authEmailService.sendVerificationEmail(user.id, user.email);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────────────────────

  // TODO: update to return tokens + auto login after User module is complete
  async verifyEmail(token: string): Promise<{ message: string }> {
    // 1. Validate token → returns verification record for userId
    const verification =
      await this.authValidationService.checkVerificationToken(token);

    // 2. Mark user as verified
    await this.authCrudService.updateUser(verification.userId, {
      isVerified: true,
    });

    // 3. Delete verification record — token can never be reused
    await this.authCrudService.deleteVerificationByToken(token);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Find user by email
    const user = await this.authCrudService.findUserByEmail(dto.email);

    // 2. Check password
    // Note: throw same exception whether email not found or password wrong
    // → prevents attacker from knowing if email is registered
    if (!user) {
      throw new InvalidCredentialsException();
    }
    await this.authValidationService.checkPassword(
      dto.password,
      user.passwordHash,
    );

    // 3. Check email verified
    this.authValidationService.checkIsVerified(user.isVerified);

    // 4. Build token payloads
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      universityId: user.universityId,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    // 5. Generate tokens
    const accessToken =
      this.authTokenService.generateAccessToken(accessPayload);
    const refreshToken =
      this.authTokenService.generateRefreshToken(refreshPayload);

    // 6. Hash and store refresh token in DB
    await this.authTokenService.hashAndStoreRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  // ─── REFRESH ───────────────────────────────────────────────────────────────

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    // 1. Find user
    const user = await this.authCrudService.findUserById(userId);
    if (!user) {
      throw new InvalidTokenException();
    }

    // 2. Validate refresh token against stored hash
    await this.authValidationService.checkRefreshToken(
      refreshToken,
      user.refreshToken,
    );

    // 3. Issue new access token
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      universityId: user.universityId,
    };

    return {
      accessToken: this.authTokenService.generateAccessToken(accessPayload),
    };
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.authTokenService.clearRefreshToken(userId);
    return { message: 'Logged out successfully.' };
  }

  // ─── RESEND VERIFICATION ───────────────────────────────────────────────────

  async resendVerification(email: string): Promise<{ message: string }> {
    // Generic message always returned — prevents email enumeration
    const genericMessage = {
      message:
        'If this email is registered and unverified, a new verification email has been sent.',
    };

    const user = await this.authCrudService.findUserByEmail(email);

    // Silent return if user not found or already verified
    if (!user || user.isVerified) {
      return genericMessage;
    }

    // Delete old record then send fresh one
    await this.authEmailService.deleteVerificationRecord(user.id);
    await this.authEmailService.sendVerificationEmail(user.id, user.email);

    return genericMessage;
  }
}
