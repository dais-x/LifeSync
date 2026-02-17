<div class="scroll-area fade-in">
	<div class="header-actions">
		<h2>Tasks</h2>
		<button class="new-task-btn"><i class="bx bx-plus"></i> New Task</button>
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
			<div class="col-header">To Do <span class="badge">4</span></div>
			<div class="task-card">
				<span class="tag blue">Backend</span>
				<h4>Connect MongoDB Atlas</h4>
				<div class="card-footer">
					<div class="avatar">FS</div>
					<span><i class="bx bx-paperclip"></i> 2</span>
				</div>
			</div>
		</div>

		<div class="kanban-col">
			<div class="col-header">In Progress <span class="badge">2</span></div>
			<div class="task-card">
				<span class="tag green">Frontend</span>
				<h4>Implement Dashboard UI</h4>
				<div class="progress-bar"><div class="fill" style="width: 75%"></div></div>
				<div class="progress-text">75% Complete</div>
			</div>
		</div>

		<div class="kanban-col">
			<div class="col-header">Completed <span class="badge">5</span></div>
		</div>
	</div>
</div>

<style>
	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	h2 {
		color: white;
		margin: 0;
	}
	.new-task-btn {
		background: var(--accent-purple);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ghost-alert {
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.3);
		padding: 1rem;
		border-radius: 0.75rem;
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.ghost-alert i {
		font-size: 1.5rem;
		color: var(--accent-purple);
	}
	.ghost-alert h4 {
		color: white;
		margin: 0;
		font-size: 0.9rem;
	}
	.ghost-alert p {
		color: var(--text-gray);
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
	}

	.kanban-board {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}
	.kanban-col {
		background: var(--card-bg);
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid var(--border-color);
		min-height: 500px;
	}
	.col-header {
		display: flex;
		justify-content: space-between;
		color: var(--text-white);
		font-weight: 600;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
	.badge {
		background: #1e1f2e;
		color: var(--text-gray);
		padding: 0.1rem 0.5rem;
		border-radius: 1rem;
		font-size: 0.75rem;
	}

	.task-card {
		background: #1e1f2e;
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--border-color);
		margin-bottom: 1rem;
		cursor: pointer;
	}
	.task-card:hover {
		border-color: var(--accent-purple);
	}
	.task-card h4 {
		color: white;
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}
	.tag {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
	}
	.tag.blue {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
	}
	.tag.green {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;
		font-size: 0.8rem;
	}
	.avatar {
		width: 1.5rem;
		height: 1.5rem;
		background: #6b7280;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 0.6rem;
	}
	.progress-bar {
		height: 4px;
		background: var(--bg-dark);
		border-radius: 2px;
		margin-top: 0.5rem;
	}
	.fill {
		height: 100%;
		background: var(--accent-green);
		border-radius: 2px;
	}
	.progress-text {
		font-size: 0.7rem;
		color: var(--text-gray);
		margin-top: 0.25rem;
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
