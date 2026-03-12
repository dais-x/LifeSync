import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';

// Check if we are running on Vercel. If not, we assume we want a static build for the phone.
const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
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
        
        // Keep the CSRF fix so the phone can talk to the API
        csrf: {
            checkOrigin: false
        }
    }
};

export default config;