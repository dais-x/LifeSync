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
    digital_wellbeing: [],
    mess_factor: 5,
    smart_sync: false,
    control_level: 'auto',
    notification_style: 'persistent'
});
