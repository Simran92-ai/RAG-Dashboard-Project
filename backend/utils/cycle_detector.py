"""
utils/cycle_detector.py  —  FIXED VERSION

No logic bugs were found in the DFS itself.
Cleanup: removed duplicate/dead code at the bottom.
The detect_deadlock() helper function at the bottom is the
public API used by graph_builder.py.
"""

from typing import Dict, List, Tuple, Optional, Set


class CycleDetector:
    """
    DFS-based cycle detection for a directed Resource Allocation Graph.

    Request edge : process → resource
    Allocation edge: resource → process

    A cycle in this directed graph = circular wait = deadlock.
    """

    def __init__(self, adjacency: Dict[str, List[str]]):
        self.adjacency = adjacency
        self.visited:    Set[str] = set()
        self.rec_stack:  Set[str] = set()   # nodes on the current DFS path
        self.parent:     Dict[str, Optional[str]] = {}
        self.traversal_steps: List[dict] = []
        self.cycle_path: List[str] = []
        self.step_counter = 0

    def detect_cycle(self) -> Tuple[bool, List[str], List[dict]]:
        """
        Run DFS over all nodes.
        Returns (has_cycle, cycle_path_ids, traversal_steps).
        """
        all_nodes = set(self.adjacency.keys())
        for neighbors in self.adjacency.values():
            all_nodes.update(neighbors)

        # Ensure every node has an entry (even leaf nodes)
        for node in all_nodes:
            if node not in self.adjacency:
                self.adjacency[node] = []

        for node in all_nodes:
            if node not in self.visited:
                self._log("start", node, f"Starting DFS from: {node}")
                found, path = self._dfs(node)
                if found:
                    return True, path, self.traversal_steps

        return False, [], self.traversal_steps

    # ── Private helpers ───────────────────────────────────────────

    def _dfs(self, node: str) -> Tuple[bool, List[str]]:
        self.visited.add(node)
        self.rec_stack.add(node)
        self._log("visit", node, f"Visiting: {node}", list(self.rec_stack))

        for neighbor in self.adjacency.get(node, []):
            self._log("explore", neighbor,
                      f"Edge {node} → {neighbor}", list(self.rec_stack))

            if neighbor not in self.visited:
                self.parent[neighbor] = node
                found, path = self._dfs(neighbor)
                if found:
                    return True, path

            elif neighbor in self.rec_stack:
                self._log("cycle", neighbor,
                          f"🔴 Back edge: {node} → {neighbor}",
                          list(self.rec_stack))
                return True, self._reconstruct_cycle(node, neighbor)

        self.rec_stack.discard(node)
        self._log("backtrack", node, f"Backtrack from: {node}",
                  list(self.rec_stack))
        return False, []

    def _reconstruct_cycle(self, current: str, cycle_start: str) -> List[str]:
        stack_list = list(self.rec_stack)
        try:
            idx = stack_list.index(cycle_start)
            cycle = stack_list[idx:] + [current, cycle_start]
        except ValueError:
            cycle = [cycle_start, current, cycle_start]
            node = current
            seen = {current}
            while node in self.parent and self.parent[node] != cycle_start:
                node = self.parent[node]
                if node in seen:
                    break
                cycle.insert(1, node)
                seen.add(node)
        self.cycle_path = cycle
        return cycle

    def _log(self, step_type: str, node: str, message: str,
             stack: Optional[List[str]] = None):
        self.step_counter += 1
        self.traversal_steps.append({
            "step":          self.step_counter,
            "type":          step_type,
            "node":          node,
            "message":       message,
            "current_stack": stack or []
        })


# ── Public helper used by graph_builder.py ────────────────────────

def detect_deadlock(
    processes:   List[dict],
    resources:   List[dict],
    requests:    List[dict],
    allocations: List[dict],
) -> Tuple[bool, List[str], List[dict], Dict[str, List[str]]]:
    """
    Convert RAG input to adjacency list and run cycle detection.

    Returns (has_cycle, cycle_path_ids, traversal_steps, adjacency_dict)
    """
    adjacency: Dict[str, List[str]] = {}

    for p in processes:
        adjacency[p["id"]] = []
    for r in resources:
        adjacency[r["id"]] = []

    # Request: process → resource
    for req in requests:
        adjacency[req["process"]].append(req["resource"])

    # Allocation: resource → process
    for alloc in allocations:
        adjacency[alloc["resource"]].append(alloc["process"])

    detector = CycleDetector(adjacency)
    has_cycle, cycle_path, steps = detector.detect_cycle()

    return has_cycle, cycle_path, steps, adjacency