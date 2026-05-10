# GlycoBot 🦠🤖

GlycoBot is an interactive, 3D biological visualization tool that explores the **Glycolysis** pathway. It is powered by a **Local AI Assistant** (using Ollama and the `qwen2.5:14b` model) that can autonomously navigate and manipulate the 3D scene based on natural language instructions using ReACT tool-calling capabilities.

## 🌟 Key Features

*   **Interactive 3D Visualization:** Explore the steps of Glycolysis in stunning 3D.
*   **Local AI Assistant:** Chat with an embedded, context-aware AI running entirely locally via Ollama. 
*   **Autonomous Scene Control:** Ask the bot to "go to the next step", "inspect the enzyme", or "turn on pro mode", and it will autonomously issue tool calls to control the 3D environment.
*   **Multiple Viewing Modes:**
    *   **Overview:** High-level view of the current reaction step.
    *   **Inspect:** Close-up examination of specific molecules and enzymes.
    *   **Explode:** Expanded view of complexes for detailed structural analysis.
*   **Pro Mode:** Toggle "Atomic Detail" for deeper structural insights.

## 🛠️ Tech Stack

*   **Framework:** React 19 + Vite
*   **3D Graphics:** Three.js, React Three Fiber (@react-three/fiber), React Three Drei (@react-three/drei)
*   **State Management:** Zustand
*   **Animations:** GSAP
*   **Local LLM Integration:** Ollama API (`qwen2.5:14b`)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [Ollama](https://ollama.ai/) running locally.

### Setting up the Local AI Model
You will need to pull the specific Qwen model that GlycoBot uses to handle scene orchestration:
```bash
ollama run qwen2.5:14b
```

## 🚀 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd GlycoBot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   Ensure Ollama is running in the background, then execute:
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to the URL provided by Vite (usually `http://localhost:5173`).

## 🏗️ Project Architecture

The core of the application resides in `src/`:

*   **`src/biology/`**: Contains the biological data and structural definitions for each step of glycolysis (`glycolysisSteps.js`).
*   **`src/components/`**: React components representing the UI overlay, assistant panel, and other HUD elements.
*   **`src/core/`**: Three.js core components managing the active 3D `SceneManager.jsx`.
*   **`src/store/`**: Zustand state stores.
    *   `useSimulationStore.js`: Manages the 3D simulation state (current step, camera angles, active entities, pro mode).
    *   `useChatStore.js`: The central orchestrator for the local LLM. It tracks conversation history, parses natural language intent, and dispatches ReACT tool calls (`control_scene`) back to the simulation state.
*   **`src/utils/`**: Helper functions for scene entity matching and parsing interactions.

## 🧠 How the AI Works

GlycoBot's AI doesn't just chat—it *acts*. 

1. **Context Gathering:** On every user message, `useChatStore.js` generates a "Scene Snapshot" describing the current step, active enzyme, camera mode, and what controls/entities are clickable.
2. **Inference & Orchestration:** The user's message, along with the system prompt and available tools (like `control_scene`), is sent to the local `qwen2.5:14b` model.
3. **Tool Calling:** If the model determines it needs to change the scene (e.g., "show me step 3"), it replies with a structured tool call.
4. **Execution:** The application catches this tool call, updates the Zustand simulation store, and the 3D scene automatically transitions to the requested state.
