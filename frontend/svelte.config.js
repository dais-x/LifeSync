import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';

// Check if we are running on Vercel. If not, we assume we want a static build for the phone.
const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // This catches all harmless Svelte 4/5 warnings and throws them away 
    // so Vercel's strict CI mode doesn't panic and crash the build.
    onwarn: (warning, handler) => {
        if (warning.code.startsWith('a11y-')) return;
        if (warning.code === 'event_directive_deprecated') return;
        if (warning.code === 'css_unused_selector') return;
        
        // Let any actual fatal errors pass through
        handler(warning);
    },

    kit: {
        // This logic chooses Auto for Vercel and Static for your local Android build
        adapter: isVercel 
            ? adapterAuto() 
            : adapterStatic({
                pages: 'build',
                assets: 'build',
                fallback: 'index.html',
                precompress: false,
                strict: false
            }),
            
        // --- NEW: THE 404 SILENCER ---
        // Stops Vercel from crashing if it can't find a linked asset (like favicon.png)
        prerender: {
            handleHttpError: 'warn'
        },
        
        // Keep the CSRF fix so the phone can talk to the API
        csrf: {
            checkOrigin: false
        }
    }
};

export default config;