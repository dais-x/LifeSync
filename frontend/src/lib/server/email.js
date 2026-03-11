import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_TO_OVERRIDE, RESEND_TEMPLATE_ID } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({ to, subject, html, templateData }) {
	const recipient = RESEND_TO_OVERRIDE || to;
	const sender = RESEND_FROM_EMAIL || 'LifeSync <onboarding@resend.dev>';

	try {
		const payload = {
			from: sender,
			to: recipient,
			subject
		};

		if (RESEND_TEMPLATE_ID && templateData) {
			// Correct structure for Resend SDK templates
			payload.template = {
				id: RESEND_TEMPLATE_ID,
				variables: templateData
			};
		} else {
			payload.html = html;
		}

		const { data, error } = await resend.emails.send(payload);

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
