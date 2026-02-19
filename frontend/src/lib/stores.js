import { writable } from 'svelte/store';

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
    health_sync_url: 'https://your-n8n-webhook-url.com/health-sync', // Placeholder for n8n webhook
    digital_wellbeing: [],
    mess_factor: 5,
    smart_sync: false,
    control_level: 'auto',
    notification_style: 'persistent'
});
