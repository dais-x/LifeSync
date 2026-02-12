<script>
    // No script logic needed for the landing page
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
</svelte:head>

<div class="page-container fade-in">
    <div class="background-effects">
        <div class="blob purple-blob"></div>
        <div class="blob blue-blob"></div>
    </div>

    <nav class="navbar">
        <div class="logo">
            <i class='bx bxs-bolt accent-icon'></i> LifeSync
        </div>
        <div class="nav-links">
            <a href="#features">Features</a>
            <a href="#pro">LifeSyncPro</a>
            <a href="#pricing">Pricing</a>
        </div>
        <a href="/login" class="login-btn">Log In</a>
    </nav>

    <main class="hero">
        <h1 class="hero-title">
            Master Your Life.<br>
            <span class="gradient-text">Not Just Your Tasks.</span>
        </h1>
        <p class="hero-subtitle">
            The first AI-powered OS that syncs your tasks with your <span class="white-text">energy</span>, <span class="white-text">location</span>, and <span class="white-text">health cycle</span>.
        </p>
        
        <div class="cta-buttons">
            <a href="/signup" class="btn-primary">Get Started Free</a>
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <i class='bx bxs-ghost feature-icon'></i>
                <h3>Ghost Mode</h3>
                <p>AI auto-reschedules tasks when you ignore them 3 times.</p>
            </div>
            <div class="feature-card">
                <i class='bx bx-pulse feature-icon'></i>
                <h3>Health Sync</h3>
                <p>Adapts your workload based on your energy & cycle phase.</p>
            </div>
            <div class="feature-card">
                <i class='bx bxs-brain feature-icon'></i>
                <h3>Second Brain</h3>
                <p>Vector-embedded memory for instant recall of goals.</p>
            </div>
        </div>
    </main>
</div>

<style>
    /* --- CSS VARIABLES (Theme Colors) --- */
    :root {
        --bg-dark: #0B0C15;
        --card-bg: #151621;
        --border-color: #2A2B3D;
        --text-main: #E2E8F0;
        --text-muted: #9ca3af;
        --accent-purple: #6366f1;
        --accent-blue: #3b82f6;
        --hover-purple: #4f46e5;
    }

    /* --- GLOBAL LAYOUT --- */
    :global(body) {
        margin: 0;
        padding: 0;
        background-color: var(--bg-dark);
        font-family: 'Inter', sans-serif;
        color: var(--text-main);
        overflow-x: hidden;
    }

    .page-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
    }

    /* --- ANIMATION --- */
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* --- BACKGROUND BLOBS --- */
    .background-effects {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: -1;
        pointer-events: none;
    }
    .blob {
        position: absolute;
        width: 40vw; height: 40vw;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.2;
    }
    .purple-blob { background: var(--accent-purple); top: -10%; left: -10%; }
    .blue-blob { background: var(--accent-blue); bottom: -10%; right: -10%; opacity: 0.1; }

    /* --- NAVIGATION --- */
    .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 3rem;
    }
    .logo {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.05em;
        color: white;
        display: flex;
        align-items: center;
    }
    .accent-icon { color: var(--accent-purple); margin-right: 0.5rem; }

    .nav-links { display: flex; gap: 2rem; }
    .nav-links a {
        text-decoration: none;
        color: var(--text-muted);
        font-size: 0.875rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-links a:hover { color: white; }

    .login-btn {
        text-decoration: none;
        color: var(--text-main);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1.5rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        transition: all 0.2s;
    }
    .login-btn:hover { background-color: var(--border-color); color: white; }

    /* --- HERO SECTION --- */
    .hero {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 4rem 1rem 0;
        margin-top: 2rem;
    }
    .hero-title {
        font-size: 3rem;
        font-weight: 800;
        color: white;
        margin-bottom: 1.5rem;
        line-height: 1.1;
        letter-spacing: -0.02em;
    }
    .gradient-text {
        background: linear-gradient(to right, var(--accent-purple), var(--accent-blue));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .hero-subtitle {
        font-size: 1.125rem;
        color: var(--text-muted);
        max-width: 42rem;
        margin-bottom: 2.5rem;
        line-height: 1.6;
    }
    .white-text { color: white; }

    /* --- BUTTONS --- */
    .btn-primary {
        background-color: var(--accent-purple);
        color: white;
        padding: 1rem 2rem;
        border-radius: 0.75rem;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.25);
        transition: transform 0.2s, background-color 0.2s;
        display: inline-block;
    }
    .btn-primary:hover {
        background-color: var(--hover-purple);
        transform: scale(1.05);
    }

    /* --- FEATURES GRID --- */
    .features-grid {
        margin-top: 5rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        width: 100%;
        max-width: 64rem;
        border-top: 1px solid var(--border-color);
        padding-top: 2.5rem;
        padding-bottom: 5rem;
        text-align: left;
    }
    .feature-card {
        padding: 1rem;
    }
    .feature-icon {
        font-size: 1.875rem;
        color: #6b7280;
        margin-bottom: 0.75rem;
        display: block;
    }
    .feature-card h3 {
        color: white;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
    }
    .feature-card p {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0;
    }

    /* --- MOBILE RESPONSIVE --- */
    @media (max-width: 768px) {
        .navbar { padding: 1.5rem; }
        .nav-links { display: none; } /* Hide links on mobile for simplicity */
        .hero-title { font-size: 2.5rem; }
        .features-grid { grid-template-columns: 1fr; margin-top: 3rem; }
    }
</style>