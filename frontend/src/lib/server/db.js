import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

if (!MONGODB_URI) {
	throw new Error('Please add MONGODB_URI to .env');
}

const client = new MongoClient(MONGODB_URI, {
	tls: true,
	connectTimeoutMS: 5000,
	serverSelectionTimeoutMS: 5000
});

let dbPromise;

async function getDb() {
	if (!dbPromise) {
		dbPromise = client.connect().then(() => client.db());
	}
	return dbPromise;
}

export async function getCollection(name) {
	const db = await getDb();
	return db.collection(name);
}

export const users = () => getCollection('users');
export const tokens = () => getCollection('tokens');
export const sessions = () => getCollection('sessions');
export const userDetails = () => getCollection('user_details');