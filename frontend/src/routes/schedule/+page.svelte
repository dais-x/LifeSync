<div class="scroll-area fade-in">
    <h2 class="page-title">Today's Timeline</h2>
    
    <div class="timeline-container">
        <div class="timeline-line"></div>
        
        <div class="time-slot">
            <div class="time-label">09:00</div>
            <div class="event-card purple">
                <div class="event-title">Deep Work: Architecture</div>
                <div class="event-desc">High Energy Block</div>
            </div>
        </div>

        <div class="time-slot">
            <div class="time-label">10:00</div>
            <div class="empty-line"></div>
        </div>

        <div class="time-slot">
            <div class="time-label">11:00</div>
            <div class="event-card blue">
                <div class="event-title">Team Standup</div>
                <div class="event-desc">Google Meet</div>
            </div>
        </div>

        <div class="time-slot">
            <div class="time-label">12:00</div>
            <div class="event-card green">
                <div class="event-title">Lunch & Recharge</div>
                <div class="event-desc">No Screens</div>
            </div>
        </div>
    </div>
</div>

<style>
    .page-title { color: white; margin-bottom: 2rem; }
    .timeline-container { position: relative; padding-left: 3rem; }
    .timeline-line { position: absolute; left: 3.5rem; top: 0; bottom: 0; width: 1px; background: var(--border-color); z-index: 0; }
    .time-slot { display: flex; margin-bottom: 2rem; position: relative; z-index: 1; }
    .time-label { width: 3rem; font-size: 0.8rem; color: var(--text-gray); margin-top: -0.2rem; }
    .event-card { flex: 1; margin-left: 2rem; padding: 0.75rem; border-left: 2px solid; border-radius: 0.25rem; background: rgba(255,255,255,0.03); }
    .event-card.purple { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.1); }
    .event-card.blue { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); }
    .event-card.green { border-color: var(--accent-green); background: rgba(34, 197, 94, 0.1); }
    .event-title { color: white; font-weight: 600; font-size: 0.9rem; }
    .event-desc { color: var(--text-gray); font-size: 0.8rem; }
    .empty-line { flex: 1; margin-left: 2rem; height: 1px; background: var(--border-color); border-bottom: 1px dashed var(--border-color); margin-top: 0.5rem; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>