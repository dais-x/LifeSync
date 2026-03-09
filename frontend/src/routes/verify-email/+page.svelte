<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let email = $page.url.searchParams.get('email') || '';
	let otp = $state(['', '', '', '', '', '']);
	let status = $state('idle'); // idle, loading, success, error
	let errorMessage = $state('');
	let successMessage = $state('');
	let resendTimer = $state(0);

	let inputs = [];

	function handleInput(e, index) {
		const value = e.target.value;
		otp[index] = value.slice(-1);
		
		if (value && index < 5) {
			inputs[index + 1].focus();
		}
	}

	function handleKeydown(e, index) {
		if (e.key === 'Backspace' && !otp[index] && index > 0) {
			inputs[index - 1].focus();
		}
	}

	async function handleVerify() {
		const code = otp.join('');
		if (code.length < 6) return;

		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, otp: code })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Verification failed');
			}

			// Store tokens for automatic login
			localStorage.setItem('accessToken', data.accessToken);
			localStorage.setItem('refreshToken', data.refreshToken);
			localStorage.setItem('user', JSON.stringify(data.user));

			status = 'success';
			setTimeout(() => {
				goto('/signup/details'); // Proceed to details after successful verification
			}, 1500);
		} catch (e) {
			status = 'error';
			errorMessage = e.message;
		}
	}

	async function handleResend() {
		if (resendTimer > 0) return;

		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch('/api/auth/resend-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to resend code');
			}

			successMessage = data.message;
			startResendTimer();
		} catch (e) {
			errorMessage = e.message;
		}
	}

	function startResendTimer() {
		resendTimer = 60;
		const interval = setInterval(() => {
			resendTimer -= 1;
			if (resendTimer <= 0) clearInterval(interval);
		}, 1000);
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
			<h2>Verify Your Account</h2>
			<p>We've sent a 6-digit code to {email || 'your email'}</p>
		</div>

		<div class="status-content">
			{#if status === 'success'}
				<div class="result success">
					<i class="bx bx-check-circle"></i>
					<p>Email verified successfully! Let's complete your profile...</p>
				</div>
			{:else}
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

				<form on:submit|preventDefault={handleVerify} class="otp-form">
					<div class="otp-inputs">
						{#each otp as digit, i}
							<input
								type="text"
								inputmode="numeric"
								maxlength="1"
								bind:this={inputs[i]}
								value={otp[i]}
								on:input={(e) => handleInput(e, i)}
								on:keydown={(e) => handleKeydown(e, i)}
								required
							/>
						{/each}
					</div>

					<button type="submit" class="btn-primary" disabled={status === 'loading' || otp.join('').length < 6}>
						{status === 'loading' ? 'Verifying...' : 'Verify Code'}
					</button>
				</form>

				<div class="resend-section">
					<p>Didn't receive the code?</p>
					<button class="resend-btn" on:click={handleResend} disabled={resendTimer > 0}>
						{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
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

	.fade-in { animation: fadeIn 0.4s ease-out forwards; }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

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
	.accent-icon { font-size: 2.5rem; color: var(--accent-purple); margin-bottom: 1rem; display: inline-block; }
	.card-header h2 { font-size: 1.5rem; color: white; margin: 0; }
	.card-header p { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }

	.banner {
		padding: 0.75rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-align: left;
	}
	.banner.error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); }
	.banner.success { background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-green); color: var(--accent-green); }

	.otp-inputs { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 2rem; }
	.otp-inputs input {
		width: 3.5rem;
		height: 4rem;
		background: #0b0c15;
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		color: white;
		font-size: 1.5rem;
		font-weight: 700;
		text-align: center;
		outline: none;
		transition: border-color 0.2s;
	}
	.otp-inputs input:focus { border-color: var(--accent-purple); }

	.btn-primary {
		width: 100%;
		background: var(--accent-purple);
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.resend-section { margin-top: 2rem; color: var(--text-muted); font-size: 0.875rem; }
	.resend-btn {
		background: none;
		border: none;
		color: var(--accent-purple);
		font-weight: 600;
		cursor: pointer;
		margin-top: 0.5rem;
	}
	.resend-btn:disabled { color: var(--text-muted); cursor: not-allowed; }

	.result i { font-size: 3rem; color: var(--accent-green); margin-bottom: 1rem; display: block; }
</style>
