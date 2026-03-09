<script>
	import { goto } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let errorMessage = '';
	let successMessage = '';
	let loading = false;

	async function handleSignup() {
		errorMessage = '';
		successMessage = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Registration failed');
			}

			successMessage = data.message;
			// After a delay, we can either redirect to login or details
			// Given the flow, maybe we want them to fill details even if not verified?
			// But usually, verification is first.
			// Let's go to details after 2 seconds if we want to follow the UI flow
			setTimeout(() => {
				goto('/signup/details');
			}, 2000);
		} catch (e) {
			errorMessage = e.message;
		} finally {
			loading = false;
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
	<a href="/" class="back-btn">
		<i class="bx bx-arrow-back"></i>
	</a>

	<div class="card">
		<div class="card-header">
			<i class="bx bxs-bolt accent-icon"></i>
			<h2>Create Account</h2>
			<p>Start syncing your life with your energy.</p>
		</div>

		{#if errorMessage}
			<div class="banner error">
				<i class="bx bx-error-circle"></i>
				{errorMessage}
			</div>
		{/if}

		{#if successMessage}
			<div class="banner success">
				<i class="bx bx-check-circle"></i>
				{successMessage}
			</div>
		{/if}

		<form on:submit|preventDefault={handleSignup} class="form-stack">
			<div class="input-group">
				<label for="name">Full Name</label>
				<input type="text" id="name" bind:value={name} placeholder="John Doe" required />
			</div>

			<div class="input-group">
				<label for="email">Email Address</label>
				<input type="email" id="email" bind:value={email} placeholder="john@example.com" required />
			</div>

			<div class="input-group">
				<label for="password">Password</label>
				<input type="password" id="password" bind:value={password} placeholder="••••••••" required />
			</div>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Creating Account...' : 'Get Started Free'}
			</button>
		</form>

		<div class="card-footer">
			<p>Already have an account? <a href="/login">Log In</a></p>
		</div>
	</div>
</div>

<style>
	/* --- CSS VARIABLES --- */
	:root {
		--bg-dark: #0b0c15;
		--card-bg: #151621;
		--input-bg: #0b0c15;
		--border-color: #2a2b3d;
		--text-main: #e2e8f0;
		--text-muted: #9ca3af;
		--accent-purple: #6366f1;
		--hover-purple: #4f46e5;
		--accent-red: #ef4444;
		--accent-green: #10b981;
	}

	/* --- LAYOUT --- */
	.page-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-dark);
		font-family: 'Inter', sans-serif;
		color: var(--text-main);
		position: relative;
	}

	.fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
		}
	}

	.back-btn {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		font-size: 1.5rem;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.2s;
	}
	.back-btn:hover {
		color: white;
	}

	/* --- CARD --- */
	.card {
		width: 100%;
		max-width: 28rem;
		background-color: var(--card-bg);
		padding: 2.5rem;
		border-radius: 1rem;
		border: 1px solid var(--border-color);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		margin: 1rem;
	}

	.card-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	.accent-icon {
		font-size: 2.5rem;
		color: var(--accent-purple);
		margin-bottom: 1rem;
		display: inline-block;
	}
	.card-header h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: white;
	}
	.card-header p {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-top: 0.5rem;
	}

	.banner {
		padding: 0.75rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid transparent;
	}
	.banner.error {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: var(--accent-red);
		color: var(--accent-red);
	}
	.banner.success {
		background-color: rgba(16, 185, 129, 0.1);
		border-color: var(--accent-green);
		color: var(--accent-green);
	}

	/* --- FORM --- */
	.form-stack {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.input-group label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}
	.input-group input {
		width: 100%;
		box-sizing: border-box;
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		color: white;
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}
	.input-group input:focus {
		border-color: var(--accent-purple);
	}

	.btn-primary {
		width: 100%;
		background-color: var(--accent-purple);
		color: white;
		font-weight: 700;
		padding: 0.75rem;
		border-radius: 0.75rem;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
		box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2);
	}
	.btn-primary:hover:not(:disabled) {
		background-color: var(--hover-purple);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* --- FOOTER --- */
	.card-footer {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.card-footer a {
		color: var(--accent-purple);
		text-decoration: none;
		font-weight: 500;
	}
	.card-footer a:hover {
		color: white;
	}
</style>

