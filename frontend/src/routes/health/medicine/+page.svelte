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
    let isAnalyzing = $state(false); // Added for AI processing state

    // State array for medicines
    let medicines = $state([]);
    let isLoading = $state(true); // Loading state for fetching data

    let newMed = $state({
        nickname: '',
        name: '',
        directions: ['0', '0', '0', '0'],
        expiry: '',
        endDate: '',
        food: 'any',
        currentStock: 0,
        dosageText: '' // Added for AI prompt
    });

    // ==========================================
    // DATA FETCHING (Single Source of Truth)
    // ==========================================
    // Added showSpinner so background syncs don't interrupt the user
    async function loadMedicines(showSpinner = true) {
        if (showSpinner) isLoading = true;
        try {
            const getMedsUrl = 'https://fahim-n8n.laddu.cc/webhook-test/get-meds';
            const response = await fetch(getMedsUrl);

            if (response.ok) {
                medicines = await response.json();
            } else {
                console.error('Failed to fetch medicines');
            }
        } catch (error) {
            console.error('Error loading medicines:', error);
        } finally {
            if (showSpinner) isLoading = false;
        }
    }

    // Fetch the medicines from MongoDB on component mount
    onMount(() => {
        loadMedicines();
    });

    // ==========================================
    // CAMERA & UPLOAD LOGIC
    // ==========================================
    async function startCamera() {
        try {
            const permissions = await Camera.requestPermissions();
            if (permissions.camera !== 'granted') {
                alert('Camera permission denied');
                return;
            }

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
        console.log('Processing captured image... Image held in state for AI processing.');
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
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.src = base64;
        });
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            capturedImage = e.target.result;
            entryMode = 'photo'; 
        };
        reader.readAsDataURL(file);
    }

    // ==========================================
    // UI CONTROLS & API ACTIONS
    // ==========================================
    function closePopup() {
        if (cameraActive) stopCamera();
        showPopup = false;
        entryMode = null;
        capturedImage = null;
        editingMedicine = null;
        newMed = { nickname: '', name: '', directions: ['0', '0', '0', '0'], expiry: '', endDate: '', food: 'any', currentStock: 0, dosageText: '' };
        isAnalyzing = false;
    }

    async function deleteMedicine(med) {
        if (confirm(`Are you sure you want to delete ${med.nickname || med.title}?`)) {
            const medId = med._id || med.id;
            
            if (!medId) {
                alert("This medicine doesn't have a valid database ID. It will be removed locally.");
                medicines = medicines.filter(m => m !== med);
                return;
            }

            // Optimistic UI update - delete instantly from screen
            medicines = medicines.filter(m => (m._id || m.id) !== medId);
            
            // Background sync
            fetch('https://fahim-n8n.laddu.cc/webhook-test/manage-meds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: medId })
            }).catch(e => {
                console.error("Failed to delete medicine from DB", e);
            });
        }
    }

    function openAddPopup() {
        entryMode = null;
        showPopup = true;
    }

    function startEdit(med) {
        editingMedicine = med;
        newMed = { ...med, directions: med.directions ? [...med.directions] : ['0','0','0','0'], dosageText: '' };
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

        if (payload.endDate && payload.currentStock > 0) {
            const today = new Date();
            const end = new Date(payload.endDate);
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const dailyDoses = payload.directions.reduce((a, b) => parseInt(a) + parseInt(b), 0);

            if (dailyDoses > 0) {
                const daysOfStockLeft = payload.currentStock / dailyDoses;
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
        
        // CRITICAL FIX: Deep clone newMed immediately.
        // This permanently detaches it from the Svelte $state proxy, guaranteeing 
        // that when we clear the form later, it doesn't accidentally clear our UI updates.
        const medData = JSON.parse(JSON.stringify(newMed));
        
        const currentMode = entryMode;
        const editId = editingMedicine ? (editingMedicine._id || editingMedicine.id) : null;
        
        isLoading = true; // Show loading state

        try {
            if (currentMode === 'edit') {
                if (!editId) {
                    alert("Cannot edit this medicine. It has no valid database ID.");
                    return;
                }

                // Optimistic UI Update: Instantly change the fields on screen!
                const index = medicines.findIndex(m => (m._id || m.id) === editId);
                if (index !== -1) {
                    medicines[index] = { 
                        ...medicines[index], 
                        ...medData,
                        nickname: medData.nickname || medData.name || "Unnamed",
                        medicine_name: medData.name || "Unknown"
                    };
                }

                // Background sync
                fetch('https://fahim-n8n.laddu.cc/webhook-test/manage-meds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', id: editId, data: medData })
                }).then(res => {
                    if (res.ok) setTimeout(() => loadMedicines(false), 1000);
                });

            } else if (currentMode === 'manual') {
                // Optimistic UI Update: Instantly add to screen using the cloned data!
                const tempId = 'temp-' + Date.now();
                const optimisticMed = {
                    ...medData,
                    _id: tempId,
                    nickname: medData.nickname || medData.name || "Unnamed Med",
                    title: medData.nickname || medData.name || "Unnamed Med",
                    medicine_name: medData.name || "Unknown Medicine"
                };
                medicines = [...medicines, optimisticMed];

                // Background sync
                fetch('https://fahim-n8n.laddu.cc/webhook-test/manage-meds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create', data: medData })
                }).then(res => {
                    // Silently pull fresh data to replace the temporary ID with the real MongoDB _id
                    if (res.ok) setTimeout(() => loadMedicines(false), 1000);
                    else alert(`n8n Create failed: ${res.status}`);
                });
            }

            syncMedicationData(medData);
        } catch (e) {
            console.error("Manage Meds API Error:", e);
            alert(`Network error during manual save: ${e.message}`);
        }

        // Close and wipe the form AFTER everything is safely sent and rendered
        closePopup();
    }

    async function handlePhotoSubmit(event) {
        event.preventDefault();
        isAnalyzing = true;

        try {
            const webhookUrl = 'https://fahim-n8n.laddu.cc/webhook-test/upload-medicine';
            const payload = {
                image: capturedImage,
                dosage: newMed.dosageText
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const aiFormattedData = await response.json();
                
                // Add the AI response instantly
                medicines = [...medicines, aiFormattedData];

                alert("Medicine processed successfully!");
                closePopup();

                // Silently refresh to grab the true MongoDB _id
                setTimeout(() => loadMedicines(false), 1000);
            } else {
                alert(`Failed to send to AI. Status: ${response.status}`);
            }
        } catch (e) {
            console.error("AI Webhook Error:", e);
            alert(`Network Error connecting to AI: ${e.message}`);
        } finally {
            isAnalyzing = false;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch(e) {
            return dateString;
        }
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
        {#if isLoading}
            <div class="loading-state" style="color: var(--text-gray); text-align: center; grid-column: 1 / -1; padding: 2rem;">
                <i class='bx bx-loader-alt bx-spin' style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Syncing with Database...</p>
            </div>
        {:else if medicines.length === 0}
            <div class="empty-state" style="color: var(--text-gray); text-align: center; grid-column: 1 / -1; padding: 2rem;">
                <p>No medicines found. Add one above!</p>
            </div>
        {:else}
            {#each medicines as med}
                <div class="card">
                    <div class="card-top">
                        <h3 class="nickname">{med.nickname || med.title || 'Unnamed Med'}</h3>
                        <div class="card-actions">
                            <button class="icon-btn edit-btn" on:click={() => startEdit(med)} title="Edit"><i class='bx bx-pencil'></i></button>
                            <button class="icon-btn delete-btn" on:click={() => deleteMedicine(med)} title="Delete"><i class='bx bx-trash'></i></button>
                        </div>
                    </div>
                    
                    <div class="card-middle">
                        <div class="official-name">{med.name || med.medicine_name || 'Unknown Official Name'}</div>
                        
                        <div class="badges">
                            {#if med.expiry}
                                <span class="badge expiry-badge"><i class='bx bx-calendar-x'></i> Exp: {formatDate(med.expiry)}</span>
                            {/if}
                            {#if med.endDate}
                                <span class="badge end-badge"><i class='bx bx-stop-circle'></i> End: {formatDate(med.endDate)}</span>
                            {/if}
                        </div>
                    </div>

                    <div class="card-bottom">
                        <div class="dosage-info">
                            <div class="dosage-pill"><i class='bx bx-time-five'></i> {(med.directions || ['0','0','0','0']).join('-')}</div>
                            <div class="dosage-pill"><i class='bx bx-restaurant'></i> {med.food || 'any'}</div>
                        </div>
                        
                        <div class="stock-info" class:low-stock={(med.currentStock || 0) < 5}>
                            <i class='bx bx-package'></i> {med.currentStock || 0} left
                            {#if (med.currentStock || 0) < 5 && med.currentStock !== undefined}
                                <span class="warning-dot">Low</span>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
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
                    <div class="choice-buttons" style="flex-wrap: wrap;">
                        <button class="choice-btn" on:click={() => setEntryMode('manual')}>
                            <i class="bx bx-edit-alt"></i> Manual
                        </button>
                        <button class="choice-btn" on:click={() => setEntryMode('photo')}>
                            <i class="bx bx-camera"></i> Camera
                        </button>
                        <button class="choice-btn" style="background: var(--accent-purple);" on:click={() => document.getElementById('med-file-upload').click()}>
                            <i class="bx bx-upload"></i> Upload
                        </button>
                    </div>
                    <input type="file" id="med-file-upload" accept="image/*" style="display: none;" on:change={handleFileUpload}>
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
                        <form class="photo-form" on:submit={handlePhotoSubmit}>
                            <img src={capturedImage} alt="Captured medicine" class="captured-image">
                            <div class="form-group">
                                <label for="photo-dosage">Dosage Instructions (Tell the AI)</label>
                                <textarea id="photo-dosage" rows="3" placeholder="e.g., Take 1 pill every morning after food. I have 30 pills left." bind:value={newMed.dosageText} required></textarea>
                            </div>
                            <button type="submit" class="save-btn ai-btn" disabled={isAnalyzing}>
                                {#if isAnalyzing}
                                    <i class='bx bx-loader-alt bx-spin'></i> AI Analyzing...
                                {:else}
                                    <i class='bx bx-brain'></i> Analyze & Save
                                {/if}
                            </button>
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
    
    /* --- NEW SPACIOUS CARD UI --- */
    .card {
        background: #1e1e2e;
        border: 1px solid #2d2d3f;
        padding: 1.5rem;
        border-radius: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.15);
    }
    .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }
    .nickname {
        color: white;
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0;
        line-height: 1.3;
        letter-spacing: -0.01em;
    }
    .card-actions {
        display: flex;
        gap: 0.4rem;
        flex-shrink: 0;
    }
    .icon-btn {
        background: #2a2a3c;
        border: none;
        color: #94a3b8;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .icon-btn:hover {
        background: #3b3b54;
        color: white;
    }
    .delete-btn:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
    }
    .card-middle {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }
    .official-name {
        color: #cbd5e1;
        font-size: 0.95rem;
        font-weight: 500;
    }
    .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
    }
    .badge {
        font-size: 0.75rem;
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .expiry-badge {
        background: rgba(245, 158, 11, 0.1);
        color: #fcd34d;
        border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .end-badge {
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-top: 1rem;
        border-top: 1px solid #2d2d3f;
        margin-top: 0.5rem;
    }
    .dosage-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .dosage-pill {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #94a3b8;
        font-size: 0.9rem;
        font-weight: 500;
    }
    .stock-info {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: #2a2a3c;
        padding: 0.5rem 0.8rem;
        border-radius: 8px;
        color: white;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .stock-info.low-stock {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }
    .warning-dot {
        background: #ef4444;
        color: white;
        font-size: 0.65rem;
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        text-transform: uppercase;
        margin-left: 0.2rem;
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
        font-family: inherit;
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
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
    }
    .save-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
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
