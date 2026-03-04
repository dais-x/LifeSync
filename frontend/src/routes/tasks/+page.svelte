<script>
    import { onMount } from 'svelte';
    import { slide, fly, fade } from 'svelte/transition';
    import Notification from '$lib/Notification.svelte';

    // --- API CONFIGURATION ---
    const SEND_URL = 'https://fahim-n8n.laddu.cc/webhook/sync-task';
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const CURRENT_USER_ID = "user_456"; 

    let showAddTaskPopup = $state(false);
    let mobileTab = $state('todo'); // 'todo', 'progress', 'completed'
    
    // State for the new task form
    let newTaskName = $state('');
    let newTaskDeadline = $state('');
    let newTaskTime = $state('23:59');
    let newTaskPriority = $state('mid');
    let repeatOption = $state('never');
    let customDays = $state([]); 
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Category with Colors
    let categories = $state([
        { name: 'Study', color: '#6366f1' },
        { name: 'Work', color: '#3b82f6' },
        { name: 'Home', color: '#f59e0b' },
        { name: 'Fitness', color: '#10b981' },
        { name: 'Groceries', color: '#ec4899' }
    ]);
    let selectedCategory = $state('Study');
    let newCategoryInput = $state('');
    let newCategoryColor = $state('#6366f1');

    const presetColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];

    // --- TASK ARRAYS ---
    let todo = $state([]);
    let inProgress = $state([]);
    let completed = $state([]);

    // --- FILTER STATE ---
    let todoFilter = $state('all'); 
    let filterStartDate = $state('');
    let filterEndDate = $state('');

    let notificationMessage = $state('');
    let notificationKey = $state(0);
    let selectedTask = $state(null); 

    let filteredTodo = $derived.by(() => {
        if (todoFilter === 'all') return todo;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrow = today + 86400000;
        const nextWeek = today + (7 * 86400000);

        return todo.filter(t => {
            if (!t.deadline) return todoFilter === 'all';
            const d = new Date(t.deadline).getTime();
            if (todoFilter === 'today') return d >= today && d < tomorrow;
            if (todoFilter === 'tomorrow') return d >= tomorrow && d < (tomorrow + 86400000);
            if (todoFilter === 'week') return d >= today && d <= nextWeek;
            if (todoFilter === 'range') {
                if (!filterStartDate || !filterEndDate) return true;
                const s = new Date(filterStartDate).getTime();
                const e = new Date(filterEndDate).setHours(23, 59, 59, 999);
                return d >= s && d <= e;
            }
            return true;
        });
    });

    function getRandomColor() {
        return presetColors[Math.floor(Math.random() * presetColors.length)];
    }

    function randomizeNewCategoryColor() {
        newCategoryColor = getRandomColor();
    }

    async function fetchTasks() {
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
                todo = []; inProgress = []; completed = [];
                allTasks.forEach(task => {
                    const uiTask = {
                        id: task._id || task.id, 
                        name: task.title || "Untitled",
                        category: task.category || "General",
                        priority: task.priority || "mid",
                        deadline: task.deadline || "",
                        status: task.status || "pending",
                        user: "ME", attachments: 0, progress: task.progress || 0,
                        completionTime: task.completionTime || null,
                        customDays: task.customDays || [],
                        color: task.color || null
                    };
                    if (uiTask.status === 'completed') completed.push(uiTask);
                    else if (uiTask.status === 'in_progress') inProgress.push(uiTask);
                    else todo.push(uiTask);
                });
                todo = [...todo]; inProgress = [...inProgress]; completed = [...completed];
                sortTodo();
            }
        } catch (e) { console.error("Failed to load tasks:", e); }
    }

    async function handleAddTask() {
        if (newTaskName.trim() === '' || selectedCategory.trim() === '') return;
        const combinedDeadline = newTaskDeadline ? `${newTaskDeadline} ${newTaskTime}` : '';
        const catObj = categories.find(c => c.name === selectedCategory);
        const payload = {
            user_id: CURRENT_USER_ID, title: newTaskName, status: "pending", 
            priority: newTaskPriority, category: selectedCategory, deadline: combinedDeadline,
            timestamp: new Date().toISOString(), color: catObj?.color || '#6366f1'
        };
        todo = [{ id: "temp-"+Date.now(), name: newTaskName, category: selectedCategory, priority: newTaskPriority, deadline: combinedDeadline, status: "pending", user: "ME", attachments: 0, color: catObj?.color }, ...todo];
        sortTodo();
        notificationMessage = `Added "${newTaskName}" to To Do!`;
        notificationKey++;
        togglePopup();
        try {
            await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            await fetchTasks();
        } catch (error) { console.error('Error sending task:', error); }
    }

    async function apiManageTask(action, task, updateFields = {}) {
        if (String(task.id).startsWith('temp-')) return; 
        try {
            await fetch(MANAGE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: task.id, updateFields }) });
        } catch (e) { console.error("Manage action failed:", e); }
    }

    function sortTodo() {
        const priorityOrder = { 'past_deadline': 4, 'high': 3, 'mid': 2, 'low': 1 };
        todo.sort((a, b) => {
            const getPrio = (p) => (p || 'mid').toLowerCase();
            return (priorityOrder[getPrio(b.priority)] || 0) - (priorityOrder[getPrio(a.priority)] || 0);
        });
        todo = [...todo]; 
    }

    function togglePopup() {
        showAddTaskPopup = !showAddTaskPopup;
        if (!showAddTaskPopup) {
            newTaskName = ''; newTaskDeadline = ''; newTaskTime = '23:59';
            newTaskPriority = 'mid'; repeatOption = 'never'; customDays = [];
            selectedCategory = categories[0]?.name || ''; newCategoryInput = '';
        }
    }

    function handleAddCategory() {
        if (newCategoryInput.trim() !== '' && !categories.some(c => c.name === newCategoryInput.trim())) {
            categories = [...categories, { name: newCategoryInput.trim(), color: newCategoryColor }];
            selectedCategory = newCategoryInput.trim();
            newCategoryInput = '';
            randomizeNewCategoryColor();
        }
    }

    function handleDeleteCategory(categoryName) {
        categories = categories.filter(c => c.name !== categoryName);
        if (selectedCategory === categoryName) selectedCategory = categories[0]?.name || '';
    }

    let activeMenu = $state(null);
    function toggleTaskMenu(taskId) { activeMenu = activeMenu === taskId ? null : taskId; }

    function handleProgressChange(task, event) {
        task.progress = parseInt(event.target.value);
        if (task.progress === 100) moveToCompleted(task);
        else { inProgress = [...inProgress]; apiManageTask('update', task, { progress: task.progress }); }
    }

    function moveToCompleted(task) {
        const taskToMove = { ...task, completionTime: new Date().toISOString(), status: 'completed' };
        completed = [taskToMove, ...completed];
        todo = todo.filter(t => t.id !== task.id);
        inProgress = inProgress.filter(t => t.id !== task.id);
        notificationMessage = `Task Completed!`;
        notificationKey++;
        activeMenu = null;
        apiManageTask('update', task, { status: 'completed', completionTime: new Date().toISOString() });
    }

    function moveToInProgress(task) {
        inProgress = [{ ...task, progress: 0, status: 'in_progress' }, ...inProgress];
        todo = todo.filter(t => t.id !== task.id);
        activeMenu = null;
        apiManageTask('update', task, { status: 'in_progress', progress: 0 });
    }

    function deleteTask(taskId) {
        const task = todo.find(t => t.id === taskId) || inProgress.find(t => t.id === taskId) || completed.find(t => t.id === taskId);
        todo = todo.filter(t => t.id !== taskId);
        inProgress = inProgress.filter(t => t.id !== taskId);
        completed = completed.filter(t => t.id !== taskId);
        activeMenu = null;
        if (task) apiManageTask('delete', task);
    }

    function getCatColor(catName) { return categories.find(c => c.name === catName)?.color || '#6366f1'; }

    onMount(fetchTasks);
