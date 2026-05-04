import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_TEMPLATE_ID } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({ to, subject, html, templateData }) {
    const sender = RESEND_FROM_EMAIL || 'LifeSync <onboarding@resend.dev>';

    try {
        const payload = {
            from: sender,
            to: to,
            subject: subject,
        };

        // Only use the template if we have the ID AND templateData.
        if (RESEND_TEMPLATE_ID && templateData) {
            payload.template = {
                id: RESEND_TEMPLATE_ID,
                variables: templateData
            };
        } else {
            payload.html = html;
        }

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