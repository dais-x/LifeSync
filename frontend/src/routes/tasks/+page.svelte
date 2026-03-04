<script>
    import { onMount } from 'svelte';
    import { slide, fade } from 'svelte/transition';
    import { spring } from 'svelte/motion';
    import Notification from '$lib/Notification.svelte';

    // --- API CONFIGURATION ---
    const SEND_URL = 'https://fahim-n8n.laddu.cc/webhook/sync-task';
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const CURRENT_USER_ID = "user_456"; 

    // --- STATE ---
    let showAddTaskPopup = $state(false);
    let activeIndex = $state(0); 
    
    // Swipe Logic
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    const swipeOffset = spring(0, { stiffness: 0.1, damping: 0.6 });

    // Form State
    let newTaskName = $state('');
    let newTaskDeadline = $state('');
    let newTaskTime = $state('23:59');
    let newTaskPriority = $state('mid');
    let repeatOption = $state('never');
    
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

    // Data
    let todo = $state([]);
    let inProgress = $state([]);
    let completed = $state([]);
    let todoFilter = $state('all'); 
    let filterStartDate = $state('');
    let filterEndDate = $state('');

    let notificationMessage = $state('');
    let notificationKey = $state(0);
    let selectedTask = $state(null); 
    let activeMenu = $state(null);

    // --- DERIVED ---
    let filteredTodo = $derived.by(() => {
        if (todoFilter === 'all') return todo;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrow = today + 86400000;
        const nextWeek = today + 7 * 86400000;

        return todo.filter(t => {
            if (!t.deadline) return false;
            const d = new Date(t.deadline).getTime();
            if (todoFilter === 'today') return d >= today && d < tomorrow;
            if (todoFilter === 'tomorrow') return d >= tomorrow && d < (tomorrow + 86400000);
            if (todoFilter === 'week') return d >= today && d < nextWeek;
            if (todoFilter === 'daterange') {
                if (!filterStartDate || !filterEndDate) return true;
                const start = new Date(filterStartDate).getTime();
                const end = new Date(filterEndDate).getTime() + 86400000;
                return d >= start && d < end;
            }
            return true;
        });
    });

    // --- SWIPE HANDLERS ---
    function handleTouchStart(e) {
        startX = e.touches[0].clientX;
        isSwiping = true;
    }
    function handleTouchMove(e) {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        swipeOffset.set(currentX - startX, { hard: true });
    }
    function handleTouchEnd() {
        if (!isSwiping) return;
        const diff = currentX - startX;
        if (diff < -60 && activeIndex < 2) activeIndex++;
        else if (diff > 60 && activeIndex > 0) activeIndex--;
        isSwiping = false;
        swipeOffset.set(0);
    }

    // --- API & LOGIC ---
    async function fetchTasks() {
        try {
            const res = await fetch(GET_URL);
            if (res.ok) {
                const incoming = await res.json();
                let allTasks = incoming.data || incoming || [];
                todo = []; inProgress = []; completed = [];
                allTasks.forEach(task => {
                    if (task.isDeleted) return;
                    const uiTask = {
                        id: task._id || task.id, name: task.title || "Untitled", category: task.category || "General",
                        priority: task.priority || "mid", deadline: task.deadline || "", status: task.status || "pending",
                        user: "ME", attachments: 0, progress: task.progress || 0, completionTime: task.completionTime || null, color: task.color
                    };
                    if (uiTask.status === 'completed') completed.push(uiTask);
                    else if (uiTask.status === 'in_progress') inProgress.push(uiTask);
                    else todo.push(uiTask);
                });
                todo = [...todo]; inProgress = [...inProgress]; completed = [...completed];
                sortTodo();
            }
        } catch (e) { console.error(e); }
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
        try {
            await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            togglePopup();
            fetchTasks();
        } catch (error) { console.error(error); }
    }

    async function apiManageTask(action, task, updateFields = {}) {
        try {
            await fetch(MANAGE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: task.id, updateFields }) });
        } catch (e) { console.error(e); }
    }

    function sortTodo() {
        const pMap = { 'high': 3, 'mid': 2, 'low': 1 };
        todo.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
        todo = [...todo]; 
    }

    function togglePopup() { 
        showAddTaskPopup = !showAddTaskPopup; 
        if (!showAddTaskPopup) { newTaskName = ''; newTaskDeadline = ''; }
    }

    function handleAddCategory() {
        if (newCategoryInput.trim() !== '' && !categories.some(c => c.name === newCategoryInput.trim())) {
            categories = [...categories, { name: newCategoryInput.trim(), color: newCategoryColor }];
            selectedCategory = newCategoryInput.trim();
            newCategoryInput = '';
        }
    }

    function randomizeNewCategoryColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; }
        newCategoryColor = color;
    }

    function handleDeleteCategory(categoryName) {
        categories = categories.filter(c => c.name !== categoryName);
        if (selectedCategory === categoryName) selectedCategory = categories[0]?.name || '';
    }

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
        <button class="new-task-btn" onclick={togglePopup}><i class="bx bx-plus"></i> New Task </button>
    </div>

    <div class="ghost-alert">
        <i class="bx bxs-ghost"></i>
        <div>
            <h4>Ghost Mode Active</h4>
            <p>AI has auto-rescheduled 3 tasks due to low energy prediction.</p>
        </div>
    </div>

    <!-- Mobile Tabs Navigation -->
    <div class="mobile-tabs">
        <button class:active={activeIndex === 0} onclick={() => activeIndex = 0}>To Do <span>({filteredTodo.length})</span></button>
        <button class:active={activeIndex === 1} onclick={() => activeIndex = 1}>Progress <span>({inProgress.length})</span></button>
        <button class:active={activeIndex === 2} onclick={() => activeIndex = 2}>Done <span>({completed.length})</span></button>
    </div>

    <!-- Swipeable Carousel Container -->
    <div class="carousel-container" 
         ontouchstart={handleTouchStart} 
         ontouchmove={handleTouchMove} 
         ontouchend={handleTouchEnd}
    >
        <!-- Corrected Alignment: Each card is 85% width. To center, we shift by (activeIndex * 85%) and add (100% - 85%) / 2 = 7.5% -->
        <div class="carousel-track" style="transform: translate3d(calc(-{activeIndex * 85}% + 7.5% + {$swipeOffset}px), 0, 0)">
            
            <!-- COLUMN: TO DO -->
            <div class="carousel-item" class:active={activeIndex === 0}>
                <div class="kanban-col">
                    <div class="col-header">
                        <div class="header-left-side">
                            <span>To Do</span>
                            <div class="filter-wrapper">
                                <select bind:value={todoFilter} class="todo-filter-select">
                                    <option value="all">All</option>
                                    <option value="today">Today</option>
                                    <option value="tomorrow">Tomorrow</option>
                                    <option value="week">This Week</option>
                                    <option value="daterange">Date Range</option>
                                </select>
                                {#if todoFilter === 'daterange'}
                                    <div class="range-inputs" transition:slide>
                                        <input type="date" bind:value={filterStartDate} class="range-date-input" />
                                        <input type="date" bind:value={filterEndDate} class="range-date-input" />
                                    </div>
                                {/if}
                            </div>
                        </div>
                        <span class="badge">{filteredTodo.length}</span>
                    </div>
                    <div class="task-container">
                        {#each filteredTodo as task (task.id)}
                            <div class="task-card" onclick={() => selectedTask = task}>
                                <div class="card-header-actions">
                                    <div class="tag-row">
                                        <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                                        <span class="tag-priority {task.priority.toLowerCase()}">{task.priority}</span>
                                    </div>
                                    <div class="task-actions">
                                        <button class="options-btn" onclick={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                        {#if activeMenu === task.id}
                                            <div class="actions-menu" transition:slide>
                                                <button onclick={(e) => { e.stopPropagation(); moveToInProgress(task); }}><i class='bx bx-loader-alt'></i> Start</button>
                                                <button onclick={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                <h4>{task.name}</h4>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- COLUMN: PROGRESS -->
            <div class="carousel-item" class:active={activeIndex === 1}>
                <div class="kanban-col">
                    <div class="col-header">In Progress <span class="badge">{inProgress.length}</span></div>
                    <div class="task-container">
                        {#each inProgress as task (task.id)}
                            <div class="task-card" onclick={() => selectedTask = task}>
                                <div class="card-header-actions">
                                    <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                                    <div class="task-actions">
                                        <button class="options-btn" onclick={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                        {#if activeMenu === task.id}
                                            <div class="actions-menu" transition:slide>
                                                <button onclick={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                <h4>{task.name}</h4>
                                <input type="range" min="0" max="100" value={task.progress} 
                                    oninput={(e) => handleProgressChange(task, e)} 
                                    onclick={(e) => e.stopPropagation()}
                                    class="progress-slider" style="accent-color: {getCatColor(task.category)}" />
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- COLUMN: COMPLETED -->
            <div class="carousel-item" class:active={activeIndex === 2}>
                <div class="kanban-col">
                    <div class="col-header">Completed <span class="badge">{completed.length}</span></div>
                    <div class="task-container">
                        {#each completed as task (task.id)}
                            <div class="task-card completed" onclick={() => selectedTask = task}>
                                <div class="card-header-actions">
                                    <h4>{task.name}</h4>
                                    <div class="task-actions">
                                        <button class="options-btn" onclick={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                        {#if activeMenu === task.id}
                                            <div class="actions-menu" transition:slide>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
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
    </div>
</div>

<!-- Add New Task Popup -->
{#if showAddTaskPopup}
    <div class="popup-backdrop" onclick={togglePopup}>
        <div class="popup" onclick={(e) => e.stopPropagation()}>
            <div class="popup-header"><h3>Add New Task</h3><button class="close-btn" onclick={togglePopup}><i class="bx bx-x"></i></button></div>
            <form onsubmit={(e) => { e.preventDefault(); handleAddTask(); }} class="task-form">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;"><label>Task Name</label><input type="text" bind:value={newTaskName} placeholder="Task title"></div>
                    <div class="form-group"><label>Date</label><input type="date" bind:value={newTaskDeadline}></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Priority</label>
                        <select bind:value={newTaskPriority}><option value="low">Low</option><option value="mid">Mid</option><option value="high">High</option><option value="past_deadline">Past Deadline</option></select>
                    </div>
                    <div class="form-group"><label>Time</label><input type="time" bind:value={newTaskTime}></div>
                    <div class="form-group"><label>Repeat</label>
                        <select bind:value={repeatOption}><option value="never">Never</option><option value="daily">Daily</option><option value="weekdays">Week days</option></select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Category Color</label>
                    <div class="color-grid">
                        {#each presetColors as color}
                            <button type="button" class="color-circle" class:selected={newCategoryColor === color} style="background: {color}" onclick={() => newCategoryColor = color}></button>
                        {/each}
                        <button type="button" class="shuffle-btn" onclick={randomizeNewCategoryColor}><i class="bx bx-shuffle"></i></button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Category Name</label>
                    <div class="category-list">
                        {#each categories as category}
                            <div class="category-item">
                                <label class:selected={selectedCategory === category.name}>
                                    <input type="radio" name="cat" value={category.name} onchange={() => selectedCategory = category.name} checked={selectedCategory === category.name}>
                                    <span class="cat-dot" style="background: {category.color}"></span> {category.name}
                                </label>
                                <button type="button" class="delete-category-btn" onclick={() => handleDeleteCategory(category.name)}><i class="bx bx-trash"></i></button>
                            </div>
                        {/each}
                    </div>
                    <div class="add-category-v2">
                        <input type="text" bind:value={newCategoryInput} placeholder="New category...">
                        <button type="button" onclick={handleAddCategory} class="add-category-btn"><i class="bx bx-plus"></i> Add</button>
                    </div>
                </div>
                <button type="submit" class="save-btn">Add Task</button>
            </form>
        </div>
    </div>
{/if}

{#if selectedTask}
    <div class="popup-backdrop" onclick={() => selectedTask = null}>
        <div class="popup" onclick={(e) => e.stopPropagation()}>
            <div class="popup-header"><h3>{selectedTask.name}</h3><button class="close-btn" onclick={() => selectedTask = null}><i class="bx bx-x"></i></button></div>
            <div class="task-detail-content">
                <p><strong>Category:</strong> <span class="tag" style="border-left-color: {getCatColor(selectedTask.category)}">{selectedTask.category}</span></p>
                <p><strong>Priority:</strong> <span class="tag-priority {selectedTask.priority.toLowerCase()}">{selectedTask.priority}</span></p>
                <p><strong>Status:</strong> {selectedTask.status.replace('_', ' ')}</p>
            </div>
        </div>
    </div>
{/if}

{#if notificationMessage}
    {#key notificationKey}<Notification message={notificationMessage} />{/key}
{/if}

<style>
    /* --- HEADER --- */
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h2 { color: white; margin: 0; }
    .new-task-btn { background: var(--accent-purple); color: white; border: none; padding: 0.6rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
    .ghost-alert { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 1rem; border-radius: 0.75rem; display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .ghost-alert i { font-size: 1.5rem; color: var(--accent-purple); }
    .ghost-alert h4 { color: white; margin: 0; font-size: 0.9rem; }
    .ghost-alert p { color: var(--text-gray); margin: 0.2rem 0 0; font-size: 0.8rem; }

    /* --- MOBILE CAROUSEL --- */
    .carousel-container { width: 100%; overflow: visible; padding: 1rem 0; perspective: 1000px; touch-action: pan-y pinch-zoom; }
    .carousel-track { display: flex; width: 100%; will-change: transform; }
    .carousel-item { flex: 0 0 85%; padding: 0 10px; transition: transform 0.4s ease, opacity 0.4s ease; transform-origin: center center; opacity: 0.5; transform: scale(0.92); }
    .carousel-item.active { transform: scale(1); opacity: 1; z-index: 10; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.4)); }

    .mobile-tabs { display: none; margin-bottom: 1rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 0.25rem; gap: 0.25rem; }
    .mobile-tabs button { flex: 1; background: none; border: none; color: var(--text-gray); padding: 0.6rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .mobile-tabs button.active { background: var(--accent-purple); color: white; }
    .mobile-tabs span { font-size: 0.7rem; opacity: 0.6; margin-left: 2px; }

    /* --- KANBAN STYLES --- */
    .kanban-col { background: var(--card-bg); padding: 1.5rem; border-radius: 1.5rem; border: 1px solid var(--border-color); min-height: 500px; }
    .col-header { display: flex; justify-content: space-between; align-items: center; color: white; font-weight: 700; margin-bottom: 1.5rem; }
    .header-left-side { display: flex; align-items: flex-start; gap: 0.75rem; }
    .todo-filter-select { background: #1e1f2e; color: var(--text-gray); border: 1px solid var(--border-color); padding: 0.2rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem; outline: none; }
    .filter-wrapper { display: flex; flex-direction: column; gap: 0.4rem; }
    .range-inputs { display: flex; flex-direction: column; gap: 0.3rem; }
    .range-date-input { background: #1e1f2e; color: var(--text-gray); border: 1px solid var(--border-color); padding: 0.2rem 0.4rem; border-radius: 0.4rem; font-size: 0.7rem; outline: none; color-scheme: dark; }
    .badge { background: #1e1f2e; color: var(--text-gray); padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; }

    .task-card { background: #1e1f2e; padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border-color); margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; }
    .task-card:hover { border-color: var(--accent-purple); }
    .task-card.completed h4 { text-decoration: line-through; opacity: 0.5; }
    .task-card h4 { color: white; margin: 0.75rem 0 0; font-size: 1rem; }
    
    .card-header-actions { display: flex; justify-content: space-between; align-items: flex-start; }
    .tag { font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 0.3rem; background: rgba(255,255,255,0.05); color: white; border-left: 3px solid; }
    .tag-priority { font-size: 0.6rem; text-transform: uppercase; font-weight: 800; color: #fff; margin-left: 5px; }
    .tag-priority.high { color: #f87171; }
    .tag-priority.mid { color: #fb923c; }
    .tag-priority.low { color: #4ade80; }

    .task-actions { position: relative; }
    .options-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; }
    .actions-menu { position: absolute; top: 100%; right: 0; background: #2a2c41; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.5rem; z-index: 50; width: 160px; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
    .actions-menu button { background: none; border: none; color: var(--text-gray); padding: 0.5rem 0.75rem; text-align: left; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .actions-menu button:hover { background: var(--accent-purple); color: white; }
    .actions-menu .delete { color: #f87171; }

    .progress-slider { width: 100%; margin-top: 1rem; height: 6px; border-radius: 3px; }

    /* --- POPUPS --- */
    .popup-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(5px); }
    .popup { background: var(--card-bg); border-radius: 1.5rem; padding: 1.5rem; width: 90%; max-width: 550px; max-height: 85vh; overflow-y: auto; border: 1px solid var(--border-color); }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); font-size: 1.5rem; cursor: pointer; }
    .task-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: flex; gap: 10px; width: 100%; }
    .form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .form-group label { color: var(--text-gray); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select { background: #1e1f2e; border: 1px solid var(--border-color); color: white; padding: 0.75rem; border-radius: 0.5rem; font-size: 16px; width: 100%; outline: none; }
    
    .category-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 150px; overflow-y: auto; margin-bottom: 0.5rem; }
    .category-item { display: flex; align-items: center; justify-content: space-between; background: #1e1f2e; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
    .category-item label { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; color: white; font-size: 0.85rem; }
    .category-item input { display: none; }
    .category-item label.selected { color: var(--accent-purple); }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; }
    .delete-category-btn { background: none; border: none; color: var(--accent-red); cursor: pointer; opacity: 0.6; }
    .add-category-v2 { background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.5rem; display: flex; gap: 10px; }
    .add-category-v2 input { flex: 1; background: none; border: none; color: white; outline: none; font-size: 0.9rem; }
    .add-category-btn { background: var(--accent-green); color: white; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }
    .color-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; }
    .color-circle { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
    .color-circle.selected { border-color: white; transform: scale(1.1); }
    .shuffle-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; margin-left: auto; }
    .save-btn { width: 100%; background: var(--accent-purple); color: white; border: none; padding: 1rem; border-radius: 1rem; font-weight: 700; margin-top: 1rem; cursor: pointer; }

    /* Layout Toggle */
    @media (min-width: 769px) {
        .carousel-track { transform: none !important; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; width: 100%; }
        .carousel-item { flex: none; width: auto; opacity: 1 !important; transform: none !important; filter: none !important; }    
        .mobile-tabs { display: none; }
        .carousel-container { overflow: visible; }
        .form-row { flex-direction: row; }
    }
    @media (max-width: 768px) {
        .mobile-tabs { display: flex; }
        .form-row { flex-direction: column; }
    }

    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
