<script>
	import { Camera, CameraResultType } from '@capacitor/camera';
	import { CameraPreview } from '@capacitor-community/camera-preview';
    import { userFormData } from '$lib/stores';
	import { onMount, onDestroy } from 'svelte';

	let showPopup = $state(false);
	let entryMode = $state(null); // null, 'manual', 'photo', 'edit'
	let capturedImage = $state(null);
	let editingMedicine = $state(null);
	let cameraActive = $state(false);

	let newMed = $state({
		nickname: '',
		name: '',
		directions: ['0', '0', '0', '0'],
		expiry: '',
		endDate: '',
		food: 'any',
        currentStock: 0
	});

	async function startCamera() {
		try {
			const permissions = await Camera.requestPermissions();
			if (permissions.camera !== 'granted') {
				alert('Camera permission denied');
				return;
			}

			// Full screen dimensions
			const width = window.innerWidth;
			const height = window.innerHeight;

			document.documentElement.classList.add('camera-mode');
			document.body.classList.add('camera-mode');

			const cameraPreviewOptions = {
				position: 'rear',
				x: 0,
				y: 0,
				width: width,
				height: height,
				toBack: true,
				storeToFile: false,
				disableExifHeaderRestore: true,
				className: 'camera-active'
			};

			try {
				await CameraPreview.start(cameraPreviewOptions);
				cameraActive = true;
			} catch (e) {
				console.error('Error starting camera preview', e);
				stopCamera();
			}
		} catch (err) {
			console.error('Permission check failed', err);
		}
	}

	async function stopCamera() {
		if (cameraActive) {
			try {
				await CameraPreview.stop();
			} catch (e) {
				console.error('Error stopping camera', e);
			}
			cameraActive = false;
			document.documentElement.classList.remove('camera-mode');
			document.body.classList.remove('camera-mode');
		}
	}

	async function processCapturedImage(base64Data) {
		console.log('Processing captured image...');
		
		// Placeholder for sending the image somewhere (e.g., an API or AI service)
		// For now, it's just a placeholder as requested.
		const destinationUrl = null; 
		
		if (destinationUrl) {
			try {
				// Example of how you might send it later:
				// await fetch(destinationUrl, { method: 'POST', body: JSON.stringify({ image: base64Data }) });
			} catch (e) {
				console.error('Failed to send image:', e);
			}
		}

		// Placeholder for saving the image locally
		// If you install @capacitor/filesystem, you can save it to the device here.
		console.log('Image saved to local state (capturedImage)');
	}

	async function takePicture() {
		try {
			const result = await CameraPreview.capture({ quality: 90 });
			const rawImage = `data:image/jpeg;base64,${result.value}`;
			
			const scanBox = document.getElementById('medicine-scan-box');
			if (scanBox) {
				const rect = scanBox.getBoundingClientRect();
				capturedImage = await cropToBox(rawImage, rect);
			} else {
				capturedImage = rawImage;
			}
			
			// Process and "send" the image
			await processCapturedImage(capturedImage);
			
			await stopCamera();
		} catch (error) {
			console.error('Error taking picture', error);
		}
	}

	function cropToBox(base64, rect) {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				
				// Calculate scale between screen and actual image
				const scaleX = img.width / window.innerWidth;
				const scaleY = img.height / window.innerHeight;
				
				canvas.width = rect.width * scaleX;
				canvas.height = rect.height * scaleY;
				
				ctx.drawImage(
					img,
					rect.left * scaleX,
					rect.top * scaleY,
					rect.width * scaleX,
					rect.height * scaleY,
					0, 0,
					canvas.width,
					canvas.height
				);
				resolve(canvas.toDataURL('image/jpeg', 0.9));
			};
			img.src = base64;
		});
	}

	function cropImage(base64) {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				
				// In this case, since we constrained the preview to the box,
				// the capture might already be close, but we ensure it's exact.
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
				resolve(canvas.toDataURL('image/jpeg'));
			};
			img.src = base64;
		});
	}

	function closePopup() {
		if (cameraActive) stopCamera();
		showPopup = false;
		entryMode = null;
		capturedImage = null;
		editingMedicine = null;
		newMed = { nickname: '', name: '', directions: ['0', '0', '0', '0'], expiry: '', endDate: '', food: 'any', currentStock: 0 };
	}

	function deleteMedicine(med) {
		if (confirm(`Are you sure you want to delete ${med.nickname}?`)) {
			medicines = medicines.filter(m => m !== med);
		}
	}

	function openAddPopup() {
		entryMode = null;
		showPopup = true;
	}

	function startEdit(med) {
		editingMedicine = med;
		newMed = { ...med, directions: [...med.directions] };
		entryMode = 'edit';
		showPopup = true;
	}

	function setEntryMode(mode) {
		entryMode = mode;
		if (mode === 'photo') {
			setTimeout(startCamera, 100);
		} else {
			stopCamera();
		}
	}

	onDestroy(() => {
		stopCamera();
	});

    async function syncMedicationData(payload) {
        if (!$userFormData.health_sync_url || $userFormData.health_sync_url.includes('your-n8n-webhook-url')) {
            console.warn('Health sync URL not configured.');
            return;
        }

        // Check if restock is needed based on end date
        if (payload.endDate && payload.currentStock > 0) {
            const today = new Date();
            const end = new Date(payload.endDate);
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Total doses per day
            const dailyDoses = payload.directions.reduce((a, b) => parseInt(a) + parseInt(b), 0);
            
            if (dailyDoses > 0) {
                const daysOfStockLeft = payload.currentStock / dailyDoses;
                
                // If stock runs out before the end date, and we are within 3 tablets of running out
                if (daysOfStockLeft < diffDays && payload.currentStock <= 3) {
                    alert(`Restock Alert: ${payload.nickname} will run out in ${Math.floor(daysOfStockLeft)} days, but your course ends on ${payload.endDate}. Please restock!`);
                }
            }
        }

        try {
            const response = await fetch($userFormData.health_sync_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'medication',
                    timestamp: new Date().toISOString(),
                    data: payload
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.lowStock) {
                    alert(`Alert: ${payload.nickname} (${payload.name}) is low on stock! Only ${payload.currentStock} left.`);
                }
                return result;
            }
        } catch (error) {
            console.error('Error syncing medication data:', error);
        }
    }

	async function handleSubmit(event) {
		event.preventDefault();
        const medData = { ...newMed };
        
		if (entryMode === 'edit') {
			const index = medicines.findIndex(m => m === editingMedicine);
			if (index !== -1) {
				medicines[index] = medData;
			}
		} else if (entryMode === 'manual') {
			medicines = [...medicines, medData];
		}
        
        // Sync to backend
        syncMedicationData(medData);
        
		closePopup();
	}

	let medicines = $state([
		{
			nickname: 'Happy Pill',
			name: 'Sertraline',
			expiry: '2025-12-31',
			endDate: '2025-06-01',
			directions: ['1', '0', '0', '0'],
			food: 'after',
            currentStock: 12
		},
		{
			nickname: 'Allergy Fix',
			name: 'Cetirizine',
			expiry: '2024-08-15',
			endDate: '2024-04-15',
			directions: ['0', '0', '1', '0'],
			food: 'before',
            currentStock: 28
		},
		{
			nickname: 'Pain Away',
			name: 'Ibuprofen',
			expiry: '2026-01-20',
			endDate: '2026-01-30',
			directions: ['1', '1', '1', '1'],
			food: 'after',
            currentStock: 4
		}
	]);
    // Helper to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
