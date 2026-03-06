<script>
    import { onMount } from 'svelte';

    let showPopup = $state(false);
    let isUploading = $state(false);
    let selectedFile = $state(null);
    let studyTitle = $state('');

    // State array for processed study materials/insights
    let studyItems = $state([]);
    let isLoading = $state(true);

    // Edit functionality state
    let showEditPopup = $state(false);
    let editingItem = $state(null);
    let editTitle = $state('');

    // --- ANKI FLASHCARD STATE ---
    let activeTopic = $state(null);
    let currentView = $state('list'); // 'list' or 'flashcard'
    let dueCards = $state([]);
    let currentCardIndex = $state(0);
    let isFlipped = $state(false);

    // --- RESET PROGRESS STATE ---
    let isPressingReset = $state(false);
    let resetProgress = $state(0);
    let resetTimer = null;
    let showResetConfirmPopup = $state(false);

    // ==========================================
    // DATA FETCHING
    // ==========================================
    async function loadStudyMaterials(showSpinner = true) {
        if (showSpinner) isLoading = true;
        try {
            const getStudyUrl = 'https://fahim-n8n.laddu.cc/webhook/get-study';
            const response = await fetch(getStudyUrl);

            if (response.ok) {
                const data = await response.json();
                studyItems = Array.isArray(data) ? data : (data.data || []);
            } else {
                console.error('Failed to fetch study materials');
            }
        } catch (error) {
            console.error('Error loading study materials:', error);
            studyItems = [];
        } finally {
            if (showSpinner) isLoading = false;
        }
    }

    onMount(() => {
        loadStudyMaterials();
    });

    // ==========================================
    // ANKI SPACED REPETITION ENGINE
    // ==========================================
    function openTopic(item) {
        if (item.status === 'processing') {
            alert("AI is still analyzing this document. Please check back in a minute!");
            return;
        }
        activeTopic = item;
        calculateDueCards();
        currentView = 'list'; 
    }

    function closeTopic() {
        activeTopic = null;
        currentView = 'list';
    }

    function calculateDueCards() {
        const now = new Date();
        dueCards = activeTopic.insights.filter(card => {
            if (!card.nextReview) return true; // Brand new card
            return new Date(card.nextReview) <= now; // Past due card
        });
    }

    function startStudySession() {
        if (dueCards.length === 0) {
            alert("You are all caught up! 🧠\n\nNo cards are due for review right now. To cram or view your notes without messing up the spaced repetition algorithm, use the 'All Cards' list view!");
            return;
        }
        currentCardIndex = 0;
        isFlipped = false;
        currentView = 'flashcard';
    }

    function flipCard() {
        isFlipped = true;
    }

    function calculateNextState(card, quality) {
        let rep = card.repetition || 0;
        let int = card.interval || 0;
        let ef = card.efactor || 2.5;

        if (quality === 0) { // Again
            rep = 0; int = 0; ef = Math.max(1.3, ef - 0.2);
        } else if (quality === 1) { // Hard
            ef = Math.max(1.3, ef - 0.15); int = int === 0 ? 1 : int * 1.2; rep = 1;
        } else if (quality === 2) { // Good
            int = rep === 0 ? 1 : rep === 1 ? 6 : int * ef; rep += 1;
        } else if (quality === 3) { // Easy
            ef += 0.15; int = rep === 0 ? 4 : int * ef * 1.3; rep += 1;
        }
        return { repetition: rep, interval: Math.round(int), efactor: ef };
    }

    function getIntervalLabel(card, quality) {
        const nextState = calculateNextState(card, quality);
        const int = nextState.interval;
        if (int === 0) return "< 10m";
        if (int === 1) return "1d";
        if (int < 30) return int + "d";
        if (int < 365) return Math.round(int / 30) + "mo";
        return Math.round(int / 365) + "y";
    }

    async function rateCard(quality) {
        let card = dueCards[currentCardIndex];
        const nextState = calculateNextState(card, quality);
        
        card.repetition = nextState.repetition;
        card.interval = nextState.interval;
        card.efactor = nextState.efactor;

        let nextReviewTime = new Date();
        if (card.interval > 0) {
            nextReviewTime.setDate(nextReviewTime.getDate() + card.interval);
        } else {
            nextReviewTime.setMinutes(nextReviewTime.getMinutes() + 10); // review shortly
        }
        card.nextReview = nextReviewTime.toISOString();

        // Update the main deck
        const insightIndex = activeTopic.insights.findIndex(i => i.title === card.title);
        if (insightIndex !== -1) {
            activeTopic.insights[insightIndex] = card;
        }

        // Background Sync to n8n
        syncProgressToDB();

        if (quality === 0) {
            dueCards.push({...card});
        }

        currentCardIndex++;
        isFlipped = false;
    }

    async function syncProgressToDB() {
        const id = activeTopic._id || activeTopic.id;
        try {
            fetch('https://fahim-n8n.laddu.cc/webhook/manage-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync_progress', id: id, insights: activeTopic.insights })
            });
        } catch (e) {
            console.error("Failed to sync progress", e);
        }
    }

    // ==========================================
    // LONG PRESS RESET LOGIC
    // ==========================================
    function startResetPress(e) {
        // Prevent default context menu on right click / long press
        if(e.type === 'contextmenu') { e.preventDefault(); return; }
        
        isPressingReset = true;
        resetProgress = 0;
        let startTime = Date.now();
        const duration = 1500; // 1.5 seconds hold time

        function updateProgress() {
            if (!isPressingReset) return;
            const elapsed = Date.now() - startTime;
            resetProgress = Math.min((elapsed / duration) * 100, 100);

            if (resetProgress >= 100) {
                isPressingReset = false;
                showResetConfirmPopup = true; // Trigger Modal
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(50); // Haptic feedback
                }
            } else {
                resetTimer = requestAnimationFrame(updateProgress);
            }
        }
        resetTimer = requestAnimationFrame(updateProgress);
    }

    function stopResetPress() {
        isPressingReset = false;
        resetProgress = 0;
        if (resetTimer) cancelAnimationFrame(resetTimer);
    }

    function confirmResetDeck() {
        // Strip out all SRS metadata from every card
        activeTopic.insights = activeTopic.insights.map(card => {
            const { repetition, interval, efactor, nextReview, ...rest } = card;
            return rest; // Return card without memory data
        });

        // Recalculate due cards (they will all be due now)
        calculateDueCards();
        
        // Sync the wiped deck to DB
        syncProgressToDB();

        showResetConfirmPopup = false;
        currentView = 'list';
    }


    // ==========================================
    // EDIT & DELETE LOGIC
    // ==========================================
    function startEdit(item) {
        editingItem = item;
        editTitle = item.title;
        showEditPopup = true;
    }

    async function handleEditSubmit() {
        if (!editTitle) return;
        const id = editingItem._id || editingItem.id;
        
        const index = studyItems.findIndex(i => (i._id || i.id) === id);
        if (index !== -1) studyItems[index].title = editTitle;
        
        showEditPopup = false;

        try {
            await fetch('https://fahim-n8n.laddu.cc/webhook/manage-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', id: id, title: editTitle })
            });
        } catch (e) {
            console.error("Rename failed", e);
        }
    }

    async function deleteTopic(item) {
        if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
        
        const id = item._id || item.id;
        studyItems = studyItems.filter(i => (i._id || i.id) !== id);

        try {
            await fetch('https://fahim-n8n.laddu.cc/webhook/manage-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: id })
            });
        } catch (e) {
            console.error("Delete failed", e);
        }
    }

    // ==========================================
    // UPLOAD LOGIC
    // ==========================================
    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            selectedFile = file;
            if (!studyTitle) {
                studyTitle = file.name.replace(/\.pdf$/i, '');
            }
        } else {
            alert("Please select a valid PDF file.");
            event.target.value = '';
        }
    }

    function removeFile() {
        selectedFile = null;
        studyTitle = '';
    }

    function closePopup() {
        showPopup = false;
        selectedFile = null;
        studyTitle = '';
        isUploading = false;
    }

    async function handleUpload(event) {
        event.preventDefault();

        if (!selectedFile) {
            alert("Please select a PDF file to upload.");
            return;
        }

        isUploading = true;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result;

                const payload = {
                    title: studyTitle || selectedFile.name,
                    fileName: selectedFile.name,
                    fileData: base64Data,
                    timestamp: new Date().toISOString()
                };

                const webhookUrl = 'https://fahim-n8n.laddu.cc/webhook/upload-study';

                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if(res.ok) {
                        setTimeout(() => loadStudyMaterials(false), 5000);
                    }
                }).catch(e => console.error("Background upload error", e));

                alert("PDF Uploaded successfully! AI is analyzing it in the background.");
                const optimisticItem = {
                    _id: 'temp-' + Date.now(),
                    title: payload.title,
                    status: 'processing',
                    type: 'document',
                    tips_count: 0,
                    quiz_count: 0,
                    insights: []
                };
                studyItems = [optimisticItem, ...studyItems];

                closePopup();
            };

            reader.onerror = () => {
                alert("Error reading file.");
                isUploading = false;
            };

            reader.readAsDataURL(selectedFile);

        } catch (error) {
            console.error("Upload error:", error);
            alert(`Network error during upload: ${error.message}`);
            isUploading = false;
        }
    }

    function getInsightIcon(type) {
        switch(type) {
            case 'tip': return 'bx-bulb';
            case 'did_you_know': return 'bx-info-circle';
            case 'point': return 'bx-star';
            default: return 'bx-check-circle';
        }
    }
