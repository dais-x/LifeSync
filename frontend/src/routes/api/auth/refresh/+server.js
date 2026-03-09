import { json } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth/session.js';

export async function POST({ request, getClientAddress }) {
	const { refreshToken } = await request.json();
	const userAgent = request.headers.get('user-agent') || 'unknown';
	const ip = getClientAddress();

	if (!refreshToken) {
		return json({ error: 'Refresh token is required' }, { status: 400 });
	}

	const result = await refreshSession(refreshToken, userAgent, ip);

	if (!result) {
		return json({ error: 'Invalid or expired refresh token' }, { status: 401 });
	}

	return json(result);
}
