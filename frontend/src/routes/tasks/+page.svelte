<script>
    import { onMount, onDestroy } from 'svelte';
    import { slide, fade } from 'svelte/transition';
    import { spring } from 'svelte/motion';
    import Notification from '$lib/Notification.svelte';
    import { currentUser } from '$lib/stores'; // NEW: Import the global store

    // --- API CONFIGURATION ---
    const SEND_URL = 'https://fahim-n8n.laddu.cc/webhook/sync-task';
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const GHOST_MODE_URL = 'https://fahim-n8n.laddu.cc/webhook/ghost-reschedule-now'; // NEW: Ghost Mode Webhook

    // --- STATE ---
    let showAddTaskPopup = $state(false);
    let activeIndex = $state(0);

    // Edit & Reschedule State
    let showEditPopup = $state(false);
    let showReschedulePopup = $state(false);
    let editTaskData = $state({ id: '', title: '', deadline: '', time: '', priority: 'mid', duration_minutes: 30, is_locked: false, category: 'General' });
    let rescheduleData = $state({ id: '', deadline: '', time: '', priority: 'high' });

    // AI PDF Upload State
    let taskEntryMode = $state('manual'); // 'manual' or 'pdf'
    let selectedFile = $state(null);
    let isUploading = $state(false);
    let aiInstruction = $state(''); // Custom AI Instruction state

    // Ghost Mode Trigger State
    let isGhosting = $state(false); // NEW: To show loading state on the banner

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
    
    // Ghost Mode Tetris Properties
    let newTaskDuration = $state(30); // Default to 30 mins
    let newTaskIsLocked = $state(false); // Default OFF (Fluid task)

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
    
    // NEW: Dynamic Ghost Mode Counter
    let ghostRescheduleTimes = $state(0); 

    let notificationMessage = $state('');
    let notificationKey = $state(0);
    let selectedTask = $state(null);
    let activeMenu = $state(null);

    function showNotification(msg) {
        notificationMessage = msg;
        notificationKey++;
        setTimeout(() => {
            if (notificationMessage === msg) {
                notificationMessage = '';
            }
        }, 4000);
    }

    // --- DERIVED ---
    let filteredTodo = $derived.by(() => {
        if (todoFilter === 'all') return todo;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrow = today + 86400000;
        const nextWeek = today + 7 * 86400000;

        return todo.filter(t => {
            const targetDate = t.scheduled_start ? t.scheduled_start : t.deadline;
            if (!targetDate) return false;
            
            const d = new Date(targetDate).getTime();
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
        if (!$currentUser || !$currentUser.id) return; 

        try {
            const res = await fetch(`${GET_URL}?userId=${$currentUser.id}`);
            if (res.ok) {
                const incoming = await res.json();
                let allTasks = incoming.data || incoming || [];
                todo = []; inProgress = []; completed = [];
                
                allTasks.forEach(task => {
                    if (task.isDeleted) return;
                    const uiTask = {
                        id: task._id || task.id, name: task.title || "Untitled", category: task.category || "General",
                        priority: task.priority || "mid", deadline: task.deadline || "", status: task.status || "pending",
                        user: "ME", attachments: 0, progress: task.progress || 0, completionTime: task.completionTime || null, color: task.color,
                        duration_minutes: task.duration_minutes || 30,
                        is_locked: task.is_locked || false,
                        reschedule_count: task.reschedule_count || 0,
                        scheduled_start: task.scheduled_start || null,
                        scheduled_end: task.scheduled_end || null
                    };
                    
                    if (uiTask.status === 'completed') completed.push(uiTask);
                    else if (uiTask.status === 'in_progress') inProgress.push(uiTask);
                    else todo.push(uiTask);
                });
                
                todo = [...todo]; inProgress = [...inProgress]; completed = [...completed];
                sortTodo();
                
                ghostRescheduleTimes = todo.reduce((sum, t) => sum + t.reschedule_count, 0) + 
                                       inProgress.reduce((sum, t) => sum + t.reschedule_count, 0);
            }
        } catch (e) { console.error(e); }
    }

    // Manual Trigger for Ghost Mode
    async function triggerGhostMode() {
        if (isGhosting) return;
        isGhosting = true;
        showNotification("Ghost Mode activated. AI is calculating gaps...");
        
        try {
            await fetch(GHOST_MODE_URL, { method: 'POST' });
            
            setTimeout(() => {
                fetchTasks();
                isGhosting = false;
                showNotification("Schedule optimized.");
            }, 5000);
            
        } catch (e) { 
            console.error("Ghost Mode error:", e);
            isGhosting = false; 
        }
    }

    async function handleAddTask() {
        if (newTaskName.trim() === '' || selectedCategory.trim() === '') return;
        const combinedDeadline = newTaskDeadline ? `${newTaskDeadline} ${newTaskTime}` : '';
        const catObj = categories.find(c => c.name === selectedCategory);
        const payload = {
            user_id: $currentUser.id,
            title: newTaskName, status: "pending",
            priority: newTaskPriority, category: selectedCategory, deadline: combinedDeadline,
            duration_minutes: newTaskDuration,
            is_locked: newTaskIsLocked,
            reschedule_count: 0, 
            timestamp: new Date().toISOString(), color: catObj?.color || '#6366f1'
        };
        try {
            await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            togglePopup();
            fetchTasks();
        } catch (error) { console.error(error); }
    }

    function updateLocalTask(id, updates) {
        const apply = (list) => list.map(t => t.id === id ? { ...t, ...updates } : t);
        todo = apply(todo);
        inProgress = apply(inProgress);
        completed = apply(completed);
        sortTodo();
    }

    function openEdit(task) {
        let d = '', t = '';
        if (task.deadline) {
            const parts = task.deadline.split(' ');
            d = parts[0] || '';
            t = parts[1] || '';
        }
        editTaskData = {
            id: task.id,
            title: task.name,
            deadline: d,
            time: t || '23:59',
            priority: task.priority || 'mid',
            duration_minutes: task.duration_minutes || 30,
            is_locked: task.is_locked || false,
            category: task.category || 'General'
        };
        showEditPopup = true;
        activeMenu = null;
    }

    async function saveEdit() {
        const combinedDeadline = editTaskData.deadline ? `${editTaskData.deadline} ${editTaskData.time}`.trim() : '';
        const catObj = categories.find(c => c.name === editTaskData.category);

        const updatePayload = {
            title: editTaskData.title,
            deadline: combinedDeadline,
            priority: editTaskData.priority,
            duration_minutes: editTaskData.duration_minutes,
            is_locked: editTaskData.is_locked,
            category: editTaskData.category,
            color: catObj?.color || '#6366f1'
        };

        updateLocalTask(editTaskData.id, {
            name: editTaskData.title,
            ...updatePayload
        });

        showEditPopup = false;
        apiManageTask('update', { id: editTaskData.id }, updatePayload);
    }

    function openReschedule(task) {
        let d = '', t = '';
        if (task.deadline) {
            const parts = task.deadline.split(' ');
            d = parts[0] || '';
            t = parts[1] || '';
        }
        rescheduleData = {
            id: task.id,
            deadline: d,
            time: t || '23:59',
            priority: task.priority === 'past_deadline' ? 'high' : (task.priority || 'high')
        };
        showReschedulePopup = true;
        activeMenu = null;
    }

    async function saveReschedule() {
        const combinedDeadline = rescheduleData.deadline ? `${rescheduleData.deadline} ${rescheduleData.time}`.trim() : '';
        
        const updatePayload = {
            deadline: combinedDeadline,
            priority: rescheduleData.priority,
            scheduled_start: null, 
            scheduled_end: null    
        };

        updateLocalTask(rescheduleData.id, updatePayload);

        showReschedulePopup = false;
        apiManageTask('update', { id: rescheduleData.id }, updatePayload);
    }

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (validateFile(file)) {
            selectedFile = file;
        } else {
            event.target.value = '';
        }
    }

    function validateFile(file) {
        if (!file) return false;
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (allowedTypes.includes(file.type) || allowedExtensions.includes(extension)) {
            return true;
        }
        showNotification("Please select a valid file (PDF, JPG, JPEG, or PNG).");
        return false;
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files[0];
        if (validateFile(file)) {
            selectedFile = file;
        }
    }

    function removeFile() {
        selectedFile = null;
    }

    async function handlePdfUpload(event) {
        event.preventDefault();
        if (!selectedFile) return;
        isUploading = true;

        const catObj = categories.find(c => c.name === selectedCategory);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            const payload = {
                fileName: selectedFile.name,
                fileData: base64Data,
                user_id: $currentUser.id,
                category: selectedCategory,
                color: catObj?.color || '#6366f1',
                instruction: aiInstruction, 
                timestamp: new Date().toISOString()
            };

            const uploadUrl = 'https://fahim-n8n.laddu.cc/webhook/upload-task-pdf';

            fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(res => {
                if(res.ok) {
                    setTimeout(() => fetchTasks(), 6000);
                }
            }).catch(e => console.error("PDF upload error", e));

            showNotification("Schedule uploaded! AI is breaking it down into tasks. 🚀");
            togglePopup();
            isUploading = false;
        };
        reader.onerror = () => { showNotification("Error reading file."); isUploading = false; };
        reader.readAsDataURL(selectedFile);
    }

    async function apiManageTask(action, task, updateFields = {}) {
        try {
            await fetch(MANAGE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: task.id, updateFields }) });
        } catch (e) { console.error(e); }
    }

    function sortTodo() {
        const pMap = { 'past_deadline': 4, 'high': 3, 'mid': 2, 'low': 1 };
        todo.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
        todo = [...todo];
    }

    function togglePopup() {
        showAddTaskPopup = !showAddTaskPopup;
        if (!showAddTaskPopup) { 
            newTaskName = ''; 
            newTaskDeadline = ''; 
            newTaskTime = '23:59';
            newTaskDuration = 30; 
            newTaskIsLocked = false;
            taskEntryMode = 'manual'; 
            selectedFile = null; 
            aiInstruction = ''; 
        }
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

    let pollInterval;

    onMount(() => {
        if ($currentUser) {
            fetchTasks();
            pollInterval = setInterval(fetchTasks, 10000);
        }
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });
</script>

<div class="scroll-area fade-in">
    <div class="header-actions">
        <h2>Tasks</h2>
        <button class="new-task-btn" onclick={togglePopup}><i class="bx bx-plus"></i> New Task </button>
    </div>

    <button class="ghost-alert" class:active-interventions={ghostRescheduleTimes > 0} onclick={triggerGhostMode} disabled={isGhosting}>
        {#if isGhosting}
            <i class="bx bx-loader-alt custom-spin"></i>
        {:else}
            <i class="bx bxs-ghost"></i>
        {/if}
        <div>
            <h4>Ghost Mode Active</h4>
            {#if isGhosting}
                <p>AI is calculating new gaps and optimizing...</p>
            {:else if ghostRescheduleTimes > 0}
                <p>AI has auto-rescheduled tasks <strong>{ghostRescheduleTimes} time{ghostRescheduleTimes === 1 ? '' : 's'}</strong>. Click to force sweep.</p>
            {:else}
                <p>AI is silently monitoring. Click to run a manual sweep.</p>
            {/if}
        </div>
    </button>

    <div class="mobile-tabs">
        <button class:active={activeIndex === 0} onclick={() => activeIndex = 0}>To Do <span>({filteredTodo.length})</span></button>
        <button class:active={activeIndex === 1} onclick={() => activeIndex = 1}>Progress <span>({inProgress.length})</span></button>
        <button class:active={activeIndex === 2} onclick={() => activeIndex = 2}>Done <span>({completed.length})</span></button>
    </div>

    <div class="carousel-container"
         ontouchstart={handleTouchStart}
         ontouchmove={handleTouchMove}
         ontouchend={handleTouchEnd}
    >
        <div class="carousel-track" style="transform: translate3d(calc(-{activeIndex * 85}% + 7.5% + {$swipeOffset}px), 0, 0)">

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
                            <div class="task-card" class:past-deadline-card={task.priority === 'past_deadline'} onclick={() => selectedTask = task}>
                                <div class="card-header-actions">
                                    <div class="tag-row">
                                        <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                                        <span class="tag-priority {task.priority.toLowerCase()}">{task.priority.replace('_', ' ')}</span>
                                        {#if task.is_locked}
                                            <span class="tag-locked"><i class='bx bxs-lock-alt'></i></span>
                                        {/if}
                                    </div>
                                    <div class="task-actions">
                                        <button class="options-btn" onclick={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                        {#if activeMenu === task.id}
                                            <div class="actions-menu" transition:slide>
                                                {#if task.priority === 'past_deadline'}
                                                    <button onclick={(e) => { e.stopPropagation(); openReschedule(task); }} class="reschedule-action"><i class='bx bx-calendar-event'></i> Reschedule</button>
                                                {/if}
                                                <button onclick={(e) => { e.stopPropagation(); openEdit(task); }}><i class='bx bx-edit'></i> Edit</button>
                                                <button onclick={(e) => { e.stopPropagation(); moveToInProgress(task); }}><i class='bx bx-loader-alt'></i> Start</button>
                                                <button onclick={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                <h4>{task.name}</h4>
                                {#if task.reschedule_count > 0}
                                    <p class="ai-scheduled-text"><i class='bx bxs-ghost bx-tada'></i> Rescheduled: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.scheduled_start}
                                    <p class="due-text"><i class='bx bx-calendar-event'></i> Planned: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.deadline}
                                    <p class="due-text"><i class='bx bx-time-five'></i> Due: {new Date(task.deadline).toLocaleDateString()}</p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="carousel-item" class:active={activeIndex === 1}>
                <div class="kanban-col">
                    <div class="col-header">In Progress <span class="badge">{inProgress.length}</span></div>
                    <div class="task-container">
                        {#each inProgress as task (task.id)}
                            <div class="task-card" class:past-deadline-card={task.priority === 'past_deadline'} onclick={() => selectedTask = task}>
                                <div class="card-header-actions">
                                    <div class="tag-row">
                                        <span class="tag" style="border-left-color: {getCatColor(task.category)}">{task.category}</span>
                                        {#if task.is_locked}
                                            <span class="tag-locked"><i class='bx bxs-lock-alt'></i></span>
                                        {/if}
                                    </div>
                                    <div class="task-actions">
                                        <button class="options-btn" onclick={(e) => { e.stopPropagation(); toggleTaskMenu(task.id); }}><i class="bx bx-dots-horizontal-rounded"></i></button>
                                        {#if activeMenu === task.id}
                                            <div class="actions-menu" transition:slide>
                                                {#if task.priority === 'past_deadline'}
                                                    <button onclick={(e) => { e.stopPropagation(); openReschedule(task); }} class="reschedule-action"><i class='bx bx-calendar-event'></i> Reschedule</button>
                                                {/if}
                                                <button onclick={(e) => { e.stopPropagation(); openEdit(task); }}><i class='bx bx-edit'></i> Edit</button>
                                                <button onclick={(e) => { e.stopPropagation(); moveToCompleted(task); }}><i class='bx bx-check-double'></i> Finish</button>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                <h4>{task.name}</h4>
                                {#if task.reschedule_count > 0}
                                    <p class="ai-scheduled-text"><i class='bx bxs-ghost bx-tada'></i> Rescheduled: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.scheduled_start}
                                    <p class="due-text"><i class='bx bx-calendar-event'></i> Planned: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.deadline}
                                    <p class="due-text"><i class='bx bx-time-five'></i> Due: {new Date(task.deadline).toLocaleDateString()}</p>
                                {/if}
                                <input type="range" min="0" max="100" value={task.progress}
                                    oninput={(e) => handleProgressChange(task, e)}
                                    onclick={(e) => e.stopPropagation()}
                                    class="progress-slider" style="accent-color: {getCatColor(task.category)}" />
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

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
                                                <button onclick={(e) => { e.stopPropagation(); openEdit(task); }}><i class='bx bx-edit'></i> Edit</button>
                                                <button onclick={(e) => { e.stopPropagation(); deleteTask(task.id); }} class="delete"><i class='bx bx-trash'></i> Delete</button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                {#if task.reschedule_count > 0}
                                    <p class="ai-scheduled-text" style="opacity: 0.5;"><i class='bx bxs-ghost'></i> Rescheduled: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.scheduled_start}
                                    <p class="due-text" style="opacity: 0.5;"><i class='bx bx-calendar-event'></i> Planned: {new Date(task.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                {:else if task.deadline}
                                    <p class="due-text" style="opacity: 0.5;"><i class='bx bx-time-five'></i> Due: {new Date(task.deadline).toLocaleDateString()}</p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>

{#if showAddTaskPopup}
    <div class="popup-backdrop" onclick={togglePopup}>
        <div class="popup" onclick={(e) => e.stopPropagation()}>
            <div class="popup-header">
                <h3>Add New Task</h3>
                <button class="close-btn" onclick={togglePopup}><i class="bx bx-x"></i></button>
            </div>

            <div class="entry-tabs">
                <button type="button" class:active={taskEntryMode === 'manual'} onclick={() => taskEntryMode = 'manual'}>
                    <i class='bx bx-edit-alt'></i> Manual Entry
                </button>
                <button type="button" class:active={taskEntryMode === 'pdf'} onclick={() => taskEntryMode = 'pdf'}>
                    <i class='bx bx-brain'></i> AI Schedule
                </button>
            </div>

            {#if taskEntryMode === 'manual'}
                <form onsubmit={(e) => { e.preventDefault(); handleAddTask(); }} class="task-form fade-in">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;"><label>Task Name</label><input type="text" bind:value={newTaskName} placeholder="Task title" required></div>
                        <div class="form-group"><label>Date</label><input type="date" bind:value={newTaskDeadline}></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Priority</label>
                            <select bind:value={newTaskPriority}><option value="low">Low</option><option value="mid">Mid</option><option value="high">High</option><option value="past_deadline">Past Deadline</option></select>
                        </div>
                        <div class="form-group">
                            <label>{newTaskIsLocked ? 'Exact Start Time' : 'Deadline (By)'}</label>
                            <input type="time" bind:value={newTaskTime}>
                        </div>
                        <div class="form-group"><label>Repeat</label>
                            <select bind:value={repeatOption}><option value="never">Never</option><option value="daily">Daily</option><option value="weekdays">Week days</option></select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>{newTaskIsLocked ? 'Event Duration (Mins)' : 'Est. Time Needed (Mins)'}</label>
                            <input type="number" bind:value={newTaskDuration} min="5" step="5" placeholder="e.g. 30">
                        </div>
                        <div class="form-group toggle-group">
                            <label>Lock to Time</label>
                            <label class="switch">
                                <input type="checkbox" bind:checked={newTaskIsLocked}>
                                <span class="switch-slider"></span>
                            </label>
                            <small class="helper-text-small">If locked, AI Ghost Mode won't reschedule this event.</small>
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
            {:else}
                <form onsubmit={handlePdfUpload} class="task-form fade-in">
                    <p class="helper-text">Upload a timetable, syllabus, or exam schedule. AI will magically extract all deadlines and convert them into tasks.</p>
                    
                    {#if !selectedFile}
                        <div class="file-dropzone" 
                            onclick={() => document.getElementById('task-pdf-upload').click()}
                            ondragover={handleDragOver}
                            ondrop={handleDrop}
                        >
                            <i class='bx bxs-cloud-upload drop-icon'></i>
                            <h4>Select a Schedule</h4>
                            <p class="allowed-types">PDF, PNG, JPEG, JPG are allowed</p>
                        </div>
                        <input type="file" id="task-pdf-upload" accept="application/pdf,image/jpeg,image/png" style="display: none;" onchange={handleFileChange}>
                    {:else}
                        <div class="selected-file-card">
                            <div class="file-info">
                                <i class='bx bxs-file-pdf file-icon'></i>
                                <span class="file-name">{selectedFile.name}</span>
                            </div>
                            <button type="button" class="remove-file-btn" onclick={removeFile}><i class='bx bx-trash'></i></button>
                        </div>

                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Apply Category to All Extracted Tasks</label>
                            <div class="category-list">
                                {#each categories as category}
                                    <div class="category-item">
                                        <label class:selected={selectedCategory === category.name}>
                                            <input type="radio" name="pdf_cat" value={category.name} onchange={() => selectedCategory = category.name} checked={selectedCategory === category.name}>
                                            <span class="cat-dot" style="background: {category.color}"></span> {category.name}
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label for="pdfInstruction">Custom Instructions (Optional)</label>
                            <textarea id="pdfInstruction" rows="2" placeholder="e.g., Only extract exams for my discipline (Computer Science)" bind:value={aiInstruction}></textarea>
                        </div>

                        <button type="submit" class="save-btn ai-btn" disabled={isUploading}>
                            {#if isUploading}
                                <i class='bx bx-loader-alt custom-spin'></i> Uploading to AI...
                            {:else}
                                <i class='bx bx-brain'></i> Extract Tasks
                            {/if}
                        </button>
                    {/if}
                </form>
            {/if}
        </div>
    </div>
{/if}

{#if showEditPopup}
    <div class="popup-backdrop" onclick={() => showEditPopup = false}>
        <div class="popup" onclick={(e) => e.stopPropagation()}>
            <div class="popup-header">
                <h3>Edit Task</h3>
                <button class="close-btn" onclick={() => showEditPopup = false}><i class="bx bx-x"></i></button>
            </div>
            <form onsubmit={(e) => { e.preventDefault(); saveEdit(); }} class="task-form fade-in">
                <div class="form-group">
                    <label>Task Name</label>
                    <input type="text" bind:value={editTaskData.title} required>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Date</label><input type="date" bind:value={editTaskData.deadline}></div>
                    <div class="form-group">
                        <label>{editTaskData.is_locked ? 'Exact Start Time' : 'Deadline (By)'}</label>
                        <input type="time" bind:value={editTaskData.time}>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Priority</label>
                        <select bind:value={editTaskData.priority}>
                            <option value="low">Low</option>
                            <option value="mid">Mid</option>
                            <option value="high">High</option>
                            <option value="past_deadline">Past Deadline</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select bind:value={editTaskData.category}>
                            {#each categories as category}
                                <option value={category.name}>{category.name}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>{editTaskData.is_locked ? 'Event Duration (Mins)' : 'Est. Time Needed (Mins)'}</label>
                        <input type="number" bind:value={editTaskData.duration_minutes} min="5" step="5" required>
                    </div>
                    <div class="form-group toggle-group">
                        <label>Lock to Time</label>
                        <label class="switch">
                            <input type="checkbox" bind:checked={editTaskData.is_locked}>
                            <span class="switch-slider"></span>
                        </label>
                        <small class="helper-text-small">If locked, AI Ghost Mode won't reschedule this event.</small>
                    </div>
                </div>
                <button type="submit" class="save-btn"><i class='bx bx-check'></i> Save Changes</button>
            </form>
        </div>
    </div>
{/if}

{#if showReschedulePopup}
    <div class="popup-backdrop" onclick={() => showReschedulePopup = false}>
        <div class="popup" onclick={(e) => e.stopPropagation()}>
            <div class="popup-header">
                <h3><i class='bx bx-calendar-event' style="color: var(--accent-orange); margin-right: 0.2rem;"></i> Reschedule Task</h3>
                <button class="close-btn" onclick={() => showReschedulePopup = false}><i class="bx bx-x"></i></button>
            </div>
            <form onsubmit={(e) => { e.preventDefault(); saveReschedule(); }} class="task-form fade-in">
                <p class="helper-text" style="text-align: left;">Give this missed task a new lease on life by pushing it to a new date.</p>
                <div class="form-row">
                    <div class="form-group"><label>New Date</label><input type="date" bind:value={rescheduleData.deadline} required></div>
                    <div class="form-group"><label>New Time</label><input type="time" bind:value={rescheduleData.time} required></div>
                </div>
                <div class="form-group">
                    <label>Update Priority (Optional)</label>
                    <select bind:value={rescheduleData.priority}>
                        <option value="low">Low</option>
                        <option value="mid">Mid</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <button type="submit" class="save-btn" style="background: var(--accent-orange); color: #0b0c15;"><i class='bx bx-sync'></i> Confirm Reschedule</button>
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
                <p><strong>Priority:</strong> <span class="tag-priority {selectedTask.priority.toLowerCase()}">{selectedTask.priority.replace('_', ' ')}</span></p>
                <p><strong>Type:</strong> {selectedTask.is_locked ? 'Fixed Event (Locked) 🔒' : 'Fluid Task 🌊'}</p>
                <p><strong>Duration:</strong> {selectedTask.duration_minutes} mins</p>
                
                <p><strong>Status:</strong> {selectedTask.status.replace('_', ' ')}</p>
                
                {#if selectedTask.reschedule_count > 0}
                    <p style="color: var(--accent-purple);"><strong><i class='bx bxs-ghost'></i> Rescheduled Start:</strong> {new Date(selectedTask.scheduled_start).toLocaleString()}</p>
                    <p style="color: var(--accent-purple);"><strong><i class='bx bxs-ghost'></i> Rescheduled End:</strong> {new Date(selectedTask.scheduled_end).toLocaleString()}</p>
                {:else if selectedTask.scheduled_start}
                    <p><strong><i class='bx bx-calendar-event'></i> Planned Start:</strong> {new Date(selectedTask.scheduled_start).toLocaleString()}</p>
                    <p><strong><i class='bx bx-calendar-event'></i> Planned End:</strong> {new Date(selectedTask.scheduled_end).toLocaleString()}</p>
                {/if}
                {#if selectedTask.deadline}
                    <p><strong><i class='bx bx-time-five'></i> Hard Deadline:</strong> {new Date(selectedTask.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} {new Date(selectedTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                {/if}
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
    .new-task-btn { background: var(--accent-purple); color: white; border: none; padding: 0.6rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.4rem; }
    
    /* INTERACTIVE GHOST ALERT */
    .ghost-alert { 
        background: rgba(156, 163, 175, 0.1); border: 1px solid rgba(156, 163, 175, 0.2); padding: 1rem; border-radius: 0.75rem; 
        display: flex; gap: 1rem; margin-bottom: 1.5rem; transition: all 0.3s ease; text-align: left; width: 100%; cursor: pointer;
    }
    .ghost-alert:hover { background: rgba(156, 163, 175, 0.15); border-color: rgba(156, 163, 175, 0.4); }
    .ghost-alert:disabled { cursor: not-allowed; opacity: 0.8; }
    
    /* NEW: Perfectly centered smooth spin for boxicons */
    .ghost-alert i { font-size: 1.5rem; color: var(--text-gray); transition: color 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; }
    .custom-spin { animation: smoothSpin 1.2s linear infinite; transform-origin: center center; }
    @keyframes smoothSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .ghost-alert h4 { color: white; margin: 0; font-size: 0.9rem; }
    .ghost-alert p { color: var(--text-gray); margin: 0.2rem 0 0; font-size: 0.8rem; }
    
    .ghost-alert.active-interventions { background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); }
    .ghost-alert.active-interventions:hover { background: rgba(99, 102, 241, 0.25); }
    .ghost-alert.active-interventions i { color: var(--accent-purple); }

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

    .task-card { background: #1e1f2e; padding: 1.25rem; border-radius: 1rem; border: 1px solid var(--border-color); margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s; }
    .task-card:hover { border-color: var(--accent-purple); }
    .task-card.past-deadline-card { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); }
    .task-card.completed h4 { text-decoration: line-through; opacity: 0.5; }
    .task-card h4 { color: white; margin: 0.75rem 0 0; font-size: 1rem; }

    .ai-scheduled-text { font-size: 0.75rem; color: var(--accent-purple); margin: 0.5rem 0 0 0; display: flex; align-items: center; gap: 0.3rem; font-weight: 500; }
    .due-text { font-size: 0.75rem; color: var(--text-gray); margin: 0.5rem 0 0 0; display: flex; align-items: center; gap: 0.3rem; }

    .card-header-actions { display: flex; justify-content: space-between; align-items: flex-start; }
    .tag-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .tag { font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 0.3rem; background: rgba(255,255,255,0.05); color: white; border-left: 3px solid; }
    .tag-priority { font-size: 0.6rem; text-transform: uppercase; font-weight: 800; color: #fff; margin-left: 5px; }
    .tag-priority.high { color: #f87171; }
    .tag-priority.mid { color: #fb923c; }
    .tag-priority.low { color: #4ade80; }
    .tag-priority.past_deadline { color: #ef4444; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
    .tag-locked { color: #f59e0b; font-size: 0.8rem; display: flex; align-items: center; } 

    .task-actions { position: relative; }
    .options-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; }
    .actions-menu { position: absolute; top: 100%; right: 0; background: #2a2c41; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.5rem; z-index: 50; width: 160px; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
    .actions-menu button { background: none; border: none; color: var(--text-gray); padding: 0.5rem 0.75rem; text-align: left; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .actions-menu button:hover { background: var(--accent-purple); color: white; }
    .actions-menu .delete { color: #f87171; }
    .actions-menu .reschedule-action { color: var(--accent-orange); }

    .progress-slider { width: 100%; margin-top: 1rem; height: 6px; border-radius: 3px; }

    /* --- POPUPS --- */
    .popup-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(5px); }
    .popup { background: var(--card-bg); border-radius: 1.5rem; padding: 1.5rem; width: 90%; max-width: 550px; max-height: 85vh; overflow-y: auto; border: 1px solid var(--border-color); }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); font-size: 1.5rem; cursor: pointer; }
    
    .entry-tabs { display: flex; gap: 0.5rem; background: #1e1f2e; padding: 0.4rem; border-radius: 0.75rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
    .entry-tabs button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: transparent; color: var(--text-gray); border: none; padding: 0.6rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .entry-tabs button.active { background: var(--accent-purple); color: white; }

    .file-dropzone { border: 2px dashed #3b3b54; border-radius: 1rem; padding: 3rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255, 255, 255, 0.02); }
    .file-dropzone:hover { border-color: var(--accent-purple); background: rgba(139, 92, 246, 0.05); }
    .drop-icon { font-size: 3rem; color: #64748b; margin-bottom: 1rem; }
    .file-dropzone h4 { color: white; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
    .allowed-types { color: #64748b; font-size: 0.8rem; margin: 0; }
    .selected-file-card { display: flex; justify-content: space-between; align-items: center; background: #2a2a3c; padding: 1rem; border-radius: 0.75rem; border: 1px solid #3b3b54; margin-bottom: 1rem; }
    .file-info { display: flex; align-items: center; gap: 0.75rem; overflow: hidden; }
    .file-icon { color: #f43f5e; font-size: 1.5rem; }
    .file-name { color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .remove-file-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; }
    .helper-text { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; margin-bottom: 1.5rem; text-align: center; }

    .task-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-row { display: flex; gap: 10px; width: 100%; }
    .form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .form-group label { color: var(--text-gray); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group textarea, .form-group select { background: #1e1f2e; border: 1px solid var(--border-color); color: white; padding: 0.75rem; border-radius: 0.5rem; font-size: 16px; width: 100%; outline: none; }

    .toggle-group { display: flex; flex-direction: column; gap: 8px; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; margin-top: 4px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #1e1f2e; border: 1px solid var(--border-color); transition: .3s; border-radius: 34px; }
    .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: var(--text-gray); transition: .3s; border-radius: 50%; }
    input:checked + .switch-slider { background-color: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }
    input:checked + .switch-slider:before { transform: translateX(20px); background-color: #f59e0b; }
    .helper-text-small { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; line-height: 1.2; }

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
    
    .save-btn { width: 100%; background: var(--accent-purple); color: white; border: none; padding: 1rem; border-radius: 1rem; font-weight: 700; margin-top: 1rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

    .task-detail-content p { color: var(--text-main); font-size: 0.95rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 10px; }
    /* test commit comment 4 */
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
