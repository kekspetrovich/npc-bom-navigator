import xmlrpc.client
import json
import sys
import os

try:
    from secret import url, db, username, api_key
except ImportError:
    print("❌ Ошибка: Создайте файл secret.py"); sys.exit(1)

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, api_key, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object', allow_none=True)

CTX = {'lang': 'ru_RU'}
FIELDS_CACHE = {}
RECORD_CACHE = {} 
BOM_ID_CACHE = {}
SUPPLIER_CACHE = {}
OPERATION_CACHE = {}

# --- FIELDS CONFIGURATION ---
PRODUCT_FIELDS = ['display_name', 'product_tmpl_id', 'categ_id', 'image_128']
BOM_FIELDS = ['display_name', 'bom_line_ids', 'code', 'type']
LINE_FIELDS = ['product_id', 'product_qty', 'product_uom_id']
SUPPLIER_FIELDS = ['partner_id', 'price', 'currency_id', 'delay', 'product_code']
OPERATION_FIELDS = ['name', 'workcenter_id', 'time_cycle']

def get_record_cached(model, record_id, fields):
    cache_key = (model, record_id, tuple(fields))
    if cache_key in RECORD_CACHE:
        return RECORD_CACHE[cache_key]
    
    try:
        data = models.execute_kw(db, uid, api_key, model, 'read', [[record_id]], 
                                 {'fields': fields, 'context': CTX})
        res = data[0] if data else {}
        RECORD_CACHE[cache_key] = res
        return res
    except Exception:
        return {"display_name": "Error reading record"}

def get_suppliers(product_id):
    if product_id in SUPPLIER_CACHE:
        return SUPPLIER_CACHE[product_id]
        
    supplier_ids = models.execute_kw(db, uid, api_key, 'product.supplierinfo', 'search', 
                                    [[('product_tmpl_id.product_variant_ids', 'in', [product_id])]])
    if not supplier_ids: 
        SUPPLIER_CACHE[product_id] = []
        return []
        
    res = models.execute_kw(db, uid, api_key, 'product.supplierinfo', 'read', [supplier_ids], 
                             {'fields': SUPPLIER_FIELDS, 'context': CTX})
    SUPPLIER_CACHE[product_id] = res
    return res

def get_operations(bom_id):
    if bom_id in OPERATION_CACHE:
        return OPERATION_CACHE[bom_id]
        
    op_ids = models.execute_kw(db, uid, api_key, 'mrp.routing.workcenter', 'search', 
                               [[('bom_id', '=', bom_id)]])
    if not op_ids:
        OPERATION_CACHE[bom_id] = []
        return []
        
    res = models.execute_kw(db, uid, api_key, 'mrp.routing.workcenter', 'read', [op_ids], 
                             {'fields': OPERATION_FIELDS, 'context': CTX})
    OPERATION_CACHE[bom_id] = res
    return res

def build_full_tree(p_id, visited=None, level=0):
    if visited is None: visited = set()
    
    product_data = get_record_cached('product.product', p_id, PRODUCT_FIELDS)
    p_name = product_data.get('display_name', f'ID {p_id}')
    
    indent = "  " * level
    print(f"{indent}📦 Продукт: {p_name}")
    
    suppliers_data = get_suppliers(p_id)

    node = {
        "product_info": product_data, 
        "suppliers": suppliers_data,
        "operations": [],
        "bom_data": None, 
        "components": []
    }

    if p_id in visited:
        node["status"] = "already_processed"
        return node
    visited.add(p_id)

    tmpl_id = product_data.get('product_tmpl_id')
    if isinstance(tmpl_id, list): tmpl_id = tmpl_id[0]

    if p_id not in BOM_ID_CACHE:
        domain = ['|', ('product_id', '=', p_id), '&', ('product_tmpl_id', '=', tmpl_id), ('product_id', '=', False)]
        bom_ids = models.execute_kw(db, uid, api_key, 'mrp.bom', 'search', [domain], {'limit': 1})
        BOM_ID_CACHE[p_id] = bom_ids[0] if bom_ids else None

    bom_id = BOM_ID_CACHE[p_id]

    if bom_id:
        print(f"{indent}    📜 BoM: {p_name} (ID {bom_id})")
        node["bom_data"] = get_record_cached('mrp.bom', bom_id, BOM_FIELDS)
        node["operations"] = get_operations(bom_id)
        
        line_ids = node["bom_data"].get('bom_line_ids', [])
        if line_ids:
            lines = models.execute_kw(db, uid, api_key, 'mrp.bom.line', 'read', [line_ids], 
                                     {'fields': ['product_id', 'id'], 'context': CTX})
            for line in lines:
                child_id = line['product_id'][0]
                component_tree = build_full_tree(child_id, visited.copy(), level + 1)
                component_tree["line_info"] = get_record_cached('mrp.bom.line', line['id'], LINE_FIELDS)
                node["components"].append(component_tree)
                
    return node

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(1)
    target_id = int(sys.argv[1])
    
    check_p = models.execute_kw(db, uid, api_key, 'product.product', 'search', [[('id', '=', target_id)]])
    if not check_p:
        res_t = models.execute_kw(db, uid, api_key, 'product.template', 'read', [target_id], 
                                 {'fields': ['product_variant_id'], 'context': CTX})
        if res_t and res_t[0].get('product_variant_id'):
            target_id = res_t[0]['product_variant_id'][0]

    final_data = build_full_tree(target_id)

    filename = f"full_bom_with_ops_{target_id}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=4)
    print(f"\n🏁 Готово! Операции добавлены в файл: {filename}")