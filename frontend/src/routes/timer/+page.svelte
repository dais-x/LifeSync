<script>
	import { onDestroy } from 'svelte';

	// Timer Configuration
	let mode = 'pomodoro'; // 'pomodoro', '5217', 'custom'
	let isWorkPhase = true;
	let isRunning = false;
	let timerInterval;

	// Presets (in seconds)
	const presets = {
		pomodoro: { work: 25 * 60, break: 5 * 60 },
		'5217': { work: 52 * 60, break: 17 * 60 },
		custom: { work: 45 * 60, break: 15 * 60 }
	};

	// Current State
	let timeLeft = presets[mode].work;

	// Custom Input Bindings (in minutes for the UI)
	let customWorkMin = 45;
	let customBreakMin = 15;

	// Formatting for the Flip Clock
	$: minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
	$: seconds = String(timeLeft % 60).padStart(2, '0');

	// Derived UI states
	$: currentPhaseText = isWorkPhase ? 'Focus Time' : 'Break Time';
	$: accentColor = isWorkPhase ? 'var(--accent-purple)' : 'var(--accent-green)';

	function switchMode(newMode) {
		mode = newMode;
		isWorkPhase = true;

		if (mode === 'custom') {
			updateCustomTime();
		} else {
			timeLeft = presets[mode].work;
		}

		pauseTimer();
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
		pauseTimer();
		timeLeft = isWorkPhase ? presets[mode].work : presets[mode].break;
	}

	function handlePhaseComplete() {
		// Play a sound here in the future if needed
		skipPhase();
	}

	function skipPhase() {
		pauseTimer();
		isWorkPhase = !isWorkPhase;
		timeLeft = isWorkPhase ? presets[mode].work : presets[mode].break;
	}

	// Cleanup interval when leaving the route
	onDestroy(() => {
		clearInterval(timerInterval);
	});
</script>

<div class="scroll-area fade-in">
	<div class="header-actions">
		<h2>Focus Timer</h2>
		<div
			class="phase-badge"
			style="background: {isWorkPhase
				? 'rgba(99, 102, 241, 0.1)'
				: 'rgba(34, 197, 94, 0.1)'}; border-color: {accentColor}; color: {accentColor}"
		>
			<i class={isWorkPhase ? 'bx bxs-brain' : 'bx bxs-coffee'}></i>
			{currentPhaseText}
		</div>
	</div>

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
		margin-bottom: 2rem;
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.3s ease;
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
