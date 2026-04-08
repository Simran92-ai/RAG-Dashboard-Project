// // components/GraphCanvas.js
// // Interactive vis-network graph with deadlock highlighting + export
// import React, { useEffect, useRef, useCallback } from 'react';
// import { Network, DataSet } from 'vis-network/standalone';
// import './GraphCanvas.css';

// /* ── vis.js options factory ────────────────────────────── */
// function buildOptions(isDark) {
//   const processColor   = isDark ? '#5b6af5' : '#4361ee';
//   const resourceColor  = isDark ? '#f49058' : '#e07b39';
//   const deadlockColor  = '#fc5c5c';
//   const edgeDefault    = isDark ? '#4a4a6e' : '#9a9ab0';
//   const textColor      = isDark ? '#e8e8f5' : '#1a1a2e';

//   return {
//     nodes: {
//       font: {
//         family: 'DM Sans, sans-serif',
//         size: 13,
//         color: textColor,
//         bold: { mod: 'bold' },
//       },
//       borderWidth: 2,
//       borderWidthSelected: 3,
//       shadow: { enabled: true, size: 8, x: 0, y: 3, color: 'rgba(0,0,0,0.25)' },
//     },
//     edges: {
//       width: 2,
//       color: { color: edgeDefault, highlight: deadlockColor, hover: processColor },
//       arrows: { to: { enabled: true, scaleFactor: 0.75 } },
//       smooth: { type: 'curvedCW', roundness: 0.15 },
//       shadow: { enabled: false },
//       selectionWidth: 3,
//     },
//     physics: {
//       enabled: true,
//       solver: 'forceAtlas2Based',
//       forceAtlas2Based: {
//         gravitationalConstant: -60,
//         centralGravity: 0.008,
//         springLength: 120,
//         springConstant: 0.05,
//         damping: 0.6,
//         avoidOverlap: 0.5,
//       },
//       stabilization: { iterations: 200, updateInterval: 25 },
//     },
//     interaction: {
//       hover: true,
//       tooltipDelay: 200,
//       zoomView: true,
//       dragView: true,
//       navigationButtons: true,
//       keyboard: { enabled: true },
//     },
//     layout: { improvedLayout: true },
//     autoResize: true,
//   };
// }

// /* ── Build vis DataSets from API result ────────────────── */
// function buildDatasets(graphData) {
//   const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
//   const processColor  = isDark ? '#5b6af5' : '#4361ee';
//   const resourceColor = isDark ? '#f49058' : '#e07b39';
//   const deadlockColor = '#fc5c5c';
//   const edgeDefault   = isDark ? '#555580' : '#9090b0';

//   // Build cycle edge set for fast lookup
//   const cycleEdgeSet = new Set(
//     (graphData.cycle_edges || []).map(e => `${e.source}||${e.target}`)
//   );
//   const cycleNodeSet = new Set(graphData.cycle_path?.flatMap
//     ? graphData.cycle_path.flatMap
//       ? [] // labels not IDs — we need IDs
//       : []
//     : []
//   );

//   // Collect IDs of nodes in cycle (using raw IDs from cycle_edges)
//   const cycleNodeIds = new Set();
//   (graphData.cycle_edges || []).forEach(e => {
//     cycleNodeIds.add(e.source);
//     cycleNodeIds.add(e.target);
//   });

//   const nodes = new DataSet(
//     graphData.nodes.map(n => {
//       const isProcess  = n.type === 'process';
//       const inCycle    = cycleNodeIds.has(n.id);
//       const baseColor  = isProcess ? processColor : resourceColor;
//       const color      = inCycle ? deadlockColor : baseColor;

//       return {
//         id:    n.id,
//         label: n.label,
//         title: `<div style="font-family:DM Sans,sans-serif;padding:6px 10px;font-size:12px">
//                   <b>${n.label}</b><br/>
//                   Type: ${n.type}${inCycle ? '<br/><span style="color:#fc5c5c">⚠ In deadlock cycle</span>' : ''}
//                 </div>`,
//         shape: isProcess ? 'ellipse' : 'box',
//         color: {
//           background: inCycle ? 'rgba(252,92,92,0.15)' : `${baseColor}22`,
//           border:     color,
//           highlight:  { background: `${color}33`, border: color },
//           hover:      { background: `${color}22`, border: color },
//         },
//         font: { color: inCycle ? deadlockColor : undefined },
//         borderWidth: inCycle ? 3 : 2,
//         size: 30,
//         margin: 10,
//       };
//     })
//   );

//   const edges = new DataSet(
//     graphData.edges.map((e, i) => {
//       const key      = `${e.source}||${e.target}`;
//       const inCycle  = cycleEdgeSet.has(key);
//       const isReq    = e.type === 'request';

//       return {
//         id:    `e${i}`,
//         from:  e.source,
//         to:    e.target,
//         label: isReq ? 'req' : 'alloc',
//         color: {
//           color:     inCycle ? deadlockColor : edgeDefault,
//           highlight: inCycle ? deadlockColor : '#6475ff',
//         },
//         width:       inCycle ? 3 : 2,
//         dashes:      !inCycle && !isReq,
//         font: {
//           size:  9,
//           color: inCycle ? deadlockColor : '#7070a0',
//           align: 'middle',
//         },
//         arrows: { to: { enabled: true, scaleFactor: 0.75 } },
//         smooth: { type: isReq ? 'curvedCW' : 'curvedCCW', roundness: 0.2 },
//       };
//     })
//   );

