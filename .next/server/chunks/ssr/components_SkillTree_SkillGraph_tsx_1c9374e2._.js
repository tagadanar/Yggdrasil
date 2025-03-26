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
var __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/skills.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$simulation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceSimulation$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/simulation.js [app-ssr] (ecmascript) <export default as forceSimulation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceLink$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/link.js [app-ssr] (ecmascript) <export default as forceLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$manyBody$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceManyBody$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/manyBody.js [app-ssr] (ecmascript) <export default as forceManyBody>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$collide$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceCollide$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/collide.js [app-ssr] (ecmascript) <export default as forceCollide>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$radial$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceRadial$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/radial.js [app-ssr] (ecmascript) <export default as forceRadial>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$center$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceCenter$3e$__ = __turbopack_context__.i("[project]/node_modules/d3-force/src/center.js [app-ssr] (ecmascript) <export default as forceCenter>");
'use client';
;
;
;
;
;
function SkillGraph({ data, userProgress, onProgressUpdate }) {
    const fgRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const simulationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [dimensions, setDimensions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        width: 800,
        height: 600
    });
    const [hoveredNode, setHoveredNode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedModule, setSelectedModule] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Diagnostic logging function
    const logNodePositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((nodes, context)=>{
        console.group(`Node Positions - ${context}`);
        nodes.forEach((node, index)=>{
            console.log(`Node ${index} (${node.name}):`, {
                id: node.id,
                level: node.level,
                x: node.x,
                y: node.y,
                fx: node.fx,
                fy: node.fy,
                isUnlocked: node.isUnlocked,
                canUnlock: node.canUnlock
            });
        });
        console.groupEnd();
    }, []);
    // Update dimensions on window resize
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
    }, []);
    // Debug unlock function
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
    }, [
        handleNodeClick,
        data.nodes
    ]);
    // Initialize force simulation
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Filter nodes based on unlock status
        const visibleNodes = data.nodes.filter((node)=>node.isUnlocked || node.id === 'join_school');
        if (visibleNodes.length > 0) {
            const width = dimensions.width;
            const height = dimensions.height;
            const centerX = width / 2;
            const centerY = height / 2;
            // Calculate optimal spacing based on canvas size
            const minSpacing = Math.min(width, height) * 0.2; // Increased to 20% of smallest dimension
            console.log('Spacing Analysis:', {
                canvasWidth: width,
                canvasHeight: height,
                totalNodes: visibleNodes.length,
                minSpacing,
                nodesPerLevel: {
                    level0: visibleNodes.filter((n)=>n.level === 0).length,
                    level1: visibleNodes.filter((n)=>n.level === 1).length,
                    level2: visibleNodes.filter((n)=>n.level === 2).length
                }
            });
            // Calculate dynamic radii based on canvas size
            const smallestDimension = Math.min(width, height);
            const levelRadii = {
                0: smallestDimension * 0.1,
                1: smallestDimension * 0.35,
                2: smallestDimension * 0.6 // Modules at 60% from center
            };
            console.log('Radii Configuration:', levelRadii);
            // Clear any previous fixed positions
            visibleNodes.forEach((node)=>{
                node.fx = undefined;
                node.fy = undefined;
            });
            // Set initial positions in a radial layout
            visibleNodes.forEach((node, index)=>{
                const level = node.level;
                const radius = levelRadii[level] || smallestDimension * 0.5;
                // Calculate position with more spacing
                const nodesAtLevel = visibleNodes.filter((n)=>n.level === level);
                const angleStep = 2 * Math.PI / nodesAtLevel.length;
                const nodeIndexAtLevel = nodesAtLevel.indexOf(node);
                const angle = nodeIndexAtLevel * angleStep;
                // Set initial positions
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
                // Fix positions for level 0 and 1 nodes to maintain structure
                if (level <= 1) {
                    node.fx = node.x;
                    node.fy = node.y;
                }
                console.log(`Node Position [${node.name}]:`, {
                    level,
                    radius,
                    angle: angle * (180 / Math.PI),
                    finalPosition: {
                        x: node.x,
                        y: node.y
                    },
                    nodesAtSameLevel: nodesAtLevel.length,
                    isFixed: level <= 1
                });
            });
            // Filter links to only include visible nodes
            const visibleLinks = data.links.filter((link)=>{
                const sourceNode = visibleNodes.find((n)=>n.id === (typeof link.source === 'string' ? link.source : link.source.id));
                const targetNode = visibleNodes.find((n)=>n.id === (typeof link.target === 'string' ? link.target : link.target.id));
                return sourceNode && targetNode;
            });
            // Create a simulation with stronger forces
            const simulation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$simulation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceSimulation$3e$__["forceSimulation"])(visibleNodes).force("center", (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$center$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceCenter$3e$__["forceCenter"])(centerX, centerY).strength(0.8)).force("link", (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceLink$3e$__["forceLink"])(visibleLinks).id((d)=>d.id).distance(minSpacing).strength(0.5)).force("charge", (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$manyBody$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceManyBody$3e$__["forceManyBody"])().strength((node)=>node.level === 0 ? -minSpacing * 4 : -minSpacing * 2).distanceMax(minSpacing * 5)).force("collide", (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$collide$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceCollide$3e$__["forceCollide"])().radius((node)=>{
                if (node.level === 0) return minSpacing * 0.8;
                if (node.level === 1) return minSpacing * 1.2;
                return minSpacing * 0.6;
            }).strength(0.9).iterations(5)).force("radial", (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$d3$2d$force$2f$src$2f$radial$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__forceRadial$3e$__["forceRadial"])((node)=>levelRadii[node.level] || levelRadii[2], centerX, centerY).strength(1)).alphaDecay(0.01).velocityDecay(0.3);
            // Monitor simulation progress
            simulation.on("tick", ()=>{
                const alpha = simulation.alpha();
                if (alpha < 0.1) {
                    // Log final positions of overlapping nodes
                    const overlaps = findOverlappingNodes(visibleNodes, minSpacing);
                    if (overlaps.length > 0) {
                        console.log('Overlapping nodes detected:', overlaps);
                    }
                }
            });
            // Store simulation reference
            simulationRef.current = simulation;
            return ()=>{
                simulation.stop();
            };
        }
    }, [
        data.nodes,
        dimensions,
        logNodePositions
    ]);
    // Helper function to detect overlapping nodes
    function findOverlappingNodes(nodes, minSpacing) {
        const overlaps = [];
        for(let i = 0; i < nodes.length; i++){
            for(let j = i + 1; j < nodes.length; j++){
                const node1 = nodes[i];
                const node2 = nodes[j];
                if (node1.x && node1.y && node2.x && node2.y) {
                    const dx = node1.x - node2.x;
                    const dy = node1.y - node2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minSpacing) {
                        overlaps.push({
                            node1: node1.name,
                            node2: node2.name,
                            distance
                        });
                    }
                }
            }
        }
        return overlaps;
    }
    // Handle node click (double click to unlock)
    const handleNodeClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((node)=>{
        if (node.canUnlock) {
            // Find the corresponding module from the original data
            const domain = data.nodes.find((n)=>n.level === 1 && n.id === node.group);
            const moduleData = domain ? __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].domaines_principaux.find((d)=>d.id === domain.id)?.modules.find((_, index)=>`${domain.id}_module_${index}` === node.id) : null;
            if (moduleData) {
                const module = {
                    id: node.id,
                    name: node.name,
                    description: node.description,
                    level: node.level,
                    actions_cles: moduleData.actions_cles,
                    concepts_acquis: moduleData.concepts_acquis,
                    skillPoints: moduleData.skill_points || {
                        problem_solving: 0,
                        coding_implementation: 0,
                        systems_thinking: 0,
                        collaboration_communication: 0,
                        learning_adaptability: 0
                    },
                    isUnlocked: false,
                    canUnlock: true
                };
                const updatedProgress = unlockSkill(userProgress, node.id, module);
                onProgressUpdate(updatedProgress);
            }
        }
        // Focus on clicked node
        if (node.x !== undefined && node.y !== undefined) {
            fgRef.current?.centerAt(node.x, node.y, 1000);
            fgRef.current?.zoom(2.5, 1000);
        }
    }, [
        userProgress,
        onProgressUpdate,
        data.nodes
    ]);
    // Custom node painting with progressive reveal
    const paintNode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((node, ctx)=>{
        const size = node.level === 0 ? 15 : node.level === 1 ? 25 : 12; // Larger domain nodes
        // Base circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        // Fill based on node state and visibility
        if (node.isUnlocked) {
            ctx.fillStyle = '#2DD4BF';
        } else if (node.canUnlock) {
            ctx.fillStyle = '#0D9488';
        } else {
            ctx.fillStyle = '#134E4A';
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
            ctx.font = node.level === 1 ? 'bold 14px Arial' : node.level === 0 ? 'bold 12px Arial' : '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Only show full name for unlocked nodes or hovered nodes
            const displayText = node.isUnlocked || hoveredNode?.id === node.id ? node.name : node.level === 0 ? '?' : '...';
            // Add background for better readability
            const textWidth = ctx.measureText(displayText).width;
            const padding = 4;
            const textHeight = 16;
            if (node.level === 1) {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                ctx.fillRect(-textWidth / 2 - padding, size + 4, textWidth + padding * 2, textHeight + padding);
            }
            ctx.fillStyle = '#F8FAFC';
            ctx.fillText(displayText, 0, size + textHeight / 2 + 6);
        }
    }, [
        hoveredNode
    ]);
    // Custom link painting for curved edges with progressive reveal
    const paintLink = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((link, ctx)=>{
        const { source, target } = link;
        // Only show links to/from unlocked nodes or if both nodes are visible
        if (!source.isUnlocked && !target.isUnlocked && (!source.canUnlock || !target.canUnlock)) {
            return;
        }
        // Determine color based on source/target state
        if (source.isUnlocked && target.isUnlocked) {
            ctx.strokeStyle = '#2DD4BF'; // Bright for connected
        } else if (source.isUnlocked && target.canUnlock) {
            ctx.strokeStyle = '#0D9488'; // Medium for potential
        } else {
            ctx.strokeStyle = '#134E4A'; // Dark for locked
        }
        ctx.lineWidth = 1;
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
    // Add the new node to the initial data structure
    const initialNodes = [
        {
            id: 'join_school',
            name: 'Rejoindre l\'école',
            description: 'Débloquez cette compétence pour accéder au reste du parcours.',
            isUnlocked: false,
            canUnlock: true,
            level: 0,
            group: 'root',
            skillPoints: {
                problem_solving: 0,
                coding_implementation: 0,
                systems_thinking: 0,
                collaboration_communication: 0,
                learning_adaptability: 0
            }
        },
        ...__TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].domaines_principaux.flatMap((domain)=>{
            return domain.modules.map((module, index)=>({
                    id: `${domain.id}_module_${index}`,
                    name: module.titre,
                    description: module.titre,
                    isUnlocked: false,
                    canUnlock: false,
                    level: 1,
                    group: domain.id,
                    skillPoints: module.skill_points || {
                        problem_solving: 0,
                        coding_implementation: 0,
                        systems_thinking: 0,
                        collaboration_communication: 0,
                        learning_adaptability: 0
                    }
                }));
        })
    ];
    // Update the graph data to include the new node
    const graphData = {
        nodes: initialNodes,
        links: [] // Define links as needed
    };
    // In the unlockSkill function, ensure that unlocking "Rejoindre l'école" allows other nodes to be visible
    function unlockSkill(userProgress, moduleId, module) {
        const now = new Date();
        const unlockedSkills = {
            ...userProgress.unlockedSkills,
            [moduleId]: {
                ...module,
                unlockedAt: now,
                logMessage: generateLogMessage(module.name),
                formattedDate: formatDate(now)
            }
        };
        // If "Rejoindre l'école" is unlocked, unlock all other nodes
        if (moduleId === 'join_school') {
            // Unlock all other nodes
            Object.keys(unlockedSkills).forEach((key)=>{
                if (key !== 'join_school') {
                    unlockedSkills[key].isUnlocked = true;
                    unlockedSkills[key].canUnlock = false; // Prevent further unlocking
                }
            });
        }
        return {
            ...userProgress,
            unlockedSkills
        };
    }
    // In the rendering logic, conditionally render nodes based on unlock status
    const visibleNodes = data.nodes.filter((node)=>{
        return node.isUnlocked || node.id === 'join_school';
    });
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
                graphData: {
                    nodes: data.nodes.filter((node)=>node.isUnlocked || node.id === 'join_school').map((node)=>({
                            ...node,
                            x: node.x ?? Math.random() * dimensions.width,
                            y: node.y ?? Math.random() * dimensions.height,
                            fx: node.fx ?? undefined,
                            fy: node.fy ?? undefined
                        })),
                    links: data.links.filter((link)=>{
                        const source = typeof link.source === 'string' ? link.source : link.source.id;
                        const target = typeof link.target === 'string' ? link.target : link.target.id;
                        const sourceVisible = data.nodes.find((n)=>n.id === source)?.isUnlocked || source === 'join_school';
                        const targetVisible = data.nodes.find((n)=>n.id === target)?.isUnlocked || target === 'join_school';
                        return sourceVisible && targetVisible;
                    }).map((link)=>({
                            source: typeof link.source === 'string' ? link.source : link.source.id,
                            target: typeof link.target === 'string' ? link.target : link.target.id,
                            value: link.value
                        }))
                },
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
                cooldownTime: 5000
            }, void 0, false, {
                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                lineNumber: 481,
                columnNumber: 7
            }, this),
            selectedModule && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "module-details",
                style: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    padding: '16px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    color: '#F8FAFC',
                    border: '1px solid #1E293B',
                    zIndex: 10
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-lg font-bold mb-3",
                        children: selectedModule.name
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 537,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                className: "text-sm font-semibold mb-2",
                                children: "Actions Clés"
                            }, void 0, false, {
                                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                lineNumber: 540,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "list-disc list-inside text-sm space-y-1",
                                children: selectedModule.actions_cles.map((action, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: action
                                    }, i, false, {
                                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                        lineNumber: 543,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                lineNumber: 541,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 539,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                className: "text-sm font-semibold mb-2",
                                children: "Concepts Acquis"
                            }, void 0, false, {
                                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                lineNumber: 549,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-2",
                                children: selectedModule.concepts_acquis.map((concept, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "px-2 py-1 bg-slate-700 rounded text-xs",
                                        children: concept
                                    }, i, false, {
                                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                        lineNumber: 552,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                lineNumber: 550,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 548,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                className: "text-sm font-semibold mb-2",
                                children: "Points de Compétence"
                            }, void 0, false, {
                                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                lineNumber: 560,
                                columnNumber: 13
                            }, this),
                            Object.entries(selectedModule.skillPoints).map(([skill, value])=>value > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "skill-point-bar mb-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between text-xs mb-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: skill.replace('_', ' ')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                                    lineNumber: 565,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        value,
                                                        "/5"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                                    lineNumber: 566,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                            lineNumber: 564,
                                            columnNumber: 19
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
                                                lineNumber: 569,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                            lineNumber: 568,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, skill, true, {
                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                    lineNumber: 563,
                                    columnNumber: 17
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 559,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setSelectedModule(null),
                        className: "absolute top-2 right-2 text-slate-400 hover:text-slate-200",
                        children: "✕"
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 579,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                lineNumber: 522,
                columnNumber: 9
            }, this),
            hoveredNode && !selectedModule && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                        lineNumber: 605,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm mb-3",
                        children: hoveredNode.description
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 606,
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
                                            lineNumber: 613,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                value,
                                                "/5"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                            lineNumber: 614,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                    lineNumber: 612,
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
                                        lineNumber: 617,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                                    lineNumber: 616,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, skill, true, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 611,
                            columnNumber: 15
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 text-sm",
                        children: hoveredNode.isUnlocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-teal-400",
                            children: "✓ Débloqué"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 628,
                            columnNumber: 15
                        }, this) : hoveredNode.canUnlock ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-amber-400",
                            children: "⟳ Disponible - Double-cliquez pour débloquer"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 630,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-slate-400",
                            children: "🔒 Verrouillé"
                        }, void 0, false, {
                            fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                            lineNumber: 632,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 626,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setSelectedModule(hoveredNode),
                        className: "mt-2 text-sm text-teal-400 hover:text-teal-300",
                        children: "Voir les détails →"
                    }, void 0, false, {
                        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                        lineNumber: 636,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/SkillTree/SkillGraph.tsx",
                lineNumber: 590,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/SkillTree/SkillGraph.tsx",
        lineNumber: 480,
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