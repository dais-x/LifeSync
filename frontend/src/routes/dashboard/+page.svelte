<script>
    import { onMount, onDestroy, tick } from 'svelte';
    import { slide } from 'svelte/transition';
    import Notification from '$lib/Notification.svelte';
    import { currentUser } from '$lib/stores';

    // --- NEW: NATIVE CAPACITOR IMPORTS ---
    import { Capacitor, CapacitorHttp } from '@capacitor/core';
    import { SpeechRecognition } from '@capacitor-community/speech-recognition';

    // --- API CONFIGURATION ---
    const GET_URL = 'https://fahim-n8n.laddu.cc/webhook/get-tasks';
    const MANAGE_URL = 'https://fahim-n8n.laddu.cc/webhook/manage-task';
    const TRANSCRIBE_URL = 'https://fahim-n8n.laddu.cc/webhook/transcribe-audio';
    const THOUGHT_CATCHER_URL = 'https://fahim-n8n.laddu.cc/webhook/thought-catcher';
    const POLL_INTERVAL = 10000;

    // --- STATE VARIABLES ---
    let pollInterval;

    // Dynamic Data State
    let totalActive = $state(0);
    let totalCompleted = $state(0);
    let priorityTasks = $state([]);
    let upcomingDeadlines = $state([]);
    let notifications = $state([]);
    let allTasks = $state([]);

    // Modal States
    let showNotifModal = $state(false);
    let showHabitModal = $state(false);
    let selectedNotifId = $state(null);

    // Donut Chart State
    let categoryStats = $state([]);
    let donutGradient = $state('conic-gradient(#2a2b3d 0% 100%)');

    // --- NEW: SMART ASSISTANT CHAT STATE ---
    let thoughtText = $state('');
    let isListening = $state(false);
    let isRecordingAudio = $state(false);
    
    // Chat UI State
    let chatHistory = $state([]); 
    // Format: { id: number, role: 'user'|'bot', type: 'text'|'audio', content: string, audioUrl?: string }
    let isAiThinking = $state(false);
    let chatContainer = $state(null);
    
    // Non-reactive variables for media objects
    let webRecognition = null;
    let mediaRecorder = null;
    let audioChunks = [];

    // --- NOTIFICATION SYSTEM ---
    let notificationMessage = $state('');
    let notificationKey = $state(0);

    function showNotification(msg) {
        notificationMessage = msg;
        notificationKey++;
        setTimeout(() => {
            if (notificationMessage === msg) {
                notificationMessage = '';
            }
        }, 4000);
    }



    // --- THE NATIVE HTTP BRIDGE ---
    // Bypasses Android WebView/CORS restrictions by routing through the OS
    async function apiRequest(url, method = 'GET', body = null) {
        if (Capacitor.isNativePlatform()) {
            const options = { url, headers: { 'Content-Type': 'application/json' } };
            if (body) options.data = body;
            
            const response = await (method === 'GET' ? CapacitorHttp.get(options) : CapacitorHttp.post(options));
            if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
            
            return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        } else {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            return await response.json();
        }
    }



    // --- MAIN SYNC FUNCTION ---
    async function refreshDashboard() {
        if (!$currentUser || !$currentUser.id) return;

        try {
            const incoming = await apiRequest(`${GET_URL}?userId=${$currentUser.id}`, 'GET');
            let tasks = [];

            if (incoming.data && Array.isArray(incoming.data)) {
                tasks = incoming.data.filter(t => t.isDeleted !== true);
            } else if (Array.isArray(incoming)) {
                tasks = incoming;
            }
            allTasks = tasks;

            updateAllProcessors();
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }

    function updateAllProcessors() {
        processStats(allTasks);
        processWidgets(allTasks);
        processNotifications(allTasks);
        processDonut(allTasks);
    }

    // --- TASK ACTIONS ---
    async function completeTask(task) {
        const taskId = task.id || task._id;

        allTasks = allTasks.map(t => {
            const tId = t.id || t._id;
            if (tId === taskId) {
                return { ...t, status: 'completed', completionTime: new Date().toISOString() };
            }
            return t;
        });
        updateAllProcessors();

        try {
            await apiRequest(MANAGE_URL, 'POST', {
                action: 'update',
                id: taskId,
                updateFields: {
                    status: 'completed',
                    completionTime: new Date().toISOString()
                }
            });
        } catch (e) {
            console.error("Failed to complete task:", e);
        }
    }

    // --- CHAT UI HELPERS ---
    async function scrollToBottom() {
        await tick();
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // NEW: Clear the chat history from local memory
    function clearChatContext() {
        chatHistory = [];
        showNotification("Conversation context cleared.");
    }

    // --- UNIVERSAL 3-TIER MICROPHONE LOGIC ---
    async function toggleListening() {
        if (isListening) {
            isListening = false;
            if (Capacitor.isNativePlatform()) {
                try { await SpeechRecognition.stop(); } catch(e) { console.error(e); }
            } else if (webRecognition) {
                webRecognition.stop();
            } else if (isRecordingAudio && mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            return;
        }

        if (Capacitor.isNativePlatform()) {
            isListening = true;
            try {
                // FIX: Updated to v7 checkPermissions() method
                let perm = await SpeechRecognition.checkPermissions();
                if (perm.speechRecognition !== 'granted') {
                    perm = await SpeechRecognition.requestPermissions();
                }

                if (perm.speechRecognition !== 'granted') {
                    showNotification("Microphone permission denied.");
                    isListening = false;
                    return;
                }

                const result = await SpeechRecognition.start({
                    language: 'en-US',
                    maxResults: 1,
                    prompt: 'What is on your mind?',
                    partialResults: false,
                    popup: true
                });

                if (result && result.matches && result.matches.length > 0) {
                    thoughtText = result.matches[0];
                    submitThought(); // Auto-submit native speech
                }
            } catch (err) {
                console.error("Native speech error:", err);
                showNotification("Speech Engine Error. Ensure Google App is installed.");
            } finally {
                isListening = false;
            }
        } else if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognitionAPI) {
                webRecognition = new SpeechRecognitionAPI();
                webRecognition.continuous = false;
                webRecognition.interimResults = true;

                webRecognition.onstart = () => { isListening = true; };
                
                webRecognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        transcript += event.results[i][0].transcript;
                    }
                    thoughtText = transcript;
                };

                webRecognition.onerror = (event) => {
                    console.error('Speech error:', event.error);
                    isListening = false;
                };

                webRecognition.onend = () => {
                    isListening = false;
                    if (thoughtText.trim()) submitThought(); // Auto-submit web speech
                };

                webRecognition.start();
            }
        } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        submitThought(null, base64Audio); 
                    };
                    stream.getTracks().forEach(t => t.stop()); 
                    isRecordingAudio = false;
                };

                mediaRecorder.start();
                isListening = true;
                isRecordingAudio = true;
            } catch (e) {
                console.error(e);
                showNotification("Microphone permission denied.");
            }
        } else {
            showNotification("Voice input is not supported on this device.");
        }
    }

    // --- THE NEW SMART CHAT ROUTER ---
    async function submitThought(manualText = null, audioBase64 = null) {
        const currentThought = manualText || thoughtText;
        if (!currentThought.trim() && !audioBase64) return;

        thoughtText = ''; // Clear immediately
        const msgId = Date.now();

        if (audioBase64) {
            // STEP 1: Handle Audio (Tier 3 Fallback)
            chatHistory = [...chatHistory, { 
                id: msgId, role: 'user', type: 'audio', audioUrl: audioBase64, content: 'Transcribing audio...' 
            }];
            scrollToBottom();

            try {
                const mimeType = audioBase64.split(';')[0].split(':')[1] || 'audio/webm';
                
                const data = await apiRequest(TRANSCRIBE_URL, 'POST', { userId: $currentUser.id, audio: audioBase64, mimeType });
                const transcribedText = data.text || "(Inaudible)";
                
                // Update bubble with actual text
                chatHistory = chatHistory.map(msg => msg.id === msgId ? { ...msg, content: transcribedText } : msg);
                scrollToBottom();

                // STEP 2: Send transcribed text to Gemma
                sendToBrain(transcribedText);
            } catch (e) {
                console.error(e);
                chatHistory = chatHistory.map(msg => msg.id === msgId ? { ...msg, content: "⚠️ Could not transcribe audio." } : msg);
            }
        } else {
            // STEP 1: Handle Direct Text (Chrome/Native/Typing)
            chatHistory = [...chatHistory, { id: msgId, role: 'user', type: 'text', content: currentThought }];
            scrollToBottom();
            sendToBrain(currentThought);
        }
    }

    // --- THE BRAIN HANDLER ---
    // --- THE BRAIN HANDLER ---
    async function sendToBrain(text) {
        if (!text || text.trim() === '' || text.includes('⚠️')) return;

        isAiThinking = true;
        scrollToBottom();

        const historyPayload = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        try {
            const data = await apiRequest(THOUGHT_CATCHER_URL, 'POST', { 
                userId: $currentUser.id, 
                thought: text,
                history: historyPayload 
            });

            isAiThinking = false;
            chatHistory = [...chatHistory, { id: Date.now(), role: 'bot', type: 'text', content: data.reply || "Done!" }];
            scrollToBottom();
            if (['create_task', 'update_task', 'delete_task'].includes(data.type)) refreshDashboard();
        } catch (e) {
            console.error("Brain Error:", e);
            isAiThinking = false;
            chatHistory = [...chatHistory, { id: Date.now(), role: 'bot', type: 'text', content: `⚠️ Error: ${e.message}` }];
            scrollToBottom();
        }
    }

    // --- DATA PROCESSORS ---
    function processStats(tasks) {
        const active = tasks.filter(t => t.status !== 'completed');
        const done = tasks.filter(t => t.status === 'completed');
        totalActive = active.length;
        totalCompleted = done.length;
    }

    function processWidgets(tasks) {
        const active = tasks.filter(t => t.status !== 'completed');

        priorityTasks = active
            .sort((a, b) => {
                const timeA = a.deadline ? new Date(a.deadline) : new Date(a.timestamp || 0);
                const timeB = b.deadline ? new Date(b.deadline) : new Date(b.timestamp || 0);
                return timeA - timeB;
            })
            .slice(0, 8);

        upcomingDeadlines = active
            .filter(t => t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3);
    }

    function processNotifications(tasks) {
        const now = new Date();
        const validTasks = tasks.filter(t => {
            if (!t.timestamp) return false;
            const taskDate = new Date(t.timestamp);
            if (isNaN(taskDate.getTime())) return false;
            const diffHours = (now - taskDate) / (1000 * 60 * 60);
            return diffHours < 24 && diffHours >= 0;
        });

        validTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        notifications = validTasks.slice(0, 15).map(t => {
            const isEmail = t.category?.toLowerCase() === 'email' || t.category?.toLowerCase() === 'inbox';
            const diffMins = Math.round((new Date() - new Date(t.timestamp)) / 60000);
            let timeStr = diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
            if (diffMins > 60) timeStr = `${Math.round(diffMins/60)}h ago`;

            return {
                id: t.id || t._id,
                title: isEmail ? `Task "${t.title}" added from email` : `New Task: ${t.title}`,
                category: t.category || 'General',
                time: timeStr,
                isHighlight: isEmail,
                priority: t.priority || 'mid',
                status: t.status || 'pending',
                fullDate: new Date(t.timestamp).toLocaleString()
            };
        });
    }

    function processDonut(tasks) {
        const catCounts = {};
        let statTotal = 0;
        tasks.forEach(t => {
            const c = t.category || 'Other';
            catCounts[c] = (catCounts[c] || 0) + 1;
            statTotal++;
        });

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        categoryStats = Object.keys(catCounts).map((key, i) => ({
            label: key,
            count: catCounts[key],
            percent: Math.round((catCounts[key] / statTotal) * 100),
            color: colors[i % colors.length]
        }));

        if (categoryStats.length > 0) {
            let currentPct = 0;
            const gradientParts = categoryStats.map(stat => {
                const start = currentPct;
                const end = currentPct + stat.percent;
                currentPct = end;
                return `${stat.color} ${start}% ${end}%`;
            });
            donutGradient = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
             donutGradient = 'conic-gradient(#2a2b3d 0% 100%)';
        }
    }

    function toggleNotif(id) {
        selectedNotifId = selectedNotifId === id ? null : id;
    }

    onMount(async () => {
        showNotification("Welcome back!");
        refreshDashboard();
        pollInterval = setInterval(refreshDashboard, POLL_INTERVAL);
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });
</script>

