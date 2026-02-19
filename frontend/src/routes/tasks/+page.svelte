<script>
	import Notification from '$lib/Notification.svelte';
	let showAddTaskPopup = $state(false);
	
	// State for the new task form
	let newTaskName = $state('');
	let newTaskDeadline = $state('');
	let newTaskTime = $state('23:59');
	let newTaskPriority = $state('mid');
	let repeatOption = $state('never');
	let customDays = $state([]); // ['Mon', 'Tue', etc.]
	const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let categories = $state(['Study', 'Work', 'Home', 'Fitness', 'Groceries']);
	let selectedCategory = $state('Study');
	let newCategoryInput = $state('');

	// Task data arrays
	let todo = $state([
		{ id: 1, name: 'Connect MongoDB Atlas', category: 'Work', attachments: 2, user: 'FS', deadline: '2024-03-15 10:00', priority: 'high' },
		{ id: 2, name: 'Design login page mockups', category: 'Design', attachments: 0, user: 'AD', deadline: '2024-03-20 18:00', priority: 'mid' },
	]);

	let inProgress = $state([
		{ id: 5, name: 'Implement Dashboard UI', category: 'Frontend', progress: 75, deadline: '2024-03-18', priority: 'high' },
	]);

	let completed = $state([
		{ id: 7, name: 'Initial project setup', category: 'DevOps', deadline: '2024-03-01', priority: 'low', completionTime: new Date('2024-03-01T10:00:00Z') },
	]);

	let notificationMessage = $state('');
	let notificationKey = $state(0);

	function sortTodo() {
		const priorityOrder = { 'past_deadline': 4, 'high': 3, 'mid': 2, 'low': 1 };

		const isPastDue = (task) => {
			if (!task.deadline) return false;
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Normalize to start of day
			const deadlineDate = new Date(task.deadline);
			return deadlineDate < today;
		};

		todo.sort((a, b) => {
			const aPriority = isPastDue(a) ? 'past_deadline' : a.priority;
			const bPriority = isPastDue(b) ? 'past_deadline' : b.priority;
			
			const aValue = priorityOrder[aPriority] || 0;
			const bValue = priorityOrder[bPriority] || 0;

			return bValue - aValue; // Sort descending
		});
		
		todo = [...todo]; // Trigger reactivity
	}

	// Initial sort of the tasks
	sortTodo();

	function togglePopup() {
		showAddTaskPopup = !showAddTaskPopup;
		if (!showAddTaskPopup) {
			// Reset form fields when closing popup
			newTaskName = '';
			newTaskDeadline = '';
			newTaskTime = '23:59';
			newTaskPriority = 'mid';
			repeatOption = 'never';
			customDays = [];
			selectedCategory = categories[0] || '';
			newCategoryInput = '';
		}
	}

	async function handleAddTask() {
		if (newTaskName.trim() === '' || selectedCategory.trim() === '') return;
		
		const newId = Math.max(0, ...[...todo, ...inProgress, ...completed].map(t => t.id || 0)) + 1;
		const combinedDeadline = newTaskDeadline ? `${newTaskDeadline} ${newTaskTime}` : '';
		const newTaskItem = { 
			id: newId, 
			name: newTaskName,
			deadline: combinedDeadline,
			priority: newTaskPriority,
			category: selectedCategory,
			user: 'ME',
			attachments: 0,
			repeat: repeatOption,
			customDays: [...customDays],
		};
		
		// 1. Send data to n8n webhook
		try {
			const webhookUrl = 'https://your-n8n-webhook-url.com/placeholder'; // IMPORTANT: Replace with actual webhook URL
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					task_name: newTaskItem.name,
					deadline: newTaskItem.deadline,
					priority: newTaskItem.priority,
					category: newTaskItem.category,
				}),
			});

			if (!response.ok) {
				console.error('Webhook call failed:', response.statusText);
			}
		} catch (error) {
			console.error('Error sending data to webhook:', error);
		}

		// 2. Add to local UI for immediate feedback
		todo = [newTaskItem, ...todo];
		sortTodo();
		
		notificationMessage = `Added "${newTaskItem.name}" to To Do list!`;
		notificationKey++;

		// 3. Close popup
		togglePopup();
	}

	function handleAddCategory() {
		if (newCategoryInput.trim() !== '' && !categories.includes(newCategoryInput.trim())) {
			categories = [...categories, newCategoryInput.trim()];
			selectedCategory = newCategoryInput.trim();
			newCategoryInput = '';
		}
	}

	function handleDeleteCategory(categoryToDelete) {
		categories = categories.filter(c => c !== categoryToDelete);
		if (selectedCategory === categoryToDelete) {
			selectedCategory = categories[0] || '';
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
			// This is needed to trigger the reactivity
			inProgress = [...inProgress];
		}
	}

	function moveToCompleted(task) {
		// Ensure correct shape for completed column
		const taskToMove = { ...task, completionTime: new Date() };
		delete taskToMove.progress; // Remove progress if it exists
		completed = [taskToMove, ...completed];
		todo = todo.filter(t => t.id !== task.id);
		inProgress = inProgress.filter(t => t.id !== task.id); // Also remove from inProgress
		notificationMessage = `Congrats on finishing "${task.name}"!`;
		notificationKey++;
		activeMenu = null;
	}

	function moveToInProgress(task) {
		// Add progress property
		inProgress = [{ ...task, progress: 0 }, ...inProgress];
		todo = todo.filter(t => t.id !== task.id);
		activeMenu = null;
	}

	function deleteTask(taskId) {
		todo = todo.filter(t => t.id !== taskId);
		activeMenu = null;
	}

	function pushBackToProgress(task) {
		const taskToMove = { ...task, progress: 75 };
		delete taskToMove.completionTime;
		inProgress = [taskToMove, ...inProgress];
		completed = completed.filter(t => t.id !== task.id);
		activeMenu = null;
	}

	function deleteCompletedTask(taskId) {
		completed = completed.filter(t => t.id !== taskId);
		activeMenu = null;
	}

	function deleteInProgressTask(taskId) {
		inProgress = inProgress.filter(t => t.id !== taskId);
		activeMenu = null;
	}

	function toggleCustomDay(day) {
		if (customDays.includes(day)) {
			customDays = customDays.filter(d => d !== day);
		} else {
			customDays = [...customDays, day];
		}
	}
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
		<div class="kanban-col">
			<div class="col-header">To Do <span class="badge">{todo.length}</span></div>
			{#each todo as task (task.id)}
				<div class="task-card">
					<div class="card-header-actions">
						<div class="tag-row">
							<span class="tag {task.priority}">{task.category}</span>
							<span class="tag-priority {task.priority}">{task.priority.replace('_', ' ')}</span>
							{#if task.deadline}
								<span class="deadline-time"><i class="bx bx-time-five"></i> {task.deadline.split(' ')[1] || task.deadline}</span>
							{/if}
						</div>
						<div class="task-actions">
							<button class="options-btn" on:click={() => toggleTaskMenu(task.id)} title="Task options">
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

		<div class="kanban-col">
			<div class="col-header">In Progress <span class="badge">{inProgress.length}</span></div>
			{#each inProgress as task (task.id)}
				<div class="task-card">
					<div class="card-header-actions">
						<div class="tag-row">
							<span class="tag green">{task.category}</span>
							<span class="tag-priority {task.priority}">{task.priority.replace('_', ' ')}</span>
							{#if task.deadline}
								<span class="deadline-time"><i class="bx bx-time-five"></i> {task.deadline.split(' ')[1] || task.deadline}</span>
							{/if}
						</div>
						<div class="task-actions">
							<button class="options-btn" on:click={() => toggleTaskMenu(task.id)} title="Task options">
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
					<input type="range" min="0" max="100" value={task.progress} on:input={(e) => handleProgressChange(task, e)} class="progress-slider" />
					<div class="progress-text">{task.progress}% Complete</div>
				</div>
			{/each}
		</div>

		<div class="kanban-col">
			<div class="col-header">Completed <span class="badge">{completed.length}</span></div>
			{#each completed as task (task.id)}
				<div class="task-card completed">
					<div class="card-header-actions">
						<h4>{task.name}</h4>
						<div class="task-actions">
							<button class="options-btn" on:click={() => toggleTaskMenu(task.id)} title="Task options">
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
					<p class="task-meta">Completed: {task.completionTime.toLocaleString()}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

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
				{:else}
					<div style="margin-top: -0.5rem"></div>
				{/if}
				
				<div class="form-group">
					<label>Task Category</label>
					<div class="category-list">
						{#each categories as category}
							<div class="category-item">
								<label class:selected={selectedCategory === category}>
									<input type="radio" bind:group={selectedCategory} value={category}>
									{category}
								</label>
								<button type="button" class="delete-category-btn" on:click={() => handleDeleteCategory(category)}>
									<i class="bx bx-trash"></i>
								</button>
							</div>
						{/each}
					</div>
					<div class="add-category">
						<input type="text" bind:value={newCategoryInput} placeholder="Add new category...">
						<button type="button" on:click={handleAddCategory} class="add-category-btn"><i class="bx bx-plus"></i> Add</button>
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
	.kanban-board { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; align-items: start; }
	.kanban-col { background: var(--card-bg); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); min-height: 500px; }
	.col-header { display: flex; justify-content: space-between; color: var(--text-white); font-weight: 600; margin-bottom: 1rem; font-size: 0.9rem; }
	.badge { background: #1e1f2e; color: var(--text-gray); padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; }
	.task-card { background: #1e1f2e; padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); margin-bottom: 1rem; }
	.task-card:hover { border-color: var(--accent-purple); }
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
	.day-selector { display: flex; gap: 0.5rem; flex-wrap: wrap; }
	.day-btn { background: #1E1F2E; border: 1px solid var(--border-color); color: var(--text-gray); padding: 0.5rem 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; font-size: 0.8rem; }
	.day-btn:hover { border-color: var(--accent-purple); color: white; }
	.day-btn.active { background: var(--accent-purple); color: white; border-color: var(--accent-purple); }
	.tag { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-weight: 500; border-left: 3px solid transparent; }
	.tag.high { border-color: #f87171; }
    .tag.mid { border-color: #fb923c; }
    .tag.low { border-color: #4ade80; }
	.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.8rem; }
	.avatar { width: 1.5rem; height: 1.5rem; background: #6b7280; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.6rem; }
	.progress-bar { height: 4px; background: var(--bg-dark); border-radius: 2px; margin-top: 0.5rem; }
	.fill { height: 100%; background: var(--accent-green); border-radius: 2px; }
	.progress-text { font-size: 0.7rem; color: var(--text-gray); margin-top: 0.25rem; }
	.popup-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 100; }
    .popup { background: var(--card-bg); border-radius: 1rem; padding: 1.25rem; width: 95%; max-width: 650px; border: 1px solid var(--border-color); }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .popup-header h3 { margin: 0; color: white; font-size: 1.1rem; }
    .close-btn { background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer; }
	.task-form { display: flex; flex-direction: column; gap: 1rem; }
	.form-row { display: flex; gap: 1rem; width: 100%; }
	.form-row .form-group { flex: 1; }
	.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .form-group label { color: var(--text-gray); font-size: 0.8rem; }
    .form-group input, .form-group select { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.6rem; border-radius: 0.5rem; font-size: 0.85rem; }
	.form-group input[type="date"], .form-group input[type="time"] { color-scheme: dark; }
	.category-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 100px; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 0.4rem; }
	.category-item { display: flex; align-items: center; justify-content: space-between; }
	.category-item label { background: #1E1F2E; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; width: 100%; user-select: none; font-size: 0.8rem; }
	.category-item label.selected { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
	.category-item input[type="radio"] { display: none; }
	.delete-category-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1rem; margin-left: 0.5rem; }
	.delete-category-btn:hover { color: var(--accent-red); }
	.add-category { display: flex; gap: 0.4rem; }
	.add-category input { flex-grow: 1; padding: 0.5rem; }
	.add-category-btn { background: var(--accent-green); color: white; border: none; border-radius: 0.5rem; padding: 0 0.75rem; cursor: pointer; font-size: 0.8rem; }
	.radio-group { display: flex; gap: 0.75rem; flex-wrap: wrap; }
	.radio-group label { background: #1E1F2E; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; user-select: none; font-size: 0.8rem; }
	.radio-group label.selected { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
	.radio-group input[type="radio"] { display: none; }
	.save-btn { background: var(--accent-purple); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 0.5rem; }
	.fade-in { animation: fadeIn 0.4s ease-out forwards; }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

	.card-header-actions {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.task-actions {
		position: relative;
	}

	.options-btn {
		background: none;
		border: none;
		color: var(--text-gray);
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0;
		line-height: 1;
	}
	.options-btn:hover {
		color: white;
	}

	.actions-menu {
		position: absolute;
		top: calc(100% + 5px);
		right: 0;
		background: #2a2c41;
		border-radius: 0.5rem;
		padding: 0.5rem;
		z-index: 10;
		width: 180px;
		border: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		animation: fadeIn 0.1s ease-out;
	}

	.actions-menu button {
		background: none;
		border: none;
		color: var(--text-gray);
		padding: 0.5rem 0.75rem;
		text-align: left;
		cursor: pointer;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		font-weight: 500;
		width: 100%;
	}

	.actions-menu button:hover {
		background: var(--accent-purple);
		color: white;
	}
	
	.actions-menu button i {
		font-size: 1.1rem;
	}

	.actions-menu .divider {
		height: 1px;
		background: var(--border-color);
		margin: 0.25rem 0;
	}

	.actions-menu button.delete {
		color: #f87171;
	}

	.actions-menu button.delete:hover {
		background: var(--accent-red);
		color: white;
	}

	/* Adjustments for card content based on new header */
	.task-card h4 {
		margin-top: 0;
	}

	.progress-slider {
		width: 100%;
		margin-top: 0.5rem;
	}
</style>
