<script>
    import { onMount } from 'svelte';

    let { message = '', duration = 5000 } = $props();

    let show = $state(true);

    onMount(() => {
        const timer = setTimeout(() => {
            show = false;
        }, duration);

        return () => clearTimeout(timer);
    });
</script>

{#if show}
<div class="notification">
    {message}
</div>
{/if}

<style>
    .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--accent-green);
        color: white;
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: fadeIn 0.3s ease-out, fadeOut 0.3s ease-in forwards;
        animation-delay: 0s, 2.7s;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
    }
</style>