{#if notificationMessage}
    {#key notificationKey}<Notification message={notificationMessage} />{/key}
{/if}

<header class="top-header">
    <div class="header-left">
        <h2>Dashboard</h2>
    </div>
    <div class="header-right">
        <div class="search-bar">
            <i class="bx bx-search"></i>
            <input type="text" placeholder="Search..." aria-label="Search" />
        </div>
        <div class="avatar">
            {$currentUser?.name ? $currentUser.name.substring(0, 2).toUpperCase() : 'ME'}
        </div>
    </div>
</header>

<div class="dashboard-scroll scroll-area">
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-header">
                <span>Tasks Today</span>
                <i class="bx bx-check-square icon-bg purple"></i>
            </div>
            <div class="stat-value">{totalActive}</div>
            <div class="stat-sub">{totalCompleted} completed total</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <span>Focus Time</span>
                <i class="bx bx-time icon-bg blue"></i>
            </div>
            <div class="stat-value">4.2h</div>
            <div class="stat-sub green-text"><i class="bx bx-up-arrow-alt"></i> +12% vs avg</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <span>Streak</span>
                <i class="bx bx-trending-up icon-bg orange"></i>
            </div>
            <div class="stat-value">12 <span class="unit">days</span></div>
            <div class="stat-sub">Personal best</div>
        </div>
    </div>

    <!-- NEW: SMART ASSISTANT CHAT WRAPPER -->
    <div class="smart-assistant-wrapper">
        <!-- Chat History Window (Only shows if there are messages) -->
        {#if chatHistory.length > 0 || isAiThinking}
            <div class="chat-history scroll-area" bind:this={chatContainer}>
                
                <!-- Chat Context Header with Clear Button -->
                <div class="chat-header-bar">
                    <span class="chat-header-title"><i class='bx bx-brain'></i> AI Assistant Context</span>
                    <button class="clear-chat-btn" onclick={clearChatContext} title="Reset Context" aria-label="Clear Context">
                        <i class="bx bx-broom"></i> <span>Clear</span>
                    </button>
                </div>

                {#each chatHistory as msg (msg.id)}
                    <div class="chat-bubble {msg.role}">
                        {#if msg.type === 'audio'}
                            <audio controls src={msg.audioUrl} class="audio-player"></audio>
                            <p class="transcription-text">"{msg.content}"</p>
                        {:else}
                            <p class="message-text">{msg.content}</p>
                        {/if}
                    </div>
                {/each}
                
                {#if isAiThinking}
                    <div class="chat-bubble bot typing-bubble">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- The Input Box -->
        <div class="input-wrapper">
            <button class="mic-btn" class:active={isListening} onclick={toggleListening} aria-label="Voice input">
                <i class="bx" class:bx-microphone={!isListening} class:bx-microphone-off={isListening} class:bx-flashing={isListening}></i>
            </button>
            <input
                type="text"
                placeholder={isRecordingAudio ? "Recording audio... Tap mic to send!" : isListening ? "Listening..." : "Type or speak to capture a thought..."}
                aria-label="Capture thought"
                bind:value={thoughtText}
                onkeydown={(e) => e.key === 'Enter' && submitThought()}
                disabled={isRecordingAudio}
            />
            <button class="send-btn" aria-label="Send thought" onclick={() => submitThought()} disabled={(!thoughtText.trim() && !isRecordingAudio) || (isListening && !isRecordingAudio)}>
                <i class="bx bx-send"></i>
            </button>
        </div>
    </div>

    <div class="widget-grid">
        <div class="widget tasks-widget">
            <div class="widget-header">
                <h3>Priority Tasks</h3>
                <span>{priorityTasks.length}</span>
            </div>
            <div class="task-list">
                {#if priorityTasks.length === 0}
                    <div style="padding:2rem; color:#9ca3af; text-align:center; font-style:italic;">All caught up!</div>
                {/if}
                {#each priorityTasks as task (task.id || task._id)}
                    <div class="task-item" transition:slide|local>
                        <button class="complete-btn" onclick={() => completeTask(task)} title="Mark as complete">
                            <span class="circle"></span> <!-- FIX: Replaced div with span to prevent hydration crash -->
                        </button>
                        <span class="task-text">{task.title}</span>
                        <div class="task-meta-info">
                            {#if task.deadline}
                                <span class="time-tag"><i class="bx bx-time-five"></i> {new Date(task.deadline).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {/if}
                            <span class="tag {task.priority ? task.priority.toLowerCase() : 'mid'}">{task.category || 'General'}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="side-widgets">
            <!-- FIX: Replaced button with div to prevent illegal nested blocks -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div role="button" tabindex="0" class="widget notification-widget clickable" onclick={() => showNotifModal = true} onkeydown={(e) => { if(e.key === 'Enter') showNotifModal = true; }}>
                <div class="widget-header">
                    <h3>Recent Notifications</h3>
                    <i class="bx bx-bell" style="color: var(--accent-orange)"></i>
                </div>
                <div class="notification-list">
                    {#if notifications.length === 0}
                        <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No new alerts</div>
                    {/if}
                    {#each notifications.slice(0, 5) as notif (notif.id)}
                        <div class="notif-card">
                            <span class="notif-dot {notif.isHighlight ? '' : 'silent'}"></span> <!-- FIX: span -->
                            <div class="notif-content">
                                <p class="notif-title">{notif.title}</p>
                                <p class="notif-time">{notif.time} • {notif.category}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- FIX: Replaced button with div to prevent illegal nested blocks -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div role="button" tabindex="0" class="widget habits-widget clickable" onclick={() => showHabitModal = true} onkeydown={(e) => { if(e.key === 'Enter') showHabitModal = true; }}>
                <div class="widget-header">
                    <h3>Habit Breakdown</h3>
                    <i class="bx bx-pie-chart-alt-2" style="color: var(--accent-purple)"></i>
                </div>

                {#if categoryStats.length === 0}
                    <div style="padding:1rem; color:#9ca3af; text-align:center; font-style:italic;">No data yet</div>
                {:else}
                    <div class="donut-row">
                        <div class="donut" style="background: {donutGradient}">
                            <div class="hole"></div>
                        </div>

                        <div class="legend">
                            {#each categoryStats.slice(0, 4) as stat}
                                <div class="legend-item">
                                    <span class="dot" style="background: {stat.color}"></span>
                                    <span class="l-text">{stat.label}</span>
                                    <span class="l-pct">{stat.percent}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <div class="widget deadlines-widget">
                <h3>Deadlines</h3>
                <div class="deadline-list">
                    {#each upcomingDeadlines as task}
                        <div class="deadline-item">
                            <div class="deadline-title">
                                <i class="bx bx-time"></i> {task.title}
                            </div>
                            <span class="time-left">{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

<!-- --- MODALS --- -->

{#if showNotifModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={() => { showNotifModal = false; selectedNotifId = null; }}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3><i class="bx bx-bell"></i> Recent Alerts</h3>
                <button class="close-btn" onclick={() => { showNotifModal = false; selectedNotifId = null; }} aria-label="Close"><i class="bx bx-x"></i></button>
            </div>

            <div class="modal-body notif-modal-body">
                <div class="notif-accordion">
                    {#each notifications as notif}
                        <div class="notif-group" class:expanded={selectedNotifId === notif.id}>
                            <!-- FIX: Replaced button with div role="button" -->
                            <div role="button" tabindex="0" class="notif-trigger" onclick={() => toggleNotif(notif.id)} onkeydown={(e) => { if(e.key === 'Enter') toggleNotif(notif.id); }}>
                                <span class="notif-dot {notif.isHighlight ? '' : 'silent'}"></span>
                                <div class="notif-main">
                                    <p class="notif-title">{notif.title}</p>
                                    <p class="notif-meta">{notif.time} • {notif.category}</p>
                                </div>
                                <i class="bx bx-chevron-down chevron"></i>
                            </div>

                            {#if selectedNotifId === notif.id}
                                <div class="notif-details" transition:slide={{ duration: 250 }}>
                                    <div class="details-inner">
                                        <div class="detail-row">
                                            <div class="detail-col">
                                                <span class="detail-label">Task Status</span>
                                                <p>{notif.status.replace('_', ' ')}</p>
                                            </div>
                                            <div class="detail-col">
                                                <span class="detail-label">Priority Level</span>
                                                <span class="tag {notif.priority}">{notif.priority}</span>
                                            </div>
                                        </div>
                                        <div class="detail-row">
                                            <div class="detail-col">
                                                <span class="detail-label">Source Category</span>
                                                <p>{notif.category}</p>
                                            </div>
                                            <div class="detail-col">
                                                <span class="detail-label">Received At</span>
                                                <p>{notif.fullDate}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                    {#if notifications.length === 0}
                         <div class="empty-notif">
                            <i class="bx bx-notification-off"></i>
                            <p>No notifications in the last 24 hours</p>
                         </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

{#if showHabitModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={() => showHabitModal = false}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content habit-modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3><i class="bx bx-pie-chart-alt-2"></i> Habit Breakdown</h3>
                <button class="close-btn" onclick={() => showHabitModal = false} aria-label="Close"><i class="bx bx-x"></i></button>
            </div>
            <div class="modal-body habit-body">
                <div class="donut large" style="background: {donutGradient}">
                    <div class="hole"></div>
                    <div class="donut-center">
                        <span class="total-val">{allTasks.length}</span>
                        <span class="total-lbl">Total Tasks</span>
                    </div>
                </div>

                <div class="full-legend">
                    {#each categoryStats as stat}
                        <div class="legend-row">
                            <span class="dot" style="background: {stat.color}"></span>
                            <span class="label">{stat.label}</span>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: {stat.percent}%; background: {stat.color}"></div>
                            </div>
                            <span class="val">{stat.percent}%</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* --- SHARED & HEADER --- */
    .top-header {
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
        border-bottom: 1px solid var(--border-color);
        background-color: var(--bg-dark);
    }
    .header-left h2 {
        color: var(--text-white);
        font-size: 1.25rem;
        margin: 0;
        font-weight: 600;
    }
    .header-right { display: flex; align-items: center; gap: 1rem; }
    .search-bar { position: relative; display: none; }
    .search-bar input {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        border-radius: 0.5rem;
        color: var(--text-white);
        width: 16rem;
    }
    .search-bar i { position: absolute; left: 0.75rem; top: 0.6rem; color: var(--text-gray); }
    .avatar {
        width: 2rem; height: 2rem; border-radius: 50%;
        background: linear-gradient(to top right, var(--accent-purple), var(--accent-blue));
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 0.75rem; font-weight: bold;
    }

    /* --- LAYOUT & SCROLL --- */
    .dashboard-scroll { flex: 1; overflow-y: auto; padding: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
    .stat-card { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; }
    .stat-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .icon-bg { padding: 0.35rem; border-radius: 0.25rem; background-color: var(--card-hover); font-size: 1rem; }
    .icon-bg.purple { color: var(--accent-purple); }
    .icon-bg.blue { color: var(--accent-blue); }
    .icon-bg.orange { color: var(--accent-orange); }

    .stat-value { font-size: 1.875rem; font-weight: 700; color: var(--text-white); }
    .stat-sub { font-size: 0.75rem; margin-top: 0.25rem; }
    .green-text { color: var(--accent-green); }
    .unit { font-size: 0.875rem; font-weight: 400; color: var(--text-gray); }

    /* --- NEW: SMART ASSISTANT CHAT UI --- */
    .smart-assistant-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        width: 100%;
    }
    
    .chat-history {
        max-height: 60vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        padding: 1.25rem;
        background: #11121a; /* Slightly darker than card-bg for depth */
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.2);
        scrollbar-width: thin;
        scrollbar-color: var(--border-color) transparent;
    }
    
    .chat-history::-webkit-scrollbar { width: 6px; }
    .chat-history::-webkit-scrollbar-thumb { background-color: var(--border-color); border-radius: 3px; }

    .chat-header-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    
    .chat-header-title {
        font-size: 0.75rem;
        color: var(--text-gray);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 600;
    }

    .clear-chat-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border-color);
        color: var(--text-gray);
        font-size: 1rem;
        padding: 0.3rem 0.6rem;
        border-radius: 0.4rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
    
    .clear-chat-btn:hover {
        color: var(--accent-red);
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
    }
    
    .clear-chat-btn span {
        font-size: 0.75rem;
        font-weight: 600;
    }

    .chat-bubble {
        max-width: 85%;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        font-size: 0.95rem;
        line-height: 1.4;
        position: relative;
        word-wrap: break-word;
    }
    
    .chat-bubble.user {
        align-self: flex-end;
        background: linear-gradient(135deg, var(--accent-purple), var(--hover-purple));
        color: white;
        border-bottom-right-radius: 0.25rem;
        box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
    }
    
    .chat-bubble.bot {
        align-self: flex-start;
        background: #2a2c41; /* Distinct bot color */
        color: #e2e8f0;
        border-bottom-left-radius: 0.25rem;
        border: 1px solid var(--border-color);
    }

    .message-text { margin: 0; }

    /* Audio Bubble Styling */
    .audio-player {
        height: 36px;
        width: 220px;
        margin-bottom: 0.5rem;
        border-radius: 18px;
        outline: none;
    }
    
    /* Native audio element restyling trick for webkit */
    .audio-player::-webkit-media-controls-panel {
        background-color: rgba(255, 255, 255, 0.2);
    }
    
    .transcription-text {
        font-size: 0.85rem;
        opacity: 0.9;
        margin: 0;
        font-style: italic;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding-top: 0.4rem;
    }

    /* Jumping Dots Typing Indicator */
    .typing-bubble {
        display: flex;
        gap: 0.3rem;
        align-items: center;
        padding: 1rem 1.25rem;
    }
    
    .dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        background: #9ca3af;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }
    
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
    }

    /* Input Box styling */
    .input-wrapper { position: relative; }
    .input-wrapper input {
        width: 100%; background-color: var(--card-bg); border: 1px solid var(--border-color);
        padding: 0.875rem 3.5rem 0.875rem 3rem;
        border-radius: 0.75rem; color: var(--text-white); outline: none; font-size: 1rem;
        transition: border-color 0.2s; box-sizing: border-box;
    }
    .input-wrapper input:focus { border-color: var(--accent-purple); }
    .input-wrapper input:disabled { opacity: 0.7; color: var(--accent-red); font-weight: 500; }
    
    .mic-btn { 
        position: absolute; left: 0.5rem; top: 0.45rem; background: none; border: none; 
        color: var(--text-gray); font-size: 1.4rem; padding: 0.4rem; cursor: pointer; 
        transition: color 0.2s; z-index: 2;
    }
    .mic-btn:hover { color: var(--accent-purple); }
    .mic-btn.active { color: var(--accent-red); }
    
    .send-btn { 
        position: absolute; right: 0.5rem; top: 0.5rem; background-color: var(--accent-purple); 
        border: none; color: white; padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; 
        display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }


    /* --- WIDGETS --- */
    .widget-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: start; }
    .widget { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; text-align: left; transition: transform 0.2s, border-color 0.2s; }
    .widget.clickable { cursor: pointer; }
    .widget.clickable:hover { border-color: var(--accent-purple); transform: translateY(-2px); }
    .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; width: 100%; }
    .widget-header h3 { margin: 0; font-size: 1rem; color: var(--text-white); }

    .notif-card { display: flex; align-items: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 3px solid var(--accent-orange); width: 100%; }
    .notif-dot { display: inline-block; width: 0.5rem; height: 0.5rem; background: var(--accent-orange); border-radius: 50%; margin-right: 0.75rem; flex-shrink: 0; }
    .notif-dot.silent { background: var(--text-gray); }
    .notif-title { color: var(--text-white); font-size: 0.85rem; font-weight: 500; margin: 0; }
    .notif-time { color: var(--text-gray); font-size: 0.7rem; margin: 0.2rem 0 0 0; }

    /* TASKS WIDGET (DYNAMIC SIZE) */
    .tasks-widget { min-height: auto; }
    .task-item {
        display: flex; align-items: center; padding: 0.875rem; border-radius: 0.5rem; margin-bottom: 0.5rem;
        background: rgba(255,255,255,0.02); border: 1px solid transparent; transition: all 0.2s;
    }
    .task-item:hover { background: rgba(255,255,255,0.05); border-color: var(--border-color); }
    .task-text { flex: 1; font-size: 0.875rem; color: #d1d5db; margin: 0 0.75rem; }

    .complete-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; }
    .circle { display: inline-block; width: 1.25rem; height: 1.25rem; border: 2px solid #4b5563; border-radius: 50%; transition: all 0.2s; }
    .complete-btn:hover .circle { border-color: var(--accent-green); background: rgba(34, 197, 94, 0.1); }

    .task-meta-info { display: flex; align-items: center; gap: 0.75rem; }
    .time-tag { font-size: 0.7rem; color: var(--text-gray); display: flex; align-items: center; gap: 0.25rem; }
    .tag { font-size: 0.625rem; padding: 0.15rem 0.5rem; border-radius: 0.25rem; text-transform: capitalize; }
    .tag.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .tag.mid { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .tag.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

    .side-widgets { display: flex; flex-direction: column; gap: 1.5rem; }
    .habits-widget { min-height: 140px; }
    .donut-row { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; justify-content: center; width: 100%; }
    .donut { width: 80px; height: 80px; border-radius: 50%; position: relative; flex-shrink: 0; background-color: #2a2b3d; }
    .donut.large { width: 180px; height: 180px; margin: 0 auto; }
    .donut .hole { position: absolute; background: var(--card-bg); border-radius: 50%; }
    .donut:not(.large) .hole { top: 12px; left: 12px; right: 12px; bottom: 12px; }
    .donut.large .hole { top: 30px; left: 30px; right: 30px; bottom: 30px; }

    .legend { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; color: var(--text-gray); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
    .l-text { color: white; }
    .l-pct { margin-left: auto; color: var(--text-gray); }

    .deadline-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .deadline-title { display: flex; align-items: center; color: var(--text-gray); gap: 0.5rem; }
    .time-left { font-size: 0.75rem; color: #6b7280; }

    /* --- MODALS --- */
    .modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
        background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 1.5rem;
        width: 90%; max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .modal-header {
        padding: 1.5rem; border-bottom: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h3 { margin: 0; color: white; display: flex; align-items: center; gap: 0.75rem; font-size: 1.1rem; }
    .close-btn { background: none; border: none; color: var(--text-gray); cursor: pointer; font-size: 1.5rem; transition: color 0.2s; }
    .close-btn:hover { color: white; }

    .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }

    /* --- NOTIF ACCORDION --- */
    .notif-accordion { display: flex; flex-direction: column; gap: 0.75rem; }
    .notif-group {
        border: 1px solid var(--border-color); border-radius: 1rem; background: rgba(255, 255, 255, 0.02);
        overflow: hidden; transition: all 0.3s ease;
    }
    .notif-group.expanded { border-color: var(--accent-purple); background: rgba(99, 102, 241, 0.05); }
    .notif-trigger {
        width: 100%; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;
        background: none; border: none; cursor: pointer; text-align: left;
    }
    .notif-main { flex: 1; }
    .notif-group .chevron { color: var(--text-gray); transition: transform 0.3s; }
    .notif-group.expanded .chevron { transform: rotate(180deg); color: var(--accent-purple); }
    .notif-meta { font-size: 0.7rem; color: var(--text-gray); margin: 0.25rem 0 0; }

    .notif-details { border-top: 1px solid rgba(255, 255, 255, 0.05); }
    .details-inner { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-col label, .detail-col .detail-label { display: block; font-size: 0.65rem; text-transform: uppercase; color: var(--text-gray); margin-bottom: 0.4rem; letter-spacing: 0.05em; }
    .detail-col p { margin: 0; color: white; font-size: 0.9rem; font-weight: 500; }

    .empty-notif { text-align: center; padding: 4rem 2rem; color: var(--text-gray); }
    .empty-notif i { font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block; }

    /* --- HABIT MODAL --- */
    .habit-modal { max-width: 500px; }
    .habit-body { padding: 2.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
    .donut-center {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .total-val { font-size: 2.5rem; font-weight: 800; color: white; line-height: 1; }
    .total-lbl { font-size: 0.8rem; color: var(--text-gray); text-transform: uppercase; }
    .full-legend { display: flex; flex-direction: column; gap: 1.25rem; }
    .legend-row { display: flex; align-items: center; gap: 1rem; }
    .legend-row .label { width: 80px; color: white; font-size: 0.85rem; }
    .progress-track { flex: 1; height: 6px; background: var(--bg-dark); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; }
    .legend-row .val { width: 40px; text-align: right; color: var(--text-gray); font-size: 0.85rem; font-weight: 600; }

    @media (min-width: 1024px) {
        .search-bar { display: block; }
        .widget-grid { grid-template-columns: 2fr 1fr; }
    }
    @media (max-width: 768px) {
        .top-header { padding: 0 1rem; }
        .dashboard-scroll { padding: 1rem; }
        .detail-row { grid-template-columns: 1fr; }
    }
</style>