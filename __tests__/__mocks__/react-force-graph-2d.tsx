import React from 'react';

interface NodeObject {
  id: string;
  x?: number;
  y?: number;
  [key: string]: any;
}

interface LinkObject {
  source: string | NodeObject;
  target: string | NodeObject;
  [key: string]: any;
}

interface ForceGraph2DProps {
  graphData: {
    nodes: NodeObject[];
    links: LinkObject[];
  };
  nodeLabel?: string | ((node: NodeObject) => string);
  nodeCanvasObject?: (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  linkCanvasObject?: (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  onNodeClick?: (node: NodeObject) => void;
  onNodeHover?: (node: NodeObject | null) => void;
  width?: number;
  height?: number;
}

const ForceGraph2D: React.FC<ForceGraph2DProps> = () => {
  return <div data-testid="force-graph" />;
};

export default ForceGraph2D;

export interface ForceGraphMethods {
  d3Force: (forceName: string, force: any) => any;
}

export type { NodeObject, LinkObject }; 