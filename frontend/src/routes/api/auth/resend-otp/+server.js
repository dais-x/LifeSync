import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { generateOTP, hashToken } from '$lib/server/auth/token.js';
import { sendEmail } from '$lib/server/email.js';

export async function POST({ request }) {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const userCol = await users();
	const user = await userCol.findOne({ email });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	if (user.verified) {
		return json({ error: 'User is already verified' }, { status: 400 });
	}

	const tokenCol = await tokens();
	const existingToken = await tokenCol.findOne({
		userId: user._id,
		type: 'email_verification'
	});

	// Anti-spam: check if created less than 60 seconds ago
	if (existingToken && (Date.now() - existingToken.createdAt.getTime()) < 60000) {
		const wait = Math.ceil((60000 - (Date.now() - existingToken.createdAt.getTime())) / 1000);
		return json({ error: `Please wait ${wait} seconds before requesting a new code.` }, { status: 429 });
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

	// Send verification email
	await sendEmail({
		to: email,
		subject: 'Verify your LifeSync account',
		html: `
			<h1>Verify your account</h1>
			<p>Your new verification code is:</p>
			<h2 style="font-size: 2rem; letter-spacing: 5px;">${otp}</h2>
			<p>This code expires in 5 minutes.</p>
		`
	});

	return json({ message: 'New verification code sent.' });
}
