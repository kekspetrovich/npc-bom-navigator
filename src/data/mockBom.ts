import { BOMItem, Route } from '../types';

import testFullBomDump from './test_full_bom_dump.json';

interface RawProductInfo {
  id: number;
  name: string;
  display_name: string;
  image_128?: string | false;
  image_256?: string | false;
  uom_name?: string;
  uom_id?: [number, string];
  standard_price?: number;
  type?: string;
  route_ids?: number[];
  categ_id?: [number, string];
}

interface RawBOMData {
  id: number;
  type: string;
  product_qty: number;
}

interface RawLineInfo {
  product_qty: number;
  product_uom_id: [number, string];
}

interface RawComponent {
  product_info: RawProductInfo;
  line_info?: RawLineInfo;
  bom_data?: RawBOMData;
  components?: RawComponent[];
  qty_in_parent?: number;
  suppliers?: any[]; // New field
  operations?: any[]; // New field
}

const rawData = testFullBomDump as any;

function flatten(
  node: RawComponent, 
  parentId?: string, 
  path: string = '', 
  parentAbsoluteQty: number = 1
): BOMItem[] {
  const product = node.product_info;
  const currentPath = path ? `${path}-${product.id}` : String(product.id);
  
  // Determine route based on bom_data and route_ids
  let route: Route = 'buy';
  if (node.bom_data && node.bom_data.type === 'normal') {
    route = 'produce';
  } else if (node.bom_data && node.bom_data.type === 'phantom') {
    route = 'virtual';
  } else if (node.components && node.components.length > 0) {
    route = 'produce';
  }

  // Use line_info.product_qty if available, otherwise fallback to qty_in_parent
  const qtyInParent = node.line_info?.product_qty ?? node.qty_in_parent ?? 1;
  const absoluteQty = qtyInParent * parentAbsoluteQty;
  
  // Extract image - prefer 256, fallback to 128
  let imageUrl = undefined;
  if (product.image_256) {
    imageUrl = `data:image/png;base64,${product.image_256}`;
  } else if (product.image_128) {
    imageUrl = `data:image/png;base64,${product.image_128}`;
  }

  const item: BOMItem = {
    id: currentPath,
    name: product.name || product.display_name,
    quantity: absoluteQty,
    qtyPerParent: qtyInParent,
    uom: node.line_info?.product_uom_id?.[1] || product.uom_name,
    route,
    parentId,
    imageUrl,
    suppliers: node.suppliers || [],
    supplier: node.suppliers && node.suppliers.length > 0 ? node.suppliers[0].partner_id[1] : undefined,
    group: product.categ_id?.[1] || (route === 'buy' ? 'Закупка' : 'Производство'),
    operations: node.operations || [],
    isRoot: !parentId,
    standard_price: product.standard_price
  };

  let result = [item];
  if (node.components) {
    node.components.forEach(child => {
      result = result.concat(flatten(child, currentPath, currentPath, absoluteQty));
    });
  }
  return result;
}

// The root in the new dump is slightly different
const rootComponent: RawComponent = {
  product_info: rawData.product_info,
  bom_data: rawData.bom_data,
  components: rawData.components,
  suppliers: rawData.suppliers, // Root suppliers
  operations: rawData.operations, // Root operations
  qty_in_parent: 1
};

export const mockBOM: BOMItem[] = flatten(rootComponent);
