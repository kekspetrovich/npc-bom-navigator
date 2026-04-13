import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BOMItem, Route } from '../types';
import { Box, Factory, Ghost, Package, Search, X, Workflow, Users, Layers, Eye, EyeOff, Copy, Check } from 'lucide-react';
import dagre from 'dagre';
import { useEffect, useState } from 'react';

// Helper to get node-specific colors for buttons and badges
const getNodeTypeStyles = (nodeData: any) => {
  const { isRoot, group, route } = nodeData;
  if (isRoot) return "bg-amber-100 text-amber-800 border-amber-200";
  if (group === 'Этапы') return "bg-purple-100 text-purple-800 border-purple-200";
  if (route === 'buy') return "bg-green-100 text-green-800 border-green-200";
  if (route === 'virtual') return "bg-gray-100 text-gray-600 border-gray-200 border-dashed";
  return "bg-blue-100 text-blue-800 border-blue-200";
};

// Custom Node Components
// Sub-components for CustomNode to improve readability
const NodeSection = ({ title, color, children }: { title: string, color?: string, children: React.ReactNode }) => (
  <div className="mt-1 pt-1 border-t border-current/10 text-[9px] space-y-1">
    <div className={`font-bold opacity-50 uppercase text-[7px] tracking-wider ${color || ''}`}>{title}</div>
    {children}
  </div>
);

