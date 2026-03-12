import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter({
            fallback: 'index.html'
        }),
        
        // NEW: Disable SvelteKit's strict Cross-Site Request Forgery (CSRF) origin checking.
        // This is required so the Capacitor mobile app (which runs on a local origin like http://localhost)
        // is allowed to make POST requests to your live Vercel API without being blocked.
        csrf: {
            checkOrigin: false
        }
    }
};

export default config;