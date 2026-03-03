<script>
    import { onMount, onDestroy } from 'svelte';
    import Notification from '$lib/Notification.svelte';

    // --- API CONFIGURATION ---
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const POLL_INTERVAL = 10000; // Check for emails every 10 seconds

    // --- STATE VARIABLES ---
    let pollInterval;
    let showWelcomeNotification = $state(false);

    // Dynamic Data State
    let totalActive = $state(0);
    let totalCompleted = $state(0);
    let priorityTasks = $state([]);
    let upcomingDeadlines = $state([]);
    let notifications = $state([]);

    // Donut Chart State (New)
    let categoryStats = $state([]);
    let donutGradient = $state('conic-gradient(#2a2b3d 0% 100%)');

    // --- MAIN SYNC FUNCTION ---
    async function refreshDashboard() {
        try {
            const res = await fetch(GET_URL);
            if (res.ok) {
                const incoming = await res.json();
                let allTasks = [];

                if (incoming.data && Array.isArray(incoming.data)) {
                    allTasks = incoming.data.filter(t => t.isDeleted !== true);
                } else if (Array.isArray(incoming)) {
                    allTasks = incoming;
                }

                // Update UI sections
                processStats(allTasks);
                processWidgets(allTasks);
                processNotifications(allTasks);
                processDonut(allTasks); // <--- Added Donut Processing
            }
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }

    // --- DATA PROCESSORS ---
    function processStats(tasks) {
        const active = tasks.filter(t => t.status !== 'completed');
        const done = tasks.filter(t => t.status === 'completed');
        totalActive = active.length;
        totalCompleted = done.length;
    }

    function processWidgets(tasks) {
        const active = tasks.filter(t => t.status !== 'completed');

        // Priority Tasks (Top 5)
        priorityTasks = active
            .sort((a, b) => {
                const pMap = { high: 3, mid: 2, low: 1 };
                return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
            })
            .slice(0, 5);

        // Deadlines (Next 3)
        upcomingDeadlines = active
            .filter(t => t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3);
    }

    function processNotifications(tasks) {
        // 1. FILTER: Only keep tasks that actually have a valid timestamp
        const now = new Date();
        const validTasks = tasks.filter(t => {
            if (!t.timestamp) return false; // Ignore old tasks with no time
            const taskDate = new Date(t.timestamp);
            if (isNaN(taskDate.getTime())) return false; // Ignore broken dates

            // Only show items from the last 24 hours
            const diffHours = (now - taskDate) / (1000 * 60 * 60);
            return diffHours < 24 && diffHours >= 0;
        });

        // 2. SORT: Newest First (Chronological)
        validTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // 3. MAP: Create the notification UI objects (Top 5)
        notifications = validTasks.slice(0, 5).map(t => {
            // Check if task is from Email (Category 'Email' or 'Inbox')
            const isEmail = t.category?.toLowerCase() === 'email' || t.category?.toLowerCase() === 'inbox';

            // Format time (e.g. "5m ago")
            const diffMins = Math.round((new Date() - new Date(t.timestamp)) / 60000);
            let timeStr = diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
            if (diffMins > 60) timeStr = `${Math.round(diffMins/60)}h ago`;

            return {
                id: t.id || t._id,
                title: isEmail ? `Task "${t.title}" added from email` : `New Task: ${t.title}`,
                category: t.category || 'General',
                time: timeStr,
                isHighlight: isEmail // True if from email
            };
        });
    }

    function processDonut(tasks) {
        // Count tasks per category
        const catCounts = {};
        let statTotal = 0;
        
        // Include all tasks (active + completed) for the breakdown
        tasks.forEach(t => {
            const c = t.category || 'Other';
            catCounts[c] = (catCounts[c] || 0) + 1;
            statTotal++;
        });

        // Calculate Percentages
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        categoryStats = Object.keys(catCounts).map((key, i) => ({
            label: key,
            count: catCounts[key],
            percent: Math.round((catCounts[key] / statTotal) * 100),
            color: colors[i % colors.length]
        }));

        // Build Gradient String for CSS
        if (categoryStats.length > 0) {
            let currentPct = 0;
            const gradientParts = categoryStats.map(stat => {
                const start = currentPct;
                const end = currentPct + stat.percent;
                currentPct = end;
                return `${stat.color} ${start}% ${end}%`;
            });
            donutGradient = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
             donutGradient = 'conic-gradient(#2a2b3d 0% 100%)';
        }
    }

    onMount(async () => {
        showWelcomeNotification = true;

        // 1. Initial Load
        refreshDashboard();

        // 2. Start Auto-Refresh (Polling)
        pollInterval = setInterval(refreshDashboard, POLL_INTERVAL);
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });
</script>

{#if showWelcomeNotification}
    <Notification message="Welcome back!" />
{/if}

<header class="top-header">
    <div class="header-left">
        <h2>Dashboard</h2>
        </div>
    <div class="header-right">
        <div class="search-bar">
            <i class="bx bx-search"></i>
            <input type="text" placeholder="Search..." aria-label="Search" />
        </div>
        <div class="avatar">FS</div>
    </div>
</header>

<div class="dashboard-scroll scroll-area">
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-header">
                <span>Tasks Today</span>
                <i class="bx bx-check-square icon-bg purple"></i>
            </div>
            <div class="stat-value">{totalActive}</div>
            <div class="stat-sub">{totalCompleted} completed total</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <span>Focus Time</span>
                <i class="bx bx-time icon-bg blue"></i>
            </div>
            <div class="stat-value">4.2h</div>
            <div class="stat-sub green-text"><i class="bx bx-up-arrow-alt"></i> +12% vs avg</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <span>Streak</span>
                <i class="bx bx-trending-up icon-bg orange"></i>
            </div>
            <div class="stat-value">12 <span class="unit">days</span></div>
            <div class="stat-sub">Personal best</div>
        </div>
    </div>

    <div class="input-wrapper">
        <i class="bx bx-microphone mic-icon"></i>
        <input
            type="text"
            placeholder="Type or speak to capture a thought..."
            aria-label="Capture thought"
        />
        <button class="send-btn" aria-label="Send thought"><i class="bx bx-send"></i></button>
    </div>

    <div class="widget-grid">
        <div class="widget tasks-widget">
            <div class="widget-header">
                <h3>Priority Tasks</h3>
                <span>{priorityTasks.length}</span>
            </div>
            <div class="task-list">
                {#if priorityTasks.length === 0}
                    <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No active tasks</div>
                {/if}
                {#each priorityTasks as task}
                    <div class="task-item">
                        <div class="circle"></div>
                        <span class="task-text">{task.title}</span>
                        <span class="tag {task.priority ? task.priority.toLowerCase() : 'mid'}">{task.category || 'General'}</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="side-widgets">
            <div class="widget notification-widget">
                <div class="widget-header">
                    <h3>Recent Notifications</h3>
                    <i class="bx bx-bell" style="color: var(--accent-orange)"></i>
                </div>
                <div class="notification-list">
                    {#if notifications.length === 0}
                        <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No new alerts</div>
                    {/if}
                    {#each notifications as notif (notif.id)}
                        <div class="notif-card">
                            <div class="notif-dot {notif.isHighlight ? '' : 'silent'}"></div>
                            <div class="notif-content">
                                <p class="notif-title">{notif.title}</p>
                                <p class="notif-time">{notif.time} • {notif.category}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="widget habits-widget">
                <div class="widget-header">
                    <h3>Habit Breakdown</h3>
                    <i class="bx bx-pie-chart-alt-2" style="color: var(--accent-purple)"></i>
                </div>
                
                {#if categoryStats.length === 0}
                    <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No data yet</div>
                {:else}
                    <div class="donut-row">
                        <div class="donut" style="background: {donutGradient}">
                            <div class="hole"></div>
                        </div>
                        
                        <div class="legend">
                            {#each categoryStats as stat}
                                <div class="legend-item">
                                    <span class="dot" style="background: {stat.color}"></span>
                                    <span class="l-text">{stat.label}</span>
                                    <span class="l-pct">{stat.percent}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <div class="widget deadlines-widget">
                <h3>Deadlines</h3>
                <div class="deadline-list">
                    {#each upcomingDeadlines as task}
                        <div class="deadline-item">
                            <div class="deadline-title">
                                <i class="bx bx-time"></i> {task.title}
                            </div>
                            <span class="time-left">{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* --- HEADER --- */
    .top-header {
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
        border-bottom: 1px solid var(--border-color);
        background-color: var(--bg-dark);
    }
    .header-left h2 {
        color: var(--text-white);
        font-size: 1.25rem;
        margin: 0;
        font-weight: 600;
    }
    /* Removed .status-indicator and .pulse-dot styles since element is removed */

    .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .search-bar {
        position: relative;
        display: none;
    }
    .search-bar input {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        border-radius: 0.5rem;
        color: var(--text-white);
        outline: none;
        width: 16rem;
    }
    .search-bar i {
        position: absolute;
        left: 0.75rem;
        top: 0.6rem;
        color: var(--text-gray);
    }
    .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: linear-gradient(to top right, var(--accent-purple), var(--accent-blue));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.75rem;
        font-weight: bold;
    }

    /* DASHBOARD SCROLL AREA */
    .dashboard-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
    }

    /* STATS GRID */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .stat-card {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.75rem;
        padding: 1.25rem;
    }
    .stat-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: 600;
    }
    .icon-bg {
        padding: 0.35rem;
        border-radius: 0.25rem;
        background-color: var(--card-hover);
        font-size: 1rem;
    }
    .icon-bg.purple {
        color: var(--accent-purple);
    }
    .icon-bg.blue {
        color: var(--accent-blue);
    }
    .icon-bg.green {
        color: var(--accent-green);
    }
    .icon-bg.orange {
        color: var(--accent-orange);
    }

    .stat-value {
        font-size: 1.875rem;
        font-weight: 700;
        color: var(--text-white);
    }
    .stat-sub {
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }
    .green-text {
        color: var(--accent-green);
    }
    .unit {
        font-size: 0.875rem;
        font-weight: 400;
        color: var(--text-gray);
    }

    /* INPUT WRAPPER */
    .input-wrapper {
        position: relative;
        margin-bottom: 1.5rem;
    }
    .input-wrapper input {
        width: 100%;
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 0.875rem 3rem;
        border-radius: 0.75rem;
        color: var(--text-white);
        outline: none;
        box-sizing: border-box;
        font-size: 1rem;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
    }
    .input-wrapper input:focus {
        border-color: var(--accent-purple);
        box-shadow: 0 0 0 1px var(--accent-purple);
    }
    .mic-icon {
        position: absolute;
        left: 1rem;
        top: 1rem;
        color: var(--text-gray);
        font-size: 1.2rem;
    }
    .send-btn {
        position: absolute;
        right: 0.5rem;
        top: 0.5rem;
        background-color: var(--accent-purple);
        border: none;
        color: white;
        padding: 0.35rem 0.5rem;
        border-radius: 0.5rem;
        cursor: pointer;
    }

    /* WIDGET GRID */
    .widget-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    .widget {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.75rem;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
    }
    .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 1rem;
    }
    .widget-header h3 {
        margin: 0;
        font-size: 1rem;
        color: var(--text-white);
    }

    /* NOTIFICATION WIDGET */
    .notif-card {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        border-left: 3px solid var(--accent-orange);
    }
    .notif-dot {
        width: 0.5rem;
        height: 0.5rem;
        background: var(--accent-orange);
        border-radius: 50%;
        margin-right: 0.75rem;
    }
    .notif-dot.silent {
        background: var(--text-gray);
    }
    .notif-title {
        color: var(--text-white);
        font-size: 0.85rem;
        font-weight: 500;
        margin: 0;
    }
    .notif-time {
        color: var(--text-gray);
        font-size: 0.7rem;
        margin: 0.2rem 0 0 0;
    }

    /* TASKS */
    .tasks-widget {
        min-height: 400px;
    }
    .task-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: background 0.2s;
        margin-bottom: 0.25rem;
    }
    .task-item:hover {
        background-color: var(--card-hover);
    }
    .task-item .task-text {
        flex: 1;
        font-size: 0.875rem;
        color: #d1d5db;
        margin: 0 0.75rem;
    }
    .task-item:hover .task-text {
        color: white;
    }
    .circle {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #4b5563;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
    }
    .circle.checked {
        background-color: var(--accent-green);
        border-color: var(--accent-green);
        color: black;
    }
    .tag {
        background-color: #2a2b3d;
        color: #9ca3af;
        font-size: 0.625rem;
        padding: 0.1rem 0.5rem;
        border-radius: 0.25rem;
        margin-right: 0.5rem;
    }
    .task-item.completed .task-text {
        text-decoration: line-through;
        color: #6b7280;
    }
    .task-item.completed {
        opacity: 0.6;
    }

    /* SIDE WIDGETS */
    .side-widgets {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    /* REMOVED: Chart Widget Styles */
    
    /* DONUT CHART (Replaced Chart Widget) */
    .habits-widget { min-height: 140px; }
    .donut-row { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; justify-content: center; }
    .donut { width: 80px; height: 80px; border-radius: 50%; position: relative; flex-shrink: 0; background-color: #2a2b3d; }
    .donut .hole { position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; background: var(--card-bg); border-radius: 50%; }
    .legend { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; color: var(--text-gray); }
    .dot { width: 8px; height: 8px; border-radius: 2px; }
    .l-text { color: white; }
    .l-pct { margin-left: auto; color: var(--text-gray); }

    /* DEADLINES */
    .deadlines-widget {
        flex: 1;
    }
    .deadline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        font-size: 0.875rem;
    }
    .deadline-title {
        display: flex;
        align-items: center;
        color: var(--text-gray);
    }
    .deadline-title.red-text {
        color: var(--accent-red);
    }
    .deadline-title i {
        margin-right: 0.5rem;
        font-size: 1.1rem;
    }
    .time-left {
        font-size: 0.75rem;
        color: #6b7280;
    }

    @media (min-width: 1024px) {
        .search-bar {
            display: block;
        }
        .widget-grid {
            grid-template-columns: 2fr 1fr;
        }
    }

    @media (max-width: 768px) {
        .top-header {
            padding: 0 1rem;
        }
        .search-bar {
            display: none;
        }
    }
</style>
