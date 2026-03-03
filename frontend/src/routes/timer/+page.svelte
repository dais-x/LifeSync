<script>
	import { onDestroy } from 'svelte';

	// Timer Configuration
	let mode = $state('pomodoro'); // 'pomodoro', '5217', 'custom'
	let isWorkPhase = $state(true);
	let isRunning = $state(false);
	let timerInterval;

	// Session Logging State
	let sessionLogs = $state([]);
	let currentSessionStart = $state(null);
	let showLog = $state(false);

	// Presets (in seconds)
	const presets = {
		pomodoro: { work: 25 * 60, break: 5 * 60 },
		'5217': { work: 52 * 60, break: 17 * 60 },
		custom: { work: 45 * 60, break: 15 * 60 }
	};

	// Current State
	let timeLeft = $state(presets[mode].work);

	// Custom Input Bindings (in minutes for the UI)
	let customWorkMin = $state(45);
	let customBreakMin = $state(15);

	// Formatting for the Flip Clock
	let minutes = $derived(String(Math.floor(timeLeft / 60)).padStart(2, '0'));
	let seconds = $derived(String(timeLeft % 60).padStart(2, '0'));

	// Derived UI states
	let currentPhaseText = $derived(isWorkPhase ? 'Focus Time' : 'Break Time');
	let accentColor = $derived(isWorkPhase ? 'var(--accent-purple)' : 'var(--accent-green)');

	// Log Computations
	let totalFocusTime = $derived(sessionLogs.reduce((acc, log) => acc + (log.endTime.getTime() - log.startTime.getTime()), 0));

	function formatDuration(ms) {
		if (ms < 0) ms = 0;
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function formatTime(date) {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function switchMode(newMode) {
		mode = newMode;
		isWorkPhase = true;
		resetTimer();
		pauseTimer();

		if (mode === 'custom') {
			updateCustomTime();
		} else {
			timeLeft = presets[mode].work;
		}
	}

	function updateCustomTime() {
		if (mode === 'custom') {
			presets.custom.work = Math.max(1, customWorkMin) * 60;
			presets.custom.break = Math.max(1, customBreakMin) * 60;
			timeLeft = isWorkPhase ? presets.custom.work : presets.custom.break;
		}
	}

	function toggleTimer() {
		if (isRunning) {
			pauseTimer();
		} else {
			startTimer();
		}
	}

	function startTimer() {
		if (isRunning) return;
		if (isWorkPhase && !currentSessionStart) {
			currentSessionStart = new Date();
		}
		isRunning = true;
		timerInterval = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
			} else {
				handlePhaseComplete();
			}
		}, 1000);
	}

	function pauseTimer() {
		isRunning = false;
		clearInterval(timerInterval);
	}

	function resetTimer() {
		endFocusSession();
		pauseTimer();
		timeLeft = isWorkPhase ? presets[mode].work : presets[mode].break;
	}

	function handlePhaseComplete() {
		// Play a sound here in the future if needed
		skipPhase();
	}

	function endFocusSession() {
		if (isWorkPhase && currentSessionStart) {
			const endTime = new Date();
			// Only log sessions longer than a minute
			if (endTime.getTime() - currentSessionStart.getTime() > 60000) {
				sessionLogs = [...sessionLogs, { startTime: currentSessionStart, endTime }];
			}
		}
		currentSessionStart = null;
	}

	function skipPhase() {
		endFocusSession();
		pauseTimer();
		isWorkPhase = !isWorkPhase;
		timeLeft = isWorkPhase ? presets[mode].work : presets[mode].break;
	}

	// Cleanup interval when leaving the route
	onDestroy(() => {
		endFocusSession();
		clearInterval(timerInterval);
	});
</script>