//   return { nodes, edges };
// }

// /* ── Component ─────────────────────────────────────────── */
// export default function GraphCanvas({ graphData, loading }) {
//   const containerRef = useRef(null);
//   const networkRef   = useRef(null);
//   const nodesRef     = useRef(null);
//   const edgesRef     = useRef(null);

//   // Detect current theme
//   const isDark = () =>
//     document.documentElement.getAttribute('data-theme') !== 'light';

//   /* Initialise / update network */
//   useEffect(() => {
//     if (!graphData || !containerRef.current) return;

//     const { nodes, edges } = buildDatasets(graphData);
//     nodesRef.current = nodes;
//     edgesRef.current = edges;

//     if (networkRef.current) {
//       networkRef.current.destroy();
//     }

//     const options = buildOptions(isDark());
//     networkRef.current = new Network(
//       containerRef.current,
//       { nodes, edges },
//       options
//     );

//     // Fit after stabilisation
//     networkRef.current.once('stabilizationIterationsDone', () => {
//       networkRef.current.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
//     });

//     return () => {
//       if (networkRef.current) {
//         networkRef.current.destroy();
//         networkRef.current = null;
//       }
//     };
//   }, [graphData]);

//   // Rebuild on theme change
//   useEffect(() => {
//     if (!networkRef.current || !graphData) return;
//     networkRef.current.setOptions(buildOptions(isDark()));
//   });

//   /* ── Fit to view ────────────────────────────────────── */
//   const handleFit = useCallback(() => {
//     networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
//   }, []);

//   /* ── Export PNG ─────────────────────────────────────── */
//   const handleExport = useCallback(() => {
//     if (!networkRef.current) return;
//     const canvas = containerRef.current?.querySelector('canvas');
//     if (!canvas) return;
//     const link = document.createElement('a');
//     link.download = 'resource-allocation-graph.png';
//     link.href = canvas.toDataURL('image/png');
//     link.click();
//   }, []);

//   const isEmpty = !graphData && !loading;

//   return (
//     <div className="graph-card">
//       <div className="graph-card-header">
//         <div className="graph-title-group">
//           <span className="card-title">Graph Visualization</span>
//           {graphData && (
//             <span className={`graph-status-badge ${graphData.deadlock_detected ? 'badge--deadlock' : 'badge--safe'}`}>
//               {graphData.deadlock_detected ? '🔴 Deadlock Detected' : '🟢 System Safe'}
//             </span>
//           )}
//         </div>
//         <div className="graph-controls">
//           {graphData && (
//             <>
//               <button className="gc-btn" onClick={handleFit} title="Fit graph to view">⊡ Fit</button>
//               <button className="gc-btn gc-btn--export" onClick={handleExport} title="Download as PNG">
//                 ↓ Export PNG
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ── Legend ────────────────────────────────────── */}
//       <div className="graph-legend">
//         <div className="legend-item">
//           <span className="legend-shape legend-circle"></span>
//           <span>Process</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-square"></span>
//           <span>Resource</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-deadlock"></span>
//           <span>Deadlock cycle</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--req"></span>
//           <span>Request</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--alloc"></span>
//           <span>Allocation</span>
//         </div>
//       </div>

//       {/* ── Canvas area ───────────────────────────────── */}
//       <div className="graph-canvas-wrap">
//         {loading && (
//           <div className="graph-overlay">
//             <div className="graph-spinner"></div>
//             <span>Analyzing graph…</span>
//           </div>
//         )}
//         {isEmpty && (
//           <div className="graph-empty">
//             <div className="graph-empty-icon">⬡</div>
//             <p>Enter processes and resources,<br/>then click <b>Generate Graph</b></p>
//           </div>
//         )}
//         <div
//           ref={containerRef}
//           className="vis-container"
//           style={{ opacity: loading || isEmpty ? 0 : 1 }}
//         />
//       </div>
//     </div>
//   );
// }






// components/GraphCanvas.js — FINAL FIX
// Problem: In safe state (no deadlock), node labels were invisible in light mode.
// Root cause: vis-network ignores per-node font.color if the global options
//   font.color is set to a light value, AND the node background is nearly
//   transparent — so text blends into the canvas background.
//
// Fix strategy:
//   1. In light mode, give nodes a solid near-white background so dark text pops
//   2. Set per-node font.color explicitly to near-black (#111122) always in light mode
//   3. Use strokeWidth + white strokeColor so text is legible on any bg
//   4. Pass isDark directly into buildDatasets() — don't re-read from DOM mid-render
//   5. Track theme changes via prevThemeRef to avoid unnecessary full rebuilds

// import React, { useEffect, useRef, useCallback } from 'react';
// import { Network, DataSet } from 'vis-network/standalone';
// import './GraphCanvas.css';

// /* ── Color palette per theme ─────────────────────────────────────── */
// function getPalette(isDark) {
//   return {
//     processColor:  isDark ? '#6475ff' : '#4361ee',
//     resourceColor: isDark ? '#f49058' : '#c85d1e',
//     deadlockColor: '#e53e3e',
//     edgeDefault:   isDark ? '#555580' : '#7777aa',
//     edgeFontColor: isDark ? '#9090c0' : '#444466',

