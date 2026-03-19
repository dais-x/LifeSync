import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
    const sender = RESEND_FROM_EMAIL || 'LifeSync <onboarding@resend.dev>';

    try {
        const payload = {
            from: sender,
            to: to, // Directly using the user's actual email address now
            subject: subject,
            html: html // Resend strictly requires html, text, or a react component
        };

        const { data, error } = await resend.emails.send(payload);

        if (error) {
            console.error('Resend API Error:', error);
            throw new Error(error.message);
        }

        return data;
    } catch (e) {
        console.error('Email send failed:', e);
        throw e;
    }
}