import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { generateToken, hashToken } from '$lib/server/auth/token.js';
import { sendEmail } from '$lib/server/email.js';
import { APP_URL } from '$env/static/private';

export async function POST({ request }) {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const userCol = await users();
	const existingUser = await userCol.findOne({ email });

	if (existingUser) {
		return json({ error: 'User already exists' }, { status: 400 });
	}

	const passwordHash = await hashPassword(password);
	const user = {
		email,
		passwordHash,
		verified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const result = await userCol.insertOne(user);
	const userId = result.insertedId;

	// Verification token
	const token = generateToken();
	const tokenHash = hashToken(token);
	const tokenCol = await tokens();
	await tokenCol.insertOne({
		userId,
		type: 'email_verification',
		tokenHash,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
		createdAt: new Date()
	});

	// Send verification email
	const verificationLink = `${APP_URL}/verify-email?token=${token}`;
	await sendEmail({
		to: email,
		subject: 'Verify your LifeSync account',
		html: `
			<h1>Verify your email</h1>
			<p>Please click the link below to verify your account:</p>
			<a href="${verificationLink}">${verificationLink}</a>
		`
	});

	return json({ message: 'User registered successfully. Please verify your email.' });
}