//     // KEY FIX: near-black in light mode so text is always visible
//     nodeFontColor: isDark ? '#e8e8f5' : '#111122',

//     // KEY FIX: solid light backgrounds in light mode (not transparent)
//     // so dark text has proper contrast
//     processBg:  isDark ? 'rgba(100,117,255,0.18)' : '#eef0ff',
//     resourceBg: isDark ? 'rgba(244,144,88,0.18)'  : '#fff3eb',
//     deadlockBg: isDark ? 'rgba(229,62,62,0.20)'   : '#fff0f0',

//     processBorder:  isDark ? '#6475ff' : '#4361ee',
//     resourceBorder: isDark ? '#f49058' : '#c85d1e',
//     deadlockBorder: '#e53e3e',

//     // White outline on letters — helps on tinted backgrounds
//     fontStrokeWidth: isDark ? 0 : 3,
//     fontStrokeColor: '#ffffff',
//   };
// }

// /* ── Global vis.js network options ──────────────────────────────── */
// function buildOptions(isDark) {
//   const p = getPalette(isDark);
//   return {
//     nodes: {
//       font: {
//         family:      'DM Sans, sans-serif',
//         size:        14,
//         color:       p.nodeFontColor,
//         strokeWidth: p.fontStrokeWidth,
//         strokeColor: p.fontStrokeColor,
//       },
//       borderWidth:         2,
//       borderWidthSelected: 3,
//       shadow: {
//         enabled: true,
//         size:    isDark ? 8 : 4,
//         x: 0, y: 2,
//         color:   isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)',
//       },
//     },
//     edges: {
//       width: 2,
//       color: {
//         color:     p.edgeDefault,
//         highlight: p.processColor,
//         hover:     p.processColor,
//       },
//       arrows: { to: { enabled: true, scaleFactor: 0.8 } },
//       smooth: { type: 'curvedCW', roundness: 0.15 },
//       selectionWidth: 3,
//     },
//     physics: {
//       enabled: true,
//       solver: 'forceAtlas2Based',
//       forceAtlas2Based: {
//         gravitationalConstant: -60,
//         centralGravity: 0.008,
//         springLength: 130,
//         springConstant: 0.05,
//         damping: 0.6,
//         avoidOverlap: 0.6,
//       },
//       stabilization: { iterations: 200, updateInterval: 25 },
//     },
//     interaction: {
//       hover: true,
//       tooltipDelay: 200,
//       zoomView: true,
//       dragView: true,
//       navigationButtons: true,
//       keyboard: { enabled: true },
//     },
//     layout: { improvedLayout: true },
//     autoResize: true,
//   };
// }

// /* ── Build node + edge DataSets ─────────────────────────────────── */
// function buildDatasets(graphData, isDark) {
//   const p = getPalette(isDark);

//   // Nodes in the deadlock cycle
//   const cycleNodeIds = new Set();
//   (graphData.cycle_edges || []).forEach(e => {
//     cycleNodeIds.add(e.source);
//     cycleNodeIds.add(e.target);
//   });

//   // Edges in the cycle
//   const cycleEdgeSet = new Set(
//     (graphData.cycle_edges || []).map(e => `${e.source}||${e.target}`)
//   );

//   /* Nodes */
//   const nodes = new DataSet(
//     graphData.nodes.map(n => {
//       const isProcess = n.type === 'process';
//       const inCycle   = cycleNodeIds.has(n.id);

//       const bg     = inCycle ? p.deadlockBg     : (isProcess ? p.processBg     : p.resourceBg);
//       const border = inCycle ? p.deadlockBorder : (isProcess ? p.processBorder : p.resourceBorder);

//       // In safe state: every node is NOT inCycle → all get p.nodeFontColor
//       // In light mode p.nodeFontColor = '#111122' — very dark, always readable
//       const fontColor = inCycle ? p.deadlockColor : p.nodeFontColor;

//       return {
//         id:    n.id,
//         label: n.label,
//         title: `<div style="
//                   font-family:DM Sans,sans-serif;
//                   padding:8px 12px;
//                   font-size:12px;
//                   line-height:1.6;
//                   color:#111122;
//                   background:#ffffff;
//                   border-radius:6px;
//                   box-shadow:0 2px 8px rgba(0,0,0,0.15);
//                 ">
//                   <b>${n.label}</b><br/>
//                   Type: ${isProcess ? 'Process' : 'Resource'}
//                   ${inCycle
//                     ? '<br/><span style="color:#e53e3e;font-weight:600">⚠ In deadlock cycle</span>'
//                     : ''}
//                 </div>`,
//         shape: isProcess ? 'ellipse' : 'box',
//         color: {
//           background: bg,
//           border,
//           highlight: { background: bg, border },
//           hover:     { background: bg, border },
//         },
//         // Per-node font — overrides global options, explicitly set always
//         font: {
//           color:       fontColor,
//           size:        14,
//           face:        'DM Sans, sans-serif',
//           strokeWidth: p.fontStrokeWidth,
//           strokeColor: p.fontStrokeColor,
//         },
//         borderWidth: inCycle ? 3 : 2,
//         size:   32,
//         margin: 12,
//       };
//     })
//   );

