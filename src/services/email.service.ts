import nodemailer from 'nodemailer';
import { verificationEmailTemplate } from '../emailTemplates/verificationEmail';

class EmailService {
    async sendVerificationEmail(to: string, verifyLink: string) {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            throw new Error('EMAIL CONFIG MISSING');
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        await transporter.sendMail({
            from: `"ChessHub" <${emailUser}>`,
            to,
            subject: 'Confirm your ChessHub email',
            html: verificationEmailTemplate(verifyLink),
        });
    }

    isEnabled() {
        return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    }
}

export const emailService = new EmailService();