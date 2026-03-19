<script>
    import { goto } from '$app/navigation';
    import { userFormData, currentUser } from '$lib/stores'; // NEW: Imported currentUser
    import { PUBLIC_API_URL } from '$env/static/public'; // NEW: Imported API URL

    let step = 1;
    let isSaving = false; // NEW: Prevents double-clicks during saving

    // formData is now the store itself, accessed via $userFormData
    // No need to redeclare local formData here.

    let statusRadio = 'student';
    let otherStatusText = '';
    let otherWellbeingText = '';

    $: $userFormData.status = statusRadio !== 'other' ? statusRadio : otherStatusText;

    let sliderColor = '';
    $: {
        const hue = 240 - (($userFormData.mess_factor - 1) / 9) * 240;
        const lightness = 80 - (($userFormData.mess_factor - 1) / 9) * 30;
        sliderColor = `hsl(${hue}, 100%, ${lightness}%)`;
    }

    const totalSteps = 3;

    function getAge(dateString) {
        if (!dateString) return 0;
        var today = new Date();
        var birthDate = new Date(dateString);
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function validateStep(currentStep) {
        let isValid = true;
        let message = '';

        if (currentStep === 1) {
            if (!$userFormData.nickname) {
                isValid = false;
                message = 'Please enter your nickname.';
            } else if (!statusRadio) { // Check if a status radio is selected
                isValid = false;
                message = 'Please select your current status.';
            } else if (statusRadio === 'other' && !otherStatusText) {
                isValid = false;
                message = 'Please specify your status.';
            } else if (!$userFormData.dob) {
                isValid = false;
                message = 'Please enter your date of birth.';
            } else {
                const age = getAge($userFormData.dob);
                if (age < 7 || age > 150) {
                    isValid = false;
                    message = 'Please enter a valid date of birth. Age must be between 7 and 150.';
                }
            }
            // Chronotype, scheduling_style, main_focus already have defaults or are required to be selected by the UI design
            // For radio groups, if no default is set and user hasn't selected, need explicit check
            // For now, assume they are handled by binding or initial state
        } else if (currentStep === 2) {
            // cycle_tracking has defaults, mess_factor has defaults
            // digital_wellbeing: needs at least one selected
            if ($userFormData.digital_wellbeing.length === 0) {
                isValid = false;
                message = 'Please select at least one digital well-being goal.';
            } else if ($userFormData.digital_wellbeing.includes('other') && !otherWellbeingText) {
                isValid = false;
                message = 'Please specify your other digital well-being goal.';
            }
        } else if (currentStep === 3) {
            // smart_sync, control_level, notification_style already have defaults or are required by the UI design
        }

        if (!isValid) {
            alert('Sign up incomplete: ' + message);
        }
        return isValid;
    }

    function nextStep() {
        console.log('nextStep called, current step:', step);
        if (!validateStep(step)) { // Add validation check
            return; // Stop if validation fails
        }

        if (step < totalSteps) {
            step += 1;
            console.log('Moving to step:', step);
        }
    }

    function prevStep() {
        if (step > 1) {
            step -= 1;
        }
    }

    let showCompletionPopup = false;

    // --- NEW: UPDATED FINISH FUNCTION ---
    async function handleFinish() {
        console.log('handleFinish called');
        if (!validateStep(step)) { 
            return; 
        }

        isSaving = true;

        // Finalize digital_wellbeing if 'other' is selected
        if ($userFormData.digital_wellbeing.includes('other')) {
            userFormData.update(currentData => {
                const updatedWellbeing = currentData.digital_wellbeing.map(item =>
                    item === 'other' ? otherWellbeingText : item
                );
                return { ...currentData, digital_wellbeing: updatedWellbeing };
            });
        }

        try {
            // 1. Get the user ID from the global store (or fallback to local storage)
            const actualUserId = $currentUser?.id || $currentUser?._id || JSON.parse(localStorage.getItem('user') || '{}').id || JSON.parse(localStorage.getItem('user') || '{}')._id;

            if (!actualUserId) {
                throw new Error("Could not find user session. Please try logging in again.");
            }

            const payload = {
                userId: actualUserId,
                details: $userFormData
            };

            // 2. Send it to our new backend route
            const baseUrl = PUBLIC_API_URL && PUBLIC_API_URL !== 'undefined' ? PUBLIC_API_URL : '';
            const response = await fetch(`${baseUrl}/api/user/details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const responseText = await response.text();
                let errData;
                try {
                    errData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error("RAW HTML SERVER RESPONSE:", responseText);
                    throw new Error(`Backend Error ${response.status}: Check your Pop!_OS terminal to see why it crashed!`);
                }
                throw new Error(errData.error || 'Failed to save profile data');
            }

            // 3. Update the global user store so the Gatekeeper knows they finished onboarding!
            if ($currentUser) {
                currentUser.update(user => ({ ...user, ...$userFormData }));
            }

            showCompletionPopup = true;
            console.log('showCompletionPopup set to true, navigating to /dashboard in 3 seconds');
            
            setTimeout(() => {
                goto('/dashboard');
            }, 3000); 

        } catch (error) {
            console.error("Save Error:", error);
            alert('Error: ' + error.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="details-container fade-in">
    <div class="details-box">
        <div class="progress-bar">
            <div class="progress" style="width: {(step / totalSteps) * 100}%"></div>
        </div>

        {#if step === 1}
            <div class="form-step">
                <h2 class="session-title">Session 1: Identity & Lifestyle</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="nickname">What should we call you?</label>
                        <input type="text" id="nickname" bind:value={$userFormData.nickname} placeholder="e.g., Alex">
                    </div>

                    <div class="form-group full-width">
                        <label>Current Status:</label>
                        <div class="radio-group">
                            <label class:selected={statusRadio === 'student'}>
                                <input type="radio" bind:group={statusRadio} value="student"> Student
                            </label>
                            <label class:selected={statusRadio === 'professional'}>
                                <input type="radio" bind:group={statusRadio} value="professional"> Professional
                            </label>
                            <label class:selected={statusRadio === 'other'}>
                                <input type="radio" bind:group={statusRadio} value="other"> Other
                            </label>
                        </div>
                        {#if statusRadio === 'other'}
                            <input type="text" bind:value={otherStatusText} placeholder="Please specify">
                        {/if}
                    </div>

                    <div class="form-group">
                        <label for="dob">What is your date of birth?</label>
                        <input type="date" id="dob" bind:value={$userFormData.dob}>
                    </div>

                    <div class="form-group">
                        <label>Energy Profile:</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.chronotype === 'early_bird'}>
                                <input type="radio" bind:group={$userFormData.chronotype} value="early_bird"> Early Bird
                            </label>
                            <label class:selected={$userFormData.chronotype === 'night_owl'}>
                                <input type="radio" bind:group={$userFormData.chronotype} value="night_owl"> Night Owl
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Scheduling Style:</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.scheduling_style === 'strict'}>
                                <input type="radio" bind:group={$userFormData.scheduling_style} value="strict"> Strict
                            </label>
                            <label class:selected={$userFormData.scheduling_style === 'flow'}>
                                <input type="radio" bind:group={$userFormData.scheduling_style} value="flow"> Flow State
                            </label>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Main Goal:</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.main_focus === 'productivity'}>
                                <input type="radio" bind:group={$userFormData.main_focus} value="productivity"> Productivity
                            </label>
                            <label class:selected={$userFormData.main_focus === 'balance'}>
                                <input type="radio" bind:group={$userFormData.main_focus} value="balance"> Work-Life Balance
                            </label>
                            <label class:selected={$userFormData.main_focus === 'clarity'}>
                                <input type="radio" bind:group={$userFormData.main_focus} value="clarity"> Mental Clarity
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        {/if}

        {#if step === 2}
            <div class="form-step">
                <h2 class="session-title">Session 2: Health & Wellness</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="wellness">Any medical conditions or important medications we should help you track?</label>
                        <textarea id="wellness" rows="3" bind:value={$userFormData.wellness_conditions} placeholder="e.g., Asthma, Vitamin D supplement..."></textarea>
                    </div>

                    <div class="form-group">
                        <label>Cycle Tracking (Optional):</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.cycle_tracking === true}>
                                <input type="radio" bind:group={$userFormData.cycle_tracking} value={true}> Yes
                            </label>
                            <label class:selected={$userFormData.cycle_tracking === false}>
                                <input type="radio" bind:group={$userFormData.cycle_tracking} value={false}> No
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>The "Mess" Factor: (1=Calm, 10=Chaos)</label>
                        <input type="range" min="1" max="10" bind:value={$userFormData.mess_factor} class="slider" style="--slider-color: {sliderColor}">
                        <span class="slider-value" style="color: {sliderColor}">{$userFormData.mess_factor}</span>
                    </div>

                    <div class="form-group full-width">
                        <label>Digital Well-being Goals:</label>
                        <div class="checkbox-group">
                            <label class:selected={$userFormData.digital_wellbeing.includes('screen_time')}>
                                <input type="checkbox" bind:group={$userFormData.digital_wellbeing} value="screen_time"> Reduce Screen Time
                            </label>
                            <label class:selected={$userFormData.digital_wellbeing.includes('meditation')}>
                                <input type="checkbox" bind:group={$userFormData.digital_wellbeing} value="meditation"> Meditate
                            </label>
                            <label class:selected={$userFormData.digital_wellbeing.includes('exercise')}>
                                <input type="checkbox" bind:group={$userFormData.digital_wellbeing} value="exercise"> Exercise
                            </label>
                            <label class:selected={$userFormData.digital_wellbeing.includes('reading')}>
                                <input type="checkbox" bind:group={$userFormData.digital_wellbeing} value="reading"> Reading
                            </label>
                            <label class:selected={$userFormData.digital_wellbeing.includes('other')}>
                                <input type="checkbox" bind:group={$userFormData.digital_wellbeing} value="other"> Other
                            </label>
                        </div>
                        {#if $userFormData.digital_wellbeing.includes('other')}
                            <input type="text" bind:value={otherWellbeingText} placeholder="Please specify">
                        {/if}
                    </div>
                </div>

            </div>
        {/if}
        {#if step === 3}
            <div class="form-step">
                <h2 class="session-title">Session 3: Automation & Connectivity</h2>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Can we read your Gmail and Google Calendar to automatically pull in deadlines and meetings?</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.smart_sync === true}>
                                <input type="radio" bind:group={$userFormData.smart_sync} value={true}> Yes, sync it!
                            </label>
                            <label class:selected={$userFormData.smart_sync === false}>
                                <input type="radio" bind:group={$userFormData.smart_sync} value={false}> No, I'll enter manually
                            </label>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Control Level:</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.control_level === 'auto'}>
                                <input type="radio" bind:group={$userFormData.control_level} value="auto"> Auto-Generate Schedule
                            </label>
                            <label class:selected={$userFormData.control_level === 'manual'}>
                                <input type="radio" bind:group={$userFormData.control_level} value="manual"> Manual Entry
                            </label>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Notification Style:</label>
                        <div class="radio-group">
                            <label class:selected={$userFormData.notification_style === 'silent'}>
                                <input type="radio" bind:group={$userFormData.notification_style} value="silent"> The Silent Tracker
                            </label>
                            <label class:selected={$userFormData.notification_style === 'persistent'}>
                                <input type="radio" bind:group={$userFormData.notification_style} value="persistent"> The Persistent Assistant
                            </label>
                            <label class:selected={$userFormData.notification_style === 'coach'}>
                                <input type="radio" bind:group={$userFormData.notification_style} value="coach"> The Encouraging Coach
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <div class="navigation-buttons">
            {#if step > 1}
                <button class="nav-btn" on:click={prevStep} disabled={isSaving}>Back</button>
            {/if}
            {#if step < totalSteps}
                <button class="nav-btn" on:click={nextStep} disabled={isSaving}>Next</button>
            {:else}
                <button class="nav-btn" on:click={handleFinish} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Finish'}
                </button>
            {/if}
        </div>
    </div>
</div>

{#if showCompletionPopup}
    <div class="completion-popup-backdrop">
        <div class="completion-popup-box fade-in">
            <i class='bx bxs-party' ></i>
            <h2>One giant leap!</h2>
            <p>You've taken the first step to making your life a little less chaotic. We're excited to have you on board.</p>
        </div>
    </div>
{/if}

<style>
    .details-container {
        display: flex;
        justify-content: center;
        /* FIX: Changed from 'center' to prevent the top of the form getting pushed off-screen */
        align-items: flex-start;
        min-height: 100vh;
        background-color: var(--bg-dark); /* Ensure fallback to dark theme var */
        /* FIX: Added padding so the box has breathing room to scroll */
        padding: 2rem 1rem;
        box-sizing: border-box;
        /* FIX: Ensures the container explicitly allows scrolling */
        overflow-y: auto;
        overflow-x: hidden;
    }
    .details-box {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 3rem;
        border-radius: 1rem;
        width: 100%;
        max-width: 700px;
        color: white;
        /* FIX: Auto vertical margin perfectly centers it if it fits, but allows scrolling if it doesn't */
        margin: auto;
    }
    .progress-bar {
        width: 100%;
        height: 8px;
        background: #1E1F2E;
        border-radius: 4px;
        margin-bottom: 2rem;
    }
    .progress {
        height: 100%;
        background: var(--accent-purple);
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    .session-title {
        text-align: center;
        margin-bottom: 2rem;
        font-weight: 500;
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        align-items: start;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .full-width {
        grid-column: 1 / -1;
    }
    .form-group label {
        color: var(--text-gray);
    }
    .form-group input[type="text"], .form-group input[type="number"], .form-group input[type="date"], .form-group textarea {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        color: white;
        padding: 0.75rem;
        border-radius: 0.5rem;
    }

    .form-group input[type="date"] {
        color-scheme: dark;
    }
    .radio-group, .checkbox-group {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .radio-group label, .checkbox-group label {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
    }
    .radio-group label.selected, .checkbox-group label.selected {
        background: var(--accent-blue);
        border-color: var(--accent-blue);
        color: white;
    }
    .radio-group input, .checkbox-group input {
        display: none;
    }
    .slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 8px;
        background: #1E1F2E;
        outline: none;
        border-radius: 4px;
    }
    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: var(--slider-color, var(--accent-purple));
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
    }
    .slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: var(--slider-color, var(--accent-purple));
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
    }
    .slider-value {
        text-align: center;
        font-weight: 500;
        color: var(--accent-purple);
    }

    .navigation-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 3rem;
    }
    .nav-btn {
        background: var(--accent-blue);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 1rem;
        margin-left: auto; /* Pushes the "Next" button to the right if Back isn't present */
        transition: opacity 0.2s;
    }
    .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .navigation-buttons button:first-child:not(:last-child) {
        margin-left: 0;
        background: #2a2a3c; /* Distinct color for back button */
    }

    .completion-popup-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .completion-popup-box {
        background: var(--card-bg);
        padding: 3rem;
        border-radius: 1rem;
        text-align: center;
        color: white;
        border: 1px solid var(--accent-purple);
        max-width: 90%;
    }
    .completion-popup-box i {
        font-size: 3rem;
        color: var(--accent-purple);
        margin-bottom: 1rem;
    }
    .completion-popup-box h2 {
        margin: 0 0 0.5rem 0;
    }
    .completion-popup-box p {
        color: var(--text-gray);
        max-width: 300px;
    }

    .fade-in {
        animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* FIX: Mobile Responsiveness */
    @media (max-width: 768px) {
        .details-container {
            padding: 1.5rem 1rem;
        }
        .details-box {
            padding: 1.5rem; /* Reduces massive padding on small screens */
        }
        .form-grid {
            grid-template-columns: 1fr; /* Forces a single column layout instead of squishing everything horizontally */
        }
    }
</style>