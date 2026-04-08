"""
utils/graph_builder.py  — Extended
Orchestrates single-instance (cycle detection) and multi-instance (Banker's) analysis.
"""

from typing import Dict, List, Tuple
from models.graph_model import GraphInput, GraphResult
from utils.cycle_detector import CycleDetector
from utils.bankers_algorithm import run_bankers


class GraphBuilder:

    def build_and_analyze(self, graph_input: GraphInput) -> GraphResult:
        nodes, edges = self._build_nodes_edges(graph_input)
        id_to_label  = {n["id"]: n["label"] for n in nodes}
        id_to_res    = {r["id"]: r for r in graph_input.resources}

        # Decide mode: if ANY resource has instances > 1 → multi-instance
        is_multi = any(
            int(r.get("instances", 1)) > 1
            for r in graph_input.resources
        )

        if is_multi:
            return self._analyze_multi(graph_input, nodes, edges, id_to_label, id_to_res)
        else:
            return self._analyze_single(graph_input, nodes, edges, id_to_label)

    # ------------------------------------------------------------------ #
    #  Single-instance: DFS cycle detection                               #
    # ------------------------------------------------------------------ #

    def _analyze_single(self, gi, nodes, edges, id_to_label):
        adjacency = self._build_adjacency(edges)
        detector  = CycleDetector(adjacency)
        has_cycle, cycle_path_ids, steps = detector.detect_cycle()

        cycle_edges = []
        if has_cycle and len(cycle_path_ids) >= 2:
            cycle_edges = [
                {"source": cycle_path_ids[i], "target": cycle_path_ids[i+1]}
                for i in range(len(cycle_path_ids) - 1)
            ]

        cycle_path_labels = [id_to_label.get(n, n) for n in cycle_path_ids]

        adj_display = {}
        for src, targets in adjacency.items():
            adj_display[id_to_label.get(src, src)] = [id_to_label.get(t, t) for t in targets]

        enriched_steps = self._enrich_steps(steps, id_to_label)

        # Safe sequence via simple topological simulation for single-instance
        safe_seq = []
        if not has_cycle:
            safe_seq = self._single_instance_safe_seq(gi, id_to_label)

        explanation = self._explain_single(has_cycle, cycle_path_labels, safe_seq)

        return GraphResult(
            nodes=nodes, edges=edges,
            deadlock_detected=has_cycle,
            detection_mode="single_instance",
            cycle_path=cycle_path_labels,
            cycle_edges=cycle_edges,
            deadlocked_procs=[],
            dependency_info=[],
            is_safe=not has_cycle,
            safe_sequence=safe_seq,
            alloc_matrix={}, need_matrix={}, max_matrix={}, available={},
            traversal_steps=enriched_steps,
            adjacency_list=adj_display,
            explanation=explanation,
        )

    def _single_instance_safe_seq(self, gi, id_to_label):
        """Simple safe sequence for single-instance: processes that hold
        nothing are safe first, then those whose held resources are freed."""
        allocated_to = {}   # resource_id -> process_id
        for alloc in gi.allocations:
            allocated_to[alloc["resource"]] = alloc["process"]

        waiting_for = {}    # process_id -> resource_id
        for req in gi.requests:
            waiting_for[req["process"]] = req["resource"]

        all_pids   = [p["id"] for p in gi.processes]
        done       = set()
        safe_seq   = []
        changed    = True

        while changed:
            changed = False
            for pid in all_pids:
                if pid in done:
                    continue
                rid = waiting_for.get(pid)
                if rid is None:
                    safe_seq.append(id_to_label.get(pid, pid))
                    done.add(pid)
                    # free its held resources
                    for r, p in list(allocated_to.items()):
                        if p == pid:
                            del allocated_to[r]
                    changed = True
                elif rid not in allocated_to or allocated_to[rid] in done:
                    safe_seq.append(id_to_label.get(pid, pid))
                    done.add(pid)
                    for r, p in list(allocated_to.items()):
                        if p == pid:
                            del allocated_to[r]
                    changed = True

        return safe_seq

    # ------------------------------------------------------------------ #
    #  Multi-instance: Banker's Algorithm                                  #
    # ------------------------------------------------------------------ #

    def _analyze_multi(self, gi, nodes, edges, id_to_label, id_to_res):
        proc_ids = [p["id"] for p in gi.processes]
        res_ids  = [r["id"] for r in gi.resources]

        # Build allocation matrix from allocations list
        alloc_raw: Dict[str, Dict[str, int]] = {pid: {rid: 0 for rid in res_ids} for pid in proc_ids}
        for alloc in gi.allocations:
            pid = alloc["process"]
            rid = alloc["resource"]
            n   = int(alloc.get("instances", 1))
            if pid in alloc_raw and rid in alloc_raw[pid]:
                alloc_raw[pid][rid] += n

        # Build max matrix from max_demand (optional)
        max_raw: Dict[str, Dict[str, int]] = {pid: {rid: 0 for rid in res_ids} for pid in proc_ids}
        for md in gi.max_demand:
            pid = md["process"]
            rid = md["resource"]
            n   = int(md.get("instances", 1))
            if pid in max_raw and rid in max_raw.get(pid, {}):
                max_raw[pid][rid] = n

        # If no max_demand provided, assume max = allocation + request (1 for each request)
        if not gi.max_demand:
            for req in gi.requests:
                pid = req["process"]
                rid = req["resource"]
                if pid in max_raw:
                    max_raw[pid][rid] = max_raw[pid].get(rid, 0) + 1 + alloc_raw.get(pid, {}).get(rid, 0)

        # Total instances per resource
        total: Dict[str, int] = {r["id"]: int(r.get("instances", 1)) for r in gi.resources}

        # Available = total - sum of allocations
        available_raw: Dict[str, int] = {}
        for rid in res_ids:
            used = sum(alloc_raw[pid][rid] for pid in proc_ids)
            available_raw[rid] = max(0, total[rid] - used)

        result = run_bankers(proc_ids, res_ids, max_raw, alloc_raw, available_raw)

        # Convert IDs → labels in all matrices
        def matrix_labels(mat):
            return {
                id_to_label.get(pid, pid): {
                    id_to_label.get(rid, rid): v
                    for rid, v in row.items()
                }
                for pid, row in mat.items()
            }

        avail_labels = {id_to_label.get(rid, rid): v for rid, v in result["available"].items()}
        safe_seq_labels = [id_to_label.get(p, p) for p in result["safe_sequence"]]
        deadlocked_labels = [id_to_label.get(p, p) for p in result["deadlocked"]]

        # Dependency info with labels
        dep_info = []
        for item in result["dependency_info"]:
            dep_info.append({
                "process": id_to_label.get(item["process"], item["process"]),
                "blocking": [
                    {
                        "resource":  id_to_label.get(b["resource"], b["resource"]),
                        "needed":    b["needed"],
                        "available": b["available"],
                        "held_by":   [id_to_label.get(h, h) for h in b["held_by"]],
                    }
                    for b in item["blocking"]
                ],
            })

        # Deadlocked node IDs for graph highlighting
        deadlocked_ids = result["deadlocked"]
        cycle_edges    = self._multi_deadlock_edges(deadlocked_ids, gi)

        explanation = self._explain_multi(
            result["is_safe"], safe_seq_labels, deadlocked_labels, dep_info
        )

        # Adjacency for display
        adjacency  = self._build_adjacency(edges)
        adj_display = {
            id_to_label.get(src, src): [id_to_label.get(t, t) for t in tgts]
            for src, tgts in adjacency.items()
        }

        return GraphResult(
            nodes=nodes, edges=edges,
            deadlock_detected=not result["is_safe"],
            detection_mode="multi_instance",
            cycle_path=[],
            cycle_edges=cycle_edges,
            deadlocked_procs=deadlocked_labels,
            dependency_info=dep_info,
            is_safe=result["is_safe"],
            safe_sequence=safe_seq_labels,
            alloc_matrix=matrix_labels(result["alloc_matrix"]),
            need_matrix=matrix_labels(result["need_matrix"]),
            max_matrix=matrix_labels(result["max_matrix"]),
            available=avail_labels,
            traversal_steps=[],
            adjacency_list=adj_display,
            explanation=explanation,
        )

    def _multi_deadlock_edges(self, deadlocked_ids, gi):
        """Build edges to highlight for multi-instance deadlock:
        request edges FROM deadlocked processes."""
        deadlocked_set = set(deadlocked_ids)
        edges = []
        for req in gi.requests:
            if req["process"] in deadlocked_set:
                edges.append({"source": req["process"], "target": req["resource"]})
        for alloc in gi.allocations:
            if alloc["process"] in deadlocked_set:
                edges.append({"source": alloc["resource"], "target": alloc["process"]})
        return edges

    # ------------------------------------------------------------------ #
    #  Shared helpers                                                      #
    # ------------------------------------------------------------------ #

    def _build_nodes_edges(self, gi: GraphInput):
        nodes = []
        edges = []

        for p in gi.processes:
            nodes.append({"id": p["id"], "label": p["label"], "type": "process"})

        for r in gi.resources:
            category  = r.get("category", "")
            instances = int(r.get("instances", 1))
            # Label format: "Core 1 (CPU - 4)" or just "Resource X" if no category
            if category:
                label = f"{r['label']} ({category} - {instances})" if instances > 1 else f"{r['label']} ({category})"
            else:
                label = r["label"]
            nodes.append({
                "id":       r["id"],
                "label":    label,
                "type":     "resource",
                "category": category,
                "instances": instances,
            })

        for req in gi.requests:
            edges.append({"source": req["process"], "target": req["resource"], "type": "request"})

        for alloc in gi.allocations:
            edges.append({"source": alloc["resource"], "target": alloc["process"], "type": "allocation"})

        return nodes, edges

    def _build_adjacency(self, edges):
        adj = {}
        for e in edges:
            src, tgt = e["source"], e["target"]
            adj.setdefault(src, [])
            adj.setdefault(tgt, [])
            if tgt not in adj[src]:
                adj[src].append(tgt)
        return adj

    def _enrich_steps(self, steps, id_to_label):
        enriched = []
        for step in steps:
            s = dict(step)
            s["node_label"] = id_to_label.get(step["node"], step["node"])
            s["current_stack_labels"] = [
                id_to_label.get(n, n) for n in step.get("current_stack", [])
            ]
            enriched.append(s)
        return enriched

    # ------------------------------------------------------------------ #
    #  Explanation generators                                              #
    # ------------------------------------------------------------------ #

    def _explain_single(self, has_cycle, cycle_labels, safe_seq):
        if not has_cycle:
            seq = " → ".join(safe_seq) if safe_seq else "N/A"
            return (
                f"✅ System is in a SAFE state.\n\n"
                f"Safe Sequence: {seq}\n\n"
                f"No circular wait found. All processes can complete in the above order."
            )
        path = " → ".join(cycle_labels)
        return (
            f"🔴 DEADLOCK DETECTED (Single-instance resources)\n\n"
            f"Cycle: {path}\n\n"
            f"Each process in the cycle waits for a resource held by the next — "
            f"none can proceed without external intervention."
        )

    def _explain_multi(self, is_safe, safe_seq, deadlocked, dep_info):
        if is_safe:
            seq = " → ".join(safe_seq) if safe_seq else "N/A"
            return (
                f"✅ System is in a SAFE state (Banker's Algorithm)\n\n"
                f"Safe Sequence: {seq}\n\n"
                f"Resources can be allocated and released in the above order "
                f"without deadlock."
            )

        procs = ", ".join(deadlocked)
        lines = [
            f"🔴 DEADLOCK DETECTED (Multi-instance resources)\n",
            f"Deadlocked Processes: {procs}\n",
        ]
        for item in dep_info:
            for b in item["blocking"]:
                holders = ", ".join(b["held_by"]) if b["held_by"] else "no process"
                lines.append(
                    f"• {item['process']} needs {b['needed']} of {b['resource']} "
                    f"but only {b['available']} available (held by {holders})"
                )
        return "\n".join(lines)
