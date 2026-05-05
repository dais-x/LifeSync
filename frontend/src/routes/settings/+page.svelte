<script>
    import { userFormData, currentUser } from '$lib/stores';
    import { goto } from '$app/navigation';

    let aiAssistanceLevel = 1; // 0: Low, 1: Balanced, 2: Aggressive
    const aiLevels = ['Low', 'Balanced', 'Aggressive'];

    let accentColor = '#6366f1';
    let theme = 'System';
    let weekStart = 'Monday';
    let timeFormat = '24h';
    let reminderTime = '15 mins before';

    // --- LOGOUT LOGIC ---
    function logout() {
        $currentUser = null;
        goto('/');
    }
</script>

<div class="scroll-area fade-in settings-container">
    <!-- Profile & Basic Settings -->
    <div class="card">
        <div class="profile-header">
            <div class="avatar-lg">
                <!-- DYNAMIC: Show first 2 letters of user's name, fallback to ME -->
                {$currentUser?.name ? $currentUser.name.substring(0, 2).toUpperCase() : 'ME'}
            </div>
            <div>
                <!-- DYNAMIC: Show actual user data -->
                <h3>{$currentUser?.name || 'LifeSync User'}</h3>
                <p>{$currentUser?.email || 'user@lifesync.ai'} • <span style="color: var(--accent-orange)">LifeSyncPro</span></p>
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
                <div class="toggle" class:active={$userFormData.control_level === 'auto'} on:click={() => $userFormData.control_level = $userFormData.control_level === 'auto' ? 'manual' : 'auto'}>
                    <div class="dot"></div>
                </div>
            </div>

            <div class="setting-item">
                <div>
                    <div class="setting-title">Allow Smart Sync</div>
                    <div class="setting-desc">Read Gmail and other third-party apps</div>
                </div>
                <div class="toggle" class:active={$userFormData.smart_sync} on:click={() => $userFormData.smart_sync = !$userFormData.smart_sync}>
                    <div class="dot"></div>
                </div>
            </div>

            <div class="setting-item">
                <div>
                    <div class="setting-title">Enable Period Tracker</div>
                    <div class="setting-desc">Show period tracker in health dashboard</div>
                </div>
                <div class="toggle" class:active={$userFormData.cycle_tracking} on:click={() => $userFormData.cycle_tracking = !$userFormData.cycle_tracking}>
                    <div class="dot"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Security Section -->
    <div class="card">
        <div class="section-header">
            <h3><i class='bx bx-shield-quarter'></i> Security</h3>
        </div>
        <div class="settings-list">
            <div class="info-group">
                <p class="label">Last login activity</p>
                <p class="value">March 9, 2026 • 10:24 AM from Dhaka, BD</p>
            </div>
            <div class="list-container">
                <p class="label">Active Sessions</p>
                <div class="session-item">
                    <i class='bx bx-mobile-alt'></i>
                    <div class="session-info">
                        <p class="device">iPhone 15 Pro • Current</p>
                        <p class="location">Dhaka, Bangladesh</p>
                    </div>
                </div>
                <div class="session-item">
                    <i class='bx bx-desktop'></i>
                    <div class="session-info">
                        <p class="device">Windows PC • Chrome</p>
                        <p class="location">Dhaka, Bangladesh</p>
                    </div>
                </div>
            </div>
            <button class="action-btn outline" on:click={logout}>Logout from all devices</button>
        </div>
    </div>

    <!-- About Section -->
    <div class="card about-card">
        <div class="about-content">
            <div class="app-info">
                <i class='bx bxs-bolt accent-icon'></i>
                <div>
                    <p class="app-name">LifeSync</p>
                    <p class="app-version">v1.0.4-beta</p>
                </div>
           </div>
          <!--   <div class="about-links">
                <a href="#">Terms of service</a>
                <a href="#">Privacy policy</a>
                <a href="#">Contact support</a>
            </div> -->
        </div> 
    </div>

    <!-- Prominent Logout & Delete Footer -->
    <div class="card footer-card">
        <div class="footer-actions">
            <button class="logout-main-btn" on:click={logout}>
                <i class='bx bx-log-out'></i> Log Out
            </button>
            <button class="delete-btn">Delete Account</button>
        </div>
    </div>
</div>

