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

    // require frontend to use button click verification
    await this.resend.emails.send({
      from: 'noreply@evenite.top',
      to: email,
      subject: 'Verify your Evenite Account',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            font-family: Arial, Helvetica, sans-serif;
            color: #18181b;
          ">
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="padding: 40px 20px;"
            >
              <tr>
                <td align="center">
                  <table
                    width="600"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      background: #ffffff;
                      border-radius: 12px;
                      overflow: hidden;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    "
                  >
                    <!-- Header -->
                    <tr>
                      <td
                        style="
                          background: #111827;
                          padding: 32px;
                          text-align: center;
                        "
                      >
                        <h1
                          style="
                            margin: 0;
                            color: #ffffff;
                            font-size: 28px;
                            font-weight: 700;
                          "
                        >
                          Please Verify Your Email Address
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2
                          style="
                            margin: 0 0 16px;
                            font-size: 24px;
                            color: #111827;
                          "
                        >
                          Welcome to Evenite!
                        </h2>

                        <p
                          style="
                            margin: 0 0 24px;
                            color: #52525b;
                            line-height: 1.6;
                          "
                        >
                          Thanks for signing up. Please verify your email address
                          to activate your account.
                        </p>

                        <!-- Verification Code -->
                        <div
                          style="
                            text-align: center;
                            margin: 32px 0;
                          "
                        >
                          <p
                            style="
                              margin: 0 0 12px;
                              color: #71717a;
                              font-size: 14px;
                            "
                          >
                            Verification Code
                          </p>

                          <div
                            style="
                              display: inline-block;
                              padding: 16px 32px;
                              background: #f4f4f5;
                              border-radius: 10px;
                              font-size: 28px;
                              font-weight: 700;
                              letter-spacing: 6px;
                              color: #111827;
                            "
                          >
                            ${token}
                          </div>
                        </div>

                        <p
                          style="
                            margin: 0 0 24px;
                            color: #52525b;
                            line-height: 1.6;
                            text-align: center;
                          "
                        >
                          Or verify instantly using the button below:
                        </p>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin-bottom: 32px;">
                          <a
                            href="${verificationUrl}"
                            style="
                              display: inline-block;
                              background: #111827;
                              color: #ffffff;
                              text-decoration: none;
                              padding: 14px 28px;
                              border-radius: 8px;
                              font-weight: 600;
                            "
                          >
                            Verify Email
                          </a>
                        </div>

                        <p
                          style="
                            margin: 0;
                            color: #71717a;
                            font-size: 14px;
                            line-height: 1.6;
                          "
                        >
                          This verification link and code will expire in
                          <strong>24 hours</strong>.
                        </p>

                        <p
                          style="
                            margin-top: 24px;
                            color: #71717a;
                            font-size: 14px;
                            line-height: 1.6;
                          "
                        >
                          If you didn't create an Evenite account, you can safely
                          ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td
                        style="
                          padding: 24px;
                          background: #fafafa;
                          text-align: center;
                          color: #71717a;
                          font-size: 12px;
                        "
                      >
                        © ${new Date().getFullYear()} Evenite. All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  }

  // Used for resend flow to delete old token
  async deleteVerificationRecord(userId: string): Promise<void> {
    await this.authCrudService.deleteVerificationByUserId(userId);
  }
}
