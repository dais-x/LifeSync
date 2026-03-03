<script>
    import { onMount } from 'svelte';

    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    let todaysEvents = $state([]);

    async function fetchSchedule() {
        try {
            const res = await fetch(GET_URL);
            if (!res.ok) {
                console.error("Failed to fetch schedule data, status:", res.status);
                return;
            };

            const incoming = await res.json();
            let allTasks = [];
            
            if (incoming.data && Array.isArray(incoming.data)) {
                allTasks = incoming.data.filter(t => t.isDeleted !== true);
            } else if (Array.isArray(incoming)) {
                allTasks = incoming;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);

            todaysEvents = allTasks
                .map(task => ({
                    ...task,
                    deadlineDate: task.deadline ? new Date(task.deadline) : null
                }))
                .filter(task => {
                    if (!task.deadlineDate) return false;
                    return task.deadlineDate >= today && task.deadlineDate <= endOfToday;
                })
                .sort((a, b) => a.deadlineDate - b.deadlineDate);
        } catch (e) {
            console.error("Failed to load schedule:", e);
        }
    }

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

    onMount(fetchSchedule);
</script>

<div class="scroll-area fade-in">
	<h2 class="page-title">Today's Timeline</h2>

	<div class="timeline-container">
		<div class="timeline-line"></div>

        {#if todaysEvents.length === 0}
            <div class="empty-state">
                <i class='bx bx-calendar-check'></i>
                <p>Nothing scheduled for today. Enjoy your free day!</p>
            </div>
        {:else}
            {#each todaysEvents as event}
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
</div>

<style>
	.page-title {
		color: white;
		margin-bottom: 2rem;
	}
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
    /* Color coding for different categories */
	.event-card.purple {
		border-color: var(--accent-purple);
		background: rgba(99, 102, 241, 0.1);
	}
	.event-card.blue {
		border-color: var(--accent-blue);
		background: rgba(59, 130, 246, 0.1);
	}
	.event-card.green {
		border-color: var(--accent-green);
		background: rgba(34, 197, 94, 0.1);
	}
    .event-card.orange {
		border-color: var(--accent-orange);
		background: rgba(251, 146, 60, 0.1);
	}
    .event-card.grey {
		border-color: var(--text-gray);
		background: rgba(156, 163, 175, 0.1);
	}

	.event-title {
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.event-desc {
		color: var(--text-gray);
		font-size: 0.8rem;
	}
    .empty-state {
        text-align: center;
        color: var(--text-gray);
        padding: 4rem 0;
    }
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
    }
	.fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
