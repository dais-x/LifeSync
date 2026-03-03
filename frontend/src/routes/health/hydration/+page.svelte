<script>
    let goal = $state(3.0); // Default 3L
    let current = $state(0.0); // Start at 0 for the day
    let reminderFrequency = $state('hourly'); // '30min', 'hourly', '2hours'
    let showCongratulatoryPopup = $state(false); // New state for popup

    const MIN_GOAL = 1;
    const MAX_GOAL = 12;
    const STEP = 0.5;

    // The percentage should not go above 100 for the progress bar
    let percentage = $derived(Math.min(100, (current / goal) * 100));

    // --- Circular Progress Logic ---
    let radius = 100;
    let circumference = $derived(2 * Math.PI * radius);
    let offset = $derived(circumference - (percentage / 100) * circumference);

    // Effect to trigger popup when goal is met
    $effect(() => {
        if (current >= goal && goal > 0) {
            showCongratulatoryPopup = true;
        }
    });

    function increaseGoal() {
        goal = Math.min(MAX_GOAL, goal + STEP);
    }

    function decreaseGoal() {
        goal = Math.max(MIN_GOAL, goal - STEP);
    }

    function resetConsumption() {
        current = 0;
        showCongratulatoryPopup = false; // Dismiss popup on reset
    }

    function closeCongratulatoryPopup() {
        showCongratulatoryPopup = false;
    }
</script>

