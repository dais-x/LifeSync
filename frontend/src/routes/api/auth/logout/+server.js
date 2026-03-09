import { json } from '@sveltejs/kit';
import { revokeSession } from '$lib/server/auth/session.js';

export async function POST({ request }) {
	const { refreshToken } = await request.json();

	if (refreshToken) {
		await revokeSession(refreshToken);
	}

	return json({ message: 'Logged out successfully' });
}
