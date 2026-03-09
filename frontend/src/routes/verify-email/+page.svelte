<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let status = 'verifying'; // verifying, success, error
	let errorMessage = '';

	onMount(async () => {
		const token = $page.url.searchParams.get('token');

		if (!token) {
			status = 'error';
			errorMessage = 'No verification token provided.';
			return;
		}

		try {
			const response = await fetch('/api/auth/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Verification failed');
			}

			status = 'success';
			setTimeout(() => {
				goto('/login');
			}, 3000);
		} catch (e) {
			status = 'error';
			errorMessage = e.message;
		}
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="page-container fade-in">
	<div class="card">
		<div class="card-header">
			<i class="bx bxs-bolt accent-icon"></i>
			{#if status === 'verifying'}
				<h2>Verifying Email</h2>
				<p>Please wait while we confirm your account...</p>
			{:else}
				<h2>Verification Result</h2>
			{/if}
		</div>

		<div class="status-content">
			{#if status === 'verifying'}
				<div class="loader"></div>
			{:else if status === 'success'}
				<div class="result success">
					<i class="bx bx-check-circle"></i>
					<p>Email verified successfully! Redirecting to login...</p>
				</div>
			{:else}
				<div class="result error">
					<i class="bx bx-error-circle"></i>
					<p>{errorMessage}</p>
					<a href="/signup" class="btn-primary">Back to Sign Up</a>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* --- CSS VARIABLES --- */
	:root {
		--bg-dark: #0b0c15;
		--card-bg: #151621;
		--border-color: #2a2b3d;
		--text-main: #e2e8f0;
		--text-muted: #9ca3af;
		--accent-purple: #6366f1;
		--accent-green: #10b981;
		--accent-red: #ef4444;
	}

	.page-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-dark);
		font-family: 'Inter', sans-serif;
		color: var(--text-main);
	}

	.fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.card {
		width: 100%;
		max-width: 28rem;
		background-color: var(--card-bg);
		padding: 2.5rem;
		border-radius: 1rem;
		border: 1px solid var(--border-color);
		text-align: center;
	}

	.card-header { margin-bottom: 2rem; }
	.accent-icon { font-size: 2.5rem; color: var(--accent-purple); margin-bottom: 1rem; }
	.card-header h2 { font-size: 1.5rem; color: white; margin: 0; }
	.card-header p { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }

	.status-content { min-height: 100px; display: flex; align-items: center; justify-content: center; }

	.loader {
		width: 40px;
		height: 40px;
		border: 4px solid var(--border-color);
		border-top-color: var(--accent-purple);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.result i { font-size: 3rem; margin-bottom: 1rem; }
	.result.success i { color: var(--accent-green); }
	.result.error i { color: var(--accent-red); }
	.result p { margin-bottom: 1.5rem; }

	.btn-primary {
		display: inline-block;
		background-color: var(--accent-purple);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
	}
</style>