//   /* Edges */
//   const edges = new DataSet(
//     graphData.edges.map((e, i) => {
//       const inCycle = cycleEdgeSet.has(`${e.source}||${e.target}`);
//       const isReq   = e.type === 'request';

//       return {
//         id:    `e${i}`,
//         from:  e.source,
//         to:    e.target,
//         label: isReq ? 'req' : 'alloc',
//         color: {
//           color:     inCycle ? p.deadlockColor : p.edgeDefault,
//           highlight: inCycle ? p.deadlockColor : p.processColor,
//           hover:     inCycle ? p.deadlockColor : p.processColor,
//         },
//         width:  inCycle ? 3 : 2,
//         dashes: !inCycle && !isReq,
//         font: {
//           size:        9,
//           color:       inCycle ? p.deadlockColor : p.edgeFontColor,
//           align:       'middle',
//           strokeWidth: p.fontStrokeWidth,
//           strokeColor: p.fontStrokeColor,
//         },
//         arrows: { to: { enabled: true, scaleFactor: 0.8 } },
//         smooth: { type: isReq ? 'curvedCW' : 'curvedCCW', roundness: 0.2 },
//       };
//     })
//   );

//   return { nodes, edges };
// }

// /* ── React Component ─────────────────────────────────────────────── */
// export default function GraphCanvas({ graphData, loading }) {
//   const containerRef = useRef(null);
//   const networkRef   = useRef(null);
//   const prevThemeRef = useRef(null);

//   const getIsDark = () =>
//     document.documentElement.getAttribute('data-theme') !== 'light';

//   /* Build/rebuild network when graphData changes */
//   useEffect(() => {
//     if (!graphData || !containerRef.current) return;

//     const isDark = getIsDark();
//     prevThemeRef.current = isDark;

//     const { nodes, edges } = buildDatasets(graphData, isDark);

//     if (networkRef.current) {
//       networkRef.current.destroy();
//     }

//     networkRef.current = new Network(
//       containerRef.current,
//       { nodes, edges },
//       buildOptions(isDark)
//     );

//     networkRef.current.once('stabilizationIterationsDone', () => {
//       networkRef.current?.fit({
//         animation: { duration: 600, easingFunction: 'easeInOutQuad' },
//       });
//     });

//     return () => {
//       networkRef.current?.destroy();
//       networkRef.current = null;
//     };
//   }, [graphData]);

//   /* Rebuild when theme changes */
//   useEffect(() => {
//     if (!networkRef.current || !graphData) return;
//     const isDark = getIsDark();
//     if (prevThemeRef.current === isDark) return; // no change
//     prevThemeRef.current = isDark;

//     // setOptions alone doesn't update per-node font.color — need full setData
//     const { nodes, edges } = buildDatasets(graphData, isDark);
//     networkRef.current.setData({ nodes, edges });
//     networkRef.current.setOptions(buildOptions(isDark));
//     networkRef.current.fit({
//       animation: { duration: 400, easingFunction: 'easeInOutQuad' },
//     });
//   });

//   const handleFit = useCallback(() => {
//     networkRef.current?.fit({
//       animation: { duration: 400, easingFunction: 'easeInOutQuad' },
//     });
//   }, []);

//   const handleExport = useCallback(() => {
//     const canvas = containerRef.current?.querySelector('canvas');
//     if (!canvas) return;
//     const link = document.createElement('a');
//     link.download = 'resource-allocation-graph.png';
//     link.href = canvas.toDataURL('image/png');
//     link.click();
//   }, []);

//   const isEmpty = !graphData && !loading;

//   return (
//     <div className="graph-card">
//       <div className="graph-card-header">
//         <div className="graph-title-group">
//           <span className="card-title">Graph Visualization</span>
//           {graphData && (
//             <span className={`graph-status-badge ${graphData.deadlock_detected ? 'badge--deadlock' : 'badge--safe'}`}>
//               {graphData.deadlock_detected ? '🔴 Deadlock Detected' : '🟢 System Safe'}
//             </span>
//           )}
//         </div>
//         <div className="graph-controls">
//           {graphData && (
//             <>
//               <button className="gc-btn" onClick={handleFit} title="Fit graph to view">
//                 ⊡ Fit
//               </button>
//               <button className="gc-btn gc-btn--export" onClick={handleExport} title="Download as PNG">
//                 ↓ Export PNG
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Legend */}
//       <div className="graph-legend">
//         <div className="legend-item">
//           <span className="legend-shape legend-circle"></span>
//           <span>Process</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-square"></span>
//           <span>Resource</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-deadlock"></span>
//           <span>Deadlock cycle</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--req"></span>
//           <span>Request</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--alloc"></span>
//           <span>Allocation</span>
//         </div>
//       </div>

