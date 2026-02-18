<script>
	let showAddTaskPopup = false;
	
	// State for the new task form
	let newTaskName = '';
	let newTaskDeadline = '';
	let newTaskPriority = 'mid';

	let categories = ['Study', 'Work', 'Home', 'Fitness', 'Groceries'];
	let selectedCategory = 'Study';
	let newCategoryInput = '';

	// Task data arrays
	let todo = [
		{ id: 1, name: 'Connect MongoDB Atlas', category: 'Work', attachments: 2, user: 'FS', deadline: '2024-03-15', priority: 'high' },
		{ id: 2, name: 'Design login page mockups', category: 'Design', attachments: 0, user: 'AD', deadline: '2024-03-20', priority: 'mid' },
	];

	let inProgress = [
		{ id: 5, name: 'Implement Dashboard UI', category: 'Frontend', progress: 75, deadline: '2024-03-18', priority: 'high' },
	];

	let completed = [
		{ id: 7, name: 'Initial project setup', category: 'DevOps', deadline: '2024-03-01', priority: 'low' },
	];

	function togglePopup() {
		showAddTaskPopup = !showAddTaskPopup;
		if (!showAddTaskPopup) {
			// Reset form fields when closing popup
			newTaskName = '';
			newTaskDeadline = '';
			newTaskPriority = 'mid';
			selectedCategory = categories[0] || '';
			newCategoryInput = '';
		}
	}

	async function handleAddTask() {
		if (newTaskName.trim() === '' || selectedCategory.trim() === '') return;
		
		const newId = Math.max(0, ...[...todo, ...inProgress, ...completed].map(t => t.id || 0)) + 1;
		const newTaskItem = { 
			id: newId, 
			name: newTaskName,
			deadline: newTaskDeadline,
			priority: newTaskPriority,
			category: selectedCategory,
			user: 'ME',
			attachments: 0,
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
</script>

<div class="scroll-area fade-in">
	<div class="header-actions">
		<h2>Tasks</h2>
		<button class="new-task-btn" on:click={togglePopup}><i class="bx bx-plus"></i> New Task</button>
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
					<span class="tag {task.priority}">{task.category}</span>
					<h4>{task.name}</h4>
					<p class="task-meta">Due: {task.deadline || 'N/A'}</p>
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
					<span class="tag green">{task.category}</span>
					<h4>{task.name}</h4>
					<div class="progress-bar"><div class="fill" style="width: {task.progress}%"></div></div>
					<div class="progress-text">{task.progress}% Complete</div>
				</div>
			{/each}
		</div>

		<div class="kanban-col">
			<div class="col-header">Completed <span class="badge">{completed.length}</span></div>
			{#each completed as task (task.id)}
				<div class="task-card completed">
					<h4>{task.name}</h4>
				</div>
			{/each}
		</div>
	</div>
</div>

{#if showAddTaskPopup}
	<div class="popup-backdrop" on:click={togglePopup}>
		<div class="popup" on:click|stopPropagation>
			<div class="popup-header">
				<h3>Add New Task</h3>
				<button class="close-btn" on:click={togglePopup}><i class="bx bx-x"></i></button>
			</div>
			<form on:submit|preventDefault={handleAddTask} class="task-form">
				<div class="form-group">
					<label for="task-name">Task Name</label>
					<input type="text" id="task-name" bind:value={newTaskName} placeholder="e.g., Finish SvelteKit tutorial">
				</div>

				<div class="form-group">
					<label for="task-deadline">Deadline</label>
					<input type="date" id="task-deadline" bind:value={newTaskDeadline}>
				</div>

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
	.task-card { background: #1e1f2e; padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); margin-bottom: 1rem; cursor: pointer; }
	.task-card:hover { border-color: var(--accent-purple); }
	.task-card.completed h4 { text-decoration: line-through; color: var(--text-gray); }
	.task-card h4 { color: white; margin: 0.5rem 0; font-size: 0.9rem; font-weight: 500; }
	.task-meta { font-size: 0.75rem; color: var(--text-gray); margin: 0.5rem 0; }
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
    .popup { background: var(--card-bg); border-radius: 1rem; padding: 2rem; width: 90%; max-width: 500px; border: 1px solid var(--border-color); }
    .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .popup-header h3 { margin: 0; color: white; }
    .close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
	.task-form { display: flex; flex-direction: column; gap: 1.5rem; }
	.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { color: var(--text-gray); font-size: 0.9rem; }
    .form-group input, .form-group select { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.75rem; border-radius: 0.5rem; }
	.form-group input[type="date"] { color-scheme: dark; }
	.category-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 150px; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 0.5rem; }
	.category-item { display: flex; align-items: center; justify-content: space-between; }
	.category-item label { background: #1E1F2E; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; width: 100%; user-select: none; }
	.category-item label.selected { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
	.category-item input[type="radio"] { display: none; }
	.delete-category-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.2rem; margin-left: 1rem; }
	.delete-category-btn:hover { color: var(--accent-red); }
	.add-category { display: flex; gap: 0.5rem; }
	.add-category input { flex-grow: 1; }
	.add-category-btn { background: var(--accent-green); color: white; border: none; border-radius: 0.5rem; padding: 0 1rem; cursor: pointer; }
	.radio-group { display: flex; gap: 1rem; flex-wrap: wrap; }
	.radio-group label { background: #1E1F2E; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; user-select: none; }
	.radio-group label.selected { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
	.radio-group input[type="radio"] { display: none; }
	.save-btn { background: var(--accent-purple); color: white; border: none; padding: 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 500; margin-top: 1rem; }
	.fade-in { animation: fadeIn 0.4s ease-out forwards; }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
