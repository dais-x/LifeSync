<script>
    // @ts-nocheck
    import { userFormData } from '$lib/stores';
    import { onMount } from 'svelte';
    import { Chart, registerables } from 'chart.js/auto';

    let userSettings = $derived({
        averageCycleLength: $userFormData.avg_cycle_length || 28,
        averagePeriodDuration: $userFormData.avg_period_length || 5,
        medicalConditions: { pcos: false, pcod: false, endometriosis: false, thyroidRelated: false, other: '', none: true },
        ifConditionSelected: { predictionFlexibilityDays: 5, rollingAverageWindow: 6, missedCycleThresholdDays: 60, irregularModeEnabled: true }
    });
    
    let lastPeriodStartDate = $state($userFormData.last_period_date || '');
    let isSetupComplete = $state(!!$userFormData.last_period_date);

    let currentDayOfCycle = $state(0);
    let currentPhase = $state('Menstrual');
    let phaseColor = $state('#ff4d4d');

    let nextPeriodPrediction = $state({ startDate: null, window: { start: null, end: null } });
    let daysUntilNextPeriod = $state(0);

    let dailyLog = $state({
        date: new Date().toISOString().split('T')[0],
        startDate: '',
        endDate: '',
        symptoms: { cramps: 0, headache: 0, nausea: 0, bloating: 0, fatigue: 0, moodSwings: 0, backPain: 0, breastTenderness: 0, acne: 0, flowIntensity: 0 },
        notes: ""
    });

    async function syncHealthData(type, payload) {
        if (!$userFormData.health_sync_url || $userFormData.health_sync_url.includes('your-n8n-webhook-url')) {
            console.warn('Health sync URL not configured.');
            return;
        }

        try {
            const response = await fetch($userFormData.health_sync_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    timestamp: new Date().toISOString(),
                    data: payload
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.lowStock) {
                    alert(`Alert: ${result.medicineName} is low on stock! (${result.currentStock} left)`);
                }
                return result;
            }
        } catch (error) {
            console.error('Error syncing health data:', error);
        }
    }

    let timelineLogs = $state([
        { "date": "2026-03-04", "cycleDay": 1, "symptoms": { "cramps": 5, "fatigue": 4 }, "notes": "First day heavy flow" },
        { "date": "2026-03-09", "cycleId": "cycle_003", "cycleDay": 6, "flowIntensity": 2, "symptoms": { "cramps": 2, "fatigue": 3 }, "notes": "Feeling better" }
    ]);

    const symptomIcons = {
        cramps: 'bxs-hot', headache: 'bxs-bolt', nausea: 'bxs-dizzy', bloating: 'bxs-fridge', fatigue: 'bxs-battery-low',
        moodSwings: 'bxs-meh', backPain: 'bxs-clinic', breastTenderness: 'bxs-heart-circle', acne: 'bxs-face', flowIntensity: 'bxs-droplet'
    };
    const levelColors = ['transparent', 'hsl(120, 80%, 60%)', 'hsl(90, 80%, 60%)', 'hsl(60, 80%, 60%)', 'hsl(30, 80%, 60%)', 'hsl(0, 80%, 60%)'];
    
    let historyView = $state('trends');
    let chartCanvas = $state();
    let chartInstance;
    
    let lineGraphData = $derived({
      cycleLengthHistory: ($userFormData.cycle_history || []).map(h => ({ label: `${h.month} '${h.year}`, value: h.cycleLength })),
      periodLengthHistory: ($userFormData.cycle_history || []).map(h => ({ label: `${h.month} '${h.year}`, value: h.periodLength }))
    });

    let advisoryMessage = $state('');
    let showSettings = $state(false);
    let settingsTab = $state('notifications'); // 'notifications' or 'diagnosis'

    function handleConditionsChange(toggledKey = null) {
        let conditions = { ...userSettings.medicalConditions };
        if (toggledKey && toggledKey !== 'other_input') { conditions[toggledKey] = !conditions[toggledKey]; }
        const anySpecificIsActive = conditions.pcos || conditions.pcod || conditions.endometriosis || conditions.thyroidRelated || (conditions.other && conditions.other.trim() !== '');
        if (anySpecificIsActive) { conditions.none = false; } else { conditions.none = true; }
        if (conditions.none) {
            conditions.pcos = false; conditions.pcod = false; conditions.endometriosis = false;
            conditions.thyroidRelated = false; conditions.other = '';
        }
        userSettings.medicalConditions = conditions;
    }

    function completeSetup() {
        if (!lastPeriodStartDate) { alert('Please select the start date of your last period.'); return; }
        
        userFormData.update(d => ({
            ...d,
            last_period_date: lastPeriodStartDate,
            avg_cycle_length: parseInt(userSettings.averageCycleLength),
            avg_period_length: parseInt(userSettings.averagePeriodDuration)
        }));
        
        isSetupComplete = true;
        recalculateCurrentState();
    }

    function recalculateCurrentState() {
        if (!$userFormData.last_period_date) return;
        
        const lastDate = new Date($userFormData.last_period_date);
        lastDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const cycleLength = $userFormData.avg_cycle_length || 28;
        currentDayOfCycle = (diffDays % cycleLength) + 1;
        
        const day = currentDayOfCycle;
        const avgPeriod = $userFormData.avg_period_length || 5;

        if (day <= avgPeriod) {
            currentPhase = 'Menstrual';
            phaseColor = '#ff4d4d'; // Red
        } else if (day <= 11) {
            currentPhase = 'Follicular';
            phaseColor = '#2ecc71'; // Green
        } else if (day <= 16) {
            currentPhase = 'Ovulation';
            phaseColor = '#ff69b4'; // Pink
        } else {
            currentPhase = 'Luteal';
            phaseColor = '#2ecc71'; // Green
        }

        const nextStart = new Date(lastDate);
        nextStart.setDate(lastDate.getDate() + cycleLength);
        while (nextStart < today) {
            nextStart.setDate(nextStart.getDate() + cycleLength);
        }
        
        const windowStart = new Date(nextStart);
        windowStart.setDate(nextStart.getDate() - 2);
        const windowEnd = new Date(nextStart);
        windowEnd.setDate(nextStart.getDate() + 2);

        nextPeriodPrediction = {
            startDate: nextStart,
            window: { start: windowStart, end: windowEnd }
        };

        const timeToNext = nextStart.getTime() - today.getTime();
        daysUntilNextPeriod = Math.ceil(timeToNext / (1000 * 60 * 60 * 24));
    }

    function logSymptomsForDay() {
        const entry = {
            date: dailyLog.date,
            startDate: dailyLog.startDate,
            endDate: dailyLog.endDate,
            cycleDay: currentDayOfCycle,
            symptoms: { ...dailyLog.symptoms },
            notes: dailyLog.notes
        };
        
        syncHealthData('period', entry);
        
        timelineLogs = [entry, ...timelineLogs];
        alert('Symptoms logged and synced!');
    }

    function createOrUpdateChart() {
        if (chartInstance) { chartInstance.destroy(); }
        if (chartCanvas && historyView === 'trends') {
            const ctx = chartCanvas.getContext('2d');
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: lineGraphData.cycleLengthHistory.map(d => d.label),
                    datasets: [
                        { label: 'Cycle Length', data: lineGraphData.cycleLengthHistory.map(d => d.value), 
                          backgroundColor: '#FF69B4', borderColor: '#FF69B4', 
                          borderWidth: 1, yAxisID: 'y' },
                        { label: 'Period Length', data: lineGraphData.periodLengthHistory.map(d => d.value), 
                          backgroundColor: '#9932CC', borderColor: '#9932CC', 
                          borderWidth: 1, yAxisID: 'y1' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'white' } },
                        y: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.1)' }, title: { display: true, text: 'Cycle (Days)', color: 'white'}, ticks: { color: 'white' }, beginAtZero: true },
                        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Period (Days)', color: 'white'}, ticks: { color: 'white' }, beginAtZero: true }
                    },
                    plugins: { legend: { labels: { color: 'white' } } }
                }
            });
        }
    }

    $effect(() => {
        if (isSetupComplete && (historyView || chartCanvas || lineGraphData)) {
            createOrUpdateChart();
        }
    });

    $effect(() => {
        if ($userFormData.last_period_date) {
            recalculateCurrentState();
        }
    });

    onMount(() => {
        Chart.register(...registerables);
        if (isSetupComplete) recalculateCurrentState();
    });