//       {/* Canvas */}
//       <div className="graph-canvas-wrap">
//         {loading && (
//           <div className="graph-overlay">
//             <div className="graph-spinner"></div>
//             <span>Analyzing graph…</span>
//           </div>
//         )}
//         {isEmpty && (
//           <div className="graph-empty">
//             <div className="graph-empty-icon">⬡</div>
//             <p>
//               Enter processes and resources,<br />
//               then click <b>Generate Graph</b>
//             </p>
//           </div>
//         )}
//         <div
//           ref={containerRef}
//           className="vis-container"
//           style={{ opacity: loading || isEmpty ? 0 : 1 }}
//         />
//       </div>
//     </div>
//   );
// }





// components/GraphCanvas.js — FINAL FIX
// Problem: In safe state (no deadlock), node labels were invisible in light mode.
// Root cause: vis-network ignores per-node font.color if the global options
//   font.color is set to a light value, AND the node background is nearly
//   transparent — so text blends into the canvas background.
//
// Fix strategy:
//   1. In light mode, give nodes a solid near-white background so dark text pops
//   2. Set per-node font.color explicitly to near-black (#111122) always in light mode
//   3. Use strokeWidth + white strokeColor so text is legible on any bg
//   4. Pass isDark directly into buildDatasets() — don't re-read from DOM mid-render
//   5. Track theme changes via prevThemeRef to avoid unnecessary full rebuilds

// import React, { useEffect, useRef, useCallback } from 'react';
// import { Network, DataSet } from 'vis-network/standalone';
// import './GraphCanvas.css';

// /* ── Color palette per theme ─────────────────────────────────────── */
// function getPalette(isDark) {
//   return {
//     processColor:  isDark ? '#6475ff' : '#4361ee',
//     resourceColor: isDark ? '#f49058' : '#c85d1e',
//     deadlockColor: '#e53e3e',
//     edgeDefault:   isDark ? '#555580' : '#7777aa',
//     //edgeFontColor: isDark ? '#9090c0' : '#444466',
//     //edgeFontColor: isDark ? '#b0b0b0' : '#666666',
//     edgeFontColor: isDark ? '#ffffff' : '#6b7280',

//     // KEY FIX: near-black in light mode so text is always visible
//     //nodeFontColor: isDark ? '#e8e8f5' : '#111122',
//     nodeFontColor: isDark ? '#ffffff' : '#111122',




//     // KEY FIX: solid light backgrounds in light mode (not transparent)
//     // so dark text has proper contrast
//     processBg:  isDark ? 'rgba(100,117,255,0.18)' : '#eef0ff',
//     resourceBg: isDark ? 'rgba(244,144,88,0.18)'  : '#fff3eb',
//     deadlockBg: isDark ? 'rgba(229,62,62,0.20)'   : '#fff0f0',

//     processBorder:  isDark ? '#6475ff' : '#4361ee',
//     resourceBorder: isDark ? '#f49058' : '#c85d1e',
//     deadlockBorder: '#e53e3e',

//     // White outline on letters — helps on tinted backgrounds
//     fontStrokeWidth: isDark ? 0 : 3,
//     fontStrokeColor: '#ffffff',
//   };
// }

// /* ── Global vis.js network options ──────────────────────────────── */
// function buildOptions(isDark) {
//   const p = getPalette(isDark);
//   return {
//     nodes: {
//       font: {
//         family:      'DM Sans, sans-serif',
//         size:        14,
//         color:       p.nodeFontColor,
//         strokeWidth: p.fontStrokeWidth,
//         strokeColor: p.fontStrokeColor,
//       },
//       borderWidth:         2,
//       borderWidthSelected: 3,
//       shadow: {
//         enabled: true,
//         size:    isDark ? 8 : 4,
//         x: 0, y: 2,
//         color:   isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)',
//       },
//     },
//     edges: {
//       width: 2,
//       color: {
//         color:     p.edgeDefault,
//         highlight: p.processColor,
//         hover:     p.processColor,
//       },
//       arrows: { to: { enabled: true, scaleFactor: 0.8 } },
//       smooth: { type: 'curvedCW', roundness: 0.15 },
//       selectionWidth: 3,
//     },
//     physics: {
//       enabled: true,
//       solver: 'forceAtlas2Based',
//       forceAtlas2Based: {
//         gravitationalConstant: -60,
//         centralGravity: 0.008,
//         springLength: 130,
//         springConstant: 0.05,
//         damping: 0.6,
//         avoidOverlap: 0.6,
//       },
//       stabilization: { iterations: 200, updateInterval: 25 },
//     },
//     interaction: {
//       hover: true,
//       tooltipDelay: 200,
//       zoomView: true,
//       dragView: true,
//       navigationButtons: true,
//       keyboard: { enabled: true },
//     },
//     layout: { improvedLayout: true },
//     autoResize: true,
//   };
// }

// /* ── Build node + edge DataSets ─────────────────────────────────── */
// function buildDatasets(graphData, isDark) {
//   const p = getPalette(isDark);

//   // Nodes in the deadlock cycle
//   const cycleNodeIds = new Set();
//   (graphData.cycle_edges || []).forEach(e => {
//     cycleNodeIds.add(e.source);
//     cycleNodeIds.add(e.target);
//   });

//   // Edges in the cycle
//   const cycleEdgeSet = new Set(
//     (graphData.cycle_edges || []).map(e => `${e.source}||${e.target}`)
//   );

//   /* Nodes */
//   const nodes = new DataSet(
//     graphData.nodes.map(n => {
//       const isProcess = n.type === 'process';
//       const inCycle   = cycleNodeIds.has(n.id);