</script>

<div class="scroll-area fade-in">
    <div class="header-actions">
        <h2>Tasks</h2>
        <button class="new-task-btn" on:click={togglePopup}><i class="bx bx-plus"></i> New Task </button>
    </div>

    <div class="ghost-alert">
        <i class="bx bxs-ghost"></i>
        <div>
            <h4>Ghost Mode Active</h4>
            <p>AI has auto-rescheduled 3 tasks due to low energy prediction.</p>
        </div>
    </div>

    <!-- Mobile Tab Switcher -->
    <div class="mobile-tabs">
        <button class:active={mobileTab === 'todo'} on:click={() => mobileTab = 'todo'}>
            To Do <span>{filteredTodo.length}</span>
        </button>
        <button class:active={mobileTab === 'progress'} on:click={() => mobileTab = 'progress'}>
            Progress <span>{inProgress.length}</span>
        </button>
        <button class:active={mobileTab === 'completed'} on:click={() => mobileTab = 'completed'}>
            Done <span>{completed.length}</span>
        </button>
    </div>

    <div class="kanban-wrapper">
        <div class="kanban-board" class:show-todo={mobileTab === 'todo'} class:show-progress={mobileTab === 'progress'} class:show-completed={mobileTab === 'completed'}>
            <!-- TO DO COLUMN -->
            <div class="kanban-col">
                <div class="col-header">
                    <div class="header-left-side">
                        <span>To Do</span>
                        <div class="filter-wrapper">
                            <select bind:value={todoFilter} class="todo-filter-select">
                                <option value="all">All</option>
                                <option value="today">Today</option>
                                <option value="tomorrow">Tomorrow</option>
                                <option value="week">Week</option>
                            </select>
                        </div>
                    </div>
                    <span class="badge">{filteredTodo.length}</span>
                </div>

                {#each filteredTodo as task (task.id)}
                    <div class="task-card" on:click={() => selectedTask = task} in:fade>
                        <div class="card-header-actions">
                            <div class="tag-row">
                                <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                                <span class="tag-priority {task.priority.toLowerCase()}">{task.priority}</span>
                            </div>
                            <div class="task-actions">
                                <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                {#if activeMenu === task.id}
                                    <div class="actions-menu" transition:slide>
                                        <button on:click={(e) => { e.stopPropagation(); moveToInProgress(task); }}><i class='bx bx-loader-alt'></i> Start</button>
                                        <button on:click={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                        <button on:click={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        <h4>{task.name}</h4>
                    </div>
                {/each}
            </div>

            <!-- IN PROGRESS COLUMN -->
            <div class="kanban-col">
                <div class="col-header">In Progress <span class="badge">{inProgress.length}</span></div>
                {#each inProgress as task (task.id)}
                    <div class="task-card" on:click={() => selectedTask = task} in:fade>
                        <div class="card-header-actions">
                            <div class="tag-row">
                                <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                            </div>
                            <div class="task-actions">
                                <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                {#if activeMenu === task.id}
                                    <div class="actions-menu" transition:slide>
                                        <button on:click={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                        <button on:click={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        <h4>{task.name}</h4>
                        <input type="range" min="0" max="100" value={task.progress} on:input={(e) => handleProgressChange(task, e)} on:click|stopPropagation class="progress-slider" style="accent-color: {getCatColor(task.category)}" />
                    </div>
                {/each}
            </div>

            <!-- COMPLETED COLUMN -->
            <div class="kanban-col">
                <div class="col-header">Completed <span class="badge">{completed.length}</span></div>
                {#each completed as task (task.id)}
                    <div class="task-card completed" on:click={() => selectedTask = task} in:fade>
                        <div class="card-header-actions">
                            <h4>{task.name}</h4>
                            <div class="task-actions">
                                <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                {#if activeMenu === task.id}
                                    <div class="actions-menu" transition:slide>
                                        <button on:click={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<!-- Add New Task Popup -->
{#if showAddTaskPopup}
    <div class="popup-backdrop" on:click={togglePopup}>
        <div class="popup" on:click|stopPropagation>
            <div class="popup-header">
                <h3>Add New Task</h3>
                <button class="close-btn" on:click={togglePopup}><i class="bx bx-x"></i></button>
            </div>
            <form on:submit|preventDefault={handleAddTask} class="task-form">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Task Name</label>
                        <input type="text" bind:value={newTaskName} placeholder="e.g., Code Refactor">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Deadline Date</label>
                        <input type="date" bind:value={newTaskDeadline}>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Priority</label>
                        <select bind:value={newTaskPriority}>
                            <option value="low">Low</option>
                            <option value="mid">Mid</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Time</label>
                        <input type="time" bind:value={newTaskTime}>
                    </div>
                    <div class="form-group">
                        <label>Repeat</label>
                        <select bind:value={repeatOption}>
                            <option value="never">Never</option>
                            <option value="daily">Daily</option>
                            <option value="weekdays">Week days</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Category Color</label>
                    <div class="custom-color-picker">
                        <div class="color-grid">
                            {#each presetColors as color}
                                <button type="button" class="color-circle" class:selected={newCategoryColor === color} style="background: {color}" on:click={() => newCategoryColor = color}></button>
                            {/each}
                            <div class="color-input-wrapper">
                                <input type="color" bind:value={newCategoryColor} class="hidden-color-input">
                                <i class="bx bx-plus custom-plus"></i>
                            </div>
                            <button type="button" class="shuffle-btn" on:click={randomizeNewCategoryColor}><i class="bx bx-shuffle"></i></button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Category Name</label>
                    <div class="add-category-v2">
                        <input type="text" bind:value={newCategoryInput} placeholder="Category name...">
                        <button type="button" on:click={handleAddCategory} class="add-category-btn"><i class="bx bx-plus"></i> Add</button>
                    </div>
                    <div class="category-chips">
                        {#each categories as category}
                            <button type="button" class="chip" class:selected={selectedCategory === category.name} on:click={() => selectedCategory = category.name}>
                                <span class="dot" style="background: {category.color}"></span>
                                {category.name}
                            </button>
                        {/each}
                    </div>
                </div>

                <button type="submit" class="save-btn">Add Task</button>
            </form>
        </div>
    </div>
{/if}

<style>
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h2 { color: white; margin: 0; }
    .new-task-btn { background: var(--accent-purple); color: white; border: none; padding: 0.6rem 1rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }

    .ghost-alert { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 1rem; border-radius: 0.75rem; display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .ghost-alert i { font-size: 1.5rem; color: var(--accent-purple); }
    .ghost-alert h4 { color: white; margin: 0; font-size: 0.9rem; }
    .ghost-alert p { color: var(--text-gray); margin: 0.2rem 0 0; font-size: 0.8rem; }

    /* Mobile Tab Switcher */
    .mobile-tabs { display: none; margin-bottom: 1.5rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 0.25rem; gap: 0.25rem; }
    .mobile-tabs button { flex: 1; background: none; border: none; color: var(--text-gray); padding: 0.6rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .mobile-tabs button.active { background: var(--accent-purple); color: white; }
    .mobile-tabs span { opacity: 0.5; font-size: 0.7rem; margin-left: 0.25rem; }

    /* Kanban Board Layout */
    .kanban-wrapper { width: 100%; overflow: hidden; }
    .kanban-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; align-items: start; transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
    
    /* ORIGINAL COLUMN STYLES RESTORED */
    .kanban-col { background: var(--card-bg); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-color); min-height: 500px; }
    .col-header { display: flex; justify-content: space-between; align-items: center; color: var(--text-white); font-weight: 600; margin-bottom: 1.5rem; font-size: 0.9rem; }
    
    .header-left-side { display: flex; align-items: center; gap: 0.75rem; }
    .todo-filter-select { background: #1e1f2e; color: var(--text-gray); border: 1px solid var(--border-color); padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; outline: none; }

    .badge { background: #1e1f2e; color: var(--text-gray); padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; }
    
    /* ORIGINAL TASK CARD STYLES RESTORED */
    .task-card { background: #1e1f2e; padding: 1.25rem; border-radius: 0.5rem; border: 1px solid var(--border-color); margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; }
    .task-card:hover { border-color: var(--accent-purple); transform: translateY(-2px); }
    .task-card.completed h4 { text-decoration: line-through; opacity: 0.6; }
    .task-card h4 { color: white; margin: 0.5rem 0; font-size: 0.9rem; font-weight: 500; }
    
    .tag-row { display: flex; align-items: center; gap: 0.5rem; }
    .tag { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-weight: 500; border-left: 3px solid transparent; background: rgba(255,255,255,0.05); color: white; }
    .tag-priority { font-size: 0.6rem; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 0.2rem; font-weight: 700; background: rgba(255, 255, 255, 0.1); color: #fff; }
    .tag-priority.high { background: #f87171; }
    .tag-priority.mid { background: #fb923c; }
    .tag-priority.low { background: #4ade80; }

    .task-actions { position: relative; }
    .options-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.25rem; }
    .actions-menu { position: absolute; top: 100%; right: 0; background: #2a2c41; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.5rem; z-index: 50; width: 160px; display: flex; flex-direction: column; gap: 0.25rem; }
    .actions-menu button { background: none; border: none; color: var(--text-gray); padding: 0.5rem 0.75rem; text-align: left; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .actions-menu button:hover { background: var(--accent-purple); color: white; }
    .actions-menu .delete { color: #f87171; }

    .progress-slider { width: 100%; margin-top: 0.75rem; }

    /* Premium Color Picker */
    .color-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }
    .color-circle { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
    .color-circle.selected { border-color: white; transform: scale(1.1); box-shadow: 0 0 12px rgba(255,255,255,0.2); }
    .color-input-wrapper { position: relative; width: 30px; height: 30px; border-radius: 50%; background: #1e1f2e; border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .hidden-color-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .shuffle-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; margin-left: auto; }

    .category-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .chip { background: #1e1f2e; border: 1px solid var(--border-color); color: white; padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
    .chip.selected { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.1); }
    .chip .dot { width: 8px; height: 8px; border-radius: 50%; }

    /* Mobile Popup Optimization */
    .popup-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(4px); }
    .popup { background: var(--card-bg); border-radius: 1.5rem; padding: 1.5rem; width: 95%; max-width: 550px; border: 1px solid var(--border-color); max-height: 90vh; overflow-y: auto; }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); font-size: 1.5rem; cursor: pointer; }
    .task-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: flex; gap: 1rem; width: 100%; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
    .form-group label { color: var(--text-gray); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.75rem; border-radius: 0.5rem; font-size: 16px; width: 100%; outline: none; }
    
    .add-category-v2 { display: flex; gap: 0.5rem; }
    .add-category-btn { background: var(--border-color); color: white; border: none; border-radius: 0.5rem; padding: 0 1rem; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
    .save-btn { background: var(--accent-purple); color: white; border: none; padding: 1rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer; margin-top: 0.5rem; font-size: 1rem; }

    /* Sliding Animation Logic */
    @media (max-width: 768px) {
        .mobile-tabs { display: flex; }
        .kanban-board { display: flex; width: 300%; gap: 0; }
        .kanban-col { flex: 1; border: none; background: none; } /* On mobile we hide column borders to allow seamless sliding */
        .show-todo { transform: translateX(0); }
        .show-progress { transform: translateX(-33.333%); }
        .show-completed { transform: translateX(-66.666%); }
        .form-row { flex-direction: column; }
    }

    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
