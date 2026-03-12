export async function handle({ event, resolve }) {
    // 1. Handle preflight requests (the phone asking Vercel if it is allowed to connect)
    if (event.url.pathname.startsWith('/api') && event.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Origin': '*', // The magic asterisk that lets the Android app in
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    // 2. Process the normal request
    const response = await resolve(event);
    
    // 3. Add the CORS headers to normal API responses so the phone can read the data
    if (event.url.pathname.startsWith('/api')) {
        response.headers.append('Access-Control-Allow-Origin', '*');
    }
    
    return response;
}