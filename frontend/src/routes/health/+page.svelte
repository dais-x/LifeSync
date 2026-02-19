<script>
    import { userFormData } from '$lib/stores';
    // @ts-nocheck
    
    let currentDayOfCycle = $derived.by(() => {
        if (!$userFormData.last_period_date) return 0;
        
        const lastDate = new Date($userFormData.last_period_date);
        lastDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const cycleLength = $userFormData.avg_cycle_length || 28;
        return (diffDays % cycleLength) + 1;
    });

    let daysUntilNextPeriod = $derived.by(() => {
        if (!$userFormData.last_period_date) return 0;
        const lastDate = new Date($userFormData.last_period_date);
        lastDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cycleLength = $userFormData.avg_cycle_length || 28;
        
        const nextStart = new Date(lastDate);
        nextStart.setDate(lastDate.getDate() + cycleLength);
        while (nextStart < today) {
            nextStart.setDate(nextStart.getDate() + cycleLength);
        }
        const diffTime = nextStart.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });

    let cycleInfo = $derived.by(() => {
        const day = currentDayOfCycle;
        if (day === 0) return { phase: 'N/A', color: 'var(--text-gray)', msg: 'Set up your tracker.' };
        
        const avgPeriod = $userFormData.avg_period_length || 5;

        if (day <= avgPeriod) {
            return { phase: 'Menstrual', color: '#ff4d4d', msg: 'Energy levels are at their lowest. Prioritize rest.' };
        } else if (day <= 11) {
            return { phase: 'Follicular', color: '#2ecc71', msg: 'Energy is rising. Great time for new projects!' };
        } else if (day <= 16) {
            return { phase: 'Ovulation', color: '#ff69b4', msg: 'Peak energy and confidence. Perfect for socializing.' };
        } else {
            return { phase: 'Luteal', color: '#2ecc71', msg: 'Energy levels naturally dipping. Focus on finishing tasks.' };
        }
    });
</script>

