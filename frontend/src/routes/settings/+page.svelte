<div class="scroll-area fade-in">
    <div class="card">
        <div class="profile-header">
            <div class="avatar-lg">FS</div>
            <div>
                <h3>Fahim Shafeek</h3>
                <p>fahim@lifesync.ai • <span style="color: var(--accent-orange)">LifeSyncPro</span></p>
            </div>
            <button class="edit-btn">Edit</button>
        </div>

        <div class="settings-list">
            <div class="setting-item">
                <div>
                    <div class="setting-title">Dark Mode</div>
                    <div class="setting-desc">System Default</div>
                </div>
                <div class="toggle active"><div class="dot"></div></div>
            </div>
            
            <div class="setting-item">
                <div>
                    <div class="setting-title">Ghost Mode Auto-Schedule</div>
                    <div class="setting-desc">Allow AI to move tasks automatically</div>
                </div>
                <div class="toggle active"><div class="dot"></div></div>
            </div>

            <div class="setting-item">
                <div>
                    <div class="setting-title">Cycle Sync Data</div>
                    <div class="setting-desc">Connected to Apple Health</div>
                </div>
                <span style="color: var(--accent-green); font-size: 0.8rem;">Connected</span>
            </div>
        </div>
        
        <div class="footer">
            <button class="delete-btn">Delete Account</button>
        </div>
    </div>
</div>

<style>
    .card { background: var(--card-bg); border: 1px solid var(--border-color); padding: 2rem; border-radius: 1rem; max-width: 600px; margin: 0 auto; }
    .profile-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
    .avatar-lg { width: 4rem; height: 4rem; border-radius: 50%; background: linear-gradient(to right, var(--accent-purple), var(--accent-blue)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; }
    h3 { color: white; margin: 0; }
    p { color: var(--text-gray); margin: 0.2rem 0 0; font-size: 0.9rem; }
    .edit-btn { margin-left: auto; background: none; border: 1px solid var(--border-color); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; }
    
    .settings-list { display: flex; flex-direction: column; gap: 1rem; }
    .setting-item { display: flex; justify-content: space-between; align-items: center; background: #0B0C15; padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
    .setting-title { color: white; font-weight: 500; font-size: 0.95rem; }
    .setting-desc { color: var(--text-gray); font-size: 0.8rem; }
    
    .toggle { width: 2.5rem; height: 1.5rem; background: var(--border-color); border-radius: 1rem; position: relative; cursor: pointer; transition: 0.2s; }
    .toggle.active { background: var(--accent-purple); }
    .dot { width: 1rem; height: 1rem; background: white; border-radius: 50%; position: absolute; top: 0.25rem; left: 0.25rem; transition: 0.2s; }
    .toggle.active .dot { left: 1.25rem; }
    
    .footer { margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; }
    .delete-btn { color: var(--accent-red); background: none; border: none; cursor: pointer; font-size: 0.9rem; }
    .delete-btn:hover { text-decoration: underline; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>