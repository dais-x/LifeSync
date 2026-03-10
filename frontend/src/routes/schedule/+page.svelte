<script>
    import { onMount } from 'svelte';
    import { currentUser } from '$lib/stores'; // NEW: Import user store

    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';

    let view = $state('day'); // 'day' or 'calendar'
    let selectedDate = $state(new Date());
    let currentMonth = $state(new Date()); // Used for calendar navigation

    let allTasks = $state([]);
    let isLoading = $state(true);

    async function fetchSchedule() {
        if (!$currentUser || !$currentUser.id) return; // NEW: Guard clause

        isLoading = true;
        try {
            // NEW: Send userId dynamically
            const res = await fetch(`${GET_URL}?userId=${$currentUser.id}`);
            if (!res.ok) {
                console.error("Failed to fetch schedule data, status:", res.status);
                return;
            };

            const incoming = await res.json();
            let rawTasks = [];

            if (incoming.data && Array.isArray(incoming.data)) {
                rawTasks = incoming.data.filter(t => t.isDeleted !== true);
            } else if (Array.isArray(incoming)) {
                rawTasks = incoming;
            }

            allTasks = rawTasks.map(task => ({
                ...task,
                deadlineDate: task.deadline ? new Date(task.deadline) : null
            }));
        } catch (e) {
            console.error("Failed to load schedule:", e);
        } finally {
            isLoading = false;
        }
    }

    // Filter tasks based on selectedDate
    let filteredEvents = $derived(
        allTasks
            .filter(task => {
                if (!task.deadlineDate) return false;
                return (
                    task.deadlineDate.getFullYear() === selectedDate.getFullYear() &&
                    task.deadlineDate.getMonth() === selectedDate.getMonth() &&
                    task.deadlineDate.getDate() === selectedDate.getDate()
                );
            })
            .sort((a, b) => a.deadlineDate - b.deadlineDate)
    );

    function formatTime(date) {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function getCategoryColor(category) {
        const lowerCategory = (category || '').toLowerCase();
        if (lowerCategory.includes('work')) return 'blue';
        if (lowerCategory.includes('study')) return 'purple';
        if (lowerCategory.includes('fitness')) return 'green';
        if (lowerCategory.includes('home')) return 'orange';
        return 'grey';
    }

    function getPriorityColor(priority) {
        const p = (priority || 'mid').toLowerCase();
        if (p === 'high' || p === 'past_deadline') return '#f87171'; // Red
        if (p === 'mid') return '#fb923c'; // Orange
        if (p === 'low') return '#4ade80'; // Green
        return '#9ca3af'; // Grey
    }

    function getDayTasks(dayObj) {
        return allTasks.filter(task => {
            if (!task.deadlineDate) return false;
            return (
                task.deadlineDate.getDate() === dayObj.day &&
                task.deadlineDate.getMonth() === dayObj.month &&
                task.deadlineDate.getFullYear() === dayObj.year
            );
        });
    }

    // Calendar logic
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let calendarDays = $derived.by(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];

        // Padding for previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                month: month - 1,
                year: year,
                isCurrentMonth: false
            });
        }

        // Days in current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                month: month,
                year: year,
                isCurrentMonth: true
            });
        }

        // Padding for next month
        const remaining = 42 - days.length; // 6 rows of 7
        for (let i = 1; i <= remaining; i++) {
            days.push({
                day: i,
                month: month + 1,
                year: year,
                isCurrentMonth: false
            });
        }

        return days;
    });

    function changeMonth(offset) {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    }

    function isSelected(dayObj) {
        return (
            selectedDate.getDate() === dayObj.day &&
            selectedDate.getMonth() === dayObj.month &&
            selectedDate.getFullYear() === dayObj.year
        );
    }

    function isToday(dayObj) {
        const today = new Date();
        return (
            today.getDate() === dayObj.day &&
            today.getMonth() === dayObj.month &&
            today.getFullYear() === dayObj.year
        );
    }

    function selectDay(dayObj) {
        selectedDate = new Date(dayObj.year, dayObj.month, dayObj.day);
    }

    onMount(fetchSchedule);
</script>

