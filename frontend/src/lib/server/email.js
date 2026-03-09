import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_TO_OVERRIDE } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
	// If a test override is set in .env, use that instead of the intended recipient
	const recipient = RESEND_TO_OVERRIDE || to;
	const sender = RESEND_FROM_EMAIL || 'LifeSync <onboarding@resend.dev>';

	try {
		const { data, error } = await resend.emails.send({
			from: sender,
			to: recipient,
			subject,
			html
		});

		if (error) {
			console.error('Resend error:', error);
			throw new Error(error.message);
		}

		return data;
	} catch (e) {
		console.error('Email send failed:', e);
		throw e;
	}
}
