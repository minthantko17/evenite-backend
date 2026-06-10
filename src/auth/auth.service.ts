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
import { UserNotFoundException } from './exceptions/user-not-found.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCrudService: AuthCrudService,
    private readonly authValidationService: AuthValidationService,
    private readonly authTokenService: AuthTokenService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const university = await this.authValidationService.checkUniversityDomain(
      dto.email,
    );
    await this.authValidationService.checkEmailNotTaken(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.authCrudService.createUser({
      universityId: university.id,
      email: dto.email,
      passwordHash,
    });
    await this.authEmailService.sendVerificationEmail(user.id, user.email);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string): Promise<{
    message: string;
  }> {
    const verification =
      await this.authValidationService.checkVerificationToken(token);

    const user = await this.authCrudService.findUserById(verification.userId);
    if (!user) throw new InvalidTokenException();
    
    await this.authCrudService.updateUser(verification.userId, {
      isVerified: true,
    });
    await this.authCrudService.deleteVerificationByToken(token);

    return {
      message: 'Email verified successfully.'
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.authCrudService.findUserByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }
    await this.authValidationService.checkPassword(
      dto.password,
      user.passwordHash,
    );

    this.authValidationService.checkIsVerified(user.isVerified);

    // Build token payloads
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      participantProfileId: user.participantProfile?.id ?? null,
      organizerProfileId: user.organizerProfile?.id ?? null,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken =
      this.authTokenService.generateAccessToken(accessPayload);
    const refreshToken =
      this.authTokenService.generateRefreshToken(refreshPayload);

    await this.authTokenService.hashAndStoreRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.authCrudService.findUserById(userId);
    if (!user) {
      throw new InvalidTokenException();
    }

    await this.authValidationService.checkRefreshToken(
      refreshToken,
      user.refreshToken,
    );

    // Issue new access token
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      participantProfileId: user.participantProfile?.id ?? null,
      organizerProfileId: user.organizerProfile?.id ?? null,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
    };

    return {
      accessToken: this.authTokenService.generateAccessToken(accessPayload),
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.authTokenService.clearRefreshToken(userId);
    return { message: 'Logged out successfully.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    // Generic message always returned — prevents email enumeration
    const genericMessage = {
      message:
        'If this email is registered and unverified, a new verification email has been sent.',
    };
    const user = await this.authCrudService.findUserByEmail(email);
    if (!user || user.isVerified) {
      return genericMessage;
    }

    // Delete old record then send fresh one
    await this.authEmailService.deleteVerificationRecord(user.id);
    await this.authEmailService.sendVerificationEmail(user.id, user.email);

    return genericMessage;
  }

  async issueAccessTokenForUser(userId: string): Promise<string> {
    const user = await this.authCrudService.findUserById(userId);
    if (!user) throw new UserNotFoundException();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      participantProfileId: user.participantProfile?.id ?? null,
      organizerProfileId: user.organizerProfile?.id ?? null,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
    };

    return this.authTokenService.generateAccessToken(accessPayload);
  }
}