//       const bg     = inCycle ? p.deadlockBg     : (isProcess ? p.processBg     : p.resourceBg);
//       const border = inCycle ? p.deadlockBorder : (isProcess ? p.processBorder : p.resourceBorder);

//       // In safe state: every node is NOT inCycle → all get p.nodeFontColor
//       // In light mode p.nodeFontColor = '#111122' — very dark, always readable
//       const fontColor = inCycle ? p.deadlockColor : p.nodeFontColor;

//       return {
//         id:    n.id,
//         label: n.label,
//         title: `<div style="
//                   font-family:DM Sans,sans-serif;
//                   padding:8px 12px;
//                   font-size:12px;
//                   line-height:1.6;
//                   color:#111122;
//                   background:#ffffff;
//                   border-radius:6px;
//                   box-shadow:0 2px 8px rgba(0,0,0,0.15);
//                 ">
//                   <b>${n.label}</b><br/>
//                   Type: ${isProcess ? 'Process' : 'Resource'}
//                   ${inCycle
//                     ? '<br/><span style="color:#e53e3e;font-weight:600">⚠ In deadlock cycle</span>'
//                     : ''}
//                 </div>`,
//         shape: isProcess ? 'ellipse' : 'box',
//         color: {
//           background: bg,
//           border,
//           highlight: { background: bg, border },
//           hover:     { background: bg, border },
//         },
//         // Per-node font — overrides global options, explicitly set always
//         font: {
//           color:       fontColor,
//           size:        14,
//           face:        'DM Sans, sans-serif',
//           strokeWidth: p.fontStrokeWidth,
//           strokeColor: p.fontStrokeColor,
//         },
//         borderWidth: inCycle ? 3 : 2,
//         size:   32,
//         margin: 12,
//       };
//     })
//   );

//   /* Edges */

//   const edges = new DataSet(
//     graphData.edges.map((e, i) => {
//       const inCycle = cycleEdgeSet.has(`${e.source}||${e.target}`);
//       const isReq   = e.type === 'request';

//       return {
//         id:    `e${i}`,
//         from:  e.source,
//         to:    e.target,
//         label: isReq ? 'req' : 'alloc',
//         color: {
//           color:     inCycle ? p.deadlockColor : p.edgeDefault,
//           highlight: inCycle ? p.deadlockColor : p.processColor,
//           hover:     inCycle ? p.deadlockColor : p.processColor,
//         },
//         width:  inCycle ? 3 : 2,
//         dashes: !inCycle && !isReq,
//         font: {
//           size:        10,
//           color:       inCycle ? p.deadlockColor : p.edgeFontColor,
//           align:       'middle',
//           strokeWidth: p.fontStrokeWidth,
//           strokeColor: p.fontStrokeColor,
//         },
//         arrows: { to: { enabled: true, scaleFactor: 0.8 } },
//         smooth: { type: isReq ? 'curvedCW' : 'curvedCCW', roundness: 0.2 },
//       };
//     })
//   );

//   return { nodes, edges };
// }

// /* ── React Component ─────────────────────────────────────────────── */
// export default function GraphCanvas({ graphData, loading }) {
//   const containerRef = useRef(null);
//   const networkRef   = useRef(null);
//   const prevThemeRef = useRef(null);

//   const getIsDark = () =>
//     document.documentElement.getAttribute('data-theme') !== 'light';

//   /* Build/rebuild network when graphData changes */
//   useEffect(() => {
//     if (!graphData || !containerRef.current) return;

//     const isDark = getIsDark();
//     prevThemeRef.current = isDark;

//     const { nodes, edges } = buildDatasets(graphData, isDark);

//     if (networkRef.current) {
//       networkRef.current.destroy();
//     }

//     networkRef.current = new Network(
//       containerRef.current,
//       { nodes, edges },
//       buildOptions(isDark)
//     );

//     networkRef.current.once('stabilizationIterationsDone', () => {
//       networkRef.current?.fit({
//         animation: { duration: 600, easingFunction: 'easeInOutQuad' },
//       });
//     });

//     return () => {
//       networkRef.current?.destroy();
//       networkRef.current = null;
//     };
//   }, [graphData]);

//   /* Rebuild when theme changes */
//   useEffect(() => {
//     if (!networkRef.current || !graphData) return;
//     const isDark = getIsDark();
//     if (prevThemeRef.current === isDark) return; // no change
//     prevThemeRef.current = isDark;

//     // setOptions alone doesn't update per-node font.color — need full setData
//     const { nodes, edges } = buildDatasets(graphData, isDark);
//     networkRef.current.setData({ nodes, edges });
//     networkRef.current.setOptions(buildOptions(isDark));
//     networkRef.current.fit({
//       animation: { duration: 400, easingFunction: 'easeInOutQuad' },
//     });
//   });

//   const handleFit = useCallback(() => {
//     networkRef.current?.fit({
//       animation: { duration: 400, easingFunction: 'easeInOutQuad' },
//     });
//   }, []);

//   const handleExport = useCallback(() => {
//     const canvas = containerRef.current?.querySelector('canvas');
//     if (!canvas) return;
//     const link = document.createElement('a');
//     link.download = 'resource-allocation-graph.png';
//     link.href = canvas.toDataURL('image/png');
//     link.click();
//   }, []);

