import { verifyAccessToken } from './jwt.js';
import { error } from '@sveltejs/kit';

export function getAuthorizedUser(request) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.split(' ')[1];
	return verifyAccessToken(token);
}

export function protectRoute(request) {
	const user = getAuthorizedUser(request);
	if (!user) {
		throw error(401, 'Unauthorized');
	}
	return user;
}
