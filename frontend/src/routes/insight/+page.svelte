<div class="scroll-area fade-in">
	<h2 class="page-title">AI Insights</h2>

	<div class="grid-layout">
		<div class="card">
			<h3>Productivity Score</h3>
			<div class="chart-wrapper">
				<svg class="circular-chart" viewBox="0 0 36 36">
					<path
						class="circle-bg"
						d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
					<path
						class="circle"
						stroke-dasharray="85, 100"
						d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
				</svg>
				<div class="percentage">
					<span>85</span>
					<span class="label">Excellent</span>
				</div>
			</div>
			<p class="insight-text">Top 5% of users this week</p>
		</div>

		<div class="card">
			<h3>Smart Suggestions</h3>
			<div class="suggestion-list">
				<div class="suggestion">
					<i class="bx bx-bulb" style="color: var(--accent-orange)"></i>
					<span>Schedule 15min break at 2 PM.</span>
				</div>
				<div class="suggestion">
					<i class="bx bx-water" style="color: var(--accent-blue)"></i>
					<span>Hydration low. Drink water.</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.page-title {
		color: white;
		margin-bottom: 2rem;
	}
	.grid-layout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}
	.card {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
		border-radius: 1rem;
	}
	h3 {
		color: white;
		margin-top: 0;
		font-size: 1rem;
	}

	.chart-wrapper {
		position: relative;
		width: 150px;
		height: 150px;
		margin: 1rem auto;
	}
	.circular-chart {
		display: block;
		margin: 10px auto;
		max-width: 80%;
		max-height: 250px;
	}
	.circle-bg {
		fill: none;
		stroke: var(--border-color);
		stroke-width: 2.5;
	}
	.circle {
		fill: none;
		stroke: var(--accent-purple);
		stroke-width: 2.5;
		stroke-linecap: round;
		animation: progress 1s ease-out forwards;
	}
	.percentage {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
	}
	.percentage span {
		font-size: 2rem;
		font-weight: bold;
	}
	.percentage .label {
		font-size: 0.8rem;
		color: var(--text-gray);
		font-weight: normal;
	}
	.insight-text {
		text-align: center;
		color: var(--text-gray);
		font-size: 0.8rem;
	}

	.suggestion {
		display: flex;
		align-items: center;
		padding: 0.75rem;
		background: #1e1f2e;
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		margin-bottom: 0.5rem;
		color: var(--text-gray);
		font-size: 0.85rem;
	}
	.suggestion i {
		margin-right: 0.75rem;
		font-size: 1.2rem;
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
			transform: translateY(0);
		}
	}
</style>
