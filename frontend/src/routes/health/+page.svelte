<script>
    // @ts-nocheck
    // This page now only displays summary cards.
    // The detailed tracker is in /health/period-tracker
    let currentDayOfCycle = 21; // This would be loaded from a summary state store in a real app
    let currentPhase = 'Luteal'; // This would be loaded from a summary state store in a real app
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
        <a href="/health/period-tracker" class="card-link">
            <div class="card relative clickable">
                <h3><i class='bx bx-calendar-heart' style="color:var(--accent-pink)"></i> Cycle Phase</h3>
                <div class="cycle-display">
                    <div class="cycle-circle">
                        <span class="day">Day {currentDayOfCycle}</span>
                        <span class="phase">{currentPhase} Phase</span>
                    </div>
                    <p class="cycle-msg">Energy levels naturally dipping. Tap to see full tracker.</p>
                </div>
            </div>
        </a>
    </div>
</div>

<style>
    :root {
        --accent-pink: #FF69B4;
        --accent-blue: #87CEEB;
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
    .cycle-circle { width: 120px; height: 120px; border: 8px solid var(--accent-pink); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
    .day { color: white; font-size: 1.5rem; font-weight: bold; }
    .phase { color: var(--accent-pink); font-size: 0.8rem; font-weight: bold; }
    .cycle-msg { text-align: center; color: var(--text-gray); font-size: 0.9rem; }

    /* Fade-in Animation */
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
