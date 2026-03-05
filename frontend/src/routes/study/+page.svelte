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

    // View state: null means showing the grid. If an object is here, show its details!
    let activeTopic = $state(null);

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
                // Ensure we get an array, handling if n8n wrapped it in { data: [...] }
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
    // UI NAVIGATION
    // ==========================================
    function openTopic(item) {
        if (item.status === 'processing') {
            alert("AI is still analyzing this document. Please check back in a minute!");
            return;
        }
        activeTopic = item;
    }

    function closeTopic() {
        activeTopic = null;
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
        
        // Optimistic UI Update
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

        // Optimistic UI Update
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

                // Send to n8n asynchronously
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if(res.ok) {
                        // Refresh grid after 5 seconds to check if AI is done
                        setTimeout(() => loadStudyMaterials(false), 5000);
                    }
                }).catch(e => console.error("Background upload error", e));

                // Optimistic UI Update instantly
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
                <p class="subtitle">AI-Powered Insights & Quizzes</p>
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
                                <i class='bx bxs-file-pdf document-icon'></i>
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
                                    <span class="stat-badge"><i class='bx bx-bulb'></i> {item.tips_count || 0} Insights</span>
                                    <span class="stat-badge quiz-badge"><i class='bx bx-brain'></i> {item.quiz_count || 0} Quizzes</span>
                                </div>
                            {/if}
                        </div>

                        <div class="card-bottom">
                            <span class="date-added">Added: {new Date(item.timestamp || Date.now()).toLocaleDateString()}</span>
                            {#if item.status !== 'processing'}
                                <button class="view-btn" on:click={() => openTopic(item)}>View Insights <i class='bx bx-chevron-right'></i></button>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

    {:else}
        <!-- ================= TOPIC DETAIL VIEW ================= -->
        <div class="detail-header fade-in">
            <button class="back-link" on:click={closeTopic}>
                <i class='bx bx-arrow-back'></i> Back to Subjects
            </button>
            <div class="detail-title-row">
                <h2 class="page-title">{activeTopic.title}</h2>
                <div class="detail-badges">
                    <span class="stat-badge"><i class='bx bx-bulb'></i> {activeTopic.tips_count || 0} Insights</span>
                </div>
            </div>
            <p class="subtitle">Important points and tips extracted by AI</p>
        </div>

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
</div>

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
        color: #f43f5e; /* Red for PDF */
        background: rgba(244, 63, 94, 0.1);
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
    .quiz-badge {
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.2);
    }
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
    .detail-badges {
        display: flex;
        gap: 0.5rem;
    }

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
    .save-btn {
        background: var(--accent-purple, #8b5cf6);
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 0.75rem;
        cursor: pointer;
        font-size: 1.05rem;
        font-weight: 600;
        margin-top: 0.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        transition: background 0.2s;
    }
    .save-btn:hover:not(:disabled) {
        background: #7c3aed;
    }
    .save-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .fade-in {
        animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
