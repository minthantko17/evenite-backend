import { Injectable } from '@nestjs/common';
import { AuthCrudService } from './auth-crud.service';
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthEmailService {
  constructor(private readonly authCrudService: AuthCrudService) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  // Creates a verification record and sends email via SendGrid
  // Token expires in 24 hours
  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = uuidv4();
    const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.authCrudService.createVerificationRecord(
      userId,
      token,
      expireAt,
    );

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Verify your Evenite account',
      html: `
        <h2>Welcome to Evenite!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  // Deletes existing verification record for user
  // Used in resend flow — old token invalidated before sending new one
  async deleteVerificationRecord(userId: string): Promise<void> {
    await this.authCrudService.deleteVerificationByUserId(userId);
  }
}
