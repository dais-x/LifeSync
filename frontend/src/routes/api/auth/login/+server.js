import { json } from '@sveltejs/kit';
import { users } from '$lib/server/db.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession } from '$lib/server/auth/session.js';

export async function POST({ request, getClientAddress }) {
	const { email: rawEmail, password } = await request.json();
	const userAgent = request.headers.get('user-agent') || 'unknown';
	const ip = getClientAddress();

	if (!rawEmail || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const email = rawEmail.toLowerCase();
	const userCol = await users();
	const user = await userCol.findOne({ email });

	if (!user) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	const valid = await verifyPassword(user.passwordHash, password);
	if (!valid) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	if (!user.verified) {
		// --- TRIGGER OTP SEND (Consistent with resend-otp) ---
		const { tokens } = await import('$lib/server/db.js');
		const { generateOTP, hashToken } = await import('$lib/server/auth/token.js');
		const { sendEmail } = await import('$lib/server/email.js');

		const tokenCol = await tokens();
		const existingToken = await tokenCol.findOne({
			userId: user._id,
			type: 'email_verification'
		});

		// Anti-spam: check if created less than 60 seconds ago
		if (existingToken && (Date.now() - existingToken.createdAt.getTime()) < 60000) {
			return json({ 
				requireVerification: true, 
				email: user.email,
				message: 'A verification code was already sent recently.'
			});
		}

		// Remove old OTP
		if (existingToken) {
			await tokenCol.deleteOne({ _id: existingToken._id });
		}

		// Generate new OTP
		const otp = generateOTP();
		const tokenHash = hashToken(otp);

		await tokenCol.insertOne({
			userId: user._id,
			type: 'email_verification',
			tokenHash,
			attempts: 0,
			expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
			createdAt: new Date()
		});

		// Send verification email via Resend
		await sendEmail({
			to: email,
			subject: 'Verify your LifeSync account',
			templateData: {
				name: user.name || 'User',
				otp_code: otp
			},
			html: `
				<h1>Verify your account</h1>
				<p>Your verification code is: ${otp}</p>
			`
		});

		return json({ 
			requireVerification: true, 
			email: user.email 
		});
	}

	const { accessToken, refreshToken } = await createSession(user._id, userAgent, ip);

	return json({
		accessToken,
		refreshToken,
		user: {
			id: user._id,
			email: user.email
		}
	});
}
