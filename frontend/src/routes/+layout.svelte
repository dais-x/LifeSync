<script>
    export const prerender = true;
    export const csr = true;
    import { page } from '$app/stores';
    import '../app.css';
    import { onMount } from 'svelte';
    import { StatusBar, Style } from '@capacitor/status-bar';
    import { Capacitor } from '@capacitor/core';
    
    // --- NEW IMPORTS FOR AUTH GATEKEEPER ---
    import { currentUser } from '$lib/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';

    // List of pages anyone can view without an account
    const publicRoutes = ['/', '/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/signup/details'];
    
    let isPublicRoute = $derived(publicRoutes.includes($page.url.pathname));

    // THE GATEKEEPER LOGIC
    $effect(() => {
        if (browser) {
            if (!isPublicRoute && !$currentUser) {
                // Not logged in? Get out of the dashboard!
                goto('/login');
            } else if (($page.url.pathname === '/' || $page.url.pathname === '/login') && $currentUser) {
                // Already logged in? Skip the landing page!
                goto('/dashboard');
            }
        }
    });

    function logout() {
        $currentUser = null;
        goto('/');
    }

    onMount(async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#0b0c15' }); // Matching --bg-dark
            } catch (e) {
                console.error('StatusBar error:', e);
            }
        }
    });
</script>

<svelte:head>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
</svelte:head>

<div class="app-container">
    <!-- ONLY SHOW SIDEBAR IF WE ARE INSIDE THE APP -->
    {#if !isPublicRoute}
        <aside class="sidebar">
            <div class="sidebar-header">
                <i class="bx bxs-bolt" style="color:var(--accent-purple); margin-right:0.5rem"></i> LifeSync
            </div>
            <nav class="sidebar-nav">
                <a href="/dashboard" class="nav-item {$page.url.pathname === '/dashboard' ? 'active' : ''}"
                    ><i class="bx bxs-dashboard"></i> Dashboard</a
                >
                <a href="/schedule" class="nav-item {$page.url.pathname === '/schedule' ? 'active' : ''}"
                    ><i class="bx bx-calendar"></i> Schedule</a
                >
                <a href="/tasks" class="nav-item {$page.url.pathname === '/tasks' ? 'active' : ''}"
                    ><i class="bx bx-task"></i> Tasks</a
                >
                <a href="/insight" class="nav-item {$page.url.pathname === '/insight' ? 'active' : ''}"
                    ><i class="bx bx-brain"></i> AI Insights</a
                >
                <a href="/health" class="nav-item {$page.url.pathname === '/health' ? 'active' : ''}"
                    ><i class="bx bx-pulse"></i> Health</a
                >
                <a href="/study" class="nav-item {$page.url.pathname === '/study' ? 'active' : ''}"
                    ><i class="bx bx-book-open"></i> Study Hub</a
                >
                <a href="/settings" class="nav-item {$page.url.pathname === '/settings' ? 'active' : ''}"
                    ><i class="bx bx-cog"></i> Settings</a
                >
                <a href="/timer" class="nav-item {$page.url.pathname === '/timer' ? 'active' : ''}"
                    ><i class="bx bx-timer"></i> Timer</a
                >
            </nav>
            <button class="logout-btn" onclick={logout}><i class="bx bx-log-out"></i> Logout</button>
        </aside>
    {/if}

    <main class="main-content" class:full-width={isPublicRoute}>
        <slot />
    </main>

    <!-- ONLY SHOW MOBILE NAV IF WE ARE INSIDE THE APP -->
    {#if !isPublicRoute}
        <nav class="mobile-nav">
            <a href="/dashboard" class="mob-item {$page.url.pathname === '/dashboard' ? 'active' : ''}"
                ><i class="bx bxs-dashboard"></i> Home</a
            >
            <a href="/schedule" class="mob-item {$page.url.pathname === '/schedule' ? 'active' : ''}"
                ><i class="bx bx-calendar"></i> Plan</a
            >
            <a href="/tasks" class="mob-item {$page.url.pathname === '/tasks' ? 'active' : ''}"
                ><i class="bx bx-task"></i> Tasks</a
            >
            <a href="/insight" class="mob-item {$page.url.pathname === '/insight' ? 'active' : ''}"
                ><i class="bx bx-brain"></i> AI</a
            >
            <a href="/health" class="mob-item {$page.url.pathname === '/health' ? 'active' : ''}"
                ><i class="bx bx-pulse"></i> Health</a
            >
            <a href="/study" class="mob-item {$page.url.pathname === '/study' ? 'active' : ''}"
                ><i class="bx bx-book-open"></i> Study</a
            >
            <a href="/settings" class="mob-item {$page.url.pathname === '/settings' ? 'active' : ''}"
                ><i class="bx bx-cog"></i> Settings</a
            >

            <a href="/timer" class="mob-item {$page.url.pathname === '/timer' ? 'active' : ''}"
                ><i class="bx bx-timer"></i> Timer</a
            >
        </nav>
    {/if}
</div>

<style>
    /* --- NEW AUTH UI STYLES --- */
    .full-width {
        margin-left: 0 !important;
        width: 100% !important;
        padding: 0 !important;
    }
    
    .logout-btn {
        margin-top: auto;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    .logout-btn:hover { 
        background: rgba(239, 68, 68, 0.2); 
    }
</style>
