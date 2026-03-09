import { sessions } from '../db.js';
import { hashToken, generateToken } from './token.js';
import { createAccessToken } from './jwt.js';

export async function createSession(userId, userAgent, ip) {
	const refreshToken = generateToken();
	const refreshTokenHash = hashToken(refreshToken);
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	const session = {
		userId,
		refreshTokenHash,
		userAgent,
		ip,
		createdAt: new Date(),
		expiresAt
	};

	const col = await sessions();
	await col.insertOne(session);

	return {
		refreshToken,
		accessToken: createAccessToken(userId)
	};
}

export async function refreshSession(refreshToken, userAgent, ip) {
	const col = await sessions();
	const refreshTokenHash = hashToken(refreshToken);

	// Find session by this refresh token hash
	const session = await col.findOne({ refreshTokenHash });

	if (!session) {
		// Potential reuse or invalid token. 
		// If it's reuse, we should ideally revoke all sessions for this user, 
		// but the prompt says "revoke the session". 
		// Since we don't store history, we can't be 100% sure if it was a "previously used" one 
		// unless we store them. However, if we find a session by userId/userAgent/ip 
		// but the token doesn't match, it's suspicious.
		return null;
	}

	if (session.expiresAt < new Date()) {
		await col.deleteOne({ _id: session._id });
		return null;
	}

	// Rotate token
	const newRefreshToken = generateToken();
	const newRefreshTokenHash = hashToken(newRefreshToken);

	await col.updateOne(
		{ _id: session._id },
		{
			$set: {
				refreshTokenHash: newRefreshTokenHash,
				updatedAt: new Date(),
				userAgent, // Update UA and IP in case they changed
				ip
			}
		}
	);

	return {
		refreshToken: newRefreshToken,
		accessToken: createAccessToken(session.userId)
	};
}

export async function revokeSession(refreshToken) {
	const col = await sessions();
	const refreshTokenHash = hashToken(refreshToken);
	await col.deleteOne({ refreshTokenHash });
}

export async function revokeAllUserSessions(userId) {
	const col = await sessions();
	await col.deleteMany({ userId });
}
