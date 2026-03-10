import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// --- AUTHENTICATION STORE ---
// Check local storage so they stay logged in if they refresh the page
const storedUser = browser ? JSON.parse(localStorage.getItem('user') || 'null') : null;

export const currentUser = writable(storedUser);

// Whenever currentUser changes (like logging in or out), update local storage automatically
if (browser) {
    currentUser.subscribe(value => {
        if (value) {
            localStorage.setItem('user', JSON.stringify(value));
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    });
}

// Initialize with default form data structure
export const userFormData = writable({
    nickname: '',
    status: 'student',
    dob: '',
    chronotype: 'early_bird',
    scheduling_style: 'strict',
    main_focus: 'productivity',
    wellness_conditions: '',
    cycle_tracking: false,
    last_period_date: '',
    avg_cycle_length: 28,
    avg_period_length: 5,
    cycle_history: [
        { month: 'Jan', year: '26', cycleLength: 29, periodLength: 7 },
        { month: 'Feb', year: '26', cycleLength: 28, periodLength: 6 }
    ],
    cycle_notifications: {
        threeDaysBeforeOvulation: false,
        onOvulation: false,
        threeDaysBeforePeriod: false,
        onPeriod: false,
        logFirstLastDay: false
    },
    menstrual_diagnosis: {
        pcos: false,
        pcod: false,
        endometriosis: false,
        thyroid: false,
        other: ''
    },
    health_sync_url: 'https://fahim-n8n.laddu.cc/webhook/health-sync',
    digital_wellbeing: [],
    mess_factor: 5,
    smart_sync: false,
    control_level: 'auto',
    notification_style: 'persistent'
});
