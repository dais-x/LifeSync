import { json } from '@sveltejs/kit';
import { userDetails } from '$lib/server/db.js';

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { userId, details } = body;

        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        if (!details) {
            return json({ error: 'Details payload is required' }, { status: 400 });
        }

        const collection = await userDetails();

        // Use updateOne with upsert: true. 
        // This creates a new record if it doesn't exist, or updates it if they edit their profile later.
        await collection.updateOne(
            { userId: userId }, // Find the document by the user's ID
            {
                $set: {
                    userId: userId,
                    ...details, // Spread all the form data (chronotype, mess_factor, etc.)
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return json({ message: 'Profile details saved successfully', success: true });

    } catch (error) {
        console.error('Error saving user details:', error);
        return json({ error: 'Failed to save user details to the database' }, { status: 500 });
    }
}