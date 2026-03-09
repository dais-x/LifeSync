import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
	try {
		const { data, error } = await resend.emails.send({
			from: 'LifeSync <onboarding@resend.dev>',
			to,
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