<div class="scroll-area fade-in">
    <h2 class="page-title">Health & Energy</h2>

    <div class="grid-layout">
        <!-- =========================================================================== -->
        <!-- MEDICATION CARD (Original UI)                                             -->
        <!-- =========================================================================== -->
        <a href="/health/medicine" class="card-link">
            <div class="card relative clickable">
                <h3><i class='bx bx-capsule' style="color:var(--accent-blue)"></i> Medication</h3>
                <div class="med-item yellow">
                    <div class="med-info">
                        <div class="med-icon">VitC</div>
                        <div>
                            <div class="name">Vitamin C</div>
                            <div class="desc">Orange round chewable</div>
                        </div>
                    </div>
                    <div class="med-stock">
                        <div class="count">12 left</div>
                        <div class="status">Low Stock</div>
                    </div>
                </div>
                <div class="med-item green">
                    <div class="med-info">
                        <div class="med-icon">Zn</div>
                        <div>
                            <div class="name">Zinc</div>
                            <div class="desc">White oval pill</div>
                        </div>
                    </div>
                    <div class="med-stock">
                        <div class="count">28 left</div>
                        <div class="status" style="color:var(--accent-green)">Good</div>
                    </div>
                </div>
            </div>
        </a>

        <!-- =========================================================================== -->
        <!-- CYCLE PHASE CARD (Now links to the new route)                             -->
        <!-- =========================================================================== -->
        {#if $userFormData.cycle_tracking}
            <a href="/health/period-tracker" class="card-link">
                <div class="card relative clickable">
                    <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Cycle Phase</h3>
                    {#if !$userFormData.last_period_date}
                        <div class="setup-msg">
                            <i class='bx bx-info-circle'></i>
                            <p>Tap to set up your cycle tracker</p>
                        </div>
                    {:else}
                        <div class="cycle-display cute-summary">
                            <div class="sparkles-container">
                                <i class='bx bxs-sparkles sparkle s1'></i>
                                <i class='bx bxs-sparkles sparkle s2'></i>
                            </div>
                            <div class="cycle-circle" style="border-color: {cycleInfo.color}">
                                <span class="day">Day {currentDayOfCycle}</span>
                                <span class="phase" style="color: {cycleInfo.color}">{cycleInfo.phase} Phase</span>
                            </div>
                            <div class="days-until">
                                <i class='bx bxs-heart-circle heart-pulse'></i>
                                {daysUntilNextPeriod} days until next period
                            </div>
                            <p class="cycle-msg">{cycleInfo.msg}</p>
                        </div>
                    {/if}
                </div>
            </a>
        {/if}
    </div>
</div>

<style>
    :root {
        --accent-pink: #FF69B4;
        --accent-blue: #87CEEB;
        --accent-red: #ff4d4d;
        --accent-green: #2ecc71;
    }
    .page-title { color: white; margin-bottom: 2rem; }
    .grid-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    
    .card-link {
        text-decoration: none;
        color: inherit;
    }

    .card { 
        background: var(--card-bg); 
        border: 1px solid var(--border-color); 
        padding: 1.5rem; 
        border-radius: 1rem; 
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .card.clickable { 
        cursor: pointer; 
        transition: transform 0.2s, box-shadow 0.2s; 
    }
    .card.clickable:hover { 
        transform: translateY(-4px); 
        box-shadow: 0 4px 20px rgba(0,0,0,0.2); 
    }
    h3 { color: white; margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
    
    .setup-msg {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-gray);
        gap: 0.5rem;
    }
    .setup-msg i { font-size: 2rem; }

    /* Medication Card Styles */
    .med-item { display: flex; justify-content: space-between; padding: 1rem; background: #1E1F2E; border-radius: 0.5rem; margin-bottom: 1rem; border-left: 4px solid; }
    .med-item.yellow { border-color: var(--accent-orange); }
    .med-item.green { border-color: var(--accent-green); }
    .med-info { display: flex; align-items: center; gap: 1rem; }
    .med-icon { width: 2rem; height: 2rem; background: white; border-radius: 50%; color: black; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.7rem; }
    .name { color: white; font-weight: 500; font-size: 0.9rem; }
    .desc { color: var(--text-gray); font-size: 0.75rem; }
    .med-stock { text-align: right; }
    .count { color: white; font-weight: bold; font-size: 0.9rem; }
    .status { font-size: 0.7rem; color: var(--accent-orange); }

    /* Cycle Display Styles */
    .cycle-display { display: flex; flex-direction: column; align-items: center; padding: 1rem 0 0; }
    .cycle-circle { width: 120px; height: 120px; border: 8px solid var(--accent-pink); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 1.5rem; transition: border-color 0.3s; position: relative; z-index: 1; }
    .day { color: white; font-size: 1.5rem; font-weight: bold; }
    .phase { color: var(--accent-pink); font-size: 0.8rem; font-weight: bold; transition: color 0.3s; }
    
    /* Cute Summary Styles */
    .cute-summary { position: relative; }
    .sparkles-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .sparkle { position: absolute; color: var(--accent-pink); font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(255, 105, 180, 0.5)); opacity: 0; animation: sparkleFloat 3s infinite; }
    .sparkle.s1 { top: 10%; left: 20%; animation-delay: 0s; }
    .sparkle.s2 { top: 5%; right: 20%; animation-delay: 1.5s; }
    
    @keyframes sparkleFloat {
        0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
    }

    .days-until { 
        font-size: 0.85rem; 
        color: var(--accent-pink); 
        margin: 0.5rem 0; 
        font-weight: 600; 
        display: flex; 
        align-items: center; 
        gap: 0.4rem;
        background: rgba(255, 105, 180, 0.1);
        padding: 0.3rem 0.8rem;
        border-radius: 99px;
    }
    .heart-pulse { animation: heartPulse 1.5s infinite; font-size: 1.1rem; }
    @keyframes heartPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }

    .cycle-msg { text-align: center; color: var(--text-gray); font-size: 0.8rem; }

    /* Fade-in Animation */
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
