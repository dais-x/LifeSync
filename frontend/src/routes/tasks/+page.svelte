<script>
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import Notification from '$lib/Notification.svelte';

    // --- API CONFIGURATION ---
    const SEND_URL = 'https://fahim-n8n.laddu.cc/webhook/sync-task';
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const CURRENT_USER_ID = "user_456"; 

    let showAddTaskPopup = $state(false);
    
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

    // --- TASK ARRAYS ---
    let todo = $state([]);
    let inProgress = $state([]);
    let completed = $state([]);

    // --- FILTER STATE ---
    let todoFilter = $state('all'); // all, today, tomorrow, week, range
    let filterStartDate = $state('');
    let filterEndDate = $state('');

    let notificationMessage = $state('');
    let notificationKey = $state(0);
    let selectedTask = $state(null); 

    // --- DERIVED FILTERED TODO ---
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
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function randomizeNewCategoryColor() {
        newCategoryColor = getRandomColor();
    }

    // --- 1. FETCH TASKS (READ) ---
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
                    const safeId = task._id ? task._id : task.id;
                    
                    const uiTask = {
                        id: safeId, 
                        name: task.title || "Untitled",
                        category: task.category || "General",
                        priority: task.priority || "mid",
                        deadline: task.deadline || "",
                        status: task.status || "pending",
                        user: "ME", 
                        attachments: 0,
                        progress: task.progress || 0,
                        completionTime: task.completionTime || null,
                        customDays: task.customDays || [],
                        color: task.color || null // Support for custom category color if backend has it
                    };

                    if (uiTask.status === 'completed') {
                        completed.push(uiTask);
                    } else if (uiTask.status === 'in_progress') {
                        inProgress.push(uiTask);
                    } else {
                        todo.push(uiTask);
                    }
                });
                
                todo = [...todo]; inProgress = [...inProgress]; completed = [...completed];
                sortTodo();
            }
        } catch (e) {
            console.error("Failed to load tasks:", e);
        }
    }

    // --- 2. ADD NEW TASK (WRITE) ---
    async function handleAddTask() {
        if (newTaskName.trim() === '' || selectedCategory.trim() === '') return;
        
        const combinedDeadline = newTaskDeadline ? `${newTaskDeadline} ${newTaskTime}` : '';
        const catObj = categories.find(c => c.name === selectedCategory);
        
        const payload = {
            user_id: CURRENT_USER_ID,
            title: newTaskName,
            status: "pending", 
            priority: newTaskPriority, 
            category: selectedCategory, 
            deadline: combinedDeadline,
            timestamp: new Date().toISOString(),
            color: catObj?.color || '#6366f1'
        };

        const newId = "temp-" + Date.now();
        const newTaskItem = { 
            id: newId, 
            name: newTaskName, 
            category: selectedCategory, 
            priority: newTaskPriority,
            deadline: combinedDeadline, 
            status: "pending", 
            user: "ME", 
            attachments: 0,
            repeat: repeatOption,
            customDays: [...customDays],
            color: catObj?.color
        };
        
        todo = [newTaskItem, ...todo]; 
        sortTodo();
        
        notificationMessage = `Added "${newTaskItem.name}" to To Do list!`;
        notificationKey++;
        togglePopup();

        try {
            await fetch(SEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await fetchTasks();
        } catch (error) {
            console.error('Error sending task:', error);
        }
    }

    // --- 3. MANAGE TASKS ---
    async function apiManageTask(action, task, updateFields = {}) {
        if (String(task.id).startsWith('temp-')) return; 

        try {
            await fetch(MANAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,      
                    id: task.id,         
                    updateFields: updateFields 
                })
            });
        } catch (e) {
            console.error("Manage action failed:", e);
        }
    }

    function sortTodo() {
        const priorityOrder = { 'past_deadline': 4, 'high': 3, 'mid': 2, 'low': 1 };
        const isPastDue = (task) => {
            if (!task.deadline) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            const deadlineDate = new Date(task.deadline);
            return deadlineDate < today;
        };
        const getPrio = (p) => (p || 'mid').toLowerCase();

        todo.sort((a, b) => {
            const aPriority = isPastDue(a) ? 'past_deadline' : getPrio(a.priority);
            const bPriority = isPastDue(b) ? 'past_deadline' : getPrio(b.priority);
            const aValue = priorityOrder[aPriority] || 0;
            const bValue = priorityOrder[bPriority] || 0;
            return bValue - aValue; 
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
        if (selectedCategory === categoryName) {
            selectedCategory = categories[0]?.name || '';
        }
    }

    let activeMenu = $state(null);
    function toggleTaskMenu(taskId) {
        activeMenu = activeMenu === taskId ? null : taskId;
    }

    function handleProgressChange(task, event) {
        task.progress = parseInt(event.target.value);
        if (task.progress === 100) {
            moveToCompleted(task);
        } else {
            inProgress = [...inProgress];
            apiManageTask('update', task, { progress: task.progress });
        }
    }

    function moveToCompleted(task) {
        const taskToMove = { ...task, completionTime: new Date().toISOString(), status: 'completed' };
        delete taskToMove.progress;
        completed = [taskToMove, ...completed];
        todo = todo.filter(t => t.id !== task.id);
        inProgress = inProgress.filter(t => t.id !== task.id);
        notificationMessage = `Congrats on finishing "${task.name}"!`;
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

    function pushBackToProgress(task) {
        const taskToMove = { ...task, progress: 75, status: 'in_progress' };
        delete taskToMove.completionTime;
        inProgress = [taskToMove, ...inProgress];
        completed = completed.filter(t => t.id !== task.id);
        activeMenu = null;
        apiManageTask('update', task, { status: 'in_progress', progress: 75 });
    }

    function deleteTask(taskId) {
        const task = todo.find(t => t.id === taskId) || inProgress.find(t => t.id === taskId) || completed.find(t => t.id === taskId);
        todo = todo.filter(t => t.id !== taskId);
        activeMenu = null;
        if (task) apiManageTask('delete', task);
    }

    function deleteCompletedTask(taskId) {
        const task = completed.find(t => t.id === taskId);
        completed = completed.filter(t => t.id !== taskId);
        activeMenu = null;
        if (task) apiManageTask('delete', task);
    }

    function deleteInProgressTask(taskId) {
        const task = inProgress.find(t => t.id === taskId);
        inProgress = inProgress.filter(t => t.id !== taskId);
        activeMenu = null;
        if (task) apiManageTask('delete', task);
    }

    function toggleCustomDay(day) {
        if (customDays.includes(day)) {
            customDays = customDays.filter(d => d !== day);
        } else {
            customDays = [...customDays, day];
        }
    }

    function formatDeadline(deadlineString) {
        if (!deadlineString) return { text: 'No deadline', class: 'neutral' };
        const deadlineDate = new Date(deadlineString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        const timeString = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        if (deadlineDate < now) return { text: `Overdue! (${timeString})`, class: 'overdue' };
        if (deadlineDay.getTime() === today.getTime()) {
            const diffMinutes = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
            if (diffMinutes <= 60) return { text: `Due in ${diffMinutes} min! (${timeString})`, class: 'due-soon' };
            return { text: `Due today at ${timeString}`, class: 'due-today' };
        }
        if (deadlineDay.getTime() === tomorrow.getTime()) return { text: `Due tomorrow at ${timeString}`, class: 'due-tomorrow' };
        return { text: `Due on ${deadlineDate.toLocaleDateString()} at ${timeString}`, class: 'due-future' };
    }

    function getCatColor(catName) {
        return categories.find(c => c.name === catName)?.color || '#6366f1';
    }

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

    <div class="kanban-board">
        <!-- TO DO COLUMN -->
        <div class="kanban-col">
            <div class="col-header">
                <div class="header-left-side">
                    <span>To Do</span>
                    <div class="filter-wrapper">
                        <select bind:value={todoFilter} class="todo-filter-select">
                            <option value="all">All Tasks</option>
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="week">This Week</option>
                            <option value="range">Range</option>
                        </select>
                        {#if todoFilter === 'range'}
                            <div class="range-inputs" transition:slide>
                                <input type="date" bind:value={filterStartDate} placeholder="Start">
                                <input type="date" bind:value={filterEndDate} placeholder="End">
                            </div>
                        {/if}
                    </div>
                </div>
                <span class="badge">{filteredTodo.length}</span>
            </div>

            {#each filteredTodo as task (task.id)}
                <div class="task-card" on:click={() => selectedTask = task}>
                    <div class="card-header-actions">
                        <div class="tag-row">
                            <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                            <span class="tag-priority {task.priority.toLowerCase()}">{task.priority.replace('_', ' ')}</span>
                            {#if task.deadline}
                                <span class="deadline-time"><i class="bx bx-time-five"></i> {task.deadline.split(' ')[1] || task.deadline}</span>
                            {/if}
                        </div>
                        <div class="task-actions">
                            <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }} title="Task options">
                                <i class="bx bx-dots-horizontal-rounded"></i>
                            </button>
                            {#if activeMenu === task.id}
                                <div class="actions-menu">
                                    <button on:click={(e) => { e.stopPropagation(); moveToInProgress(task); }}><i class='bx bx-loader-alt'></i> Push to Progress</button>
                                    <button on:click={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Mark as Completed</button>
                                    <div class="divider"></div>
                                    <button on:click={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete Task</button>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <h4>{task.name}</h4>
                    <div class="card-footer">
                        <div class="avatar">{task.user}</div>
                        {#if task.attachments > 0}
                            <span><i class="bx bx-paperclip"></i> {task.attachments}</span>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        <!-- IN PROGRESS COLUMN -->
        <div class="kanban-col">
            <div class="col-header">In Progress <span class="badge">{inProgress.length}</span></div>
            {#each inProgress as task (task.id)}
                <div class="task-card" on:click={() => selectedTask = task}>
                    <div class="card-header-actions">
                        <div class="tag-row">
                            <span class="tag green" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                            <span class="tag-priority {task.priority.toLowerCase()}">{task.priority.replace('_', ' ')}</span>
                            {#if task.deadline}
                                <span class="deadline-time"><i class="bx bx-time-five"></i> {task.deadline.split(' ')[1] || task.deadline}</span>
                            {/if}
                        </div>
                        <div class="task-actions">
                            <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }} title="Task options">
                                <i class="bx bx-dots-horizontal-rounded"></i>
                            </button>
                            {#if activeMenu === task.id}
                                <div class="actions-menu">
                                    <button on:click={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Mark as Completed</button>
                                    <div class="divider"></div>
                                    <button on:click={(e) => { e.stopPropagation(); deleteInProgressTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete Task</button>
                                </div>
                            {/if}
                        </div>
                    </div>
                    <h4>{task.name}</h4>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={task.progress} 
                        on:input={(e) => handleProgressChange(task, e)} 
                        on:click|stopPropagation
                        class="progress-slider" 
                        style="accent-color: {getCatColor(task.category)}"
                    />
                    <div class="progress-text">{task.progress}% Complete</div>
                </div>
            {/each}
        </div>

        <!-- COMPLETED COLUMN -->
        <div class="kanban-col">
            <div class="col-header">Completed <span class="badge">{completed.length}</span></div>
            {#each completed as task (task.id)}
                <div class="task-card completed" on:click={() => selectedTask = task}>
                    <div class="card-header-actions">
                        <h4>{task.name}</h4>
                        <div class="task-actions">
                            <button class="options-btn" on:click={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }} title="Task options">
                                <i class="bx bx-dots-horizontal-rounded"></i>
                            </button>
                            {#if activeMenu === task.id}
                                <div class="actions-menu">
                                    <button on:click={(e) => { e.stopPropagation(); pushBackToProgress(task); }}><i class='bx bx-loader-alt'></i> Push to Progress</button>
                                    <div class="divider"></div>
                                    <button on:click={(e) => { e.stopPropagation(); deleteCompletedTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete Task</button>
                                </div>
                            {/if}
                        </div>
                    </div>
                    {#if task.completionTime}
                    <p class="task-meta">Completed: {new Date(task.completionTime).toLocaleString()}</p>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

{#if selectedTask}
    <div class="popup-backdrop" on:click={() => selectedTask = null}>
        <div class="popup" on:click|stopPropagation>
            <div class="popup-header">
                <h3>{selectedTask.name}</h3>
                <button class="close-btn" on:click={() => selectedTask = null}><i class="bx bx-x"></i></button>
            </div>
            <div class="task-detail-content">
                <p><strong>Category:</strong> <span class="tag" style="border-left-color: {getCatColor(selectedTask.category)}">{selectedTask.category}</span></p>
                <p><strong>Priority:</strong> <span class="tag-priority {selectedTask.priority.toLowerCase()}">{selectedTask.priority.replace('_', ' ')}</span></p>
                {#if selectedTask.deadline}
                    <p><strong>Deadline:</strong> <span class="deadline-status {formatDeadline(selectedTask.deadline).class}">{formatDeadline(selectedTask.deadline).text}</span></p>
                {/if}
                <p><strong>Status:</strong> {selectedTask.status.replace('_', ' ')}</p>
                {#if selectedTask.status === 'in_progress'}
                    <p><strong>Progress:</strong> {selectedTask.progress}%</p>
                {/if}
                {#if selectedTask.status === 'completed' && selectedTask.completionTime}
                    <p><strong>Completed On:</strong> {new Date(selectedTask.completionTime).toLocaleString()}</p>
                {/if}
            </div>
        </div>
    </div>
{/if}

{#if notificationMessage}
    {#key notificationKey}
        <Notification message={notificationMessage} />
    {/key}
{/if}

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
                        <label for="task-name">Task Name</label>
                        <input type="text" id="task-name" bind:value={newTaskName} placeholder="e.g., Finish SvelteKit tutorial">
                    </div>

                    <div class="form-group" style="flex: 1;">
                        <label for="task-deadline">Deadline Date</label>
                        <input type="date" id="task-deadline" bind:value={newTaskDeadline}>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Priority</label>
                        <select bind:value={newTaskPriority}>
                            <option value="low">Low</option>
                            <option value="mid">Mid</option>
                            <option value="high">High</option>
                            <option value="past_deadline">Past Deadline</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="task-time">Time</label>
                        <input type="time" id="task-time" bind:value={newTaskTime}>
                    </div>

                    <div class="form-group">
                        <label>Repeat</label>
                        <select bind:value={repeatOption}>
                            <option value="never">Never</option>
                            <option value="daily">Daily</option>
                            <option value="weekdays">Week days</option>
                            <option value="weekends">Weekends</option>
                            <option value="custom">set custom</option>
                        </select>
                    </div>
                </div>

                {#if repeatOption === 'custom'}
                    <div class="form-group">
                        <label>Custom Repeat Days</label>
                        <div class="day-selector">
                            {#each daysOfWeek as day}
                                <button type="button" class="day-btn" class:active={customDays.includes(day)} on:click={() => toggleCustomDay(day)}>
                                    {day}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                <div class="form-group">
                    <label>Task Category</label>
                    <div class="category-list">
                        {#each categories as category}
                            <div class="category-item">
                                <label class:selected={selectedCategory === category.name}>
                                    <input type="radio" bind:group={selectedCategory} value={category.name}>
                                    <span class="cat-dot" style="background: {category.color}"></span>
                                    {category.name}
                                </label>
                                <button type="button" class="delete-category-btn" on:click={() => handleDeleteCategory(category.name)}>
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        {/each}
                    </div>
                    <div class="add-category-v2">
                        <input type="text" bind:value={newCategoryInput} placeholder="New category name...">
                        <div class="cat-color-actions">
                            <input type="color" bind:value={newCategoryColor} title="Pick category color">
                            <button type="button" class="random-color-btn" on:click={randomizeNewCategoryColor} title="Randomize Color">
                                <i class="bx bx-shuffle"></i>
                            </button>
                            <button type="button" on:click={handleAddCategory} class="add-category-btn"><i class="bx bx-plus"></i> Add</button>
                        </div>
                    </div>
                </div>

                <button type="submit" class="save-btn">Add Task to "To Do"</button>
            </form>
        </div>
    </div>
{/if}

<style>
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    h2 { color: white; margin: 0; }
    .new-task-btn { background: var(--accent-purple); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
    .ghost-alert { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 1rem; border-radius: 0.75rem; display: flex; gap: 1rem; margin-bottom: 2rem; }
    .ghost-alert i { font-size: 1.5rem; color: var(--accent-purple); }
    .ghost-alert h4 { color: white; margin: 0; font-size: 0.9rem; }
    .ghost-alert p { color: var(--text-gray); margin: 0.2rem 0 0; font-size: 0.8rem; }
    .kanban-board { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; align-items: start; }
    .kanban-col { background: var(--card-bg); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); min-height: 500px; }
    .col-header { display: flex; justify-content: space-between; align-items: center; color: var(--text-white); font-weight: 600; margin-bottom: 1.5rem; font-size: 0.9rem; }
    
    .header-left-side { display: flex; align-items: center; gap: 0.75rem; }
    .filter-wrapper { position: relative; }
    .todo-filter-select { background: #1e1f2e; color: var(--text-gray); border: 1px solid var(--border-color); padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; outline: none; cursor: pointer; }
    .range-inputs { position: absolute; top: 100%; left: 0; background: #1e1f2e; border: 1px solid var(--border-color); padding: 0.5rem; border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; z-index: 20; margin-top: 0.5rem; width: 150px; }
    .range-inputs input { background: #0b0c15; color: white; border: 1px solid var(--border-color); padding: 0.3rem; border-radius: 0.3rem; font-size: 0.7rem; color-scheme: dark; }

    .badge { background: #1e1f2e; color: var(--text-gray); padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; }
    .task-card { background: #1e1f2e; padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; }
    .task-card:hover { border-color: var(--accent-purple); transform: translateY(-2px); }
    .task-card.completed h4 { text-decoration: line-through; color: var(--text-gray); }
    .task-card h4 { color: white; margin: 0.5rem 0; font-size: 0.9rem; font-weight: 500; }
    .task-meta { font-size: 0.75rem; color: var(--text-gray); margin: 0.5rem 0; }
    .tag-row { display: flex; align-items: center; gap: 0.5rem; }
    .deadline-time { font-size: 0.7rem; color: var(--text-gray); display: flex; align-items: center; gap: 0.25rem; }
    .tag-priority { font-size: 0.6rem; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 0.2rem; font-weight: 700; background: rgba(255, 255, 255, 0.1); color: #fff; }
    .tag-priority.high { background: #f87171; color: white; }
    .tag-priority.mid { background: #fb923c; color: white; }
    .tag-priority.low { background: #4ade80; color: white; }
    .tag-priority.past_deadline { background: #ef4444; color: white; }
    
    .tag { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-weight: 500; border-left: 3px solid transparent; background: rgba(255,255,255,0.05); color: white; }
    
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.8rem; }
    .avatar { width: 1.5rem; height: 1.5rem; background: #6b7280; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.6rem; }
    .progress-text { font-size: 0.7rem; color: var(--text-gray); margin-top: 0.25rem; }
    
    .popup-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 100; }
    .popup { background: var(--card-bg); border-radius: 1rem; padding: 1.25rem; width: 95%; max-width: 650px; border: 1px solid var(--border-color); max-height: 90vh; overflow-y: auto; }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .popup-header h3 { margin: 0; color: white; font-size: 1.1rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; }
    
    .task-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: flex; gap: 1rem; width: 100%; }
    @media (max-width: 600px) {
        .form-row { flex-direction: column; }
    }
    .form-row .form-group { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .form-group label { color: var(--text-gray); font-size: 0.8rem; }
    .form-group input, .form-group select { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.6rem; border-radius: 0.5rem; font-size: 16px; }
    
    .category-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 120px; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 0.4rem; }
    .category-item { display: flex; align-items: center; justify-content: space-between; }
    .category-item label { background: #1E1F2E; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; width: 100%; user-select: none; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; }
    .category-item label.selected { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); }
    .category-item input[type="radio"] { display: none; }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; }
    
    .add-category-v2 { display: flex; flex-direction: column; gap: 0.5rem; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 0.5rem; border: 1px dashed var(--border-color); }
    .cat-color-actions { display: flex; gap: 0.5rem; align-items: center; }
    .cat-color-actions input[type="color"] { width: 30px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; }
    .random-color-btn { background: #1e1f2e; border: 1px solid var(--border-color); color: white; padding: 0.4rem; border-radius: 0.4rem; cursor: pointer; }
    .add-category-btn { background: var(--accent-green); color: white; border: none; border-radius: 0.5rem; padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.8rem; margin-left: auto; }

    .save-btn { background: var(--accent-purple); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 0.5rem; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .card-header-actions { display: flex; justify-content: space-between; align-items: flex-start; }
    .task-actions { position: relative; }
    .options-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.25rem; padding: 0; line-height: 1; }
    
    .actions-menu { position: absolute; top: calc(100% + 5px); right: 0; background: #2a2c41; border-radius: 0.5rem; padding: 0.5rem; z-index: 30; width: 180px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.25rem; animation: fadeIn 0.1s ease-out; }
    .actions-menu button { background: none; border: none; color: var(--text-gray); padding: 0.5rem 0.75rem; text-align: left; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; font-weight: 500; width: 100%; }
    .actions-menu button:hover { background: var(--accent-purple); color: white; }
    .actions-menu .divider { height: 1px; background: var(--border-color); margin: 0.25rem 0; }
    .actions-menu button.delete { color: #f87171; }
    .actions-menu button.delete:hover { background: var(--accent-red); color: white; }

    .progress-slider { width: 100%; margin-top: 0.5rem; accent-color: var(--accent-green); }
    .task-detail-content { padding: 1rem; text-align: left; }
    .deadline-status { font-weight: 600; padding: 0.2em 0.5em; border-radius: 0.25em; }
    .deadline-status.overdue { background-color: #ef4444; color: white; }
    .deadline-status.due-today { background-color: #4ade80; color: #1e1f2e; }
</style>
