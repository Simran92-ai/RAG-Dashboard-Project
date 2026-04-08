"""
models/graph_model.py
Extended data models — supports single-instance (cycle) and multi-instance (Banker's).
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional

RESOURCE_CATEGORIES = ["CPU", "Memory", "I/O Device", "File", "Network"]


@dataclass
class GraphInput:
    processes:   List[Dict]
    resources:   List[Dict]
    requests:    List[Dict]
    allocations: List[Dict]
    max_demand:  List[Dict] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> 'GraphInput':
        return cls(
            processes=data.get('processes',   []),
            resources=data.get('resources',   []),
            requests=data.get('requests',     []),
            allocations=data.get('allocations', []),
            max_demand=data.get('max_demand',   []),
        )


@dataclass
class GraphResult:
    nodes:             List[dict]
    edges:             List[dict]
    deadlock_detected: bool
    detection_mode:    str
    cycle_path:        List[str]
    cycle_edges:       List[dict]
    deadlocked_procs:  List[str]
    dependency_info:   List[dict]
    is_safe:           bool
    safe_sequence:     List[str]
    alloc_matrix:      Dict
    need_matrix:       Dict
    max_matrix:        Dict
    available:         Dict
    traversal_steps:   List[dict]
    adjacency_list:    Dict
    explanation:       str

    def to_dict(self) -> dict:
        return {
            "nodes":             self.nodes,
            "edges":             self.edges,
            "deadlock_detected": self.deadlock_detected,
            "detection_mode":    self.detection_mode,
            "cycle_path":        self.cycle_path,
            "cycle_edges":       self.cycle_edges,
            "deadlocked_procs":  self.deadlocked_procs,
            "dependency_info":   self.dependency_info,
            "is_safe":           self.is_safe,
            "safe_sequence":     self.safe_sequence,
            "alloc_matrix":      self.alloc_matrix,
            "need_matrix":       self.need_matrix,
            "max_matrix":        self.max_matrix,
            "available":         self.available,
            "traversal_steps":   self.traversal_steps,
            "adjacency_list":    self.adjacency_list,
            "explanation":       self.explanation,
        }
