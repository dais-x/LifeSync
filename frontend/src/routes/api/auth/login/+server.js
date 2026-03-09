import { json } from '@sveltejs/kit';
import { users } from '$lib/server/db.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession } from '$lib/server/auth/session.js';

export async function POST({ request, getClientAddress }) {
	const { email, password } = await request.json();
	const userAgent = request.headers.get('user-agent') || 'unknown';
	const ip = getClientAddress();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const userCol = await users();
	const user = await userCol.findOne({ email });

	if (!user) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	if (!user.verified) {
		return json({ error: 'Please verify your email first' }, { status: 403 });
	}

	const valid = await verifyPassword(user.passwordHash, password);
	if (!valid) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
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
