# RAG Visualizer — Resource Allocation Graph Deadlock Detector

A full-stack web application for visualizing Resource Allocation Graphs and detecting deadlocks using DFS-based cycle detection.

**Tech Stack:** Python Flask · React.js · vis-network · CSS Variables

---

## Project Structure

```
rag-visualizer/
├── backend/
│   ├── app.py                  # Flask entry point
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   └── graph_routes.py     # API endpoints
│   ├── models/
│   │   └── graph_model.py      # Data models (Node, Edge, GraphInput, GraphResult)
│   └── utils/
│   │   ├── bankers_algorithm.py
│   │   ├── cycle_detector.py   # DFS-based cycle detection
│   │   └── graph_builder.py    # Graph construction + analysis orchestrator
│   ├──venv/
│   ├──app.py
└── frontend/
    ├── package.json
    └── src/
        ├── index.jsx
        ├── App.jsx
        ├── styles/
        │   ├── globals.css     # CSS variables, resets, theme (light/dark)
        │   └── App.css         # Layout grid
        └── components/
            ├── Header.jsx/css       # Navbar + theme toggle
            ├── InputPanel.jsx/css   # Process/resource/edge input form
            ├── GraphCanvas.jsx/css  # vis-network interactive graph
            ├── ResultPanel.jsx/css  # Deadlock status + explanation
            ├── StepsPanel.jsx/css   # DFS step-by-step viewer
            ├── AdjacencyTable.jsx/css  # Adjacency list table
            └── EducationSection.jsx/css  # Collapsible learning section
```

---

## Quick Setup

### Prerequisites
- Python 3.9+
- Node.js 16+ and npm

---

### 1. Backend (Flask)

```bash
cd rag-visualizer/backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Backend runs at: **http://localhost:5000**

---

### 2. Frontend (React)

Open a **new terminal**:

```bash
cd rag-visualizer/frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs at: **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint       | Description                          |
|--------|---------------|--------------------------------------|
| POST   | /api/analyze  | Analyze RAG for deadlocks            |
| GET    | /api/sample   | Get classic 4-node deadlock example  |
| GET    | /api/health   | Health check                         |

### POST /api/analyze — Request Body

```json
{
  "processes": [
    { "id": "p0", "label": "Process A" },
    { "id": "p1", "label": "Process B" }
  ],
  "resources": [
    { "id": "r0", "label": "Resource X" },
    { "id": "r1", "label": "Resource Y" }
  ],
  "requests": [
    { "process": "p0", "resource": "r0" },
    { "process": "p1", "resource": "r1" }
  ],
  "allocations": [
    { "resource": "r0", "process": "p1" },
    { "resource": "r1", "process": "p0" }
  ]
}
```

### Response

```json
{
  "nodes": [...],
  "edges": [...],
  "deadlock_detected": true,
  "cycle_path": ["Process A", "Resource X", "Process B", "Resource Y", "Process A"],
  "cycle_edges": [{"source": "p0", "target": "r0"}, ...],
  "traversal_steps": [...],
  "adjacency_list": {"Process A": ["Resource X"], ...},
  "explanation": "🔴 DEADLOCK DETECTED! ..."
}
```

---

## Features

| Feature | Description |
|---------|-------------|
| Interactive Graph | vis-network with zoom, drag, tooltips |
| Deadlock Detection | DFS-based cycle detection |
| Red Highlighting | Cycle nodes and edges highlighted in red |
| Step-by-Step | Full DFS traversal with stack inspection |
| Light/Dark Theme | CSS variable-based theming with smooth transitions |
| Export PNG | Download graph as image |
| Sample Data | One-click classic deadlock example |
| Adjacency Table | Human-readable graph representation |
| Education Panel | Collapsible OS deadlock theory sections |

---

## Sample Deadlock (built-in)

```
Process A → Resource X (request)
Resource X → Process B (allocated to)
Process B → Resource Y (request)
Resource Y → Process A (allocated to)
```

Cycle: Process A → Resource X → Process B → Resource Y → Process A

---

## Edge Cases Handled

- No edges: validation error shown
- Isolated nodes: handled gracefully
- Duplicate edges: silently ignored
- Large inputs: up to any no.of processes and resources
- Invalid requests: 400 response with clear error message
- Backend unreachable: error banner with message
