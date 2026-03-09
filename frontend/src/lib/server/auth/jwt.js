import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

export function createAccessToken(userId) {
	return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}

export function createRefreshToken(userId) {
	// Not a JWT, just a random token as requested by rotation requirements
	// But the user prompt says "JWT access tokens + refresh tokens with rotation"
	// and "Validate the refresh token against the hashed token stored in the sessions collection"
	// Usually refresh tokens are just random strings if stored in DB.
	// I'll use randomBytes for the refresh token itself, and sign it if needed,
	// but the session collection stores `refreshTokenHash`.
	return null; // Will use session helper to manage this
}

export function verifyAccessToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (e) {
		return null;
	}
}