//   const isEmpty = !graphData && !loading;

//   return (
//     <div className="graph-card">
//       <div className="graph-card-header">
//         <div className="graph-title-group">
//           <span className="card-title">Graph Visualization</span>
//           {graphData && (
//             <span className={`graph-status-badge ${graphData.deadlock_detected ? 'badge--deadlock' : 'badge--safe'}`}>
//               {graphData.deadlock_detected ? '🔴 Deadlock Detected' : '🟢 System Safe'}
//             </span>
//           )}
//         </div>
//         <div className="graph-controls">
//           {graphData && (
//             <>
//               <button className="gc-btn" onClick={handleFit} title="Fit graph to view">
//                 ⊡ Fit
//               </button>
//               <button className="gc-btn gc-btn--export" onClick={handleExport} title="Download as PNG">
//                 ↓ Export PNG
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Legend */}
//       <div className="graph-legend">
//         <div className="legend-item">
//           <span className="legend-shape legend-circle"></span>
//           <span>Process</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-square"></span>
//           <span>Resource</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-shape legend-deadlock"></span>
//           <span>Deadlock cycle</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--req"></span>
//           <span>Request</span>
//         </div>
//         <div className="legend-item">
//           <span className="legend-line legend-line--alloc"></span>
//           <span>Allocation</span>
//         </div>
//       </div>

//       {/* Canvas */}
//       <div className="graph-canvas-wrap">
//         {loading && (
//           <div className="graph-overlay">
//             <div className="graph-spinner"></div>
//             <span>Analyzing graph…</span>
//           </div>
//         )}
//         {isEmpty && (
//           <div className="graph-empty">
//             <div className="graph-empty-icon">⬡</div>
//             <p>
//               Enter processes and resources,<br />
//               then click <b>Generate Graph</b>
//             </p>
//           </div>
//         )}
//         <div
//           ref={containerRef}
//           className="vis-container"
//           style={{ opacity: loading || isEmpty ? 0 : 1 }}
//         />
//       </div>
//     </div>
//   );
// }








// components/GraphCanvas.js — Extended for multi-instance deadlock highlighting
import React, { useEffect, useRef, useCallback } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import './GraphCanvas.css';

function getPalette(isDark) {
  return {
    processColor: isDark ? '#6475ff' : '#4361ee',
    resourceColor: isDark ? '#f49058' : '#c85d1e',
    deadlockColor: '#e53e3e',
    edgeDefault: isDark ? '#555580' : '#7777aa',
    edgeFontColor: isDark ? '#9090c0' : '#444466',
    nodeFontColor: isDark ? '#e8e8f5' : '#111122',
    processBg: isDark ? 'rgba(100,117,255,0.18)' : '#eef0ff',
    resourceBg: isDark ? 'rgba(244,144,88,0.18)' : '#fff3eb',
    deadlockBg: isDark ? 'rgba(229,62,62,0.20)' : '#fff0f0',
    processBorder: isDark ? '#6475ff' : '#4361ee',
    resourceBorder: isDark ? '#f49058' : '#c85d1e',
    deadlockBorder: '#e53e3e',
    fontStrokeWidth: isDark ? 0 : 3,
    fontStrokeColor: '#ffffff',
  };
}

function buildOptions(isDark) {
  const p = getPalette(isDark);
  return {
    nodes: {
      font: {
        family: 'DM Sans, sans-serif', size: 14, color: p.nodeFontColor,
        strokeWidth: p.fontStrokeWidth, strokeColor: p.fontStrokeColor,
      },
      borderWidth: 2, borderWidthSelected: 3,
      shadow: { enabled: true, size: isDark ? 8 : 4, x: 0, y: 2, color: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)' },
    },
    edges: {
      width: 2,
      color: { color: p.edgeDefault, highlight: p.processColor, hover: p.processColor },
      arrows: { to: { enabled: true, scaleFactor: 0.8 } },
      smooth: { type: 'curvedCW', roundness: 0.15 }, selectionWidth: 3,
    },
    physics: {
      enabled: true, solver: 'forceAtlas2Based',
      forceAtlas2Based: { gravitationalConstant: -60, centralGravity: 0.008, springLength: 130, springConstant: 0.05, damping: 0.6, avoidOverlap: 0.6 },
      stabilization: { iterations: 200, updateInterval: 25 },
    },
    interaction: { hover: true, tooltipDelay: 200, zoomView: true, dragView: true, navigationButtons: true, keyboard: { enabled: true } },
    layout: { improvedLayout: true }, autoResize: true,
  };
}