const CustomNode = ({ data }: NodeProps<any>) => {
  const [copied, setCopied] = useState(false);
  const { 
    label, 
    quantity, 
    uom,
    supplier, 
    suppliers,
    group, 
    route, 
    isGrouped, 
    isSupplierGroup,
    items, 
    isHighlighted, 
    isSelected, 
    isDimmed,
    highlightedItemIds,
    imageUrl,
    operations,
    isRoot,
    usedIn,
    consistsOf,
    onNavigate,
    localQty,
    totalSourceQty,
    totalSourceUom
  } = data;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const opsText = operations && operations.length > 0 
      ? `\nТех. процесс:\n${operations.map((op: any) => `• ${op.name}`).join('\n')}` 
      : '';
      
    const usedInText = usedIn && usedIn.length > 0
      ? `\nИспользуется в:\n${usedIn.map((i: any) => `• ${i.qty} — ${i.label}`).join('\n')}`
      : '';
      
    const consistsOfText = consistsOf && consistsOf.length > 0
      ? `\nСостоит из:\n${consistsOf.map((i: any) => `• ${i.qty} — ${i.label}`).join('\n')}`
      : '';

    const text = `
Наименование: ${label}
Количество: ${quantity?.toFixed(2)} ${uom || ''}
${data.standard_price !== undefined ? `Стоимость: ${data.standard_price.toFixed(2)} руб` : ''}
${route === 'buy' ? `Поставщик: ${supplier || 'Не указан'}` : ''}${opsText}${usedInText}${consistsOfText}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStyles = () => {
    const dimmed = isDimmed ? 'opacity-20 grayscale blur-[4px] pointer-events-none' : 'opacity-100';
    
    if (isRoot) {
      return `bg-amber-50 border-amber-500 text-amber-900 shadow-lg ring-2 ring-amber-200 ${isSelected ? 'ring-4 ring-amber-600 border-amber-700 z-50 shadow-2xl' : ''} ${dimmed} transition-all duration-300`;
    }

    if (group === 'Этапы') {
      return `bg-purple-50 border-purple-500 text-purple-900 shadow-md ${isSelected ? 'ring-4 ring-purple-600 border-purple-700 z-50 shadow-xl' : ''} ${isHighlighted ? 'ring-4 ring-purple-400/50 border-purple-600 scale-105 z-50' : ''} ${dimmed} transition-all duration-300`;
    }

    let base = '';
    switch (route) {
      case 'produce':
        base = 'bg-blue-50 border-blue-500 text-blue-900 shadow-md';
        break;
      case 'buy':
        base = 'bg-green-50 border-green-500 text-green-900 shadow-sm';
        break;
      case 'virtual':
        base = 'bg-gray-50 border-gray-400 text-gray-600 border-dashed opacity-80';
        break;
      default:
        base = 'bg-white border-gray-300';
    }

    const highlight = isHighlighted ? 'ring-4 ring-blue-400/50 border-blue-600 scale-105 z-50' : '';
    const selected = isSelected ? 'ring-4 ring-blue-600 border-blue-700 z-50 shadow-xl' : '';

    return `${base} ${highlight} ${selected} ${dimmed} transition-all duration-300`;
  };

  const Icon = () => {
    if (isRoot) return <Factory className="w-5 h-5 text-amber-600" />;
    if (group === 'Этапы') return <Workflow className="w-4 h-4 text-purple-600" />;
    if (isGrouped) return <Package className="w-4 h-4" />;
    switch (route) {
      case 'produce': return <Factory className="w-4 h-4" />;
      case 'buy': return <Box className="w-4 h-4" />;
      case 'virtual': return <Ghost className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className={`px-3 py-2 ${isSelected ? 'w-[400px]' : 'w-[280px]'} border-2 rounded-xl text-left ${getStyles()}`}>
      <Handle type="target" position={Position.Right} className="w-2 h-2 !bg-gray-400" />
      
      <div className="flex gap-3">
        {imageUrl && (
          <div className="flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={label} 
              className={`${isSelected ? 'w-24 h-24' : 'w-14 h-14'} object-contain rounded-lg bg-white border border-gray-200 shadow-sm transition-all duration-300`}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {isSelected && <Icon />}
              <span className={`font-bold ${isRoot ? 'text-base' : 'text-sm'} ${isSelected ? '' : 'truncate'}`}>{label}</span>
            </div>
            {isSelected && (
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-black/5 rounded transition-colors text-gray-500 hover:text-gray-700"
                title="Копировать информацию"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          
          <div className="text-[10px] space-y-0.5">
            {quantity !== undefined && (
              <div className={isRoot ? 'font-bold text-amber-800' : ''}>
                Кол-во: {localQty ? `${localQty} (из ${totalSourceQty?.toFixed(2)}${totalSourceUom ? ` ${totalSourceUom}` : ''})` : `${quantity.toFixed(2)}${uom ? ` ${uom}` : ''}`}
              </div>
            )}
            {data.standard_price !== undefined && (
              <div className="text-blue-700 font-semibold">
                {isGrouped ? 'Общая стоимость' : 'Стоимость'}: {data.standard_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} руб
                {!isGrouped && ' за шт'}
              </div>
            )}
            
            {/* Operations Section */}
            {isSelected && operations && operations.length > 0 && (
              <NodeSection title="Тех. процесс:">
                {operations.map((op: any, idx: number) => (
                  <div key={idx} className="bg-white/40 p-1 rounded border border-black/5 flex justify-between items-center gap-2">
                    <span className="font-semibold flex-1 truncate">{op.name}</span>
                    <span className="opacity-60 text-[8px] italic">{op.workcenter_id[1]}</span>
                  </div>
                ))}
              </NodeSection>
            )}

            {/* Suppliers Section */}
            {isSelected && suppliers && suppliers.length > 0 && (
              <NodeSection title="Поставщики:">
                {suppliers.map((s: any, idx: number) => (
                  <div key={idx} className="bg-white/40 p-1 rounded border border-black/5">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`font-semibold ${isSelected ? '' : 'truncate'} flex-1`}>{s.partner_id[1]}</span>
                    </div>
                    <div className="flex justify-between text-[8px] opacity-60 mt-0.5">
                      {s.product_code && <span className={`${isSelected ? '' : 'truncate max-w-[100px]'}`}>{s.product_code}</span>}
                    </div>
                  </div>
                ))}
              </NodeSection>
            )}

            {/* Used In Section */}
            {isSelected && usedIn && usedIn.length > 0 && (
              <NodeSection title="Используется в:" color="text-blue-600">
                <div className="flex flex-wrap gap-1">
                  {usedIn.map((info: any, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate(info.id);
                      }}
                      className={`${getNodeTypeStyles(info)} px-1.5 py-0.5 rounded border font-medium hover:opacity-80 transition-opacity cursor-pointer`}
                    >
                      {info.label} <span className="text-[8px] opacity-70">({info.qty})</span>
                    </button>
                  ))}
                </div>
              </NodeSection>
            )}

            {/* Consists Of Section */}
            {isSelected && consistsOf && consistsOf.length > 0 && (
              <NodeSection title="Состоит из:" color="text-green-600">
                <div className="flex flex-wrap gap-1">
                  {consistsOf.map((info: any, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate(info.id);
                      }}
                      className={`${getNodeTypeStyles(info)} px-1.5 py-0.5 rounded border font-medium hover:opacity-80 transition-opacity cursor-pointer`}
                    >
                      {info.label} <span className="text-[8px] opacity-70">({info.qty})</span>
                    </button>
                  ))}
                </div>
              </NodeSection>
            )}
          </div>
        </div>
      </div>

      {isSelected && isGrouped && items && (
        <div 
          className="mt-2 pt-1 border-t border-current/20 text-[8px]"
          onWheel={(e) => {
            const target = e.currentTarget;
            const isAtTop = target.scrollTop === 0;
            const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
            
            // Only stop propagation if we can actually scroll in the requested direction
            if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
              e.stopPropagation();
            }
          }}
        >
          {(() => {
            const sortedItems = [...items].sort((a, b) => {
              const aH = highlightedItemIds?.has(a.id) ? 1 : 0;
              const bH = highlightedItemIds?.has(b.id) ? 1 : 0;
              return bH - aH;
            });
            
            return sortedItems.map((item: BOMItem) => {
              const isItemHighlighted = highlightedItemIds?.has(item.id);
              const hasActiveSelection = highlightedItemIds && highlightedItemIds.size > 0;
              
              return (
                <div 
                  key={item.id} 
                  className={`flex flex-col gap-0.5 text-left px-1 rounded transition-all duration-300 ${
                    isItemHighlighted 
                      ? 'bg-blue-600 text-white font-bold py-1 shadow-sm' 
                      : hasActiveSelection ? 'opacity-20 grayscale' : ''
                  }`}
                >
                  <div className="flex items-center gap-1 py-0.5">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-4 h-4 object-contain bg-white rounded-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className={`${isSelected ? '' : 'truncate'} flex-1`}>• {item.name} (x{item.quantity.toFixed(2)}{item.uom ? ` ${item.uom}` : ''})</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
      <Handle type="source" position={Position.Left} className="w-2 h-2 !bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface BOMGraphProps {
  items: BOMItem[];
  showVirtual: boolean;
  setShowVirtual: (show: boolean) => void;
  groupBy: 'none';
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], selectedNodeId: string | null) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'RL', nodesep: 30, ranksep: 60 });

  nodes.forEach((node) => {
    const isSelected = node.id === selectedNodeId;
    const items = node.data.items as BOMItem[] | undefined;
    const suppliers = node.data.suppliers as any[] | undefined;
    const itemCount = items?.length || 0;
    const supplierCount = suppliers?.length || 0;
    const hasImage = !!node.data.imageUrl;
    const operations = node.data.operations as any[] | undefined;
    const opCount = operations?.length || 0;
    const usedInCount = (node.data.usedIn as any[] | undefined)?.length || 0;
    const consistsOfCount = (node.data.consistsOf as any[] | undefined)?.length || 0;

    let height = 80; // Base height for unselected
    
    if (isSelected) {
      height = 120 + 
        (itemCount > 0 ? itemCount * 30 : 0) + 
        (supplierCount > 0 ? supplierCount * 35 : 0) +
        (opCount > 0 ? opCount * 22 : 0) +
        (usedInCount > 0 ? 40 : 0) +
        (consistsOfCount > 0 ? 40 : 0);
    } else {
      // Small adjustment if there's an image even when unselected
      if (hasImage) height = 90;
    }
    
    if (hasImage && isSelected && height < 140) height = 140;
    const width = isSelected ? 400 : 280;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 130,
        y: nodeWithPosition.y - (nodeWithPosition.height / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Helper to handle virtual nodes and calculate cumulative quantity
const getEffectiveParentInfo = (items: BOMItem[], id: string | undefined, showVirtual: boolean, currentQty: number = 1): { id: string, qty: number } | null => {
  if (!id) return null;
  const parent = items.find(i => i.id === id);
  if (!parent) return null;
  
  const isRoot = !parent.parentId;
  if (isRoot) return { id: parent.id, qty: currentQty };

  if (!showVirtual && parent.route === 'virtual' && parent.group !== 'Этапы') {
    return getEffectiveParentInfo(items, parent.parentId, showVirtual, currentQty * parent.qtyPerParent);
  }
  return { id: parent.id, qty: currentQty };
};

// Helper to extract a subtree for a specific stage
const getSubtreeItems = (items: BOMItem[], stageId: string) => {
  const rootStage = items.find(i => i.id === stageId);
  if (!rootStage) return items;

  const descendants = new Set<string>();
  const findDescendants = (parentId: string) => {
    items.forEach(i => {
      if (i.parentId === parentId) {
        descendants.add(i.id);
        findDescendants(i.id);
      }
    });
  };
  findDescendants(stageId);
  
  const subtree = items.filter(i => i.id === stageId || descendants.has(i.id));
  
  return subtree.map(i => ({
    ...i,
    isRoot: i.id === stageId,
    parentId: i.id === stageId ? undefined : i.parentId
  }));
};

export const BOMGraph: React.FC<BOMGraphProps> = ({ items, showVirtual, setShowVirtual, groupBy }) => {
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.getElementById('search-container');
      if (searchContainer && !searchContainer.contains(event.target as any)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    // Filter out virtual items from suggestions
    const uniqueNames = Array.from(new Set(items.filter(i => i.route !== 'virtual').map(i => i.name)));
    return (uniqueNames as string[])
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [items, searchQuery]);

  const handleSearchSelect = (name: string) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    // Use a special prefix to indicate this is a name-based selection
    setSelectedNodeId(`name:${name}`);
  };

  const stages = useMemo(() => {
    return items.filter(i => i.group === 'Этапы');
  }, [items]);

  const { nodes, edges } = useMemo(() => {
    const processedItems = selectedStageId ? getSubtreeItems(items, selectedStageId) : [...items];
    let finalEdges: Edge[] = [];

    // Check if we are in "Name Focus" mode (from search or if grouped by none)
    const isNameFocus = selectedNodeId?.startsWith('name:') || (groupBy === 'none' && selectedNodeId && !items.find(i => i.id === selectedNodeId));
    const focusName = isNameFocus 
      ? (selectedNodeId?.startsWith('name:') ? selectedNodeId?.replace('name:', '') : selectedNodeId) 
      : null;

    // 1. Grouping Logic
    let displayNodes: Node[] = [];
    
    if (isNameFocus && focusName) {
      // Special mode: Merge all items with the same name into one central node
      const matchingItems = items.filter(i => i.name === focusName);
      if (matchingItems.length === 0) return { nodes: [], edges: [] };

      const first = matchingItems[0];
      const totalQty = matchingItems.reduce((sum, i) => sum + i.quantity, 0);
      
      // Create the central merged node
      const centralNodeId = `name:${focusName}`;
      const centralNode: Node = {
        id: centralNodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          ...first,
          id: centralNodeId,
          quantity: totalQty,
          label: focusName,
          isGrouped: matchingItems.length > 1,
          items: matchingItems,
          usedIn: [],
          consistsOf: []
        }
      };

      // Find all parents and children for ALL matching items
      const usedInMap: Record<string, any> = {};
      const consistsOfMap: Record<string, any> = {};

      matchingItems.forEach(item => {
        // Parents
        if (item.parentId) {
          const parentInfo = getEffectiveParentInfo(items, item.parentId, showVirtual);
          if (parentInfo) {
            const parent = items.find(p => p.id === parentInfo.id);
            if (parent) {
              const key = parent.id;
              if (!usedInMap[key]) {
                usedInMap[key] = { 
                  id: parent.id, 
                  label: parent.name, 
                  qty: 0, 
                  uom: parent.uom,
                  route: parent.route,
                  group: parent.group,
                  isRoot: !parent.parentId
                };
              }
              // Use the item's own quantity which is absolute in the project
              usedInMap[key].qty += item.quantity;
            }
          }
        }

        // Children
        items.forEach(child => {
          if (child.parentId === item.id) {
            const key = child.name;
            if (!consistsOfMap[key]) {
              consistsOfMap[key] = {
                id: child.id,
                label: child.name,
                qty: 0,
                uom: child.uom,
                route: child.route,
                group: child.group
              };
            }
            consistsOfMap[key].qty += child.quantity;
          }
        });
      });

      const usedInList = Object.values(usedInMap);
      const consistsOfList = Object.values(consistsOfMap);
      
      centralNode.data.usedIn = usedInList;
      centralNode.data.consistsOf = consistsOfList;
      displayNodes.push(centralNode);

      // Create nodes for parents and children
      usedInList.forEach((p: any) => {
        displayNodes.push({
          id: p.id,
          type: 'custom',
          position: { x: -400, y: 0 },
          data: { ...items.find(i => i.id === p.id), label: p.label, quantity: items.find(i => i.id === p.id)?.quantity }
        });
        finalEdges.push({
          id: `e-${centralNodeId}-${p.id}`,
          source: centralNodeId,
          target: p.id,
          label: `${p.qty.toFixed(2)} ${p.uom || 'шт'}`,
          type: 'smoothstep'
        });
      });

      consistsOfList.forEach((c: any) => {
        displayNodes.push({
          id: c.id,
          type: 'custom',
          position: { x: 400, y: 0 },
          data: { ...items.find(i => i.id === c.id), label: c.label, quantity: c.qty }
        });
        finalEdges.push({
          id: `e-${c.id}-${centralNodeId}`,
          source: c.id,
          target: centralNodeId,
          label: `${c.qty.toFixed(2)} ${c.uom || 'шт'}`,
          type: 'smoothstep'
        });
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(displayNodes, finalEdges, centralNodeId);
      
      // Post-process for focus highlighting
      const finalNodes = layoutedNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === centralNodeId,
          isHighlighted: n.id !== centralNodeId,
          onNavigate: (id: string) => setSelectedNodeId(id),
          // For parents, show how much of the focus item they contain
          localQty: n.id !== centralNodeId && usedInMap[n.id] ? usedInMap[n.id].qty.toFixed(2) : undefined,
          totalSourceQty: totalQty,
          totalSourceUom: first.uom
        }
      }));

      const finalEdgesWithStyle = layoutedEdges.map(e => ({
        ...e,
        animated: true,
        style: { stroke: e.source === centralNodeId ? '#3b82f6' : '#f59e0b', strokeWidth: 3 }
      }));

      return { nodes: finalNodes, edges: finalEdgesWithStyle };
    }

    if (groupBy === 'none') {
      // Merge nodes by name
      const mergedNodesMap: Record<string, BOMItem> = {};
      processedItems.forEach(item => {
        if (showVirtual || item.route !== 'virtual' || item.group === 'Этапы' || !item.parentId) {
          if (!mergedNodesMap[item.name]) {
            mergedNodesMap[item.name] = { ...item, id: item.name };
          } else {
            mergedNodesMap[item.name].quantity += item.quantity;
          }
        }
      });

      displayNodes = Object.values(mergedNodesMap).map(item => ({
        id: item.id,
        type: 'custom',
        data: { ...item, label: item.name, imageUrl: item.imageUrl },
        position: { x: 0, y: 0 },
      }));

      // Create edges between merged nodes
      const edgeMap: Record<string, { source: string, target: string, qty: number, uom: string, route: Route, group: string }> = {};
      processedItems.forEach(item => {
        if (item.parentId) {
          const parentInfo = getEffectiveParentInfo(items, item.parentId, showVirtual);
          if (parentInfo && (showVirtual || item.route !== 'virtual' || item.group === 'Этапы')) {
            const parent = items.find(i => i.id === parentInfo.id);
            if (parent) {
              const edgeKey = `${item.name}->${parent.name}`;
              // item.quantity is the absolute quantity of this specific instance.
              // We want to add this instance's absolute quantity to the edge.
              if (!edgeMap[edgeKey]) {
                edgeMap[edgeKey] = { 
                  source: item.name, 
                  target: parent.name, 
                  qty: item.quantity,
                  uom: item.uom,
                  route: item.route,
                  group: item.group
                };
              } else {
                edgeMap[edgeKey].qty += item.quantity;
              }
            }
          }
        }
      });

      Object.entries(edgeMap).forEach(([id, e]) => {
        const isVirtual = e.route === 'virtual';
        const isStage = e.group === 'Этапы';
        finalEdges.push({
          id: `e-${id}`,
          source: e.source,
          target: e.target,
          label: `${e.qty.toFixed(2)} ${e.uom}${isVirtual && !isStage ? ' (Фантом)' : ''}`,
          labelStyle: { fill: isVirtual && !isStage ? '#94a3b8' : '#475569', fontWeight: 600, fontSize: 11 },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9, stroke: isVirtual && !isStage ? '#cbd5e1' : '#94a3b8', strokeWidth: 1 },
          animated: false,
          style: { 
            stroke: isVirtual && !isStage ? '#cbd5e1' : '#64748b', 
            strokeWidth: isVirtual && !isStage ? 1 : 2,
          },
        });
      });
    } else {
      const nonBuyItems = processedItems.filter(i => i.route !== 'buy');
      const buyItems = processedItems.filter(i => i.route === 'buy');

      // Merge non-buy nodes by name
      const mergedNonBuyMap: Record<string, BOMItem> = {};
      nonBuyItems.forEach(item => {
        if (showVirtual || item.route !== 'virtual' || item.group === 'Этапы' || !item.parentId) {
          if (!mergedNonBuyMap[item.name]) {
            mergedNonBuyMap[item.name] = { ...item, id: item.name };
          } else {
            mergedNonBuyMap[item.name].quantity += item.quantity;
          }
        }
      });

      displayNodes = Object.values(mergedNonBuyMap).map(item => ({
        id: item.id,
        type: 'custom',
        data: { ...item, label: item.name, imageUrl: item.imageUrl },
        position: { x: 0, y: 0 },
      }));

      const groups: Record<string, BOMItem[]> = {};
      buyItems.forEach(item => {
        const key = groupBy === 'supplier' ? (item.supplier || 'Без поставщика') : item.group;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      Object.entries(groups).forEach(([groupName, groupItems]) => {
        const groupId = `group-${groupName}`;
        
        // Merge items by name within the group
        const mergedItemsMap: Record<string, BOMItem> = {};
        groupItems.forEach(item => {
          if (!mergedItemsMap[item.name]) {
            mergedItemsMap[item.name] = { ...item, id: `merged-${item.name}` };
          } else {
            mergedItemsMap[item.name].quantity += item.quantity;
          }
        });
        const mergedItems = Object.values(mergedItemsMap);
        const totalQty = mergedItems.reduce((acc, curr) => acc + curr.quantity, 0);
        const totalCost = mergedItems.reduce((acc, curr) => acc + (curr.quantity * (curr.standard_price || 0)), 0);

        displayNodes.push({
          id: groupId,
          type: 'custom',
          data: {
            label: groupName,
            route: 'buy',
            isGrouped: true,
            isSupplierGroup: groupBy === 'supplier',
            items: mergedItems,
            group: groupBy === 'group' ? groupName : 'Сборная группа',
            supplier: groupBy === 'supplier' ? groupName : undefined,
            quantity: totalQty,
            standard_price: totalCost, // For groups, this represents total cost
            imageUrl: mergedItems[0]?.imageUrl, // Use first item's image for the group
          },
          position: { x: 0, y: 0 },
        });

        const parentQtys: Record<string, { qty: number, uom: string }> = {};
        groupItems.forEach(i => {
          const parentInfo = getEffectiveParentInfo(items, i.parentId, showVirtual);
          if (parentInfo) {
            const parent = items.find(p => p.id === parentInfo.id);
            const parentKey = parent ? parent.name : parentInfo.id;
            if (!parentQtys[parentKey]) {
              parentQtys[parentKey] = { qty: 0, uom: i.uom };
            }
            parentQtys[parentKey].qty += i.quantity;
          }
        });

        Object.entries(parentQtys).forEach(([parentKey, data]) => {
          finalEdges.push({
            id: `e-${groupId}-${parentKey}`,
            source: groupId,
            target: parentKey,
            label: `${data.qty.toFixed(2)} ${data.uom}`,
            labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 11 },
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9, stroke: '#94a3b8', strokeWidth: 1 },
            style: { stroke: '#64748b', strokeWidth: 2 },
          });
        });
      });

      // Edges between non-buy items
      const nonBuyEdgeMap: Record<string, { source: string, target: string, qty: number, uom: string, route: Route, group: string }> = {};
      nonBuyItems.forEach(item => {
        if (item.parentId) {
          const parentInfo = getEffectiveParentInfo(items, item.parentId, showVirtual);
          if (parentInfo && (showVirtual || item.route !== 'virtual' || item.group === 'Этапы')) {
            const parent = items.find(i => i.id === parentInfo.id);
            if (parent && parent.route !== 'buy') {
              const edgeKey = `${item.name}->${parent.name}`;
              if (!nonBuyEdgeMap[edgeKey]) {
                nonBuyEdgeMap[edgeKey] = { 
                  source: item.name, 
                  target: parent.name, 
                  qty: item.quantity,
                  uom: item.uom,
                  route: item.route,
                  group: item.group
                };
              } else {
                nonBuyEdgeMap[edgeKey].qty += item.quantity;
              }
            }
          }
        }
      });

      Object.entries(nonBuyEdgeMap).forEach(([id, e]) => {
        const isVirtual = e.route === 'virtual';
        const isStage = e.group === 'Этапы';
        finalEdges.push({
          id: `e-${id}`,
          source: e.source,
          target: e.target,
          label: `${e.qty.toFixed(2)} ${e.uom}${isVirtual && !isStage ? ' (Фантом)' : ''}`,
          labelStyle: { fill: isVirtual && !isStage ? '#94a3b8' : '#475569', fontWeight: 600, fontSize: 11 },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9, stroke: isVirtual && !isStage ? '#cbd5e1' : '#94a3b8', strokeWidth: 1 },
          animated: false,
          style: { 
            stroke: isVirtual && !isStage ? '#cbd5e1' : '#64748b', 
            strokeWidth: isVirtual && !isStage ? 1 : 2,
          },
        });
      });
    }

    // Pre-calculate usedIn and consistsOf for all nodes to ensure correct layout height
    displayNodes.forEach(node => {
      const nodeItems = node.data.isGrouped ? (node.data.items as BOMItem[]) : [node.data as unknown as BOMItem];
      
      // Find what this node is used in (parents)
      const usedInInfo: any[] = [];
      finalEdges
        .filter(e => e.source === node.id)
        .forEach(e => {
          const targetNode = displayNodes.find(n => n.id === e.target);
          if (!targetNode) return;
          
          if (targetNode.data.isGrouped) {
            const itemsInTarget = targetNode.data.items as BOMItem[];
            const relevantParents: Record<string, { qty: number, uom: string }> = {};
            
            nodeItems.forEach((item) => {
              const parentInfo = getEffectiveParentInfo(items, item.parentId, showVirtual);
              if (parentInfo) {
                const parent = items.find(p => p.id === parentInfo.id);
                if (parent && itemsInTarget.some(it => it.name === parent.name)) {
                  if (!relevantParents[parent.name]) {
                    relevantParents[parent.name] = { qty: 0, uom: item.uom };
                  }
                  relevantParents[parent.name].qty += item.quantity;
                }
              }
            });
            
            Object.entries(relevantParents).forEach(([name, data]) => {
              usedInInfo.push({
                label: name,
                qty: `${data.qty.toFixed(2)} ${data.uom}`,
                id: targetNode.id,
                route: targetNode.data.route,
                group: targetNode.data.group,
                isRoot: targetNode.data.isRoot
              });
            });
          } else {
            usedInInfo.push({
              label: targetNode.data.label,
              qty: e.label,
              id: targetNode.id,
              route: targetNode.data.route,
              group: targetNode.data.group,
              isRoot: targetNode.data.isRoot
            });
          }
        });

      // Find what this node consists of (children)
      const consistsOfInfo: any[] = [];
      finalEdges
        .filter(e => e.target === node.id)
        .forEach(e => {
          const sourceNode = displayNodes.find(n => n.id === e.source);
          if (!sourceNode) return;
          
          if (sourceNode.data.isGrouped) {
            const itemsInSource = sourceNode.data.items as BOMItem[];
            const currentItemNames = new Set(nodeItems.map(i => i.name));
            
            const relevantChildren: Record<string, { qty: number, uom: string }> = {};
            
            itemsInSource.forEach(item => {
              const parentInfo = getEffectiveParentInfo(items, item.parentId, showVirtual);
              if (parentInfo) {
                const parent = items.find(p => p.id === parentInfo.id);
                if (parent && currentItemNames.has(parent.name)) {
                  if (!relevantChildren[item.name]) {
                    relevantChildren[item.name] = { qty: 0, uom: item.uom };
                  }
                  relevantChildren[item.name].qty += item.quantity;
                }
              }
            });
            
            Object.entries(relevantChildren).forEach(([name, data]) => {
              consistsOfInfo.push({
                label: name,
                qty: `${data.qty.toFixed(2)} ${data.uom}`,
                id: sourceNode.id,
                route: sourceNode.data.route,
                group: sourceNode.data.group,
                isRoot: sourceNode.data.isRoot
              });
            });
          } else {
            consistsOfInfo.push({
              label: sourceNode.data.label,
              qty: e.label,
              id: sourceNode.id,
              route: sourceNode.data.route,
              group: sourceNode.data.group,
              isRoot: sourceNode.data.isRoot
            });
          }
        });
        
      node.data.usedIn = usedInInfo;
      node.data.consistsOf = consistsOfInfo;
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(displayNodes, finalEdges, selectedNodeId);

    // 3. Apply Highlighting (Bidirectional)
    if (selectedNodeId) {
      const outgoingEdges = layoutedEdges.filter(e => e.source === selectedNodeId);
      const incomingEdges = layoutedEdges.filter(e => e.target === selectedNodeId);
      
      const targetNodeIds = new Set(outgoingEdges.map(e => e.target));
      const sourceNodeIds = new Set(incomingEdges.map(e => e.source));

      // Find which items within grouped nodes are actually connected to the selected node
      const getHighlightedItemsForNode = (nodeId: string) => {
        const node = layoutedNodes.find(n => n.id === nodeId);
        if (!node || !node.data.isGrouped) return null;

        const highlightedIds = new Set<string>();
        const itemsInGroup = node.data.items as BOMItem[];

        // Helper to get display ID for any original item
        const getDisplayIdOfOrig = (orig: BOMItem) => {
          if (orig.route === 'buy' && groupBy !== 'none') {
            const key = groupBy === 'supplier' ? (orig.supplier || 'Без поставщика') : orig.group;
            return `group-${key}`;
          }
          return orig.name;
        };

        // If the grouped node is a SOURCE of the selection (Child pointing to Parent)
        if (sourceNodeIds.has(nodeId)) {
          itemsInGroup.forEach(mergedItem => {
            const hasConnection = processedItems.some(orig => {
              if (orig.name !== mergedItem.name) return false;
              const parentInfo = getEffectiveParentInfo(items, orig.parentId, showVirtual);
              if (!parentInfo) return false;
              const parent = items.find(p => p.id === parentInfo.id);
              if (!parent) return false;
              return getDisplayIdOfOrig(parent) === selectedNodeId;
            });
            if (hasConnection) {
              highlightedIds.add(mergedItem.id);
            }
          });
        }

        // If the grouped node is a TARGET of the selection (Parent being pointed to by Child)
        if (targetNodeIds.has(nodeId)) {
          itemsInGroup.forEach(mergedItem => {
            const isParent = processedItems.some(orig => {
              // The child of this merged item is the selected node
              if (getDisplayIdOfOrig(orig) !== selectedNodeId) return false;
              const parentInfo = getEffectiveParentInfo(items, orig.parentId, showVirtual);
              if (!parentInfo) return false;
              const parent = items.find(p => p.id === parentInfo.id);
              return parent && parent.name === mergedItem.name;
            });
            if (isParent) {
              highlightedIds.add(mergedItem.id);
            }
          });
        }

        return highlightedIds.size > 0 ? highlightedIds : null;
      };
      
      const highlightedNodes = layoutedNodes.map(node => {
        const isSelected = node.id === selectedNodeId;
        const isTarget = targetNodeIds.has(node.id);
        const isSource = sourceNodeIds.has(node.id);
        const isRelated = isSelected || isTarget || isSource;
        const isDimmed = !isRelated;
        
        // Dynamic Focus Layout: Move related nodes closer to the selected one
        let position = node.position;
        if (selectedNodeId && isRelated) {
          const selectedNodeOrig = layoutedNodes.find(n => n.id === selectedNodeId);
          if (selectedNodeOrig) {
            const baseX = selectedNodeOrig.position.x;
            const baseY = selectedNodeOrig.position.y;
            
            if (isSelected) {
              position = { x: baseX, y: baseY };
            } else if (isTarget) {
              // Parents (Used In) - Grid Layout (expanding left)
              const targetIdsArray = Array.from(targetNodeIds);
              const idx = targetIdsArray.indexOf(node.id);
              const count = targetIdsArray.length;
              
              // Determine grid dimensions
              const cols = count > 6 ? 3 : (count > 3 ? 2 : 1);
              const colIdx = idx % cols;
              const rowIdx = Math.floor(idx / cols);
              const rowsInCol = Math.ceil(count / cols);
              
              position = { 
                x: baseX - 500 - (colIdx * 300), 
                y: baseY + (rowIdx - (rowsInCol - 1) / 2) * 160 
              };
            } else if (isSource) {
              // Children (Consists Of) - Grid Layout (expanding right)
              const sourceIdsArray = Array.from(sourceNodeIds);
              const idx = sourceIdsArray.indexOf(node.id);
              const count = sourceIdsArray.length;
              
              // Determine grid dimensions
              const cols = count > 6 ? 3 : (count > 3 ? 2 : 1);
              const colIdx = idx % cols;
              const rowIdx = Math.floor(idx / cols);
              const rowsInCol = Math.ceil(count / cols);
              
              position = { 
                x: baseX + 500 + (colIdx * 300), 
                y: baseY + (rowIdx - (rowsInCol - 1) / 2) * 160 
              };
            }
          }
        }

        let localQty = undefined;
        let totalSourceQty = undefined;
        let totalSourceUom = undefined;
        
        if (selectedNodeId && !isSelected && (isTarget || isSource)) {
          const edge = layoutedEdges.find(e => 
            (e.source === node.id && e.target === selectedNodeId) || 
            (e.target === node.id && e.source === selectedNodeId)
          );
          if (edge) {
            localQty = edge.label;
            // The source of the edge is the item being counted
            const sourceNode = layoutedNodes.find(n => n.id === edge.source);
            if (sourceNode) {
              totalSourceQty = sourceNode.data.quantity;
              totalSourceUom = sourceNode.data.uom;
            }
          }
        }

        return {
          ...node,
          position,
          data: {
            ...node.data,
            isHighlighted: isTarget || isSource,
            isSelected: isSelected,
            isDimmed: isDimmed,
            highlightedItemIds: getHighlightedItemsForNode(node.id),
            localQty,
            totalSourceQty,
            totalSourceUom,
            onNavigate: (id: string) => {
              setSelectedNodeId(id);
            }
          }
        };
      });

      const highlightedEdges = layoutedEdges.map(edge => {
        const isOutgoing = edge.source === selectedNodeId;
        const isIncoming = edge.target === selectedNodeId;
        const isHighlighted = isOutgoing || isIncoming;
        
        return {
          ...edge,
          animated: isHighlighted,
          style: {
            ...edge.style,
            stroke: isHighlighted ? (isOutgoing ? '#f59e0b' : '#3b82f6') : edge.style?.stroke,
            strokeWidth: isHighlighted ? 4 : 1.5,
            opacity: isHighlighted ? 1 : 0.05,
            filter: isHighlighted ? 'none' : 'blur(2px)',
          },
          labelStyle: {
            ...edge.labelStyle,
            opacity: isHighlighted ? 1 : 0,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            opacity: isHighlighted ? 1 : 0,
          }
        };
      });

      return { nodes: highlightedNodes, edges: highlightedEdges };
    }

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [items, showVirtual, groupBy, selectedNodeId, selectedStageId]);

  // Automatically fit view when nodes or edges change (e.g. after grouping change)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedNodeId) {
        // Find the selected node and its neighbors to fit them in view
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        if (selectedNode) {
          const usedInIds = (selectedNode.data.usedIn || []).map((i: any) => i.id);
          const consistsOfIds = (selectedNode.data.consistsOf || []).map((i: any) => i.id);
          const nodesToFit = [selectedNodeId, ...usedInIds, ...consistsOfIds];
          fitView({ nodes: nodesToFit.map(id => ({ id })), padding: 0.4, duration: 800 });
        }
      } else {
        fitView({ padding: 0.2, duration: 800 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes.length, edges.length, groupBy, showVirtual, selectedNodeId, selectedStageId, fitView]);

  return (
    <div className="w-full h-full bg-slate-50 overflow-hidden relative">
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[50] flex flex-wrap items-center gap-3 pointer-events-none">
        {/* Stages Dropdown */}
        <div className="pointer-events-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <select 
              className="bg-white rounded-lg shadow-lg border border-slate-200 pl-10 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none hover:border-slate-300"
              value={selectedStageId || ''}
              onChange={(e) => {
                setSelectedStageId(e.target.value || null);
                setSelectedNodeId(null);
              }}
            >
              <option value="">Все этапы (Полная схема)</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Workflow className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Search UI */}
        <div id="search-container" className="w-72 pointer-events-auto">
          <div className="relative">
            <div className="flex items-center bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Поиск по номенклатуре..."
                className="bg-transparent border-none outline-none text-sm w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedNodeId(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
            
            {isSearchOpen && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                {searchSuggestions.map((name, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-none"
                    onClick={() => handleSearchSelect(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Virtual Blocks Toggle */}
        <button
          onClick={() => setShowVirtual(!showVirtual)}
          className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-slate-200 text-xs font-medium transition-all pointer-events-auto ${
            showVirtual ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {showVirtual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Виртуальные блоки
        </button>

        {/* Exit Focus Button */}
        {selectedNodeId && (
          <button
            onClick={() => setSelectedNodeId(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg border border-blue-500 text-xs font-bold transition-all pointer-events-auto hover:bg-blue-700 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-300"
          >
            <X className="w-4 h-4" />
            Выйти из фокуса
          </button>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        onNodeMouseEnter={(_, node) => setHoveredNode(node)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        fitView
        minZoom={0.05}
        maxZoom={2}
        zoomOnScroll={true}
        panOnScroll={false}
      >
        <Background color="#cbd5e1" gap={20} variant="dots" />
        <Controls />
      </ReactFlow>

      {/* Custom Tooltip */}
      {hoveredNode && !selectedNodeId && (
        <div 
          className="fixed z-[1000] pointer-events-none bg-slate-900 text-white p-3 rounded-lg shadow-2xl border border-slate-700 max-w-xs text-xs animate-in fade-in zoom-in duration-200"
          style={{ 
            left: tooltipPos.x + 20, 
            top: tooltipPos.y + 20 
          }}
        >
          <div className="font-bold border-b border-slate-700 pb-1 mb-2 text-blue-400">
            {hoveredNode.data.label}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-4">
              <span className="opacity-60">Количество:</span>
              <span className="font-mono">{hoveredNode.data.quantity?.toFixed(2)} {hoveredNode.data.uom}</span>
            </div>
            {hoveredNode.data.standard_price !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="opacity-60">{hoveredNode.data.isGrouped ? 'Общая стоимость' : 'Стоимость'}:</span>
                <span className="text-blue-400 font-bold">
                  {hoveredNode.data.standard_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} руб
                </span>
              </div>
            )}
            {hoveredNode.data.group && (
              <div className="flex justify-between gap-4">
                <span className="opacity-60">Категория:</span>
                <span>{hoveredNode.data.group}</span>
              </div>
            )}
            {hoveredNode.data.operations && hoveredNode.data.operations.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Тех. процесс:</div>
                {hoveredNode.data.operations.map((op: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2 text-[10px]">
                    <span className="opacity-80">• {op.name}</span>
                    <span className="text-slate-500 italic">{op.workcenter_id[1]}</span>
                  </div>
                ))}
              </div>
            )}
            {hoveredNode.data.suppliers && hoveredNode.data.suppliers.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Поставщики:</div>
                {hoveredNode.data.suppliers.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2 text-[10px]">
                    <span className="truncate opacity-80">{s.partner_id[1]}</span>
                    <span className="text-green-400 font-bold">{s.price} {s.currency_id[1]}</span>
                  </div>
                ))}
                {hoveredNode.data.suppliers.length > 3 && (
                  <div className="text-[9px] opacity-40 mt-1">...и еще {hoveredNode.data.suppliers.length - 3}</div>
                )}
              </div>
            )}
            {hoveredNode.data.isGrouped && hoveredNode.data.items && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Состав группы ({hoveredNode.data.items.length}):</div>
                <div className="max-h-32 overflow-hidden opacity-80">
                  {hoveredNode.data.items.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="truncate">• {item.name}</div>
                  ))}
                  {hoveredNode.data.items.length > 5 && (
                    <div className="text-[9px] opacity-40 mt-1">...и еще {hoveredNode.data.items.length - 5}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-700 text-[9px] text-slate-500 italic">
            Нажмите для фиксации и раскрытия
          </div>
        </div>
      )}
    </div>
  );
};