</script>

<div class="scroll-area fade-in">
    <div class="page-header">
        <a href="/health" class="back-link"><i class='bx bx-arrow-back'></i> Back to Health</a>
        <button class="settings-trigger" on:click={() => showSettings = true}>
            <i class='bx bx-cog'></i>
        </button>
    </div>
    <h2 class="page-title">Period Cycle Tracker</h2>

    {#if !isSetupComplete}
        <div class="card setup-card">
             <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Setup Your Cycle Tracker</h3>
            <p class="disclaimer">This is a tracking tool, not for medical diagnosis.</p>
            <div class="form-grid">
                <label>Avg Cycle Length (days)<input type="number" bind:value={userSettings.averageCycleLength}></label>
                <label>Avg Period Duration (days)<input type="number" bind:value={userSettings.averagePeriodDuration}></label>
                <label>Start Date of LAST Period<input type="date" bind:value={lastPeriodStartDate}></label>
            </div>
            <div class="medical-header">Any existing medical conditions? (Optional)</div>
            <div class="custom-checkbox-group">
                {#each ['pcos', 'pcod', 'endometriosis', 'thyroidRelated'] as condition}
                <label class="custom-checkbox">
                    <input type="checkbox" checked={userSettings.medicalConditions[condition]} on:change={() => handleConditionsChange(condition)}>
                    <span class="checkbox-ui"></span><span>{condition}</span>
                </label>
                {/each}
                 <label class="custom-checkbox">
                    <input type="checkbox" checked={userSettings.medicalConditions.none} on:change={() => handleConditionsChange('none')}>
                    <span class="checkbox-ui"></span><span>None</span>
                </label>
            </div>
             <input type="text" placeholder="Other..." class="other-input" bind:value={userSettings.medicalConditions.other} on:input={() => handleConditionsChange('other_input')}>
            <button class="primary-button" on:click={completeSetup}>Start Tracking</button>
        </div>
    {:else}
    <div>
        <div class="grid-layout" style="margin-top: 1.5rem;">
             <div class="card relative">
                <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Current Phase</h3>
                <div class="cycle-display">
                    <div class="cycle-circle" style="border-color: {phaseColor}">
                        <span class="day">Day {currentDayOfCycle}</span>
                        <span class="phase" style="color: {phaseColor}">{currentPhase} Phase</span>
                    </div>
                </div>
                 <div class="disclaimer-bottom">Not for medical diagnosis.</div>
            </div>
             <div class="card prediction-card">
                <h3><i class='bx bx-bell' style="color:var(--accent-yellow)"></i> Predictions</h3>
                <div class="prediction-main">
                    <div class="prediction-date">{nextPeriodPrediction.startDate?.toDateString() || 'N/A'}</div>
                    <div class="prediction-label">Next Expected Period</div>
                    <div class="days-countdown">{daysUntilNextPeriod} days until next period</div>
                </div>
                {#if !userSettings.medicalConditions.none}
                    <div class="prediction-window cute-mode">
                        <div class="window-header">
                            <i class='bx bxs-magic-wand sparkle-icon'></i>
                            <span class="window-label">Prediction Window</span>
                            <i class='bx bxs-sparkles sparkle-icon'></i>
                        </div>
                        <div class="window-bar">
                            <div class="window-dates">
                                <div class="date-chip start">
                                    <span class="chip-label">Starts</span>
                                    <span>{nextPeriodPrediction.window.start?.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                </div>
                                <div class="range-connector"></div>
                                <div class="date-chip end">
                                    <span class="chip-label">Ends</span>
                                    <span>{nextPeriodPrediction.window.end?.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
             </div>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
            <h3><i class='bx bx-plus-medical' style="color:var(--accent-blue)"></i> Log Daily Symptoms & Notes</h3>
            <div class="form-grid" style="margin-bottom: 1.5rem;">
                <label>Period Start Date (if applicable)<input type="date" bind:value={dailyLog.startDate}></label>
                <label>Period End Date (if applicable)<input type="date" bind:value={dailyLog.endDate}></label>
            </div>
            <div class="symptom-rating-grid">
                {#each Object.entries(dailyLog.symptoms) as [symptom, value]}
                <div class="symptom-item">
                    <div class="symptom-label">
                        <i class='bx {symptomIcons[symptom] || 'bxs-tag'}'></i>
                        <span>{symptom.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                    <div class="dots-container">
                        {#each {length: 6} as _, i}
                        <button class="dot" style="background-color: {value >= i ? levelColors[i] : 'transparent'}; border-color: {value >= i && i > 0 ? levelColors[i] : 'var(--border-color)'};" class:active={value === i} on:click={() => dailyLog.symptoms[symptom] = i}></button>
                        {/each}
                    </div>
                </div>
                {/each}
            </div>
            <textarea class="notes-input" placeholder="Add any notes for today..." bind:value={dailyLog.notes}></textarea>
            <button class="secondary-button" on:click={logSymptomsForDay}>Log Today's Entry</button>
        </div>
        
        {#if showSettings}
            <div class="modal-backdrop" on:click={() => showSettings = false}>
                <div class="modal-content cute-modal" on:click|stopPropagation>
                    <div class="modal-header">
                        <h3><i class='bx bx-cog'></i> Tracker Settings</h3>
                        <button class="close-modal" on:click={() => showSettings = false}><i class='bx bx-x'></i></button>
                    </div>
                    
                    <div class="settings-tabs">
                        <button class:active={settingsTab === 'notifications'} on:click={() => settingsTab = 'notifications'}>Notifications</button>
                        <button class:active={settingsTab === 'diagnosis'} on:click={() => settingsTab = 'diagnosis'}>Diagnosis</button>
                    </div>

                    <div class="settings-body">
                        {#if settingsTab === 'notifications'}
                            <div class="notification-settings-grid">
                                <label class="notif-item">
                                    <div class="notif-info">
                                        <span class="notif-title">Ovulation Warning</span>
                                        <span class="notif-desc">Notify me 3 days before ovulation</span>
                                    </div>
                                    <input type="checkbox" bind:checked={$userFormData.cycle_notifications.threeDaysBeforeOvulation}>
                                    <div class="toggle-ui"></div>
                                </label>

                                <label class="notif-item">
                                    <div class="notif-info">
                                        <span class="notif-title">Ovulation Day</span>
                                        <span class="notif-desc">Notify me on the day of ovulation</span>
                                    </div>
                                    <input type="checkbox" bind:checked={$userFormData.cycle_notifications.onOvulation}>
                                    <div class="toggle-ui"></div>
                                </label>

                                <label class="notif-item">
                                    <div class="notif-info">
                                        <span class="notif-title">Period Warning</span>
                                        <span class="notif-desc">Notify me 3 days before my period</span>
                                    </div>
                                    <input type="checkbox" bind:checked={$userFormData.cycle_notifications.threeDaysBeforePeriod}>
                                    <div class="toggle-ui"></div>
                                </label>

                                <label class="notif-item">
                                    <div class="notif-info">
                                        <span class="notif-title">Period Day</span>
                                        <span class="notif-desc">Notify me on the day my period starts</span>
                                    </div>
                                    <input type="checkbox" bind:checked={$userFormData.cycle_notifications.onPeriod}>
                                    <div class="toggle-ui"></div>
                                </label>

                                <label class="notif-item">
                                    <div class="notif-info">
                                        <span class="notif-title">Logging Reminders</span>
                                        <span class="notif-desc">Remind me to log on first & last day (with 3-day grace period if late)</span>
                                    </div>
                                    <input type="checkbox" bind:checked={$userFormData.cycle_notifications.logFirstLastDay}>
                                    <div class="toggle-ui"></div>
                                </label>
                            </div>
                        {:else}
                            <div class="diagnosis-settings">
                                <p class="settings-hint">Select any conditions that apply or enter a custom one.</p>
                                <div class="diagnosis-grid">
                                    <label class="diag-chip">
                                        <input type="checkbox" bind:checked={$userFormData.menstrual_diagnosis.pcos}>
                                        <span>PCOS</span>
                                    </label>
                                    <label class="diag-chip">
                                        <input type="checkbox" bind:checked={$userFormData.menstrual_diagnosis.pcod}>
                                        <span>PCOD</span>
                                    </label>
                                    <label class="diag-chip">
                                        <input type="checkbox" bind:checked={$userFormData.menstrual_diagnosis.endometriosis}>
                                        <span>Endometriosis</span>
                                    </label>
                                    <label class="diag-chip">
                                        <input type="checkbox" bind:checked={$userFormData.menstrual_diagnosis.thyroid}>
                                        <span>Thyroid</span>
                                    </label>
                                </div>
                                <div class="custom-diag">
                                    <label>Other / Additional Details</label>
                                    <textarea placeholder="Enter any other menstruation related diagnosis..." bind:value={$userFormData.menstrual_diagnosis.other}></textarea>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}

        <div class="card" style="margin-top: 1.5rem;">
            <h3><i class='bx bx-history' style="color:var(--accent-green)"></i> Cycle History</h3>
            <div class="tab-buttons">
                <button class:active={historyView === 'trends'} on:click={() => historyView = 'trends'}>Trends</button>
                <button class:active={historyView === 'timeline'} on:click={() => historyView = 'timeline'}>Timeline</button>
            </div>
            <div class="tab-content">
                {#if historyView === 'trends'}
                <div class="chart-container"><canvas bind:this={chartCanvas}></canvas></div>
                {:else}
                <div class="timeline-container">
                    {#each timelineLogs as log}
                    <div class="timeline-item">
                        <div class="timeline-date">{new Date(log.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} <span class="day-chip">Day {log.cycleDay}</span></div>
                        <div class="timeline-symptoms">
                            {#each Object.entries(log.symptoms) as [symptom, value]}
                               {#if value > 0}<span class="symptom-tag" title="{symptom} (Level {value})"><i class='bx {symptomIcons[symptom]}'></i></span>{/if}
                            {/each}
                        </div>
                        {#if log.notes}<p class="timeline-notes">"{log.notes}"</p>{/if}
                    </div>
                    {/each}
                </div>
                {/if}
            </div>
        </div>
        {#if advisoryMessage}<div class="advisory-message">{advisoryMessage}</div>{/if}
    </div>
    {/if}
</div>

<style>
    :root { --accent-pink: #FF69B4; --accent-blue: #87CEEB; --accent-yellow: #FFD700; --accent-green: #32CD32; }
    
    .page-title { color: white; margin-bottom: 2rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .settings-trigger { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.5rem; transition: all 0.2s; padding: 0.5rem; }
    .settings-trigger:hover { color: var(--accent-pink); transform: rotate(45deg); }
    
    .back-link { color: var(--text-gray); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .grid-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    
    /* Modal Styles */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .modal-content.cute-modal { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 1.5rem; width: 90%; max-width: 500px; padding: 1.5rem; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; color: white; }
    .close-modal { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.5rem; }
    .close-modal:hover { color: white; }

    .settings-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: var(--bg-dark); padding: 0.3rem; border-radius: 0.75rem; }
    .settings-tabs button { flex: 1; padding: 0.6rem; border: none; background: none; color: var(--text-gray); cursor: pointer; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
    .settings-tabs button.active { background: var(--accent-pink); color: white; }

    .diagnosis-settings { display: flex; flex-direction: column; gap: 1.5rem; }
    .settings-hint { font-size: 0.8rem; color: var(--text-gray); margin: 0; }
    .diagnosis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .diag-chip { display: flex; align-items: center; gap: 0.5rem; background: #1E1F2E; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
    .diag-chip:hover { border-color: var(--accent-pink); }
    .diag-chip input { display: none; }
    .diag-chip span { color: white; font-size: 0.85rem; }
    .diag-chip:has(input:checked) { border-color: var(--accent-pink); background: rgba(255, 105, 180, 0.1); }
    
    .custom-diag { display: flex; flex-direction: column; gap: 0.5rem; }
    .custom-diag label { font-size: 0.85rem; color: white; font-weight: 600; }
    .custom-diag textarea { width: 100%; min-height: 100px; resize: vertical; }

    .card { background: var(--card-bg); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 1rem; }
    h3 { color: white; margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .disclaimer, .disclaimer-bottom { font-size: 0.8rem; color: var(--text-gray); }
    .disclaimer-bottom { text-align: right; margin-top: 1rem; width: 100%;}
    
    input, select, textarea { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.5rem; border-radius: 0.5rem; margin-top: 0.25rem; }
    .primary-button { background: var(--accent-pink); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; width: 100%; font-weight: bold; margin-top: 1.5rem; }
    .secondary-button { background: var(--accent-blue); color: #111; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; width: 100%; font-weight: bold; margin-top: 1rem; }
    .advisory-message { margin-top: 1.5rem; color: var(--accent-orange); text-align: center; background: #1e1f2e55; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid var(--accent-orange); }

    .setup-card { max-width: 800px; margin: 0 auto; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .medical-header { font-size: 0.9rem; color: var(--text-gray); margin-bottom: 1rem; }
    .other-input { width: 100%; margin-top: 1rem; }
    .custom-checkbox-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .custom-checkbox { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 0.75rem; background: #1E1F2E; border-radius: 0.5rem; border: 1px solid var(--border-color); transition: border-color 0.2s; }
    .custom-checkbox:hover { border-color: var(--accent-pink); }
    .custom-checkbox input { display: none; }
    .custom-checkbox .checkbox-ui { width: 1.25em; height: 1.25em; border: 2px solid var(--text-gray); border-radius: 4px; display: inline-block; position: relative; transition: all 0.2s; }
    .custom-checkbox input:checked + .checkbox-ui { background-color: var(--accent-pink); border-color: var(--accent-pink); }
    .custom-checkbox .checkbox-ui::after { content: ''; position: absolute; display: none; left: 6px; top: 2px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .custom-checkbox input:checked + .checkbox-ui::after { display: block; }
    .custom-checkbox span { color: white; font-size: 0.9rem; text-transform: capitalize; }

    .cycle-display { display: flex; flex-direction: column; align-items: center; padding: 1rem 0 0; }
    .cycle-circle { width: 120px; height: 120px; border: 8px solid var(--accent-pink); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
    .day { color: white; font-size: 1.5rem; font-weight: bold; }
    .phase { color: var(--accent-pink); font-size: 0.8rem; font-weight: bold; }
    .cycle-msg { text-align: center; color: var(--text-gray); font-size: 0.9rem; }

    .prediction-card { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 1.5rem;}
    .prediction-main .prediction-date { font-size: 1.5rem; font-weight: bold; color: white; }
    .prediction-main .prediction-label { font-size: 0.9rem; color: var(--text-gray); }
    .prediction-main .days-countdown { font-size: 0.85rem; color: var(--accent-pink); margin-top: 0.5rem; font-weight: 600; }
    
    /* Cute Prediction Window Styles */
    .prediction-window.cute-mode { 
        width: 100%; 
        background: rgba(255, 105, 180, 0.05); 
        padding: 1rem; 
        border-radius: 1.25rem; 
        border: 1px dashed rgba(255, 105, 180, 0.3);
        margin-top: 1rem;
    }
    .window-header { 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 0.5rem; 
        margin-bottom: 0.75rem; 
    }
    .sparkle-icon { color: var(--accent-pink); font-size: 1rem; filter: drop-shadow(0 0 5px rgba(255, 105, 180, 0.5)); animation: sparkle 2s infinite; }
    @keyframes sparkle {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        50% { transform: scale(1.3) rotate(15deg); opacity: 0.7; }
    }
    .window-label { font-size: 0.75rem; color: var(--text-gray); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    
    .window-bar { 
        background: #1E1F2E; 
        border-radius: 1rem; 
        padding: 0.4rem; 
        border: 1px solid var(--border-color); 
    }
    .window-dates { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        gap: 0.5rem; 
    }
    .date-chip { 
        flex: 1; 
        background: linear-gradient(135deg, rgba(255, 105, 180, 0.1), rgba(153, 50, 204, 0.1)); 
        padding: 0.5rem; 
        border-radius: 0.75rem; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        font-size: 0.85rem; 
        font-weight: bold; 
        color: white; 
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .chip-label { font-size: 0.6rem; color: var(--text-gray); text-transform: uppercase; margin-bottom: 0.1rem; }
    .range-connector { width: 20px; height: 2px; background: var(--border-color); border-radius: 2px; }
    
    .symptom-rating-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 1.5rem 0; }
    .symptom-item { display: flex; flex-direction: column; }
    .symptom-label { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .symptom-label i { font-size: 1.2rem; color: var(--accent-blue); }
    .symptom-label span { color: white; text-transform: capitalize; }
    .dots-container { display: flex; align-items: center; gap: 0.5rem; }
    .dot { all: unset; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #1E1F2E; border: 2px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
    .dot:first-child { background: transparent; }
    .dot:hover { border-color: var(--accent-pink); }
    .dot.active { box-shadow: 0 0 0 3px var(--card-bg), 0 0 0 5px var(--accent-pink); }
    .notes-input { width: 100%; min-height: 80px; margin-top: 1.5rem; }

    .tab-buttons { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; }
    .tab-buttons button { all: unset; padding: 0.5rem 1rem; cursor: pointer; color: var(--text-gray); border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-buttons button:hover { color: white; }
    .tab-buttons button.active { color: white; border-bottom-color: var(--accent-green); }
    .chart-container { height: 300px; position: relative; }
    .timeline-container { display: flex; flex-direction: column; gap: 1.5rem; max-height: 400px; overflow-y: auto; padding-right: 1rem; }
    .timeline-item { border-left: 3px solid var(--accent-green); padding-left: 1rem; }
    .timeline-date { font-weight: bold; color: white; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .day-chip { font-size: 0.7rem; background: #1E1F2E; padding: 0.1rem 0.4rem; border-radius: 99px; }
    .timeline-symptoms { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
    .symptom-tag { background: #1E1F2E; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 1rem; display: inline-flex; align-items: center; }
    .timeline-notes { font-style: italic; color: var(--text-gray); margin: 0; background: #1E1F2E; padding: 0.5rem; border-radius: 0.5rem; }

    /* Notification Settings Styles */
    .notification-settings-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem; }
    .notif-item { display: flex; justify-content: space-between; align-items: center; background: #1E1F2E; padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
    .notif-item:hover { border-color: var(--accent-pink); background: rgba(255, 105, 180, 0.05); }
    .notif-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .notif-title { color: white; font-weight: 600; font-size: 0.9rem; }
    .notif-desc { color: var(--text-gray); font-size: 0.75rem; }
    
    .notif-item input { display: none; }
    .toggle-ui { width: 40px; height: 20px; background: var(--bg-dark); border-radius: 20px; position: relative; border: 1px solid var(--border-color); transition: all 0.3s; }
    .toggle-ui::after { content: ''; position: absolute; width: 14px; height: 14px; background: var(--text-gray); border-radius: 50%; top: 2px; left: 2px; transition: all 0.3s; }
    .notif-item input:checked + .toggle-ui { background: var(--accent-pink); border-color: var(--accent-pink); }
    .notif-item input:checked + .toggle-ui::after { left: 22px; background: white; }
</style>