function buildDatasets(graphData, isDark) {
  const p = getPalette(isDark);

  // Deadlocked node IDs — works for both single & multi instance
  const cycleNodeIds = new Set();
  (graphData.cycle_edges || []).forEach(e => {
    cycleNodeIds.add(e.source);
    cycleNodeIds.add(e.target);
  });
  const cycleEdgeSet = new Set(
    (graphData.cycle_edges || []).map(e => `${e.source}||${e.target}`)
  );

  const nodes = new DataSet(
    graphData.nodes.map(n => {
      const isProcess = n.type === 'process';
      const inCycle = cycleNodeIds.has(n.id);
      const bg = inCycle ? p.deadlockBg : (isProcess ? p.processBg : p.resourceBg);
      const border = inCycle ? p.deadlockBorder : (isProcess ? p.processBorder : p.resourceBorder);
      //const fontColor = inCycle ? p.deadlockColor : p.nodeFontColor;
      const fontColor = inCycle ? '#ff0000' : (isDark ? '#7d7d7d' : '#322d2d');

  
      return {
        id: n.id,
        label: n.label,
        shape: isProcess ? 'ellipse' : 'box',
        color: {
          background: bg,
          border,
          highlight: { background: bg, border },
          hover: { background: bg, border }
        },
        font: {
          color: fontColor,
          size: 14,
          face: 'DM Sans, sans-serif',
          strokeWidth: p.fontStrokeWidth,
          strokeColor: p.fontStrokeColor
        },
        borderWidth: inCycle ? 3 : 2,
        size: 32,
        margin: 12,
      };
    })
  );

  const edges = new DataSet(
    graphData.edges.map((e, i) => {
      const inCycle = cycleEdgeSet.has(`${e.source}||${e.target}`);
      const isReq = e.type === 'request';
      // Fixed: allocation edges are orange, request edges are blue
      const edgeColor = inCycle
        ? p.deadlockColor
        : isReq ? p.processColor : p.resourceColor;

      return {
        id: `e${i}`, from: e.source, to: e.target,
        label: isReq ? 'req' : 'alloc',
        color: { color: edgeColor, highlight: edgeColor, hover: edgeColor },
        width: inCycle ? 3 : 2,
        dashes: false,
        // font: { size: 9, color: inCycle ? p.deadlockColor : p.edgeFontColor, align: 'middle', strokeWidth: p.fontStrokeWidth, strokeColor: p.fontStrokeColor },
        font: {
          size: 9,
          color: inCycle ? '#ff0000' : (isDark ? '#7d7d7d' : '#374151'),
          align: 'middle'
        },
        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
        smooth: { type: isReq ? 'curvedCW' : 'curvedCCW', roundness: 0.2 },
      };
    })
  );

  return { nodes, edges };
}

export default function GraphCanvas({ graphData, loading }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const prevThemeRef = useRef(null);

  const getIsDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

  useEffect(() => {
    if (!graphData || !containerRef.current) return;
    const isDark = getIsDark();
    prevThemeRef.current = isDark;
    const { nodes, edges } = buildDatasets(graphData, isDark);
    if (networkRef.current) networkRef.current.destroy();
    networkRef.current = new Network(containerRef.current, { nodes, edges }, buildOptions(isDark));
    networkRef.current.once('stabilizationIterationsDone', () => {
      networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    });
    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [graphData]);

  useEffect(() => {
    if (!networkRef.current || !graphData) return;
    const isDark = getIsDark();
    if (prevThemeRef.current === isDark) return;
    prevThemeRef.current = isDark;
    const { nodes, edges } = buildDatasets(graphData, isDark);
    networkRef.current.setData({ nodes, edges });
    networkRef.current.setOptions(buildOptions(isDark));
    networkRef.current.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  });

  const handleFit = useCallback(() => {
    networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  }, []);

  const handleExport = useCallback(() => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'resource-allocation-graph.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const isEmpty = !graphData && !loading;

  return (
    <div className="graph-card">
      <div className="graph-card-header">
        <div className="graph-title-group">
          <span className="card-title">Graph Visualization</span>
          {graphData && (
            <span className={`graph-status-badge ${graphData.deadlock_detected ? 'badge--deadlock' : 'badge--safe'}`}>
              {graphData.deadlock_detected ? '🔴 Deadlock Detected' : '🟢 System Safe'}
            </span>
          )}
        </div>
        <div className="graph-controls">
          {graphData && (
            <>
              <button className="gc-btn" onClick={handleFit}>⊡ Fit</button>
              <button className="gc-btn gc-btn--export" onClick={handleExport}>↓ Export PNG</button>
            </>
          )}
        </div>
      </div>
      <div className="graph-legend">
        <div className="legend-item"><span className="legend-shape legend-circle"></span><span>Process</span></div>
        <div className="legend-item"><span className="legend-shape legend-square"></span><span>Resource</span></div>
        <div className="legend-item"><span className="legend-shape legend-deadlock"></span><span>Deadlocked</span></div>
        <div className="legend-item"><span className="legend-line" style={{ background: 'var(--node-process)' }}></span><span>Request</span></div>
        <div className="legend-item"><span className="legend-line" style={{ background: 'var(--node-resource)' }}></span><span>Allocation</span></div>
      </div>
      <div className="graph-canvas-wrap">
        {loading && (
          <div className="graph-overlay"><div className="graph-spinner"></div><span>Analyzing graph…</span></div>
        )}
        {isEmpty && (
          <div className="graph-empty">
            <div className="graph-empty-icon">⬡</div>
            <p>Enter processes and resources,<br />then click <b>Generate Graph</b></p>
          </div>
        )}
        <div ref={containerRef} className="vis-container" style={{ opacity: loading || isEmpty ? 0 : 1 }} />
      </div>
    </div>
  );
}
