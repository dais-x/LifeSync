<script>
    import { page } from '$app/stores';
    import '../app.css';
</script>

<svelte:head>
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
</svelte:head>

<div class="app-container">
    <aside class="sidebar">
        <div class="sidebar-header"><i class='bx bxs-bolt' style="color:var(--accent-purple); margin-right:0.5rem"></i> LifeSync</div>
        <nav class="sidebar-nav">
            <a href="/dashboard" class="nav-item {$page.url.pathname === '/dashboard' ? 'active' : ''}"><i class='bx bxs-dashboard'></i> Dashboard</a>
            <a href="/schedule" class="nav-item {$page.url.pathname === '/schedule' ? 'active' : ''}"><i class='bx bx-calendar'></i> Schedule</a>
            <a href="/tasks" class="nav-item {$page.url.pathname === '/tasks' ? 'active' : ''}"><i class='bx bx-task'></i> Tasks</a>
            <a href="/insight" class="nav-item {$page.url.pathname === '/insight' ? 'active' : ''}"><i class='bx bx-brain'></i> AI Insights</a>
            <a href="/health" class="nav-item {$page.url.pathname === '/health' ? 'active' : ''}"><i class='bx bx-pulse'></i> Health</a>
            <a href="/settings" class="nav-item {$page.url.pathname === '/settings' ? 'active' : ''}"><i class='bx bx-cog'></i> Settings</a>
        </nav>
    </aside>

    <main class="main-content">
        <slot /> </main>

    <nav class="mobile-nav">
        <a href="/dashboard" class="mob-item {$page.url.pathname === '/dashboard' ? 'active' : ''}"><i class='bx bxs-dashboard'></i> Home</a>
        <a href="/schedule" class="mob-item {$page.url.pathname === '/schedule' ? 'active' : ''}"><i class='bx bx-calendar'></i> Plan</a>
        <a href="/tasks" class="mob-item {$page.url.pathname === '/tasks' ? 'active' : ''}"><i class='bx bx-task'></i> Tasks</a>
        <a href="/insight" class="mob-item {$page.url.pathname === '/insight' ? 'active' : ''}"><i class='bx bx-brain'></i> AI</a>
        <a href="/health" class="mob-item {$page.url.pathname === '/health' ? 'active' : ''}"><i class='bx bx-pulse'></i> Health</a>
    </nav>
</div>