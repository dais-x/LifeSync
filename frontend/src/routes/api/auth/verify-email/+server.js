import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { hashToken } from '$lib/server/auth/token.js';

export async function POST({ request }) {
	const { token } = await request.json();

	if (!token) {
		return json({ error: 'Token is required' }, { status: 400 });
	}

	const tokenHash = hashToken(token);
	const tokenCol = await tokens();
	const tokenDoc = await tokenCol.findOne({
		tokenHash,
		type: 'email_verification'
	});

	if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
		return json({ error: 'Invalid or expired token' }, { status: 400 });
	}

	const userCol = await users();
	await userCol.updateOne(
		{ _id: tokenDoc.userId },
		{ $set: { verified: true, updatedAt: new Date() } }
	);

	// Delete used token
	await tokenCol.deleteOne({ _id: tokenDoc._id });

	return json({ message: 'Email verified successfully' });
}
