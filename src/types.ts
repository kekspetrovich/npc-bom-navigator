export type Route = 'buy' | 'produce' | 'virtual';

export interface SupplierInfo {
  partner_id: [number, string]; // [ID, Name]
  price: number;
  product_code?: string | false;
  product_name?: string | false;
  delay: number;
  currency_id: [number, string]; // [ID, Name]
}

export interface BOMOperation {
  id: number;
  name: string;
  workcenter_id: [number, string];
}

export interface BOMItem {
  id: string;
  name: string;
  quantity: number; // Absolute quantity
  qtyPerParent: number; // Local quantity relative to parent
  uom?: string;
  supplier?: string;
  suppliers?: SupplierInfo[];
  group: string;
  route: Route;
  parentId?: string;
  imageUrl?: string;
  operations?: BOMOperation[];
  isRoot?: boolean;
  standard_price?: number;
}

export interface GraphNodeData {
  label: string;
  quantity: number;
  uom?: string;
  supplier?: string;
  suppliers?: SupplierInfo[];
  group: string;
  route: Route;
  isGrouped?: boolean;
  items?: BOMItem[];
  isHighlighted?: boolean;
  isSelected?: boolean;
  isDimmed?: boolean;
  highlightedItemIds?: Set<string>;
  imageUrl?: string;
  standard_price?: number;
  localQty?: string;
}
