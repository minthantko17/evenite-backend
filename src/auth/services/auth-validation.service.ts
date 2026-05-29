import { Injectable } from '@nestjs/common';
import { UniversityService } from '../../university/university.service';
import { AuthCrudService } from './auth-crud.service';
import { University, EmailVerification } from '@prisma/client';
import { EmailAlreadyRegisteredException } from '../exceptions/email-already-registered.exception';
import { UniversityDomainNotFoundException } from '../exceptions/university-domain-not-found.exception';
import { EmailNotVerifiedException } from '../exceptions/email-not-verified.exception';
import { InvalidCredentialsException } from '../exceptions/invalid-credentials.exception';
import { InvalidTokenException } from '../exceptions/invalid-token.exception';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthValidationService {
  constructor(
    private readonly authCrudService: AuthCrudService,
    private readonly universityService: UniversityService,
  ) {}

  // Extracts domain from email and checks against University table
  // Returns University so auth.service can use its id
  async checkUniversityDomain(email: string): Promise<University> {
    const university = await this.universityService.findByEmailDomain(email);
    if (!university) {
      throw new UniversityDomainNotFoundException();
    }
    return university;
  }

  // Checks no existing user has this email
  async checkEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.authCrudService.findUserByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyRegisteredException();
    }
  }

  // Compares plain password against stored hash
  async checkPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isValid) {
      throw new InvalidCredentialsException();
    }
  }

  // Checks user has verified their email
  checkIsVerified(isVerified: boolean): void {
    if (!isVerified) {
      throw new EmailNotVerifiedException();
    }
  }

  // Compares plain refresh token against stored hash
  async checkRefreshToken(
    plainToken: string,
    hashedToken: string | null,
  ): Promise<void> {
    if (!hashedToken) {
      throw new InvalidTokenException();
    }
    const isValid = await bcrypt.compare(plainToken, hashedToken);
    if (!isValid) {
      throw new InvalidTokenException();
    }
  }

  // Finds verification record by token and checks expiry
  // Returns record so auth.service can use userId
  async checkVerificationToken(token: string): Promise<EmailVerification> {
    const verification =
      await this.authCrudService.findVerificationByToken(token);
    if (!verification) {
      throw new InvalidTokenException();
    }

    // Delete expired record so user can request a new one
    if (new Date() > verification.expireAt) {
      await this.authCrudService.deleteVerificationByToken(token);
      throw new InvalidTokenException();
    }

    return verification;
  }
}
