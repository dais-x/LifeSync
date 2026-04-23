# LifeSync: Semi-Autonomous Intelligent Task Scheduling System

## Overview

LifeSync is an AI-powered task scheduling and life management system designed to reduce cognitive overload and improve overall well-being. Modern users often struggle with managing tasks spread across multiple platforms such as email, messaging applications, and calendars. LifeSync addresses this challenge by automatically extracting, organizing, and scheduling tasks while maintaining a balance between productivity and personal health.

The system integrates intelligent automation, adaptive scheduling, and wellness tracking to create a unified and context-aware productivity environment.

---

## Live Application

Access the deployed LifeSync system here:  
https://api.lifesync.laddu.cc

---

## Problem Statement

Traditional task management systems rely heavily on manual input and static scheduling. This leads to:

- Cognitive overload  
- Missed deadlines  
- Inefficient task prioritization  
- Lack of adaptability to user behavior  

LifeSync aims to overcome these limitations by introducing automation, adaptability, and user-centric scheduling.

---

## Solution Approach

The system operates in three major phases:

- **Data Acquisition:** Automatically collects tasks from multiple sources  
- **Task Evaluation:** Assigns priority and energy levels  
- **Adaptive Scheduling:** Dynamically allocates and reschedules tasks  

This approach ensures efficient task handling while maintaining user well-being.

---

## Key Features

### 1. Automatic Task Ingestion (n8n Orchestration)
LifeSync uses **n8n as its core orchestration engine** to automate the process of task collection from multiple communication platforms such as Gmail and messaging services. Through structured workflow pipelines, the system extracts important information like deadlines, reminders, and actionable items using Natural Language Processing (NLP). This eliminates the need for manual data entry and significantly reduces the risk of missing critical tasks.

---

### 2. Voice-Based Task Input (Whisper Integration)
LifeSync integrates **Whisper-based speech recognition**, allowing users to input tasks through voice commands. The spoken input is transcribed into text and processed through the n8n workflow pipeline for scheduling. This improves accessibility and reduces interaction effort.

---

### 3. Adaptive Scheduling System
The system dynamically adjusts tasks based on priority, deadlines, and user behavior patterns. It monitors real-time progress and reallocates tasks accordingly, ensuring efficient time utilization and preventing backlog accumulation.

---

### 4. Energy Level Scoring (ELS) Framework
Each task is assigned an energy value based on complexity and effort. A daily energy threshold is maintained to prevent overload. This ensures a balance between high-energy and low-energy tasks, reducing burnout.

---

### 5. Ghost Mode (Automatic Rescheduling)
Ghost Mode automatically reschedules incomplete tasks by analyzing priority, urgency, and available time slots. High-priority tasks are handled first to ensure important deadlines are not missed.

---

### 6. Wellness and Lifestyle Integration
LifeSync includes features such as hydration tracking, medication reminders, and period tracking. These ensure users maintain a balance between productivity and personal health.

---

### 7. AI Chatbot Interface
An AI-powered chatbot allows users to interact using natural language. Tasks can be added, modified, or queried conversationally, improving usability and accessibility.

---

### 8. Learning and Productivity Tools
Users can upload study materials and generate flashcards automatically. Calendar-based visualization helps in planning and organizing tasks effectively.

---

## System Architecture

LifeSync follows a modular architecture centered around **n8n orchestration**:

- **n8n Workflow Engine:** Task ingestion and automation  
- **NLP & Whisper Modules:** Text and voice processing  
- **Scheduling Engine:** ELS and adaptive scheduling  
- **Frontend:** User interface and visualization  
- **Backend:** Data processing and logic  

---

## Technologies Used

- n8n (Workflow Automation)  
- Whisper (Speech-to-Text)  
- Python  
- Natural Language Processing (NLP)  
- Machine Learning  
- HTML, CSS, JavaScript, SvelteKit  

---

## Applications

- Personal productivity management  
- Academic scheduling  
- Professional task management  
- Health-aware planning  

---

## Future Scope

- Multi-device synchronization  
- Emotion-aware scheduling using wearable data  
- Predictive habit modeling  
- Edge computing for better privacy  

---

## Conclusion

LifeSync transforms traditional task management into an intelligent, adaptive, and wellness-oriented system. By combining automation with human-centered design, it reduces planning fatigue, enhances productivity, and promotes a balanced lifestyle.