<div class="scroll-area fade-in">
    <div class="header-container">
        <h2 class="page-title">{view === 'day' ? "Today's Timeline" : "Calendar View"}</h2>
        <div class="view-toggle">
            <button class:active={view === 'day'} on:click={() => view = 'day'}>Day</button>
            <button class:active={view === 'calendar'} on:click={() => view = 'calendar'}>Calendar</button>
        </div>
    </div>

    {#if view === 'day'}
        <div class="timeline-container">
            <div class="timeline-line"></div>

            {#if isLoading}
                <div class="loading-state">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <p>Loading schedule...</p>
                </div>
            {:else if filteredEvents.length === 0}
                <div class="empty-state">
                    <i class='bx bx-calendar-check'></i>
                    <p>Nothing scheduled for {selectedDate.toDateString() === new Date().toDateString() ? 'today' : selectedDate.toLocaleDateString()}. Enjoy your free day!</p>
                </div>
            {:else}
                {#each filteredEvents as event}
                    <div class="time-slot">
                        <div class="time-label">{formatTime(event.deadlineDate)}</div>
                        <div class="event-card {getCategoryColor(event.category)}">
                            <div class="event-title">{event.title}</div>
                            <div class="event-desc">{event.category || 'No category'}</div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {:else}
        <div class="calendar-wrapper">
            <div class="calendar-header">
                <h3>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <div class="month-nav">
                    <button on:click={() => changeMonth(-1)}><i class='bx bx-chevron-left'></i></button>
                    <button on:click={() => { currentMonth = new Date(); selectedDate = new Date(); }} title="Go to today"><i class='bx bx-target-lock'></i></button>
                    <button on:click={() => changeMonth(1)}><i class='bx bx-chevron-right'></i></button>
                </div>
            </div>

            <div class="calendar-grid">
                {#each daysOfWeek as day}
                    <div class="day-name">{day}</div>
                {/each}
                {#each calendarDays as dayObj}
                    {@const dayTasks = getDayTasks(dayObj)}
                    <button
                        class="day-cell"
                        class:not-current={!dayObj.isCurrentMonth}
                        class:selected={isSelected(dayObj)}
                        class:today={isToday(dayObj)}
                        on:click={() => selectDay(dayObj)}
                    >
                        <span>{dayObj.day}</span>
                        <div class="task-indicators">
                            {#each dayTasks.slice(0, 4) as task}
                                <div class="task-dot" style="background: {getPriorityColor(task.priority)}"></div>
                            {/each}
                        </div>
                    </button>
                {/each}
            </div>

            <div class="selected-day-tasks">
                <h4>Tasks for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                <div class="mini-timeline">
                    {#if filteredEvents.length === 0}
                        <p class="no-tasks">No tasks for this day.</p>
                    {:else}
                        {#each filteredEvents as event}
                            <div class="mini-event-card {getCategoryColor(event.category)}">
                                <span class="mini-time">{formatTime(event.deadlineDate)}</span>
                                <div class="mini-content">
                                    <span class="mini-title">{event.title}</span>
                                    <span class="mini-priority" style="color: {getPriorityColor(event.priority)}">{event.priority}</span>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    .page-title {
        color: white;
        margin: 0;
    }
    .view-toggle {
        display: flex;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 0.25rem;
        border-radius: 0.5rem;
    }
    .view-toggle button {
        background: none;
        border: none;
        color: var(--text-gray);
        padding: 0.4rem 1rem;
        border-radius: 0.35rem;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.2s;
    }
    .view-toggle button.active {
        background: var(--accent-purple);
        color: white;
    }

    /* Timeline Styles */
    .timeline-container {
        position: relative;
        padding-left: 3rem;
        min-height: 50vh;
    }
    .timeline-line {
        position: absolute;
        left: 3.5rem;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--border-color);
        z-index: 0;
    }
    .time-slot {
        display: flex;
        margin-bottom: 2rem;
        position: relative;
        z-index: 1;
    }
    .time-label {
        width: 3rem;
        font-size: 0.8rem;
        color: var(--text-gray);
        margin-top: -0.2rem;
    }
    .event-card {
        flex: 1;
        margin-left: 2rem;
        padding: 0.75rem 1rem;
        border-left: 3px solid;
        border-radius: 0.25rem;
    }
    .event-card.purple { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.1); }
    .event-card.blue { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); }
    .event-card.green { border-color: var(--accent-green); background: rgba(34, 197, 94, 0.1); }
    .event-card.orange { border-color: var(--accent-orange); background: rgba(251, 146, 60, 0.1); }
    .event-card.grey { border-color: var(--text-gray); background: rgba(156, 163, 175, 0.1); }

    .event-title { color: white; font-weight: 600; font-size: 0.9rem; }
    .event-desc { color: var(--text-gray); font-size: 0.8rem; }

    .empty-state, .loading-state {
        text-align: center;
        color: var(--text-gray);
        padding: 4rem 0;
    }
    .empty-state i, .loading-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
    }

    /* Calendar Styles */
    .calendar-wrapper {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.5rem;
    }
    .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .calendar-header h3 {
        color: white;
        margin: 0;
        font-size: 1.1rem;
    }
    .month-nav {
        display: flex;
        gap: 0.5rem;
    }
    .month-nav button {
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        color: white;
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }
    .month-nav button:hover {
        border-color: var(--accent-purple);
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.5rem;
        margin-bottom: 2rem;
    }
    .day-name {
        text-align: center;
        color: var(--text-gray);
        font-size: 0.75rem;
        font-weight: 600;
        padding-bottom: 0.5rem;
    }
    .day-cell {
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        color: white;
        aspect-ratio: 1;
        border-radius: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        font-size: 0.9rem;
    }
    .day-cell:hover {
        border-color: var(--accent-purple);
    }
    .day-cell.not-current {
        opacity: 0.3;
    }
    .day-cell.selected {
        background: var(--accent-purple);
        border-color: var(--accent-purple);
    }
    .day-cell.today {
        border-color: var(--accent-green);
        color: var(--accent-green);
    }
    .day-cell.today.selected {
        color: white;
    }

    .task-indicators {
        position: absolute;
        bottom: 0.3rem;
        display: flex;
        gap: 2px;
        justify-content: center;
        width: 100%;
        padding: 0 2px;
    }
    .task-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
    }

    .selected-day-tasks h4 {
        color: white;
        font-size: 1rem;
        margin-bottom: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }
    .mini-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .mini-event-card {
        padding: 0.75rem;
        border-radius: 0.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
        border-left: 3px solid;
    }
    .mini-event-card.purple { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.05); }
    .mini-event-card.blue { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.05); }
    .mini-event-card.green { border-color: var(--accent-green); background: rgba(34, 197, 94, 0.05); }
    .mini-event-card.orange { border-color: var(--accent-orange); background: rgba(251, 146, 60, 0.05); }
    .mini-event-card.grey { border-color: var(--text-gray); background: rgba(156, 163, 175, 0.05); }

    .mini-time {
        font-size: 0.75rem;
        color: var(--text-gray);
        font-family: monospace;
        min-width: 40px;
    }
    .mini-content {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }
    .mini-title {
        color: white;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .mini-priority {
        font-size: 0.65rem;
        text-transform: uppercase;
        font-weight: 700;
    }
    .no-tasks {
        color: var(--text-gray);
        font-size: 0.85rem;
        font-style: italic;
    }

    .fade-in {
        animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