<div class="scroll-area fade-in">
	<div class="header-actions">
		<h2>Focus Timer</h2>
		<button class="log-btn" on:click={() => showLog = true}>
			<i class='bx bx-history'></i> View Log
		</button>
	</div>
	<div
		class="phase-badge"
		style="background: {isWorkPhase
			? 'rgba(99, 102, 241, 0.1)'
			: 'rgba(34, 197, 94, 0.1)'}; border-color: {accentColor}; color: {accentColor}"
	>
		<i class={isWorkPhase ? 'bx bxs-brain' : 'bx bxs-coffee'}></i>
		{currentPhaseText}
	</div>

	{#if showLog}
		<div class="modal-backdrop" on:click={() => showLog = false}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h3><i class='bx bx-history'></i> Study Log</h3>
					<button class="close-modal" on:click={() => showLog = false}><i class='bx bx-x'></i></button>
				</div>
				<div class="log-summary">
					<h4>Total Focus Time</h4>
					<div class="total-time">{formatDuration(totalFocusTime)}</div>
				</div>
				<div class="log-list">
					{#if sessionLogs.length === 0}
						<p class="empty-log">No focus sessions logged yet. Start the timer to begin!</p>
					{:else}
						{#each sessionLogs.slice().reverse() as log, i}
							<div class="log-item">
								<div class="log-item-header">
									<span class="log-item-title">Session {sessionLogs.length - i}</span>
									<span class="log-item-duration">Duration: {formatDuration(log.endTime.getTime() - log.startTime.getTime())}</span>
								</div>
								<div class="log-item-body">
									<span>Start: {formatTime(log.startTime)}</span>
									<span>End: {formatTime(log.endTime)}</span>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="timer-container">
		<div class="mode-selector">
			<button
				class="mode-btn {mode === 'pomodoro' ? 'active' : ''}"
				on:click={() => switchMode('pomodoro')}>Pomodoro (25/5)</button
			>
			<button class="mode-btn {mode === '5217' ? 'active' : ''}" on:click={() => switchMode('5217')}
				>52/17 Rule</button
			>
			<button
				class="mode-btn {mode === 'custom' ? 'active' : ''}"
				on:click={() => switchMode('custom')}>Custom</button
			>
		</div>

		{#if mode === 'custom'}
			<div class="custom-inputs slide-down">
				<div class="input-group">
					<label for="work-min">Work (min)</label>
					<input
						type="number"
						id="work-min"
						bind:value={customWorkMin}
						on:change={updateCustomTime}
						min="1"
					/>
				</div>
				<div class="input-group">
					<label for="break-min">Break (min)</label>
					<input
						type="number"
						id="break-min"
						bind:value={customBreakMin}
						on:change={updateCustomTime}
						min="1"
					/>
				</div>
			</div>
		{/if}

		<div class="flip-clock-wrapper">
			<div class="flip-card">
				<div class="card-half top"><div class="num">{minutes}</div></div>
				<div class="card-half bottom"><div class="num">{minutes}</div></div>

				{#key minutes}
					<div class="card-flap bottom-flap">
						<div class="num">{minutes}</div>
					</div>
				{/key}

				<div class="mechanical-hinge"></div>
			</div>

			<span class="colon" style="color: {accentColor}">:</span>

			<div class="flip-card">
				<div class="card-half top"><div class="num">{seconds}</div></div>
				<div class="card-half bottom"><div class="num">{seconds}</div></div>

				{#key seconds}
					<div class="card-flap bottom-flap">
						<div class="num">{seconds}</div>
					</div>
				{/key}

				<div class="mechanical-hinge"></div>
			</div>
		</div>

		<div class="controls">
			<button class="control-btn secondary" on:click={resetTimer} aria-label="Reset Timer">
				<i class="bx bx-reset"></i>
			</button>

			<button
				class="control-btn primary lg"
				on:click={toggleTimer}
				style="background-color: {accentColor}"
			>
				{#if isRunning}
					<i class="bx bx-pause"></i> Pause
				{:else}
					<i class="bx bx-play"></i> Start
				{/if}
			</button>

			<button class="control-btn secondary" on:click={skipPhase} aria-label="Skip Phase">
				<i class="bx bx-skip-next"></i>
			</button>
		</div>
	</div>
</div>

<style>
	/* Header & Badge */
	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.log-btn {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-gray);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
	}
	.log-btn:hover {
		background: var(--card-bg);
		color: white;
	}
	h2 {
		color: white;
		margin: 0;
	}
	.phase-badge {
		padding: 0.5rem 1rem;
		border-radius: 2rem;
		border: 1px solid;
		font-size: 0.85rem;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.3s ease;
		margin-bottom: 2rem;
	}

	/* Log Modal Styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
		backdrop-filter: blur(4px);
	}
	.modal-content {
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 2rem;
		width: 90%;
		max-width: 500px;
		border: 1px solid var(--border-color);
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-header h3 {
		margin: 0;
		color: white;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.close-modal {
		background: none;
		border: none;
		color: var(--text-gray);
		font-size: 1.5rem;
		cursor: pointer;
	}
	.log-summary {
		text-align: center;
		margin-bottom: 2rem;
	}
	.log-summary h4 {
		margin: 0 0 0.5rem;
		color: var(--text-gray);
		font-size: 0.9rem;
		text-transform: uppercase;
		font-weight: 500;
	}
	.total-time {
		font-size: 2.5rem;
		color: white;
		font-weight: 700;
		font-family: 'Inter', monospace;
	}
	.log-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-right: 0.5rem;
	}
	.empty-log {
		text-align: center;
		color: var(--text-gray);
		padding: 2rem;
	}
	.log-item {
		background: #1e1f2e;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid var(--border-color);
	}
	.log-item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.log-item-title {
		color: white;
		font-weight: 600;
	}
	.log-item-duration {
		font-size: 0.8rem;
		color: var(--text-gray);
		font-family: 'Inter', monospace;
	}
	.log-item-body {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--text-gray);
	}

	/* Timer Container Card */
	.timer-container {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 1rem;
		padding: 3rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 600px;
		margin: 0 auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
	}

	/* Mode Selector */
	.mode-selector {
		display: flex;
		background: #0b0c15;
		padding: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--border-color);
		margin-bottom: 2.5rem;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.mode-btn {
		background: transparent;
		border: none;
		color: var(--text-gray);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
	}
	.mode-btn:hover {
		color: white;
	}
	.mode-btn.active {
		background: var(--card-bg);
		color: white;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
	}

	/* Custom Inputs */
	.custom-inputs {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 2rem;
		background: #1e1f2e;
		padding: 1rem 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--border-color);
	}
	.input-group {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.input-group label {
		font-size: 0.7rem;
		color: var(--text-gray);
		text-transform: uppercase;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}
	.input-group input {
		background: #0b0c15;
		border: 1px solid var(--border-color);
		color: white;
		padding: 0.5rem;
		border-radius: 0.5rem;
		width: 4rem;
		text-align: center;
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}
	.input-group input:focus {
		border-color: var(--accent-purple);
	}
	.slide-down {
		animation: slideDown 0.3s ease-out;
	}
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* --- Flip Clock UI --- */
	.flip-clock-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.colon {
		font-size: 4rem;
		font-weight: bold;
		animation: pulse 2s infinite;
		margin-top: -10px;
	}

	/* The main card container */
	.flip-card {
		position: relative;
		width: 130px;
		height: 150px;
		perspective: 1200px;
		border-radius: 0.75rem;
		font-family: 'Inter', monospace;
		font-size: 6rem;
		font-weight: 700;
		color: white;
		background: #0b0c15;
		box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
	}

	/* Common styles for the physical card halves */
	.card-half,
	.card-flap {
		position: absolute;
		left: 0;
		width: 100%;
		height: 50%;
		background: #1e1f2e;
		overflow: hidden;
	}

	/* Top Half */
	.top {
		top: 0;
		border-top-left-radius: 0.75rem;
		border-top-right-radius: 0.75rem;
	}

	/* Bottom Half */
	.bottom {
		bottom: 0;
		border-bottom-left-radius: 0.75rem;
		border-bottom-right-radius: 0.75rem;
	}

	/* Aligning the text inside the halves */
	.num {
		position: absolute;
		width: 100%;
		height: 150px; /* Must match the total card height */
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.top .num {
		top: 0;
	}
	.bottom .num,
	.bottom-flap .num {
		bottom: 0;
	} /* Keeps the text anchored to the bottom */

	/* Subtle shadow gradient on the top half */
	.top::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%);
		pointer-events: none;
	}

	/* The Physical Cut/Hinge Line */
	.mechanical-hinge {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 4px;
		background: #0b0c15;
		margin-top: -2px;
		z-index: 20;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
	}

	/* --- The CORRECT Gravity-Obeying Animation --- */
	.bottom-flap {
		bottom: 0;
		border-bottom-left-radius: 0.75rem;
		border-bottom-right-radius: 0.75rem;
		transform-origin: top center; /* Hinges exactly at the middle cut */
		z-index: 10;
		animation: dropDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
	}

	@keyframes dropDown {
		/* Starts sticking straight out towards you (-90deg), then slams flat (0deg) */
		0% {
			transform: rotateX(-90deg);
			filter: brightness(1.5);
		}
		100% {
			transform: rotateX(0deg);
			filter: brightness(1);
		}
	}

	/* Controls */
	.controls {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.control-btn {
		border: none;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.2s,
			background-color 0.2s,
			box-shadow 0.2s;
	}
	.control-btn:active {
		transform: scale(0.95);
	}
	.control-btn i {
		font-size: 1.5rem;
	}

	.control-btn.secondary {
		width: 3.5rem;
		height: 3.5rem;
		background: #1e1f2e;
		color: var(--text-gray);
		border: 1px solid var(--border-color);
	}
	.control-btn.secondary:hover {
		color: white;
		border-color: #4b5563;
	}

	.control-btn.primary.lg {
		width: 5rem;
		height: 5rem;
		border-radius: 1.5rem;
		color: white;
		font-weight: bold;
		font-size: 1.1rem;
		gap: 0.5rem;
		flex-direction: column;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
	}
	.control-btn.primary.lg i {
		font-size: 2rem;
		margin-bottom: -0.2rem;
	}
	.control-btn.primary.lg:hover {
		filter: brightness(1.1);
		box-shadow: 0 15px 20px -3px rgba(0, 0, 0, 0.4);
	}

	/* General Animations */
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
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	/* Mobile Tweaks */
	@media (max-width: 600px) {
		.flip-card {
			width: 90px;
			height: 110px;
			font-size: 4rem;
		}
		.num {
			height: 110px;
		}
		.colon {
			font-size: 3rem;
		}
		.timer-container {
			padding: 2rem 1rem;
			border-radius: 0;
			border-left: none;
			border-right: none;
		}
	}
</style>
	