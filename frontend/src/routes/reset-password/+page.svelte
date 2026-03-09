<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let password = '';
	let confirmPassword = '';
	let status = 'idle'; // idle, loading, success, error
	let errorMessage = '';

	async function handleReset() {
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			status = 'error';
			return;
		}

		status = 'loading';
		errorMessage = '';

		const token = $page.url.searchParams.get('token');

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Reset failed');
			}

			status = 'success';
			setTimeout(() => {
				goto('/login');
			}, 3000);
		} catch (e) {
			status = 'error';
			errorMessage = e.message;
		}
	}
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
			<h2>Reset Password</h2>
			<p>Enter your new password below</p>
		</div>

		{#if status === 'success'}
			<div class="result success">
				<i class="bx bx-check-circle"></i>
				<p>Password reset successfully! Redirecting to login...</p>
			</div>
		{:else}
			{#if status === 'error'}
				<div class="banner error">
					<i class="bx bx-error-circle"></i>
					{errorMessage}
				</div>
			{/if}

			<form on:submit|preventDefault={handleReset} class="form-stack">
				<div class="input-group">
					<label for="password">New Password</label>
					<input type="password" id="password" bind:value={password} placeholder="••••••••" required />
				</div>

				<div class="input-group">
					<label for="confirm">Confirm Password</label>
					<input type="password" id="confirm" bind:value={confirmPassword} placeholder="••••••••" required />
				</div>

				<button type="submit" class="btn-primary" disabled={status === 'loading'}>
					{status === 'loading' ? 'Resetting...' : 'Reset Password'}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	/* Same common styles */
	:root {
		--bg-dark: #0b0c15;
		--card-bg: #151621;
		--input-bg: #0b0c15;
		--border-color: #2a2b3d;
		--text-main: #e2e8f0;
		--text-muted: #9ca3af;
		--accent-purple: #6366f1;
		--accent-red: #ef4444;
		--accent-green: #10b981;
	}

	.page-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: var(--bg-dark); font-family: 'Inter', sans-serif; color: var(--text-main); }
	.fade-in { animation: fadeIn 0.4s ease-out forwards; }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }

	.card { width: 100%; max-width: 28rem; background-color: var(--card-bg); padding: 2.5rem; border-radius: 1rem; border: 1px solid var(--border-color); }
	.card-header { text-align: center; margin-bottom: 2rem; }
	.accent-icon { font-size: 2.5rem; color: var(--accent-purple); margin-bottom: 1rem; display: inline-block; }
	.card-header h2 { font-size: 1.5rem; color: white; margin: 0; }
	.card-header p { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }

	.banner { padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; background: rgba(239,68,68,0.1); border: 1px solid var(--accent-red); color: var(--accent-red); }

	.result { text-align: center; }
	.result i { font-size: 3rem; color: var(--accent-green); margin-bottom: 1rem; display: block; }
	.result p { margin: 0; }

	.form-stack { display: flex; flex-direction: column; gap: 1.25rem; }
	.input-group label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; }
	.input-group input { width: 100%; background: var(--input-bg); border: 1px solid var(--border-color); padding: 0.75rem; color: white; border-radius: 0.5rem; outline: none; box-sizing: border-box; }
	.input-group input:focus { border-color: var(--accent-purple); }

	.btn-primary { width: 100%; background: var(--accent-purple); color: white; border: none; padding: 0.75rem; border-radius: 0.75rem; cursor: pointer; font-weight: 700; transition: opacity 0.2s; }
	.btn-primary:disabled { opacity: 0.5; }
</style>