</script>

<div class="scroll-area fade-in">

    {#if !activeTopic}
        <!-- ================= MAIN DASHBOARD VIEW ================= -->
        <div class="page-header">
            <div class="header-titles">
                <h2 class="page-title">Study Hub</h2>
                <p class="subtitle">AI-Powered Insights & Flashcards</p>
            </div>
            <button class="add-btn" on:click={() => showPopup = true}>
                <i class="bx bx-upload"></i> Upload PDF
            </button>
        </div>

        <div class="grid-layout">
            {#if isLoading}
                <div class="loading-state">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <p>Loading your study materials...</p>
                </div>
            {:else if studyItems.length === 0}
                <div class="empty-state">
                    <div class="empty-icon"><i class='bx bx-book-reader'></i></div>
                    <h3>No study materials yet</h3>
                    <p>Upload a PDF syllabus or notes, and AI will extract periodic tips, important points, and quizzes for you.</p>
                    <button class="empty-add-btn" on:click={() => showPopup = true}>Upload your first PDF</button>
                </div>
            {:else}
                {#each studyItems as item}
                    <div class="card" class:processing={item.status === 'processing'}>
                        <div class="card-top">
                            <div class="title-group">
                                <i class='bx bx-layer document-icon'></i>
                                <h3 class="item-title">{item.title}</h3>
                            </div>
                            <div class="card-actions">
                                <button class="action-btn edit" on:click={() => startEdit(item)}><i class='bx bx-pencil'></i></button>
                                <button class="action-btn delete" on:click={() => deleteTopic(item)}><i class='bx bx-trash'></i></button>
                            </div>
                        </div>

                        <div class="card-middle">
                            {#if item.status === 'processing'}
                                <div class="processing-indicator">
                                    <i class='bx bx-loader-alt bx-spin'></i> AI is analyzing this document...
                                </div>
                            {:else}
                                <div class="stats-row">
                                    <span class="stat-badge"><i class='bx bx-bulb'></i> {item.tips_count || 0} Cards</span>
                                    {#if item.insights}
                                        {@const due = item.insights.filter(c => !c.nextReview || new Date(c.nextReview) <= new Date()).length}
                                        {#if due > 0}
                                            <span class="stat-badge due-badge"><i class='bx bx-time-five'></i> {due} Due</span>
                                        {:else}
                                            <span class="stat-badge perfect-badge"><i class='bx bx-check'></i> Done</span>
                                        {/if}
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <div class="card-bottom">
                            <span class="date-added">Added: {new Date(item.timestamp || Date.now()).toLocaleDateString()}</span>
                            {#if item.status !== 'processing'}
                                <button class="view-btn" on:click={() => openTopic(item)}>Study Deck <i class='bx bx-chevron-right'></i></button>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

    {:else}
        <!-- ================= TOPIC DETAIL VIEW / ANKI PLAYER ================= -->
        <div class="detail-header fade-in">
            <button class="back-link" on:click={closeTopic}>
                <i class='bx bx-arrow-back'></i> Back to Subjects
            </button>
            <div class="detail-title-row">
                <h2 class="page-title">{activeTopic.title}</h2>
            </div>
            
            <div class="view-toggles-wrapper">
                <div class="view-toggles">
                    <button class="toggle-btn" class:active={currentView === 'list'} on:click={() => currentView = 'list'}>
                        <i class='bx bx-list-ul'></i> All Cards ({activeTopic.tips_count})
                    </button>
                    <button class="toggle-btn study-toggle" class:active={currentView === 'flashcard'} on:click={startStudySession}>
                        <i class='bx bx-play-circle'></i> Study Now 
                        {#if dueCards.length > 0}
                            <span class="due-count">{dueCards.length}</span>
                        {/if}
                    </button>
                </div>

                <!-- NEW: LONG PRESS RESET BUTTON -->
                <button 
                    class="reset-hold-btn" 
                    on:mousedown={startResetPress}
                    on:mouseup={stopResetPress}
                    on:mouseleave={stopResetPress}
                    on:touchstart={startResetPress}
                    on:touchend={stopResetPress}
                    on:contextmenu|preventDefault
                >
                    <svg class="progress-ring" width="20" height="20">
                        <circle class="ring-track" cx="10" cy="10" r="8"></circle>
                        <circle class="ring-fill" cx="10" cy="10" r="8" style="stroke-dashoffset: {50.26 - (resetProgress / 100) * 50.26};"></circle>
                    </svg>
                    <span>Hold to Reset</span>
                </button>
            </div>
        </div>

        {#if currentView === 'flashcard'}
            <!-- FLASCARD PLAYER UI -->
            <div class="anki-container fade-in">
                {#if currentCardIndex < dueCards.length}
                    {@const card = dueCards[currentCardIndex]}
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {(currentCardIndex / dueCards.length) * 100}%"></div>
                    </div>
                    <p class="progress-text">Card {currentCardIndex + 1} of {dueCards.length}</p>

                    <div class="flashcard">
                        <div class="card-front">
                            <span class="card-type-tag"><i class='bx {getInsightIcon(card.type)}'></i> {card.type.replace('_', ' ').toUpperCase()}</span>
                            <h2>{card.title}</h2>
                        </div>
                        
                        {#if isFlipped}
                            <div class="divider"></div>
                            <div class="card-back fade-in">
                                <p>{card.content}</p>
                            </div>
                        {/if}
                    </div>

                    <div class="anki-controls">
                        {#if !isFlipped}
                            <button class="reveal-btn" on:click={flipCard}>Show Answer</button>
                        {:else}
                            <p class="rate-prompt">How well did you remember this?</p>
                            <div class="rating-buttons fade-in">
                                <button class="rate-btn btn-again" on:click={() => rateCard(0)}>
                                    <span class="time">{getIntervalLabel(card, 0)}</span>
                                    <span class="label">Again</span>
                                </button>
                                <button class="rate-btn btn-hard" on:click={() => rateCard(1)}>
                                    <span class="time">{getIntervalLabel(card, 1)}</span>
                                    <span class="label">Hard</span>
                                </button>
                                <button class="rate-btn btn-good" on:click={() => rateCard(2)}>
                                    <span class="time">{getIntervalLabel(card, 2)}</span>
                                    <span class="label">Good</span>
                                </button>
                                <button class="rate-btn btn-easy" on:click={() => rateCard(3)}>
                                    <span class="time">{getIntervalLabel(card, 3)}</span>
                                    <span class="label">Easy</span>
                                </button>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="deck-finished fade-in">
                        <i class='bx bx-party'></i>
                        <h3>Deck Completed!</h3>
                        <p>You have finished reviewing all due cards for this topic.</p>
                        <button class="reveal-btn" style="width: auto; padding: 1rem 2rem; margin-top: 1rem;" on:click={() => currentView = 'list'}>Return to Notes</button>
                    </div>
                {/if}
            </div>
        {:else}
            <!-- STATIC LIST UI -->
            <div class="insights-grid fade-in">
                {#if activeTopic.insights && activeTopic.insights.length > 0}
                    {#each activeTopic.insights as insight}
                        <div class="insight-card type-{insight.type}">
                            <div class="insight-icon">
                                <i class='bx {getInsightIcon(insight.type)}'></i>
                            </div>
                            <div class="insight-content">
                                <h4>{insight.title || 'Important Point'}</h4>
                                <p>{insight.content}</p>
                                <div class="memory-stats">
                                    <span><i class='bx bx-history'></i> Reps: {insight.repetition || 0}</span>
                                    {#if insight.nextReview}
                                        <span><i class='bx bx-calendar'></i> Due: {new Date(insight.nextReview).toLocaleDateString()}</span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                {:else}
                    <div class="empty-state">
                        <i class='bx bx-ghost' style="font-size: 3rem; color: #3b3b54;"></i>
                        <p>No insights found for this topic yet.</p>
                    </div>
                {/if}
            </div>
        {/if}
    {/if}
</div>

<!-- ================= RESET CONFIRM POPUP ================= -->
{#if showResetConfirmPopup}
    <div class="popup-backdrop" on:click={() => showResetConfirmPopup = false}>
        <div class="popup reset-popup" on:click|stopPropagation>
            <div class="popup-header">
                <h3 class="danger-text"><i class='bx bx-error-circle'></i> Reset Deck Progress?</h3>
                <button class="close-btn" on:click={() => showResetConfirmPopup = false}><i class="bx bx-x"></i></button>
            </div>
            <div class="popup-body">
                <p>This will permanently wipe all spaced repetition data for <strong>{activeTopic.title}</strong>. All cards will be marked as new.</p>
                <p class="danger-text" style="font-weight: 600; margin-bottom: 2rem;">This action cannot be undone.</p>
                <div class="confirm-actions">
                    <button class="save-btn cancel-gray" on:click={() => showResetConfirmPopup = false}>Cancel</button>
                    <button class="save-btn danger-bg" on:click={confirmResetDeck}>Yes, Wipe Data</button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- ================= UPLOAD POPUP ================= -->
{#if showPopup}
    <div class="popup-backdrop" on:click={closePopup}>
        <div class="popup" on:click|stopPropagation>
            <div class="popup-header">
                <h3>Upload Study Material</h3>
                <button class="close-btn" on:click={closePopup}><i class="bx bx-x"></i></button>
            </div>

            <div class="popup-body">
                <p class="helper-text">Upload a PDF to let the AI break it down into actionable study insights.</p>

                <form class="upload-form" on:submit={handleUpload}>
                    {#if !selectedFile}
                        <div class="file-dropzone" on:click={() => document.getElementById('pdf-upload').click()}>
                            <i class='bx bxs-cloud-upload drop-icon'></i>
                            <h4>Select a PDF file</h4>
                            <p>Max file size: 10MB</p>
                        </div>
                        <input type="file" id="pdf-upload" accept="application/pdf" style="display: none;" on:change={handleFileChange}>
                    {:else}
                        <div class="selected-file-card">
                            <div class="file-info">
                                <i class='bx bxs-file-pdf file-icon'></i>
                                <span class="file-name">{selectedFile.name}</span>
                            </div>
                            <button type="button" class="remove-file-btn" on:click={removeFile}><i class='bx bx-trash'></i></button>
                        </div>

                        <div class="form-group">
                            <label for="studyTitle">Subject / Topic Name</label>
                            <input type="text" id="studyTitle" placeholder="e.g., Biology - Chapter 4" bind:value={studyTitle} required>
                        </div>

                        <button type="submit" class="save-btn ai-btn" disabled={isUploading}>
                            {#if isUploading}
                                <i class='bx bx-loader-alt bx-spin'></i> Uploading to AI...
                            {:else}
                                <i class='bx bx-brain'></i> Process PDF
                            {/if}
                        </button>
                    {/if}
                </form>
            </div>
        </div>
    </div>
{/if}

<!-- ================= EDIT TITLE POPUP ================= -->
{#if showEditPopup}
    <div class="popup-backdrop" on:click={() => showEditPopup = false}>
        <div class="popup" on:click|stopPropagation>
            <div class="popup-header">
                <h3>Rename Topic</h3>
                <button class="close-btn" on:click={() => showEditPopup = false}><i class="bx bx-x"></i></button>
            </div>
            <div class="popup-body">
                <div class="form-group">
                    <label for="editTitle">New Name</label>
                    <input type="text" id="editTitle" bind:value={editTitle}>
                </div>
                <button class="save-btn" on:click={handleEditSubmit}>Save Name</button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Base Page Styles */
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }
    .header-titles {
        display: flex;
        flex-direction: column;
    }
    .page-title {
        color: white;
        margin: 0;
        font-size: 1.8rem;
    }
    .subtitle {
        color: #94a3b8;
        margin: 0;
        font-size: 0.9rem;
        margin-top: 0.2rem;
    }
    .add-btn {
        background: var(--accent-purple, #8b5cf6);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.75rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        transition: transform 0.2s, background 0.2s;
        box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.3);
    }
    .add-btn:hover {
        background: #7c3aed;
        transform: translateY(-2px);
    }

    /* Grid & Cards */
    .grid-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
    }
    .card {
        background: #1e1e2e;
        border: 1px solid #2d2d3f;
        padding: 1.5rem;
        border-radius: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        border-color: #3b3b54;
    }
    .card.processing {
        border-color: rgba(139, 92, 246, 0.5);
        background: linear-gradient(145deg, #1e1e2e 0%, #231f3c 100%);
    }
    .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .title-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        max-width: 75%;
    }
    .document-icon {
        font-size: 1.8rem;
        color: #a78bfa; 
        background: rgba(139, 92, 246, 0.1);
        padding: 0.5rem;
        border-radius: 0.5rem;
        flex-shrink: 0;
    }
    .item-title {
        color: white;
        font-size: 1.2rem;
        font-weight: 700;
        margin: 0;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    /* Action Buttons */
    .card-actions {
        display: flex;
        gap: 0.4rem;
        flex-shrink: 0;
    }
    .action-btn {
        background: #2a2a3c;
        border: none;
        color: #94a3b8;
        width: 30px;
        height: 30px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .action-btn:hover {
        background: #3b3b54;
        color: white;
    }
    .action-btn.delete:hover {
        color: #f87171;
        background: rgba(239, 68, 68, 0.1);
    }

    .processing-indicator {
        color: #a78bfa;
        font-size: 0.9rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(139, 92, 246, 0.1);
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 1px dashed rgba(139, 92, 246, 0.3);
    }
    .stats-row {
        display: flex;
        gap: 0.75rem;
    }
    .stat-badge {
        font-size: 0.85rem;
        padding: 0.4rem 0.75rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 600;
        background: rgba(59, 130, 246, 0.1);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .due-badge { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
    .perfect-badge { background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.2); }
    
    .card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 1rem;
        border-top: 1px solid #2d2d3f;
    }
    .date-added {
        font-size: 0.8rem;
        color: #64748b;
    }
    .view-btn {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.3);
        color: #a78bfa;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.4rem 0.8rem;
        border-radius: 0.5rem;
        transition: all 0.2s;
    }
    .view-btn:hover {
        background: rgba(139, 92, 246, 0.2);
        color: white;
    }

    /* ================= DETAIL VIEW STYLES ================= */
    .detail-header {
        margin-bottom: 2rem;
        border-bottom: 1px solid #2d2d3f;
        padding-bottom: 1.5rem;
    }
    .back-link {
        background: none;
        border: none;
        color: #a78bfa;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0;
        margin-bottom: 1rem;
        transition: color 0.2s;
    }
    .back-link:hover {
        color: #c4b5fd;
    }
    .detail-title-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
    }
    
    .view-toggles-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .view-toggles { 
        display: flex; 
        gap: 0.5rem; 
        background: #1e1e2e; 
        padding: 0.4rem; 
        border-radius: 0.75rem; 
        display: inline-flex; 
        border: 1px solid #2d2d3f;
    }
    .toggle-btn { background: transparent; color: #94a3b8; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .toggle-btn:hover { color: white; }
    .toggle-btn.active { background: #2a2a3c; color: white; }
    .study-toggle.active { background: var(--accent-purple); color: white; }
    .due-count { background: #f43f5e; color: white; font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 1rem; }

    /* RESET BUTTON CSS */
    .reset-hold-btn {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 0.75rem;
        padding: 0.5rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 600;
        cursor: pointer;
        position: relative;
        user-select: none;
        -webkit-user-select: none;
        transition: all 0.2s;
    }
    .reset-hold-btn:active {
        transform: scale(0.95);
        background: rgba(239, 68, 68, 0.2);
    }
    .progress-ring {
        transform: rotate(-90deg);
    }
    .ring-track {
        fill: transparent;
        stroke: rgba(239, 68, 68, 0.2);
        stroke-width: 3;
    }
    .ring-fill {
        fill: transparent;
        stroke: #ef4444;
        stroke-width: 3;
        stroke-dasharray: 50.26; /* 2 * PI * 8 */
        transition: stroke-dashoffset 0.1s linear;
    }

    /* ================= ANKI PLAYER STYLES ================= */
    .anki-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 700px;
        margin: 0 auto;
        padding-top: 2rem;
    }
    .progress-bar { width: 100%; height: 6px; background: #2d2d3f; border-radius: 3px; margin-bottom: 0.5rem; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent-purple); transition: width 0.3s ease; }
    .progress-text { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; font-weight: 500; }

    .flashcard {
        background: #1e1e2e;
        width: 100%;
        min-height: 300px;
        border-radius: 1.5rem;
        padding: 2.5rem;
        border: 1px solid #3b3b54;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    }
    .card-type-tag { position: absolute; top: 1.5rem; left: 1.5rem; font-size: 0.75rem; background: #2a2a3c; color: #a78bfa; padding: 0.3rem 0.6rem; border-radius: 0.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;}
    .card-front h2 { color: white; font-size: 1.8rem; line-height: 1.4; margin: 0; text-align: center; font-weight: 600; }
    
    .divider { height: 1px; background: #2d2d3f; margin: 2rem 0; width: 100%; }
    .card-back p { color: #cbd5e1; font-size: 1.2rem; line-height: 1.6; margin: 0; text-align: center; }

    .anki-controls { width: 100%; margin-top: 2.5rem; display: flex; flex-direction: column; align-items: center; }
    .reveal-btn { background: white; color: #0b0c15; border: none; padding: 1rem 3rem; border-radius: 3rem; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: transform 0.2s; width: 100%; max-width: 300px; }
    .reveal-btn:hover { transform: translateY(-2px); }
    
    .rate-prompt { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1rem; }
    .rating-buttons { display: flex; gap: 1rem; width: 100%; justify-content: center; flex-wrap: wrap; }
    
    .rate-btn { display: flex; flex-direction: column; align-items: center; padding: 0.8rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; width: 100px; transition: transform 0.1s; }
    .rate-btn:active { transform: scale(0.95); }
    .rate-btn .time { font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.2rem; font-weight: 600; }
    .rate-btn .label { font-size: 1.1rem; font-weight: 700; }
    
    .btn-again { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
    .btn-hard { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .btn-good { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .btn-easy { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }

    .deck-finished { text-align: center; padding: 4rem 0; }
    .deck-finished i { font-size: 5rem; color: #a78bfa; margin-bottom: 1rem; }
    .deck-finished h3 { color: white; font-size: 2rem; margin: 0 0 1rem 0; }
    .deck-finished p { color: #94a3b8; font-size: 1.1rem; }


    /* Static List View */
    .insights-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .insight-card {
        background: #1e1e2e;
        border: 1px solid #2d2d3f;
        border-left: 4px solid #3b82f6; /* Default Blue */
        padding: 1.25rem;
        border-radius: 0.75rem;
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        transition: transform 0.2s;
    }
    .insight-card:hover {
        transform: translateX(4px);
    }
    .insight-card.type-tip { border-left-color: #f59e0b; } /* Yellow */
    .insight-card.type-did_you_know { border-left-color: #8b5cf6; } /* Purple */

    .insight-icon {
        font-size: 1.5rem;
        background: #2a2a3c;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .type-tip .insight-icon { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .type-did_you_know .insight-icon { color: #a78bfa; background: rgba(139, 92, 246, 0.1); }
    .type-point .insight-icon { color: #60a5fa; background: rgba(59, 130, 246, 0.1); }

    .insight-content h4 {
        color: white;
        margin: 0 0 0.4rem 0;
        font-size: 1.05rem;
    }
    .insight-content p {
        color: #cbd5e1;
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .memory-stats { display: flex; gap: 1rem; margin-top: 0.8rem; font-size: 0.75rem; color: #64748b; font-weight: 500;}
    .memory-stats span { display: flex; align-items: center; gap: 0.3rem; }

    /* States */
    .loading-state, .empty-state {
        color: var(--text-gray);
        text-align: center;
        grid-column: 1 / -1;
        padding: 4rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }
    .loading-state i {
        font-size: 2.5rem;
        color: var(--accent-purple, #8b5cf6);
    }
    .empty-icon {
        font-size: 4rem;
        color: #3b3b54;
        margin-bottom: 0.5rem;
    }
    .empty-state h3 {
        color: white;
        margin: 0;
        font-size: 1.3rem;
    }
    .empty-state p {
        max-width: 400px;
        line-height: 1.5;
        margin: 0;
    }
    .empty-add-btn {
        margin-top: 1rem;
        background: #2a2a3c;
        color: white;
        border: 1px solid #3b3b54;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    .empty-add-btn:hover {
        background: #3b3b54;
    }

    /* Popup & Upload UI */
    .popup-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
    }
    .popup {
        background: #1e1e2e;
        border-radius: 1.25rem;
        padding: 2rem;
        width: 90%;
        max-width: 450px;
        border: 1px solid #2d2d3f;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .popup-header h3 {
        margin: 0;
        color: white;
        font-size: 1.4rem;
    }
    .danger-text { color: #ef4444 !important; display: flex; align-items: center; gap: 0.5rem; }
    
    .close-btn {
        background: #2a2a3c;
        border: none;
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .close-btn:hover {
        background: #ef4444;
        color: white;
    }
    .helper-text {
        color: #94a3b8;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
        line-height: 1.4;
    }

    /* Upload Dropzone */
    .file-dropzone {
        border: 2px dashed #3b3b54;
        border-radius: 1rem;
        padding: 3rem 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.02);
    }
    .file-dropzone:hover {
        border-color: var(--accent-purple, #8b5cf6);
        background: rgba(139, 92, 246, 0.05);
    }
    .drop-icon {
        font-size: 3rem;
        color: #64748b;
        margin-bottom: 1rem;
    }
    .file-dropzone h4 {
        color: white;
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
    }
    .file-dropzone p {
        color: #64748b;
        margin: 0;
        font-size: 0.85rem;
    }

    /* Selected File View */
    .selected-file-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #2a2a3c;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 1px solid #3b3b54;
        margin-bottom: 1.5rem;
    }
    .file-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        overflow: hidden;
    }
    .file-icon {
        color: #f43f5e;
        font-size: 1.5rem;
    }
    .file-name {
        color: white;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .remove-file-btn {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.2rem;
        font-size: 1.2rem;
    }

    /* Form Styles */
    .upload-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .form-group label {
        color: #e2e8f0;
        font-size: 0.9rem;
        font-weight: 500;
    }
    .form-group input {
        background: #1e1e2e;
        border: 1px solid #3b3b54;
        color: white;
        padding: 0.85rem 1rem;
        border-radius: 0.5rem;
        font-family: inherit;
        font-size: 1rem;
        transition: border-color 0.2s;
    }
    .form-group input:focus {
        outline: none;
        border-color: var(--accent-purple, #8b5cf6);
    }
    
    .confirm-actions { display: flex; gap: 1rem; }
    
    .save-btn {
        background: var(--accent-purple, #8b5cf6);
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 0.75rem;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        margin-top: 0.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        transition: background 0.2s;
        flex: 1;
    }
    .save-btn:hover:not(:disabled) {
        background: #7c3aed;
    }
    .save-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .cancel-gray { background: #2a2a3c !important; }
    .cancel-gray:hover { background: #3b3b54 !important; }
    .danger-bg { background: #ef4444 !important; }
    .danger-bg:hover { background: #dc2626 !important; }

    .fade-in {
        animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
