<script>
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import Notification from '$lib/Notification.svelte';

	let energyChartCanvas;
	let chartInstance;
	let showWelcomeNotification = $state(false);

	onMount(() => {
		showWelcomeNotification = true;
		if (energyChartCanvas) {
			chartInstance = new Chart(energyChartCanvas, {
				type: 'line',
				data: {
					labels: ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm'],
					datasets: [
						{
							label: 'Energy',
							data: [30, 60, 95, 80, 40, 50, 20],
							borderColor: '#22c55e',
							backgroundColor: 'rgba(34, 197, 94, 0.1)',
							borderWidth: 2,
							tension: 0.4,
							fill: true,
							pointRadius: 0,
							pointHoverRadius: 4
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						x: { display: false },
						y: { display: false, min: 0, max: 100 }
					}
				}
			});
		}
	});
</script>

{#if showWelcomeNotification}
	<Notification message="Welcome back! Your energy is peaking." />
{/if}

<header class="top-header">
	<div class="header-left">
		<h2>Dashboard</h2>
		<p class="status-indicator">
			<span class="pulse-dot"></span> High Energy Window • 10:42 AM
		</p>
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
			<div class="stat-value">8</div>
			<div class="stat-sub">3 completed</div>
		</div>
		<div class="stat-card">
			<div class="stat-header">
				<span>Focus Time</span>
				<i class="bx bx-time icon-bg blue"></i>
			</div>
			<div class="stat-value">4.2h</div>
			<div class="stat-sub green-text"><i class="bx bx-up-arrow-alt"></i> +12% vs avg</div>
		</div>
		<div class="stat-card border-green">
			<div class="stat-header">
				<span>Energy</span>
				<i class="bx bxs-battery-charging icon-bg green"></i>
			</div>
			<div class="stat-value green-text">High</div>
			<div class="stat-sub">Peak at 10am</div>
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
				<span>1/7</span>
			</div>
			<div class="task-list">
				<div class="task-item">
					<div class="circle"></div>
					<span class="task-text">Finish API integration for auth module</span>
					<span class="tag">LifeSync</span>
				</div>
				<div class="task-item completed">
					<div class="circle checked"><i class="bx bx-check"></i></div>
					<span class="task-text">Write unit tests</span>
				</div>
				<div class="task-item">
					<div class="circle"></div>
					<span class="task-text">Research vector DB options</span>
					<span class="tag">AI</span>
					<i class="bx bx-down-arrow-alt arrow-icon"></i>
				</div>
			</div>
		</div>

		<div class="side-widgets">
			<div class="widget notification-widget">
				<div class="widget-header">
					<h3>Recent Notifications</h3>
					<i class="bx bx-bell" style="color: var(--accent-orange)"></i>
				</div>
				<div class="notification-list">
					<div class="notif-card">
						<div class="notif-dot"></div>
						<div class="notif-content">
							<p class="notif-title">Upcoming Period</p>
							<p class="notif-time">In 3 days • Health</p>
						</div>
					</div>
					<div class="notif-card">
						<div class="notif-dot silent"></div>
						<div class="notif-content">
							<p class="notif-title">Daily Summary Ready</p>
							<p class="notif-time">8:00 AM • Insight</p>
						</div>
					</div>
				</div>
			</div>

			<div class="widget chart-widget">
				<h3>Energy Curve</h3>
				<div class="chart-container">
					<canvas bind:this={energyChartCanvas}></canvas>
				</div>
			</div>
			<div class="widget deadlines-widget">
				<h3>Deadlines</h3>
				<div class="deadline-list">
					<div class="deadline-item">
						<div class="deadline-title red-text">
							<i class="bx bx-error-circle"></i> API Integration
						</div>
						<span class="time-left">3h left</span>
					</div>
					<div class="deadline-item">
						<div class="deadline-title"><i class="bx bx-time"></i> CI/CD Setup</div>
						<span class="time-left">8h left</span>
					</div>
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
	.status-indicator {
		font-size: 0.75rem;
		color: var(--accent-green);
		display: flex;
		align-items: center;
		margin-top: 0.25rem;
	}
	.pulse-dot {
		width: 0.5rem;
		height: 0.5rem;
		background-color: var(--accent-green);
		border-radius: 50%;
		margin-right: 0.5rem;
		animation: pulse 2s infinite;
	}
	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}

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
	.chart-widget {
		height: 12rem;
	}
	.chart-container {
		flex: 1;
		position: relative;
		width: 100%;
	}
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
