import { json } from '@sveltejs/kit';
import { timerLogs } from '$lib/server/db.js';

export async function GET({ url }) {
    try {
        const userId = url.searchParams.get('userId');
        const targetDate = url.searchParams.get('date'); // e.g., '2026-05-05'

        if (!userId) {
            return json({ error: 'Missing userId parameter' }, { status: 400 });
        }

        const collection = await timerLogs();
        
        // Fetch ALL logs for this user to calculate the all-time running average
        const allLogs = await collection.find({ userId: userId }).toArray();
        
        // 1. Calculate Today's Total Focus Time
        const todayLogs = targetDate ? allLogs.filter(log => log.date === targetDate) : [];
        
        // HABIBI-PROOF FIX: Calculate duration dynamically from timestamps so manual DB edits always work
        const todayMs = todayLogs.reduce((sum, log) => {
            const calculatedDuration = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
            return sum + (calculatedDuration > 0 ? calculatedDuration : 0);
        }, 0);
        
        // Convert to hours with 1 decimal place (e.g., "1.5")
        const todayHours = (todayMs / 3600000).toFixed(1);

        // 2. Calculate All-Time Running Average 
        const uniqueDays = new Set(allLogs.map(log => log.date));
        const totalMsAllTime = allLogs.reduce((sum, log) => {
            const calculatedDuration = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
            return sum + (calculatedDuration > 0 ? calculatedDuration : 0);
        }, 0);
        
        let avgMsPerDay = 0;
        if (uniqueDays.size > 0) {
            avgMsPerDay = totalMsAllTime / uniqueDays.size;
        }
        
        // 3. Calculate % Difference vs Average
        let percentChange = 0;
        if (avgMsPerDay > 0) {
            percentChange = Math.round(((todayMs - avgMsPerDay) / avgMsPerDay) * 100);
        }

        return json({ 
            success: true, 
            logs: todayLogs, // Send today's logs for the Timer UI
            stats: {         // Send the math for the Dashboard UI
                todayHours: todayHours,
                percentChange: Math.abs(percentChange), // Send absolute number, we handle the +/- in UI
                isUp: percentChange >= 0
            }
        });
    } catch (error) {
        console.error('Error fetching timer logs:', error);
        return json({ error: 'Failed to fetch logs from MongoDB' }, { status: 500 });
    }
}