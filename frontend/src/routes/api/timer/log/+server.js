import { json } from '@sveltejs/kit';
import { timerLogs } from '$lib/server/db.js';

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { userId, date, startTime, endTime, duration } = body;

        // Don't be a himar and accept empty data! Let's validate.
        if (!userId || !date || !startTime || !endTime || duration === undefined) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        const collection = await timerLogs();
        
        // Format the document for MongoDB
        const newLog = {
            userId: userId,
            date: date, // Stored as 'YYYY-MM-DD' for super easy daily querying
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            duration_ms: duration, // Exact milliseconds for perfect accuracy
            createdAt: new Date()
        };

        // Drop it into the cloud!
        await collection.insertOne(newLog);

        return json({ success: true, message: 'Timer log saved to cloud successfully' });
    } catch (error) {
        console.error('Error saving timer log:', error);
        return json({ error: 'Failed to save log to MongoDB' }, { status: 500 });
    }
}