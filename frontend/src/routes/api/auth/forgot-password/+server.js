import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { generateToken, hashToken } from '$lib/server/auth/token.js';
import { sendEmail } from '$lib/server/email.js';
import { APP_URL } from '$env/static/private';

export async function POST({ request }) {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const userCol = await users();
	const user = await userCol.findOne({ email });

	if (!user) {
		// For security, don't reveal if user exists. 
		// Just return success message.
		return json({ message: 'If an account exists, a reset link has been sent.' });
	}

	const token = generateToken();
	const tokenHash = hashToken(token);
	const tokenCol = await tokens();
	
	// Delete any existing reset tokens for this user
	await tokenCol.deleteMany({ userId: user._id, type: 'password_reset' });

	await tokenCol.insertOne({
		userId: user._id,
		type: 'password_reset',
		tokenHash,
		expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
		createdAt: new Date()
	});

	const resetLink = `${APP_URL}/reset-password?token=${token}`;
	await sendEmail({
		to: email,
		subject: 'Reset your LifeSync password',
		html: `
			<h1>Reset your password</h1>
			<p>Please click the link below to reset your password. This link expires in 15 minutes.</p>
			<a href="${resetLink}">${resetLink}</a>
		`
	});

	return json({ message: 'If an account exists, a reset link has been sent.' });
}