<style>
    .settings-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding-bottom: 5rem;
    }
    .card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 2rem;
        border-radius: 1rem;
        max-width: 600px;
        width: 100%;
        margin: 0 auto;
    }
    .section-header {
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
    }
    .section-header h3 {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.1rem;
    }
    .profile-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    .avatar-lg {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: linear-gradient(to right, var(--accent-purple), var(--accent-blue));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 1.2rem;
    }
    h3 {
        color: white;
        margin: 0;
    }
    p {
        color: var(--text-gray);
        margin: 0.2rem 0 0;
        font-size: 0.9rem;
    }
    .edit-btn {
        margin-left: auto;
        background: none;
        border: 1px solid var(--border-color);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.85rem;
    }

    .settings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0b0c15;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border-color);
    }
    .setting-item.no-bg {
        background: transparent;
        border: none;
        padding: 0.5rem 0;
    }
    .setting-title {
        color: white;
        font-weight: 500;
        font-size: 0.95rem;
    }
    .setting-desc {
        color: var(--text-gray);
        font-size: 0.8rem;
    }

    /* Toggle */
    .toggle {
        width: 2.5rem;
        height: 1.5rem;
        background: var(--border-color);
        border-radius: 1rem;
        position: relative;
        cursor: pointer;
        transition: 0.2s;
    }
    .toggle.active {
        background: var(--accent-purple);
    }
    .dot {
        width: 1rem;
        height: 1rem;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 0.25rem;
        left: 0.25rem;
        transition: 0.2s;
    }
    .toggle.active .dot {
        left: 1.25rem;
    }

    /* Custom Inputs */
    .custom-select {
        background: #0b0c15;
        color: white;
        border: 1px solid var(--border-color);
        padding: 0.5rem;
        border-radius: 0.4rem;
        outline: none;
        font-size: 0.9rem;
    }
    .color-picker {
        background: none;
        border: none;
        width: 2.5rem;
        height: 1.5rem;
        cursor: pointer;
    }
    .time-input {
        background: #0b0c15;
        color: white;
        border: 1px solid var(--border-color);
        padding: 0.4rem;
        border-radius: 0.4rem;
        font-size: 0.85rem;
    }

    /* Security Styles */
    .info-group {
        margin-bottom: 1rem;
    }
    .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--text-gray);
        letter-spacing: 0.05em;
        margin-bottom: 0.4rem;
    }
    .value {
        color: white;
        font-size: 0.9rem;
    }
    .session-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    .session-item i {
        font-size: 1.5rem;
        color: var(--text-gray);
    }
    .session-info .device {
        color: white;
        font-size: 0.9rem;
        margin: 0;
    }
    .session-info .location {
        font-size: 0.75rem;
        color: var(--text-gray);
        margin: 0;
    }

    /* AI Settings Slider */
    .slider-group {
        background: #0b0c15;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border-color);
    }
    .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .badge {
        background: var(--accent-purple);
        color: white;
        font-size: 0.7rem;
        padding: 0.2rem 0.6rem;
        border-radius: 1rem;
        font-weight: 600;
    }
    .custom-range {
        width: 100%;
        accent-color: var(--accent-purple);
        margin-bottom: 0.5rem;
    }
    .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: var(--text-gray);
    }

    /* Integrations Grid */
    .integration-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    .integration-btn {
        background: #0b0c15;
        border: 1px solid var(--border-color);
        padding: 1rem;
        border-radius: 0.75rem;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: 0.2s;
    }
    .integration-btn:hover {
        border-color: var(--accent-purple);
    }
    .integration-btn i {
        font-size: 1.5rem;
    }
    .integration-btn span {
        font-size: 0.8rem;
    }
    .integration-btn .status {
        font-size: 0.65rem;
        color: var(--text-gray);
    }
    .integration-btn .status.connected {
        color: var(--accent-green);
    }

    /* Action Buttons */
    .action-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .action-btn {
        padding: 0.75rem;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    .action-btn.outline {
        background: none;
        border: 1px solid var(--border-color);
        color: white;
    }
    .action-btn.outline:hover {
        background: rgba(255,255,255,0.05);
    }

    /* About Section */
    .about-card {
        background: transparent;
        border-style: dashed;
        padding: 1.5rem;
    }
    .app-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .app-info .accent-icon {
        font-size: 2rem;
        color: var(--accent-purple);
    }
    .app-name {
        font-weight: 700;
        color: white;
        margin: 0;
    }
    .app-version {
        font-size: 0.7rem;
        color: var(--text-gray);
        margin: 0;
    }
    .about-links {
        display: flex;
        gap: 1.5rem;
    }
    .about-links a {
        color: var(--text-gray);
        text-decoration: none;
        font-size: 0.8rem;
    }
    .about-links a:hover {
        color: white;
        text-decoration: underline;
    }

    /* Footer & Logout */
    .footer-card {
        border: none;
        background: transparent;
        padding-top: 0;
    }
    .footer-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        border-top: 1px solid var(--border-color);
        padding-top: 2rem;
    }
    .logout-main-btn {
        width: 100%;
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-red);
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 1rem;
        border-radius: 0.75rem;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
    }
    .logout-main-btn:hover {
        background: rgba(239, 68, 68, 0.2);
    }
    .delete-btn {
        color: var(--text-gray);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        transition: color 0.2s;
    }
    .delete-btn:hover {
        color: var(--accent-red);
        text-decoration: underline;
    }

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

    @media (max-width: 480px) {
        .integration-grid {
            grid-template-columns: 1fr;
        }
        .about-links {
            flex-direction: column;
            gap: 0.5rem;
        }
    }
</style>