<div class="scroll-area fade-in">
    <a href="/health" class="back-link"><i class='bx bx-arrow-back'></i> Back to Health</a>
    <h2 class="page-title">Hydration Goal</h2>

    <div class="hydration-card">
        <div class="slider-container">
            <svg class="slider-svg" viewBox="0 0 240 240">
                <!-- Background Track -->
                <circle
                    cx="120" cy="120" r={radius}
                    fill="none"
                    stroke="var(--border-color)"
                    stroke-width="24"
                />
                <!-- Progress Fill -->
                <circle
                    cx="120" cy="120" r={radius}
                    fill="none"
                    stroke="var(--accent-blue)"
                    stroke-width="24"
                    stroke-dasharray={circumference}
                    stroke-dashoffset={offset}
                    stroke-linecap="round"
                    transform="rotate(-90 120 120)"
                />
            </svg>
            <div class="slider-text">
                <div class="current-amount">{current.toFixed(2)}L</div>
                <div class="goal-label">of {goal.toFixed(1)}L</div>
            </div>
        </div>

        <div class="goal-setter">
            <h3>Set Your Daily Goal</h3>
            <p>Use the buttons to set your daily goal.</p>
            <div class="goal-control">
                <button on:click={decreaseGoal} class="goal-btn"><i class='bx bx-minus'></i></button>
                <div class="goal-display">
                    {goal.toFixed(1)} Liters
                </div>
                <button on:click={increaseGoal} class="goal-btn"><i class='bx bx-plus'></i></button>
            </div>
        </div>
        
        <div class="quick-add">
             <button on:click={() => current = Math.min(goal, current + 0.25)}><i class='bx bx-plus'></i> 250ml</button>
             <button on:click={() => current = Math.min(goal, current + 0.50)}><i class='bx bx-plus'></i> 500ml</button>
             <button on:click={() => current = Math.max(0, current - 0.25)}> <i class='bx bx-minus'></i> 250ml</button>
        </div>

        <div class="reminder-setter">
            <h4>Remind Me Every</h4>
            <div class="reminder-options">
                <button class:active={reminderFrequency === '30min'} on:click={() => reminderFrequency = '30min'}>30 min</button>
                <button class:active={reminderFrequency === 'hourly'} on:click={() => reminderFrequency = 'hourly'}>1 hour</button>
                <button class:active={reminderFrequency === '2hours'} on:click={() => reminderFrequency = '2hours'}>2 hours</button>
            </div>
        </div>

        <button on:click={resetConsumption} class="reset-btn">
            <i class='bx bx-reset'></i> Reset Day
        </button>

        {#if showCongratulatoryPopup}
            <div class="modal-backdrop" on:click={closeCongratulatoryPopup}>
                <div class="modal-content" on:click|stopPropagation>
                    <div class="modal-header">
                        <h3><i class='bx bxs-medal'></i> Goal Achieved!</h3>
                        <button class="close-modal" on:click={closeCongratulatoryPopup}><i class='bx bx-x'></i></button>
                    </div>
                    <p class="congrats-message">Congratulations! You've met your daily hydration goal of {goal.toFixed(1)}L!</p>
                    <button class="primary-button" on:click={closeCongratulatoryPopup}>Awesome!</button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    :root {
        --accent-blue: #3b82f6;
        --accent-purple: #6366f1; /* For primary-button, consistent with overall app */
    }
    .page-title { color: white; margin-bottom: 1rem; text-align: center; }
    .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-gray);
        text-decoration: none;
        margin-bottom: 2rem;
        font-size: 0.9rem;
    }
    .back-link:hover { color: white; }

    .hydration-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1.5rem;
        padding: 2rem;
        max-width: 400px;
        margin: 2rem auto;
        text-align: center;
    }

    .slider-container {
        position: relative;
        width: 240px;
        height: 240px;
        margin: 0 auto 2rem;
        user-select: none;
    }
    .slider-svg {
        width: 100%;
        height: 100%;
    }
    .slider-text {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        pointer-events: none;
    }
    .current-amount {
        font-size: 2.5rem;
        font-weight: 700;
    }
    .goal-label {
        font-size: 1rem;
        color: var(--text-gray);
    }
    
    .goal-setter {
        margin-bottom: 2rem;
    }
    .goal-setter h3 {
        color: white;
        margin: 0 0 0.5rem;
    }
    .goal-setter p {
        color: var(--text-gray);
        font-size: 0.85rem;
        margin: 0 0 1rem;
    }
    .goal-control {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }
    .goal-btn {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        color: var(--text-main);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.2s;
    }
    .goal-btn:hover {
        background: var(--accent-blue);
        border-color: var(--accent-blue);
        color: white;
    }
    .goal-display {
        background: #10111a;
        padding: 0.75rem 1.5rem;
        border-radius: 99px;
        color: white;
        font-size: 1.2rem;
        font-weight: 600;
        display: inline-block;
        border: 1px solid var(--border-color);
        min-width: 120px;
    }
    
    .reminder-setter {
        border-top: 1px solid var(--border-color);
        padding: 1.5rem 0;
        margin-top: 1.5rem;
    }
    .reminder-setter h4 {
        margin: 0 0 1rem;
        color: var(--text-gray);
        font-size: 0.9rem;
        font-weight: 500;
    }
    .reminder-options {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
    }
    .reminder-options button {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        color: var(--text-main);
        padding: 0.5rem 1rem;
        border-radius: 99px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    .reminder-options button.active,
    .reminder-options button:hover {
        background: var(--accent-blue);
        border-color: var(--accent-blue);
        color: white;
    }

    .quick-add {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .quick-add button {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        color: var(--text-main);
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        transition: all 0.2s;
    }
    .quick-add button:hover {
        background: var(--accent-blue);
        color: white;
    }
    
    .reset-btn {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-gray);
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        font-weight: 500;
        margin-top: 1.5rem;
        transition: all 0.2s;
    }
    .reset-btn:hover {
        background: var(--card-bg);
        color: white;
        border-color: var(--accent-blue);
    }

    /* Modal Styles */
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
        max-width: 400px;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
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
        font-size: 1.2rem;
    }
    .close-modal {
        background: none;
        border: none;
        color: var(--text-gray);
        font-size: 1.5rem;
        cursor: pointer;
    }
    .congrats-message {
        color: white;
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
    }
    .primary-button {
        background: var(--accent-purple);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.75rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }
    .primary-button:hover {
        filter: brightness(1.1);
        transform: translateY(-2px);
    }

    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
