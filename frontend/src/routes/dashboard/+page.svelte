<script>
    import { onMount, onDestroy } from 'svelte';
    import { slide } from 'svelte/transition';
    import Notification from '$lib/Notification.svelte';

    // --- API CONFIGURATION ---
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const POLL_INTERVAL = 10000;

    // --- STATE VARIABLES ---
    let pollInterval;
    let showWelcomeNotification = $state(false);

    // Dynamic Data State
    let totalActive = $state(0);
    let totalCompleted = $state(0);
    let priorityTasks = $state([]);
    let upcomingDeadlines = $state([]);
    let notifications = $state([]);
    let allTasks = $state([]);

    // Modal States
    let showNotifModal = $state(false);
    let showHabitModal = $state(false);
    let selectedNotifId = $state(null);

    // Donut Chart State
    let categoryStats = $state([]);
    let donutGradient = $state('conic-gradient(#2a2b3d 0% 100%)');

    // --- MAIN SYNC FUNCTION ---
    async function refreshDashboard() {
        try {
            const res = await fetch(GET_URL);
            if (res.ok) {
                const incoming = await res.json();
                let tasks = [];

                if (incoming.data && Array.isArray(incoming.data)) {
                    tasks = incoming.data.filter(t => t.isDeleted !== true);
                } else if (Array.isArray(incoming)) {
                    tasks = incoming;
                }
                allTasks = tasks;

                updateAllProcessors();
            }
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }

    function updateAllProcessors() {
        processStats(allTasks);
        processWidgets(allTasks);
        processNotifications(allTasks);
        processDonut(allTasks);
    }

    // --- TASK ACTIONS ---
    async function completeTask(task) {
        const taskId = task.id || task._id;
        
        // 1. Optimistic UI Update
        allTasks = allTasks.map(t => {
            const tId = t.id || t._id;
            if (tId === taskId) {
                return { ...t, status: 'completed', completionTime: new Date().toISOString() };
            }
            return t;
        });
        updateAllProcessors();

        // 2. API Call
        try {
            await fetch(MANAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    id: taskId,
                    updateFields: { 
                        status: 'completed', 
                        completionTime: new Date().toISOString() 
                    }
                })
            });
        } catch (e) {
            console.error("Failed to complete task:", e);
            // Optional: Revert on failure
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
        
        // Sorted by TIME (Deadline first, then creation time)
        priorityTasks = active
            .sort((a, b) => {
                const timeA = a.deadline ? new Date(a.deadline) : new Date(a.timestamp || 0);
                const timeB = b.deadline ? new Date(b.deadline) : new Date(b.timestamp || 0);
                return timeA - timeB;
            })
            .slice(0, 8); // Showing a bit more since it's dynamic now

        upcomingDeadlines = active
            .filter(t => t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3);
    }

    function processNotifications(tasks) {
        const now = new Date();
        const validTasks = tasks.filter(t => {
            if (!t.timestamp) return false;
            const taskDate = new Date(t.timestamp);
            if (isNaN(taskDate.getTime())) return false;
            const diffHours = (now - taskDate) / (1000 * 60 * 60);
            return diffHours < 24 && diffHours >= 0;
        });

        validTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        notifications = validTasks.slice(0, 15).map(t => { 
            const isEmail = t.category?.toLowerCase() === 'email' || t.category?.toLowerCase() === 'inbox';
            const diffMins = Math.round((new Date() - new Date(t.timestamp)) / 60000);
            let timeStr = diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
            if (diffMins > 60) timeStr = `${Math.round(diffMins/60)}h ago`;

            return {
                id: t.id || t._id,
                title: isEmail ? `Task "${t.title}" added from email` : `New Task: ${t.title}`,
                category: t.category || 'General',
                time: timeStr,
                isHighlight: isEmail,
                priority: t.priority || 'mid',
                status: t.status || 'pending',
                fullDate: new Date(t.timestamp).toLocaleString()
            };
        });
    }

    function processDonut(tasks) {
        const catCounts = {};
        let statTotal = 0;
        tasks.forEach(t => {
            const c = t.category || 'Other';
            catCounts[c] = (catCounts[c] || 0) + 1;
            statTotal++;
        });

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        categoryStats = Object.keys(catCounts).map((key, i) => ({
            label: key,
            count: catCounts[key],
            percent: Math.round((catCounts[key] / statTotal) * 100),
            color: colors[i % colors.length]
        }));

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

    function toggleNotif(id) {
        selectedNotifId = selectedNotifId === id ? null : id;
    }

    onMount(async () => {
        showWelcomeNotification = true;
        refreshDashboard();
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
                    <div style="padding:2rem; color:#9ca3af; text-align:center; font-style:italic;">All caught up!</div>
                {/if}
                {#each priorityTasks as task (task.id || task._id)}
                    <div class="task-item" transition:slide|local>
                        <button class="complete-btn" on:click={() => completeTask(task)} title="Mark as complete">
                            <div class="circle"></div>
                        </button>
                        <span class="task-text">{task.title}</span>
                        <div class="task-meta-info">
                            {#if task.deadline}
                                <span class="time-tag"><i class="bx bx-time-five"></i> {new Date(task.deadline).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {/if}
                            <span class="tag {task.priority ? task.priority.toLowerCase() : 'mid'}">{task.category || 'General'}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="side-widgets">
            <button class="widget notification-widget clickable" on:click={() => showNotifModal = true}>
                <div class="widget-header">
                    <h3>Recent Notifications</h3>
                    <i class="bx bx-bell" style="color: var(--accent-orange)"></i>
                </div>
                <div class="notification-list">
                    {#if notifications.length === 0}
                        <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No new alerts</div>
                    {/if}
                    {#each notifications.slice(0, 5) as notif (notif.id)}
                        <div class="notif-card">
                            <div class="notif-dot {notif.isHighlight ? '' : 'silent'}"></div>
                            <div class="notif-content">
                                <p class="notif-title">{notif.title}</p>
                                <p class="notif-time">{notif.time} • {notif.category}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </button>

            <button class="widget habits-widget clickable" on:click={() => showHabitModal = true}>
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
                            {#each categoryStats.slice(0, 4) as stat}
                                <div class="legend-item">
                                    <span class="dot" style="background: {stat.color}"></span>
                                    <span class="l-text">{stat.label}</span>
                                    <span class="l-pct">{stat.percent}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </button>

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

<!-- --- MODALS --- -->

{#if showNotifModal}
    <div class="modal-backdrop" on:click={() => { showNotifModal = false; selectedNotifId = null; }}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3><i class="bx bx-bell"></i> Recent Alerts</h3>
                <button class="close-btn" on:click={() => { showNotifModal = false; selectedNotifId = null; }}><i class="bx bx-x"></i></button>
            </div>
            
            <div class="modal-body notif-modal-body">
                <div class="notif-accordion">
                    {#each notifications as notif}
                        <div class="notif-group" class:expanded={selectedNotifId === notif.id}>
                            <button class="notif-trigger" on:click={() => toggleNotif(notif.id)}>
                                <div class="notif-dot {notif.isHighlight ? '' : 'silent'}"></div>
                                <div class="notif-main">
                                    <p class="notif-title">{notif.title}</p>
                                    <p class="notif-meta">{notif.time} • {notif.category}</p>
                                </div>
                                <i class="bx bx-chevron-down chevron"></i>
                            </button>
                            
                            {#if selectedNotifId === notif.id}
                                <div class="notif-details" transition:slide={{ duration: 250 }}>
                                    <div class="details-inner">
                                        <div class="detail-row">
                                            <div class="detail-col">
                                                <label>Task Status</label>
                                                <p>{notif.status.replace('_', ' ')}</p>
                                            </div>
                                            <div class="detail-col">
                                                <label>Priority Level</label>
                                                <span class="tag {notif.priority}">{notif.priority}</span>
                                            </div>
                                        </div>
                                        <div class="detail-row">
                                            <div class="detail-col">
                                                <label>Source Category</label>
                                                <p>{notif.category}</p>
                                            </div>
                                            <div class="detail-col">
                                                <label>Received At</label>
                                                <p>{notif.fullDate}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                    {#if notifications.length === 0}
                         <div class="empty-notif">
                            <i class="bx bx-notification-off"></i>
                            <p>No notifications in the last 24 hours</p>
                         </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

{#if showHabitModal}
    <div class="modal-backdrop" on:click={() => showHabitModal = false}>
        <div class="modal-content habit-modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3><i class="bx bx-pie-chart-alt-2"></i> Habit Breakdown</h3>
                <button class="close-btn" on:click={() => showHabitModal = false}><i class="bx bx-x"></i></button>
            </div>
            <div class="modal-body habit-body">
                <div class="donut large" style="background: {donutGradient}">
                    <div class="hole"></div>
                    <div class="donut-center">
                        <span class="total-val">{allTasks.length}</span>
                        <span class="total-lbl">Total Tasks</span>
                    </div>
                </div>
                
                <div class="full-legend">
                    {#each categoryStats as stat}
                        <div class="legend-row">
                            <span class="dot" style="background: {stat.color}"></span>
                            <span class="label">{stat.label}</span>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: {stat.percent}%; background: {stat.color}"></div>
                            </div>
                            <span class="val">{stat.percent}%</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* --- SHARED & HEADER --- */
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
    .header-right { display: flex; align-items: center; gap: 1rem; }
    .search-bar { position: relative; display: none; }
    .search-bar input {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        border-radius: 0.5rem;
        color: var(--text-white);
        width: 16rem;
    }
    .search-bar i { position: absolute; left: 0.75rem; top: 0.6rem; color: var(--text-gray); }
    .avatar {
        width: 2rem; height: 2rem; border-radius: 50%;
        background: linear-gradient(to top right, var(--accent-purple), var(--accent-blue));
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 0.75rem; font-weight: bold;
    }

    /* --- LAYOUT & SCROLL --- */
    .dashboard-scroll { flex: 1; overflow-y: auto; padding: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
    .stat-card { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; }
    .stat-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .icon-bg { padding: 0.35rem; border-radius: 0.25rem; background-color: var(--card-hover); font-size: 1rem; }
    .icon-bg.purple { color: var(--accent-purple); }
    .icon-bg.blue { color: var(--accent-blue); }
    .icon-bg.orange { color: var(--accent-orange); }

    .stat-value { font-size: 1.875rem; font-weight: 700; color: var(--text-white); }
    .stat-sub { font-size: 0.75rem; margin-top: 0.25rem; }
    .green-text { color: var(--accent-green); }
    .unit { font-size: 0.875rem; font-weight: 400; color: var(--text-gray); }

    /* --- INPUT --- */
    .input-wrapper { position: relative; margin-bottom: 1.5rem; }
    .input-wrapper input {
        width: 100%; background-color: var(--card-bg); border: 1px solid var(--border-color);
        padding: 0.875rem 3rem; border-radius: 0.75rem; color: var(--text-white); outline: none; font-size: 1rem;
        transition: border-color 0.2s;
    }
    .input-wrapper input:focus { border-color: var(--accent-purple); }
    .mic-icon { position: absolute; left: 1rem; top: 1rem; color: var(--text-gray); font-size: 1.2rem; }
    .send-btn { position: absolute; right: 0.5rem; top: 0.5rem; background-color: var(--accent-purple); border: none; color: white; padding: 0.35rem 0.5rem; border-radius: 0.5rem; cursor: pointer; }

    /* --- WIDGETS --- */
    .widget-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: start; }
    .widget { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; text-align: left; transition: transform 0.2s, border-color 0.2s; }
    .widget.clickable { cursor: pointer; }
    .widget.clickable:hover { border-color: var(--accent-purple); transform: translateY(-2px); }
    .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; width: 100%; }
    .widget-header h3 { margin: 0; font-size: 1rem; color: var(--text-white); }

    .notif-card { display: flex; align-items: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 3px solid var(--accent-orange); width: 100%; }
    .notif-dot { width: 0.5rem; height: 0.5rem; background: var(--accent-orange); border-radius: 50%; margin-right: 0.75rem; flex-shrink: 0; }
    .notif-dot.silent { background: var(--text-gray); }
    .notif-title { color: var(--text-white); font-size: 0.85rem; font-weight: 500; margin: 0; }
    .notif-time { color: var(--text-gray); font-size: 0.7rem; margin: 0.2rem 0 0 0; }

    /* TASKS WIDGET (DYNAMIC SIZE) */
    .tasks-widget { min-height: auto; } /* Removed fixed 400px */
    .task-item { 
        display: flex; align-items: center; padding: 0.875rem; border-radius: 0.5rem; margin-bottom: 0.5rem;
        background: rgba(255,255,255,0.02); border: 1px solid transparent; transition: all 0.2s;
    }
    .task-item:hover { background: rgba(255,255,255,0.05); border-color: var(--border-color); }
    .task-text { flex: 1; font-size: 0.875rem; color: #d1d5db; margin: 0 0.75rem; }
    
    .complete-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; }
    .circle { width: 1.25rem; height: 1.25rem; border: 2px solid #4b5563; border-radius: 50%; transition: all 0.2s; }
    .complete-btn:hover .circle { border-color: var(--accent-green); background: rgba(34, 197, 94, 0.1); }
    
    .task-meta-info { display: flex; align-items: center; gap: 0.75rem; }
    .time-tag { font-size: 0.7rem; color: var(--text-gray); display: flex; align-items: center; gap: 0.25rem; }
    .tag { font-size: 0.625rem; padding: 0.15rem 0.5rem; border-radius: 0.25rem; text-transform: capitalize; }
    .tag.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .tag.mid { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .tag.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

    .side-widgets { display: flex; flex-direction: column; gap: 1.5rem; }
    .habits-widget { min-height: 140px; }
    .donut-row { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; justify-content: center; width: 100%; }
    .donut { width: 80px; height: 80px; border-radius: 50%; position: relative; flex-shrink: 0; background-color: #2a2b3d; }
    .donut.large { width: 180px; height: 180px; margin: 0 auto; }
    .donut .hole { position: absolute; background: var(--card-bg); border-radius: 50%; }
    .donut:not(.large) .hole { top: 12px; left: 12px; right: 12px; bottom: 12px; }
    .donut.large .hole { top: 30px; left: 30px; right: 30px; bottom: 30px; }
    
    .legend { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; color: var(--text-gray); }
    .dot { width: 8px; height: 8px; border-radius: 2px; }
    .l-text { color: white; }
    .l-pct { margin-left: auto; color: var(--text-gray); }

    .deadline-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .deadline-title { display: flex; align-items: center; color: var(--text-gray); gap: 0.5rem; }
    .time-left { font-size: 0.75rem; color: #6b7280; }

    /* --- MODALS --- */
    .modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
        background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 1.5rem;
        width: 90%; max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .modal-header {
        padding: 1.5rem; border-bottom: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h3 { margin: 0; color: white; display: flex; align-items: center; gap: 0.75rem; font-size: 1.1rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.5rem; transition: color 0.2s; }
    .close-btn:hover { color: white; }
    
    .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }

    /* --- NOTIF ACCORDION --- */
    .notif-accordion { display: flex; flex-direction: column; gap: 0.75rem; }
    .notif-group {
        border: 1px solid var(--border-color); border-radius: 1rem; background: rgba(255, 255, 255, 0.02);
        overflow: hidden; transition: all 0.3s ease;
    }
    .notif-group.expanded { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.05); }
    .notif-trigger {
        width: 100%; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;
        background: none; border: none; cursor: pointer; text-align: left;
    }
    .notif-main { flex: 1; }
    .notif-group .chevron { color: var(--text-gray); transition: transform 0.3s; }
    .notif-group.expanded .chevron { transform: rotate(180deg); color: var(--accent-purple); }
    .notif-meta { font-size: 0.7rem; color: var(--text-gray); margin: 0.25rem 0 0; }
    
    .notif-details { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    .details-inner { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-col label { display: block; font-size: 0.65rem; text-transform: uppercase; color: var(--text-gray); margin-bottom: 0.4rem; letter-spacing: 0.05em; }
    .detail-col p { margin: 0; color: white; font-size: 0.9rem; font-weight: 500; }
    
    .empty-notif { text-align: center; padding: 4rem 2rem; color: var(--text-gray); }
    .empty-notif i { font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block; }

    /* --- HABIT MODAL --- */
    .habit-modal { max-width: 500px; }
    .habit-body { padding: 2.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
    .donut-center {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .total-val { font-size: 2.5rem; font-weight: 800; color: white; line-height: 1; }
    .total-lbl { font-size: 0.8rem; color: var(--text-gray); text-transform: uppercase; }
    .full-legend { display: flex; flex-direction: column; gap: 1.25rem; }
    .legend-row { display: flex; align-items: center; gap: 1rem; }
    .legend-row .label { width: 80px; color: white; font-size: 0.85rem; }
    .progress-track { flex: 1; height: 6px; background: var(--bg-dark); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; }
    .legend-row .val { width: 40px; text-align: right; color: var(--text-gray); font-size: 0.85rem; font-weight: 600; }

    @media (min-width: 1024px) {
        .search-bar { display: block; }
        .widget-grid { grid-template-columns: 2fr 1fr; }
    }
    @media (max-width: 768px) {
        .top-header { padding: 0 1rem; }
        .dashboard-scroll { padding: 1rem; }
        .detail-row { grid-template-columns: 1fr; }
    }
</style>
