import { Injectable } from '@nestjs/common';
import { AuthCrudService } from './auth-crud.service';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthEmailService {
  private readonly resend: Resend;

  constructor(private readonly authCrudService: AuthCrudService) {
    this.resend = new Resend(process.env.RESEND_API_KEY!);
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = uuidv4();
    const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000); //24hrs

    await this.authCrudService.createVerificationRecord(
      userId,
      token,
      expireAt,
    );

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.resend.emails.send({
      from: 'Evenite <onboarding@resend.dev>',  // TODO: replace with real domain in production
      to: email,
      subject: 'Verify your Evenite account',
      html: `
        <h2>Welcome to Evenite!</h2>
        <p>Please verify your email by clicking the link below:\n</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>\nThis link expires in 24 hours.</p>
      `,
    });
  }

  // Used for resend flow to delete old token
  async deleteVerificationRecord(userId: string): Promise<void> {
    await this.authCrudService.deleteVerificationByUserId(userId);
  }
}
