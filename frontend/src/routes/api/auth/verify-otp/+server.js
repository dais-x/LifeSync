import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { hashToken } from '$lib/server/auth/token.js';

export async function POST({ request }) {
	const { email, otp } = await request.json();

	if (!email || !otp) {
		return json({ error: 'Email and OTP are required' }, { status: 400 });
	}

	const userCol = await users();
	const user = await userCol.findOne({ email });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const tokenCol = await tokens();
	const tokenDoc = await tokenCol.findOne({
		userId: user._id,
		type: 'email_verification'
	});

	if (!tokenDoc) {
		return json({ error: 'No verification code found' }, { status: 400 });
	}

	if (tokenDoc.expiresAt < new Date()) {
		await tokenCol.deleteOne({ _id: tokenDoc._id });
		return json({ error: 'Verification code expired' }, { status: 400 });
	}

	if (tokenDoc.attempts >= 5) {
		await tokenCol.deleteOne({ _id: tokenDoc._id });
		return json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 });
	}

	const providedHash = hashToken(otp);

	if (providedHash !== tokenDoc.tokenHash) {
		await tokenCol.updateOne(
			{ _id: tokenDoc._id },
			{ $inc: { attempts: 1 } }
		);
		return json({ error: 'Invalid verification code' }, { status: 400 });
	}

	// Success
	await userCol.updateOne(
		{ _id: user._id },
		{ $set: { verified: true, updatedAt: new Date() } }
	);

	await tokenCol.deleteOne({ _id: tokenDoc._id });

	return json({ message: 'Email verified successfully' });
}
