module.exports = {

"[project]/components/SkillTree/SkillGraph.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>SkillGraph)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$force$2d$graph$2d$2d$2f$dist$2f$react$2d$force$2d$graph$2d$2d$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-force-graph-2d/dist/react-force-graph-2d.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/skillTreeUtils.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function SkillGraph({ data, userProgress, onProgressUpdate }) {
    const fgRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])();
    const [dimensions, setDimensions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        width: 800,
        height: 600
    });
    const [hoveredNode, setHoveredNode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Update dimensions on window resize
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
    }, []);
    // Handle node click (double click to unlock)
    const handleNodeClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((node)=>{
        if (node.canUnlock) {
            const updatedProgress = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["unlockSkill"])(node.id, userProgress);
            onProgressUpdate(updatedProgress);
        }
        // Focus on clicked node
        fgRef.current?.centerAt(node.x, node.y, 1000);
        fgRef.current?.zoom(2.5, 1000);
    }, [
        userProgress,
        onProgressUpdate
    ]);
    // Custom node painting
    const paintNode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((node, ctx)=>{
        const size = node.level === 0 ? 20 : node.level === 1 ? 15 : 10;
        // Base circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        // Fill based on node state
        if (node.isUnlocked) {
            // Unlocked - use a bright color
            ctx.fillStyle = '#2DD4BF'; // Teal color
        } else if (node.canUnlock) {
            // Can unlock - use a slightly dimmer color
            ctx.fillStyle = '#0D9488'; // Darker teal
        } else {
            // Locked - use a dark/muted color
            ctx.fillStyle = '#134E4A'; // Very dark teal
        }
        ctx.fill();
        // Outer glow for canUnlock nodes
        if (node.canUnlock) {
            ctx.shadowColor = '#2DD4BF';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        // Border
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Label for important nodes or hovered node
        if (node.level <= 1 || hoveredNode?.id === node.id) {
            ctx.fillStyle = '#F8FAFC';
            ctx.font = node.level === 0 ? 'bold 12px Arial' : '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.name, 0, size + 10);
        }
    }, [
        hoveredNode
    ]);
    // Custom link painting for curved edges
    const paintLink = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((link, ctx)=>{
        const { source, target } = link;
        // Determine color based on source/target state
        if (source.isUnlocked && target.isUnlocked) {
            ctx.strokeStyle = '#2DD4BF'; // Bright for connected
        } else if (source.isUnlocked && target.canUnlock) {
            ctx.strokeStyle = '#0D9488'; // Medium for potential
        } else {
            ctx.strokeStyle = '#134E4A'; // Dark for locked
        }
        ctx.lineWidth = link.value || 1;
        // Calculate control point for curve
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Draw curved path
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        // Simple curved line
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const curveFactor = dist * 0.2;
        // Orthogonal vector for control point
        const orthX = -dy / dist * curveFactor;
        const orthY = dx / dist * curveFactor;
        ctx.quadraticCurveTo(midX + orthX, midY + orthY, target.x, target.y);
        ctx.stroke();
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "skill-graph",
        style: {
            width: '100%',
            height: '100vh',
            position: 'relative'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$force$2d$graph$2d$2d$2f$dist$2f$react$2d$force$2d$graph$2d$2d$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                ref: fgRef,
                graphData: data,
                width: dimensions.width,
                height: dimensions.height,
                nodeLabel: "description",
                nodeCanvasObject: paintNode,
                linkCanvasObject: paintLink,
                linkDirectionalParticles: 2,
                linkDirectionalParticleSpeed: 0.005,
                nodeRelSize: 1,
                onNodeClick: handleNodeClick,
                onNodeHover: setHoveredNode,
                cooldownTime: 3000,
                d3VelocityDecay: 0.3,
                d3AlphaDecay: 0.02,
                d3Force: (d3)=>{
                    // Customize forces
                    d3.force('charge').strength(-120);
                    d3.force('link').distance((link)=>link.value === 2 ? 150 : 80);
                    // Apply radial force to organize by levels
                    d3.force('radial', d3.forceRadial().radius((node)=>node.level * 120).strength(0.8));
                }
            }, void 0, false, {
                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                lineNumber: 137,
                columnNumber: 7
            }, this),
            hoveredNode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "skill-tooltip",
                style: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    padding: '12px',
                    borderRadius: '8px',
                    maxWidth: '300px',
                    color: '#F8FAFC',
                    border: '1px solid #1E293B',
                    zIndex: 10
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-lg font-bold mb-2",
                        children: hoveredNode.name
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 185,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm mb-3",
                        children: hoveredNode.description
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 186,
                        columnNumber: 11
                    }, this),
                    Object.entries(hoveredNode.skillPoints).map(([skill, value])=>value > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "skill-point-bar mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between text-xs mb-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: skill.replace('_', ' ')
                                        }, void 0, false, {
                                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                            lineNumber: 193,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                value,
                                                "/5"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                            lineNumber: 194,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                    lineNumber: 192,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-slate-700 rounded-full h-2 w-full",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-teal-500 h-2 rounded-full",
                                        style: {
                                            width: `${value / 5 * 100}%`
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                        lineNumber: 197,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                    lineNumber: 196,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, skill, true, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 191,
                            columnNumber: 15
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 text-sm",
                        children: hoveredNode.isUnlocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-teal-400",
                            children: "✓ Débloqué"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 208,
                            columnNumber: 15
                        }, this) : hoveredNode.canUnlock ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-amber-400",
                            children: "⟳ Disponible - Double-cliquez pour débloquer"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 210,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-slate-400",
                            children: "🔒 Verrouillé"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 212,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 206,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                lineNumber: 170,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
        lineNumber: 136,
        columnNumber: 5
    }, this);
}
}}),
"[project]/components/SkillTree/SkillGraph.tsx [app-ssr] (ecmascript, next/dynamic entry)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/components/SkillTree/SkillGraph.tsx [app-ssr] (ecmascript)"));
}}),

};

//# sourceMappingURL=components_SkillTree_SkillGraph_tsx_1c9374e2._.js.map