</script>

<div class="scroll-area fade-in">
	<div class="page-header">
		<h2 class="page-title">Medication</h2>
		<button class="add-btn" on:click={openAddPopup}>
			<i class="bx bx-plus"></i> Add Medicine
		</button>
	</div>

	<div class="grid-layout">
		{#each medicines as med}
			<div class="card">
				<div class="card-header">
					<h3 class="nickname">{med.nickname}</h3>
					<div class="card-actions">
						<div class="date-info">
                            <span class="expiry">Exp: {formatDate(med.expiry)}</span>
                            {#if med.endDate}<span class="end-date">End: {formatDate(med.endDate)}</span>{/if}
                        </div>
						<button class="edit-btn" on:click={() => startEdit(med)}><i class='bx bx-pencil'></i></button>
                        <button class="delete-btn" on:click={() => deleteMedicine(med)}><i class='bx bx-trash'></i></button>
					</div>
				</div>
				<div class="card-body">
					<div class="name">{med.name}</div>
					<p class="description">{med.directions.join('-')} - {med.food}</p>
                    <div class="stock-info" class:low-stock={med.currentStock < 5}>
                        <i class='bx bx-package'></i> Stock: {med.currentStock} units
                        {#if med.currentStock < 5}
                            <span class="warning-tag">Low Stock</span>
                        {/if}
                    </div>
				</div>
			</div>
		{/each}
	</div>
</div>

{#if showPopup}
	<div class="popup-backdrop" on:click={closePopup}>
		<div class="popup" on:click|stopPropagation>
			<div class="popup-header">
				{#if entryMode === 'manual' || entryMode === 'photo' || entryMode === 'edit'}
					<button class="back-btn" on:click={() => {
						if (entryMode === 'edit') {
							closePopup();
						} else {
							setEntryMode(null)
						}
					}}><i class="bx bx-arrow-back"></i></button>
				{/if}
				
				{#if entryMode === 'edit'}
					<h3>Edit Medicine</h3>
				{:else if entryMode === 'manual'}
					<h3>Manual Entry</h3>
				{:else if entryMode === 'photo'}
					<h3>Photo Entry</h3>
				{:else}
					<h3>Add a New Medicine</h3>
				{/if}
				<button class="close-btn" on:click={closePopup}><i class="bx bx-x"></i></button>
			</div>

			<div class="popup-body">
				{#if entryMode === null}
					<p>How would you like to add your medicine?</p>
					<div class="choice-buttons">
						<button class="choice-btn" on:click={() => setEntryMode('manual')}>
							<i class="bx bx-edit-alt"></i> Manual Entry
						</button>
						<button class="choice-btn" on:click={() => setEntryMode('photo')}>
							<i class="bx bx-camera"></i> Photo-Driven
						</button>
					</div>
				{:else if entryMode === 'manual' || entryMode === 'edit'}
					<form class="manual-form" on:submit={handleSubmit}>
						<div class="form-group">
							<label for="nickname">Nickname</label>
							<input type="text" id="nickname" placeholder="e.g., Happy Pill" bind:value={newMed.nickname}>
						</div>
						<div class="form-group">
							<label for="name">Official Name</label>
							<input type="text" id="name" placeholder="e.g., Sertraline" bind:value={newMed.name}>
						</div>
						<div class="form-group">
							<label>Directions</label>
							<div class="directions-grid">
								<input type="number" placeholder="Morn" min="0" bind:value={newMed.directions[0]}>
								<input type="number" placeholder="Noon" min="0" bind:value={newMed.directions[1]}>
								<input type="number" placeholder="Eve" min="0" bind:value={newMed.directions[2]}>
								<input type="number" placeholder="Night" min="0" bind:value={newMed.directions[3]}>
							</div>
						</div>
						<div class="form-group">
							<label for="expiry">Expiry Date</label>
							<input type="date" id="expiry" bind:value={newMed.expiry}>
						</div>
                        <div class="form-group">
							<label for="endDate">Course End Date (Optional)</label>
							<input type="date" id="endDate" bind:value={newMed.endDate}>
						</div>
						<div class="form-group">
							<label for="food">Timing</label>
							<select id="food" bind:value={newMed.food}>
								<option value="before">Before Food</option>
								<option value="after">After Food</option>
								<option value="any">Any Time</option>
							</select>
						</div>
                        <div class="form-group">
							<label for="stock">Current Stock (units)</label>
							<input type="number" id="stock" min="0" bind:value={newMed.currentStock}>
						</div>
						<button type="submit" class="save-btn">{entryMode === 'edit' ? 'Save Changes' : 'Save Medicine'}</button>
					</form>
				{:else if entryMode === 'photo'}
					{#if !capturedImage}
						<div class="camera-container" class:full-screen={cameraActive}>
							<div class="camera-overlay">
								<div class="scan-box" id="medicine-scan-box">
                                    <div class="corner tl"></div>
                                    <div class="corner tr"></div>
                                    <div class="corner bl"></div>
                                    <div class="corner br"></div>
                                </div>
								<p class="scan-text">Position the medicine label inside the box</p>
                                <div class="camera-controls">
                                    <button class="cancel-btn" on:click={() => setEntryMode(null)}>Cancel</button>
                                    <button class="capture-btn" on:click={takePicture}>
                                        <div class="inner-circle"></div>
                                    </button>
                                    <div class="placeholder"></div>
                                </div>
							</div>
						</div>
					{:else}
						<form class="photo-form">
							<img src={capturedImage} alt="Captured medicine" class="captured-image">
							<div class="form-group">
								<label for="photo-nickname">Nickname</label>
								<input type="text" id="photo-nickname" placeholder="e.g., Happy Pill">
							</div>
							<div class="form-group">
								<label>Directions</label>
								<div class="directions-grid">
									<input type="number" placeholder="Morn" min="0">
									<input type="number" placeholder="Noon" min="0">
									<input type="number" placeholder="Eve" min="0">
									<input type="number" placeholder="Night" min="0">
								</div>
							</div>
							<div class="form-group">
								<label for="photo-food">Timing</label>
								<select id="photo-food">
									<option value="before">Before Food</option>
									<option value="after">After Food</option>
									<option value="any">Any Time</option>
								</select>
							</div>
							<button type="submit" class="save-btn">Save Medicine</button>
						</form>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    .page-title {
        color: white;
        margin: 0;
    }
    .add-btn {
        background: var(--accent-purple);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        transition: background 0.2s;
    }
    .add-btn:hover {
        background: #a855f7;
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
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .nickname {
        color: white;
        font-size: 1.2rem;
        font-weight: 600;
        margin: 0;
    }
	.card-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
    .expiry, .end-date {
        font-size: 0.75rem;
        color: var(--text-gray);
        display: block;
    }
    .date-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
	.edit-btn, .delete-btn {
		background: none;
		border: none;
		color: var(--text-gray);
		font-size: 1.2rem;
		cursor: pointer;
        padding: 0.2rem;
        transition: color 0.2s;
	}
    .delete-btn:hover {
        color: var(--accent-red);
    }
    .edit-btn:hover {
        color: var(--accent-blue);
    }
    .name {
        font-weight: 500;
        color: #ddd;
        margin-bottom: 0.5rem;
    }
    .description {
        color: var(--text-gray);
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 0.5rem;
    }
    .stock-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-gray);
    }
    .stock-info.low-stock {
        color: var(--accent-red);
    }
    .warning-tag {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-red);
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
    }

    /* Popup Styles */
    .popup-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
    }
    .popup {
        background: var(--card-bg);
        border-radius: 1rem;
        padding: 2rem;
        width: 90%;
        max-width: 500px;
        border: 1px solid var(--border-color);
    }
    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        position: relative;
    }
    .popup-header h3 {
        margin: 0;
        color: white;
        text-align: center;
        flex-grow: 1;
    }
    .close-btn, .back-btn {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        position: absolute;
    }
    .close-btn { right: -1rem; top:-1rem }
    .back-btn { left: -1rem; top:-1rem }

    .popup-body p {
        color: var(--text-gray);
        text-align: center;
        margin-bottom: 2rem;
    }
    .choice-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    .choice-btn {
        background: var(--accent-blue);
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1rem;
        font-weight: 500;
        transition: background 0.2s;
    }
    .choice-btn:last-child {
        background: var(--accent-green);
    }
    .choice-btn:hover {
        filter: brightness(1.2);
    }

    /* Manual Form Styles */
    .manual-form, .photo-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .form-group {
        display: flex;
        flex-direction: column;
    }
    .form-group label {
        color: var(--text-gray);
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    .form-group input, .form-group textarea, .form-group select {
        background: #1E1F2E;
        border: 1px solid var(--border-color);
        color: white;
        padding: 0.75rem;
        border-radius: 0.5rem;
    }
    .directions-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.5rem;
    }
    .directions-grid input {
        text-align: center;
    }
    .save-btn {
        background: var(--accent-purple);
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        margin-top: 1rem;
    }
    
    /* Global styles for camera transparency */
    :global(html.camera-mode),
    :global(body.camera-mode),
    :global(.camera-mode .app-container),
    :global(.camera-mode .main-content),
    :global(.camera-mode .scroll-area),
    :global(.camera-mode .popup-backdrop),
    :global(.camera-mode .popup),
    :global(.camera-mode .popup-body),
    :global(.camera-mode .camera-container) {
        background: transparent !important;
        background-color: transparent !important;
    }

    /* Hide background elements during camera mode */
    :global(.camera-mode .sidebar),
    :global(.camera-mode .mobile-nav),
    :global(.camera-mode .scroll-area .page-header),
    :global(.camera-mode .scroll-area .grid-layout),
    :global(.camera-mode .popup-header),
    :global(.camera-mode .popup-body > p),
    :global(.camera-mode .popup-body > .choice-buttons) {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }

    /* Ensure the camera container and overlay are visible */
    :global(.camera-mode .camera-container),
    :global(.camera-mode .camera-overlay) {
        visibility: visible !important;
        opacity: 1 !important;
    }

    /* Camera Styles */
    .camera-container {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        background: #000;
        border-radius: 0.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }

    .camera-container.full-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        aspect-ratio: auto;
        border-radius: 0;
        background: transparent;
    }

    .camera-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.4); /* Dimmed area */
        z-index: 5;
    }

    .scan-box {
        width: 80%;
        height: 40%;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 0.5rem;
        background: transparent;
        position: relative;
        box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5); /* Creates the transparent window effect */
    }

    /* Scan Box Corners */
    .corner {
        position: absolute;
        width: 20px;
        height: 20px;
        border-color: var(--accent-purple);
        border-style: solid;
    }
    .tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 8px; }
    .tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 8px; }
    .bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 8px; }
    .br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 8px; }

    .scan-text {
        color: white;
        margin-top: 2rem;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        font-weight: 500;
    }

    .camera-controls {
        position: absolute;
        bottom: 2rem;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 0 2rem;
    }

    .capture-btn {
        background: rgba(255, 255, 255, 0.3);
        border: 4px solid white;
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
        transition: transform 0.1s;
    }

    .capture-btn:active {
        transform: scale(0.9);
    }

    .inner-circle {
        width: 3.8rem;
        height: 3.8rem;
        background: white;
        border-radius: 50%;
    }

    .cancel-btn {
        background: none;
        border: none;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }
    
    .placeholder { width: 4rem; }
    .captured-image {
        width: 100%;
        max-height: 200px;
        object-fit: cover;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }

    .fade-in {
        animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
