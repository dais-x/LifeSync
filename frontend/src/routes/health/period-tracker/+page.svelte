<script>
    // @ts-nocheck
    import { onMount } from 'svelte';

    // ====================================================================================
    // DATA MODELS & STATE
    // ====================================================================================
    let userSettings = {
        averageCycleLength: 28,
        averagePeriodDuration: 5,
        predictionFlexibilityDays: 2,
        medicalConditions: {
            pcos: false, pcod: false, endometriosis: false,
            thyroidRelated: false, other: '', none: true
        },
        ifConditionSelected: {
            predictionFlexibilityDays: 5, rollingAverageWindow: 6,
            missedCycleThresholdDays: 60, irregularModeEnabled: true
        }
    };
    
    let dailyLog = {
        date: new Date().toISOString().split('T')[0],
        symptoms: {
            cramps: 0, headache: 0, nausea: 0, bloating: 0,
            fatigue: 0, moodSwings: 0, backPain: 0, breastTenderness: 0,
            acne: 0, flowIntensity: 0
        },
        notes: ""
    };

    let cycleHistory = [];
    let isSetupComplete = false;
    let lastPeriodStartDate;
    let currentDayOfCycle = 0;
    let currentPhase = 'Menstrual';
    let nextPeriodPrediction = { startDate: null, window: { start: null, end: null } };
    let advisoryMessage = '';

    const symptomIcons = {
        cramps: 'bxs-hot', headache: 'bxs-bolt', nausea: 'bxs-dizzy',
        bloating: 'bxs-fridge', fatigue: 'bxs-battery-low', moodSwings: 'bxs-meh',
        backPain: 'bxs-clinic', breastTenderness: 'bxs-heart-circle', acne: 'bxs-face',
        flowIntensity: 'bxs-droplet'
    };

    const levelColors = [
        'transparent', 'hsl(120, 80%, 60%)', 'hsl(90, 80%, 60%)',
        'hsl(60, 80%, 60%)', 'hsl(30, 80%, 60%)', 'hsl(0, 80%, 60%)'
    ];

    // ====================================================================================
    // CHECKBOX LOGIC (CORRECTED AND SIMPLIFIED)
    // ====================================================================================
    function handleConditionsChange(toggledKey = null) {
        let conditions = { ...userSettings.medicalConditions };

        if (toggledKey && toggledKey !== 'other_input') {
            conditions[toggledKey] = !conditions[toggledKey];
        }

        const anySpecificIsActive = conditions.pcos || conditions.pcod || conditions.endometriosis || conditions.thyroidRelated || (conditions.other && conditions.other.trim() !== '');

        if (conditions.none && (toggledKey !== 'none' || anySpecificIsActive)) {
            conditions.none = false;
        } else if (!anySpecificIsActive) {
            conditions.none = true;
        }

        if (conditions.none) {
            conditions.pcos = false;
            conditions.pcod = false;
            conditions.endometriosis = false;
            conditions.thyroidRelated = false;
            conditions.other = '';
        }
        
        userSettings.medicalConditions = conditions;
    }

    // ====================================================================================
    // CORE LOGIC (UNCHANGED)
    // ====================================================================================
    function completeSetup() {
        if (!lastPeriodStartDate) {
            alert('Please select the start date of your last period.');
            return;
        }
        const firstCycle = {
            startDate: lastPeriodStartDate,
            endDate: new Date(new Date(lastPeriodStartDate).getTime() + (userSettings.averagePeriodDuration - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            cycleLength: userSettings.averageCycleLength, bleedingDuration: userSettings.averagePeriodDuration,
            symptoms: {}, notes: "Initial cycle entry."
        };
        cycleHistory = [firstCycle];
        isSetupComplete = true;
        recalculateCurrentState();
    }

    function recalculateCurrentState() {
        if (cycleHistory.length === 0) return;
        const lastCycle = cycleHistory[cycleHistory.length - 1];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const lastStartDate = new Date(lastCycle.startDate);
        currentDayOfCycle = Math.round((today - lastStartDate) / (1000 * 60 * 60 * 24)) + 1;
        const rollingAvgLength = getRollingAverageCycleLength();
        const ovulationDate = new Date(lastStartDate.getTime() + (rollingAvgLength - 14) * 24 * 60 * 60 * 1000);
        const periodEndDate = new Date(new Date(lastCycle.startDate).getTime() + (lastCycle.bleedingDuration -1) * 24 * 60 * 60 * 1000);
        if (today <= periodEndDate) currentPhase = 'Menstrual';
        else if (today > periodEndDate && today < ovulationDate) currentPhase = 'Follicular';
        else if (today >= ovulationDate && today <= new Date(ovulationDate.getTime() + 2 * 24*60*60*1000)) currentPhase = 'Ovulation';
        else currentPhase = 'Luteal';
        const flexibility = userSettings.medicalConditions.none ? userSettings.predictionFlexibilityDays : userSettings.ifConditionSelected.predictionFlexibilityDays;
        const nextStartDate = new Date(lastStartDate.getTime() + rollingAvgLength * 24 * 60 * 60 * 1000);
        nextPeriodPrediction.startDate = nextStartDate;
        nextPeriodPrediction.window.start = new Date(nextStartDate.getTime() - flexibility * 24*60*60*1000);
        nextPeriodPrediction.window.end = new Date(nextStartDate.getTime() + flexibility * 24*60*60*1000);
        runPatternDetectionAndScoring();
    }

    function getRollingAverageCycleLength() {
        const isIrregularMode = !userSettings.medicalConditions.none;
        const windowSize = isIrregularMode ? userSettings.ifConditionSelected.rollingAverageWindow : 3;
        const completedCycles = cycleHistory.filter(c => c.cycleLength).slice(-windowSize);
        if (completedCycles.length > 0) {
            const sum = completedCycles.reduce((acc, c) => acc + c.cycleLength, 0);
            return Math.round(sum / completedCycles.length);
        }
        return userSettings.averageCycleLength;
    }

    function runPatternDetectionAndScoring() {
        const cycles = cycleHistory.slice(-2);
        if (cycles.length < 2) { advisoryMessage = ''; return; }
        let score = 0;
        const scoringRules = { crampsSevere: 2, bleedingDurationLong: 2, flowHeavy: 2, cycleLong: 2, missedCycle: 3, persistentFatigue: 1 };
        cycles.forEach(cycle => {
            if(cycle.bleedingDuration > 7) score += scoringRules.bleedingDurationLong;
            if(cycle.cycleLength > 35) score += scoringRules.cycleLong;
            if(cycle.cycleLength > 60) score += scoringRules.missedCycle;
            const symptoms = cycle.symptoms || {};
            if(Object.values(symptoms).some(day => day.cramps >= 4)) score += scoringRules.crampsSevere;
            if(Object.values(symptoms).some(day => day.flowIntensity >= 4)) score += scoringRules.flowHeavy;
        });
        advisoryMessage = score >= 5 ? "Your logged cycle patterns show irregularities. If this continues, consider consulting a healthcare professional." : "";
    }
    
    function logSymptomsForDay() {
        const lastCycle = cycleHistory[cycleHistory.length - 1];
        if (!lastCycle) return;
        if (!lastCycle.symptoms) lastCycle.symptoms = {};
        lastCycle.symptoms[dailyLog.date] = { ...dailyLog.symptoms };
        alert(`Symptoms logged for ${dailyLog.date}`);
        runPatternDetectionAndScoring();
    }

    onMount(() => { if (isSetupComplete) recalculateCurrentState(); });
</script>

<div class="scroll-area fade-in">
    <a href="/health" class="back-link"><i class='bx bx-arrow-back'></i> Back to Health</a>
    <h2 class="page-title">Period Cycle Tracker</h2>

    {#if !isSetupComplete}
        <div class="card setup-card">
             <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Setup Your Cycle Tracker</h3>
            <p class="disclaimer">This is a tracking tool, not for medical diagnosis.</p>
            <div class="form-grid">
                <label>Average Cycle Length (days)<input type="number" bind:value={userSettings.averageCycleLength} min="20" max="45"></label>
                <label>Average Period Duration (days)<input type="number" bind:value={userSettings.averagePeriodDuration} min="1" max="10"></label>
                <label>Start Date of Your LAST Period<input type="date" bind:value={lastPeriodStartDate}></label>
            </div>
            <div class="medical-header">Any existing medical conditions? (Optional)</div>
            <div class="custom-checkbox-group">
                {#each ['pcos', 'pcod', 'endometriosis', 'thyroidRelated'] as condition}
                <label class="custom-checkbox">
                    <input type="checkbox" checked={userSettings.medicalConditions[condition]} on:change={() => handleConditionsChange(condition)}>
                    <span class="checkbox-ui"></span>
                    <span>{condition}</span>
                </label>
                {/each}
                 <label class="custom-checkbox">
                    <input type="checkbox" checked={userSettings.medicalConditions.none} on:change={() => handleConditionsChange('none')}>
                    <span class="checkbox-ui"></span>
                    <span>None</span>
                </label>
            </div>
             <input type="text" placeholder="Other condition..." class="other-input" bind:value={userSettings.medicalConditions.other} on:input={() => handleConditionsChange('other_input')}>
            <button class="primary-button" on:click={completeSetup}>Start Tracking</button>
        </div>
    {:else}
    <!-- This div wrapper is the fix for the structural bug -->
    <div>
        <div class="grid-layout" style="margin-top: 1.5rem;">
             <div class="card relative">
                <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Current Phase</h3>
                <div class="cycle-display"><div class="cycle-circle"><span class="day">Day {currentDayOfCycle}</span><span class="phase">{currentPhase} Phase</span></div></div>
                 <div class="disclaimer-bottom">Not for medical diagnosis.</div>
            </div>
             <div class="card">
                <h3><i class='bx bx-bell' style="color: var(--accent-yellow);"></i> Predictions</h3>
                <p class="cycle-msg">Next period expected:<br><b>{nextPeriodPrediction.startDate?.toDateString() || 'N/A'}</b></p>
                <p class="disclaimer" style="text-align:center; margin-top: 1rem;">Window: {nextPeriodPrediction.window.start?.toLocaleDateString()} - {nextPeriodPrediction.window.end?.toLocaleDateString()}</p>
                 <div class="disclaimer-bottom">This is an estimate.</div>
             </div>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
            <h3><i class='bx bx-plus-medical' style="color:var(--accent-blue)"></i> Log Daily Symptoms & Notes</h3>
            <div class="symptom-rating-grid">
                {#each Object.entries(dailyLog.symptoms) as [symptom, value]}
                <div class="symptom-item">
                    <div class="symptom-label">
                        <i class='bx {symptomIcons[symptom] || 'bxs-tag'}'></i>
                        <span>{symptom.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                    <div class="dots-container">
                        {#each {length: 6} as _, i}
                        <button 
                            class="dot" 
                            style="background-color: {value >= i ? levelColors[i] : 'transparent'}; border-color: {value >= i && i > 0 ? levelColors[i] : 'var(--border-color)'};"
                            class:active={value === i} 
                            on:click={() => dailyLog.symptoms[symptom] = i}>
                        </button>
                        {/each}
                    </div>
                </div>
                {/each}
            </div>
            <textarea class="notes-input" placeholder="Add any notes for today..." bind:value={dailyLog.notes}></textarea>
            <button class="secondary-button" on:click={logSymptomsForDay}>Log Today's Entry</button>
            {#if advisoryMessage}
                <p class="advisory-message">{advisoryMessage}</p>
            {/if}
        </div>
    </div>
    {/if}
</div>

<style>
    :root { --accent-pink: #FF69B4; --accent-blue: #87CEEB; --accent-yellow: #FFD700; }
    .page-title { color: white; margin-bottom: 2rem; }
    .back-link { color: var(--text-gray); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .grid-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 1rem; }
    h3 { color: white; margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .setup-card { max-width: 800px; margin: 0 auto; }
    .disclaimer { font-size: 0.8rem; color: var(--text-gray); margin: 0.5rem 0 1.5rem; }
    .disclaimer-bottom { font-size: 0.7rem; color: var(--text-gray); text-align: right; margin-top: 1rem; width: 100%;}
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    input, select, textarea { background: #1E1F2E; border: 1px solid var(--border-color); color: white; padding: 0.5rem; border-radius: 0.5rem; margin-top: 0.25rem; }
    .medical-header { font-size: 0.9rem; color: var(--text-gray); margin-bottom: 1rem; }
    .other-input { width: 100%; margin-top: 1rem; }
    .primary-button { background: var(--accent-pink); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; width: 100%; font-weight: bold; margin-top: 1.5rem; }
    .secondary-button { background: var(--accent-blue); color: #111; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; width: 100%; font-weight: bold; margin-top: 1rem; }
    .advisory-message { margin-top: 1rem; color: var(--accent-orange); text-align: center; background: #1e1f2e55; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid var(--accent-orange); }

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
    .notes-input { width: 100%; min-height: 80px; margin-top: 1.5rem; }
    
    .symptom-rating-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 1.5rem 0; }
    .symptom-item { display: flex; flex-direction: column; }
    .symptom-label { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .symptom-label i { font-size: 1.2rem; color: var(--accent-blue); }
    .symptom-label span { color: white; text-transform: capitalize; }
    .dots-container { display: flex; align-items: center; gap: 0.5rem; }
    .dot { all: unset; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #1E1F2E; border: 2px solid var(--border-color); cursor: pointer; transition: all 0.2s; }
    .dot:hover { border-color: var(--accent-pink); }
    .dot.active { box-shadow: 0 0 0 3px var(--card-bg), 0 0 0 5px var(--accent-pink); }

</style>
