"""
routes/graph_routes.py — Extended (no hard limits on processes/resources)
"""

from flask import Blueprint, request, jsonify
from models.graph_model import GraphInput
from utils.graph_builder import GraphBuilder

graph_bp = Blueprint('graph', __name__)
builder  = GraphBuilder()


def _validate_input(data: dict):
    if not data:
        return "Request body is empty."
    for key in ('processes', 'resources', 'requests', 'allocations'):
        if not isinstance(data.get(key), list):
            return f"'{key}' must be a list."
    if len(data['processes']) == 0 and len(data['resources']) == 0:
        return "At least one process or resource is required."
    # NO hard upper limit — removed 20-node cap
    return None


@graph_bp.route('/analyze', methods=['POST'])
def analyze_graph():
    try:
        data  = request.get_json(force=True)
        error = _validate_input(data)
        if error:
            return jsonify({"error": error}), 400
        graph_input = GraphInput.from_dict(data)
        result      = builder.build_and_analyze(graph_input)
        return jsonify(result.to_dict()), 200
    except Exception as e:
        import traceback
        return jsonify({"error": f"Internal server error: {str(e)}", "trace": traceback.format_exc()}), 500


@graph_bp.route('/sample', methods=['GET'])
def get_sample():
    """Classic deadlock with single-instance resources."""
    return jsonify({
        "processes": [
            {"id": "p0", "label": "Process A"},
            {"id": "p1", "label": "Process B"},
        ],
        "resources": [
            {"id": "r0", "label": "Resource X", "category": "CPU",    "instances": 1},
            {"id": "r1", "label": "Resource Y", "category": "Memory", "instances": 1},
        ],
        "requests":    [{"process": "p0", "resource": "r0"}, {"process": "p1", "resource": "r1"}],
        "allocations": [{"resource": "r0", "process": "p1", "instances": 1},
                        {"resource": "r1", "process": "p0", "instances": 1}],
        "max_demand": [],
    }), 200


@graph_bp.route('/sample_multi', methods=['GET'])
def get_sample_multi():
    """Multi-instance Banker's algorithm sample (safe state)."""
    return jsonify({
        "processes": [
            {"id": "p0", "label": "P0"},
            {"id": "p1", "label": "P1"},
            {"id": "p2", "label": "P2"},
        ],
        "resources": [
            {"id": "r0", "label": "CPU",    "category": "CPU",    "instances": 3},
            {"id": "r1", "label": "Memory", "category": "Memory", "instances": 3},
        ],
        "requests": [
            {"process": "p0", "resource": "r0"},
            {"process": "p1", "resource": "r1"},
        ],
        "allocations": [
            {"resource": "r0", "process": "p0", "instances": 1},
            {"resource": "r0", "process": "p1", "instances": 1},
            {"resource": "r1", "process": "p1", "instances": 1},
            {"resource": "r1", "process": "p2", "instances": 2},
        ],
        "max_demand": [
            {"process": "p0", "resource": "r0", "instances": 2},
            {"process": "p0", "resource": "r1", "instances": 1},
            {"process": "p1", "resource": "r0", "instances": 2},
            {"process": "p1", "resource": "r1", "instances": 2},
            {"process": "p2", "resource": "r0", "instances": 1},
            {"process": "p2", "resource": "r1", "instances": 3},
        ],
    }), 200


@graph_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "RAG Visualizer API running"}), 200
