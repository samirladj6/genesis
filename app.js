// ===== Supabase =====
// REMPLACER par les valeurs de votre nouveau projet Supabase
const SB_URL = 'https://kjqbrdrxehmdgnojphlp.supabase.co';
const SB_KEY = 'sb_publishable_a0hRv6l85rV8wBKPz5N29Q_c1gHoXwA';
const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

const sb = {
    async get(table, opts = '') {
        const r = await fetch(`${SB_URL}/rest/v1/${table}?${opts}`, { headers });
        return r.json();
    },
    async post(table, data) {
        const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
            method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify(data)
        });
        return r.json();
    },
    async patch(table, id, data) {
        const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify(data)
        });
        return r.json();
    },
    async del(table, id) {
        await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers });
    }
};

// ===== WhatsApp Alerts (CallMeBot) =====
const WA_PHONE = '33628204298';
const WA_APIKEY = '8275269';

function sendWhatsApp(message) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${WA_PHONE}&text=${encodeURIComponent(message)}&apikey=${WA_APIKEY}`;
    fetch(url, { mode: 'no-cors' }).catch(() => {});
}

function shouldNotify(productId) {
    const key = `wa_notif_${productId}`;
    const last = localStorage.getItem(key);
    if (last && Date.now() - parseInt(last) < 4 * 3600 * 1000) return false;
    localStorage.setItem(key, Date.now().toString());
    return true;
}

function checkAndNotifyLowStock(items) {
    const alertItems = items.filter(i => +i.quantity <= +i.min_stock && shouldNotify(i.id));
    if (!alertItems.length) return;

    let msg = '⚠️ *ALERTE STOCK — Genesis*\n\n';
    alertItems.forEach(i => {
        const status = +i.quantity === 0 ? '🔴 RUPTURE' : '🟡 Stock bas';
        msg += `${status} : *${i.name}*\n→ ${i.quantity} ${i.unit} (min: ${i.min_stock})\n\n`;
    });
    msg += '📦 Pense à réapprovisionner !';
    sendWhatsApp(msg);
}

// ===== Helpers =====
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// ===== Date =====
const now = new Date();
document.getElementById('currentDate').textContent =
    now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

// ===== Navigation =====
const pageTitles = {
    inventaire: 'Inventaire',
    courses: 'Liste de courses',
    historique: 'Historique'
};

function navigate(page) {
    if (!pageTitles[page]) page = 'inventaire';
    Object.keys(pageTitles).forEach(p => document.getElementById(`page-${p}`).classList.toggle('hidden', p !== page));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.getElementById('pageTitle').textContent = pageTitles[page];
    document.getElementById('sidebar').classList.remove('open');
    const bdrop = document.getElementById('sidebarBackdrop');
    if (bdrop) bdrop.classList.remove('active');
    const loaders = { inventaire: loadInventory, courses: loadCourses, historique: loadHistory };
    if (loaders[page]) loaders[page]();
}

window.addEventListener('hashchange', () => navigate(location.hash.replace('#', '') || 'inventaire'));
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarBackdrop').classList.toggle('active');
});
// Close sidebar on backdrop click
const backdrop = document.getElementById('sidebarBackdrop');
if (backdrop) backdrop.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    backdrop.classList.remove('active');
});
// Bottom nav
document.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    });
});

// ===== Modal =====
function openModal(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('active');
}
function closeModal() { document.getElementById('modal').classList.remove('active'); }
window.closeModal = closeModal;
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// ===== Categories =====
const INV_CATEGORIES = {
    'SEC': { label: 'Sec', color: 'orange' },
    'FRAIS': { label: 'Frais', color: 'blue' },
    'SURGELÉ': { label: 'Surgelé', color: 'teal' },
    'VIANDE': { label: 'Viande', color: 'red' },
    'EMBALLAGE': { label: 'Emballage / Divers', color: 'purple' },
    'SAUCE': { label: 'Sauce', color: 'green' },
    'LÉGUMES': { label: 'Légumes', color: 'green' },
    'DESSERTS': { label: 'Desserts', color: 'orange' }
};

// ===========================================
//  INVENTAIRE
// ===========================================
let allItems = [];

async function loadInventory() {
    allItems = await sb.get('inventory', 'order=category.asc,name.asc');

    const total = allItems.length;
    const lowStock = allItems.filter(i => +i.quantity <= +i.min_stock);
    const okStock = total - lowStock.length;

    document.getElementById('inv-total').textContent = total;
    document.getElementById('inv-total-sub').textContent = Object.keys(INV_CATEGORIES).length + ' catégories';
    document.getElementById('inv-ok').textContent = okStock;
    document.getElementById('inv-ok-sub').textContent = total ? Math.round(okStock / total * 100) + '% du stock' : '';
    document.getElementById('inv-low').textContent = lowStock.length;
    document.getElementById('inv-low-sub').textContent = lowStock.length ? 'à réapprovisionner' : 'tout va bien';
    document.getElementById('inv-low-sub').className = 'kpi-sub ' + (lowStock.length ? 'warning' : 'positive');

    filterAndRender();
    checkAndNotifyLowStock(allItems);
}

function filterAndRender() {
    const catFilter = document.getElementById('invCategoryFilter').value;
    const search = document.getElementById('invSearch').value.toLowerCase().trim();

    let data = allItems;
    if (catFilter !== 'all') data = data.filter(i => i.category === catFilter);
    if (search) data = data.filter(i => i.name.toLowerCase().includes(search));

    // Desktop table
    document.getElementById('inv-table-body').innerHTML = data.map(i => {
        const isLow = +i.quantity <= +i.min_stock;
        const isEmpty = +i.quantity === 0;
        const statusClass = isEmpty ? 'status-rupture' : isLow ? 'status-stock-bas' : 'status-stock-ok';
        const statusText = isEmpty ? 'Rupture' : isLow ? 'Stock bas' : 'OK';
        const cat = INV_CATEGORIES[i.category] || { label: i.category, color: 'blue' };
        return `<tr class="${isLow ? 'inv-row-low' : ''}">
            <td><strong>${i.name}</strong></td>
            <td><span class="inv-cat inv-cat-${cat.color}">${cat.label}</span></td>
            <td class="text-right"><strong class="${isEmpty ? 'text-red' : isLow ? 'text-orange' : ''}">${i.quantity}</strong></td>
            <td>${i.unit}</td>
            <td style="color:var(--text-lighter)">${i.min_stock}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn approve" onclick="addStock(${i.id}, '${i.name.replace(/'/g, "\\'")}', ${i.quantity}, '${i.unit}')">+ Stock</button>
                    <button class="action-btn edit" onclick="editItem(${i.id})">Modifier</button>
                    <button class="action-btn reject" onclick="delItem(${i.id})">&#10005;</button>
                </div>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Aucun produit trouvé</td></tr>';

    // Mobile cards
    document.getElementById('inv-cards-mobile').innerHTML = data.map(i => {
        const isLow = +i.quantity <= +i.min_stock;
        const isEmpty = +i.quantity === 0;
        const statusClass = isEmpty ? 'status-rupture' : isLow ? 'status-stock-bas' : 'status-stock-ok';
        const statusText = isEmpty ? 'Rupture' : isLow ? 'Stock bas' : 'OK';
        const cat = INV_CATEGORIES[i.category] || { label: i.category, color: 'blue' };
        const cardClass = isEmpty ? 'rupture' : isLow ? 'low' : '';
        return `<div class="inv-card-item ${cardClass}">
            <div class="inv-card-top">
                <div class="inv-card-name">${i.name}</div>
                <div class="inv-card-qty ${isEmpty ? 'text-red' : isLow ? 'text-orange' : ''}">${i.quantity} <span style="font-size:0.75rem;font-weight:500;color:var(--text-lighter)">${i.unit}</span></div>
            </div>
            <div class="inv-card-mid">
                <span class="inv-cat inv-cat-${cat.color}">${cat.label}</span>
                <span class="status ${statusClass}">${statusText}</span>
                <span style="font-size:0.72rem;color:var(--text-lighter)">min: ${i.min_stock}</span>
            </div>
            <div class="inv-card-actions">
                <button class="action-btn approve" onclick="addStock(${i.id}, '${i.name.replace(/'/g, "\\'")}', ${i.quantity}, '${i.unit}')">+ Stock</button>
                <button class="action-btn edit" onclick="editItem(${i.id})">Modifier</button>
                <button class="action-btn reject" onclick="delItem(${i.id})">&#10005;</button>
            </div>
        </div>`;
    }).join('') || '<div class="empty-state">Aucun produit trouvé</div>';
}

document.getElementById('invCategoryFilter').addEventListener('change', filterAndRender);
document.getElementById('invSearch').addEventListener('input', filterAndRender);

// ===== Add stock to a single item =====
window.addStock = function(id, name, currentQty, unit) {
    openModal('Réapprovisionner', `
        <form id="addStockForm">
            <p style="margin-bottom:16px">Produit : <strong>${name}</strong></p>
            <p style="margin-bottom:16px;font-size:0.85rem;color:var(--text-light)">Stock actuel : <strong>${currentQty} ${unit}</strong></p>
            <div class="form-group">
                <label>Quantité à ajouter</label>
                <input type="number" name="qty" step="0.5" min="0.5" required autofocus placeholder="Ex : 5">
            </div>
            <div class="form-group">
                <label>Note (optionnel)</label>
                <input type="text" name="note" placeholder="Ex : Courses du lundi">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-success">Ajouter au stock</button>
            </div>
        </form>`);
    document.getElementById('addStockForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const qty = +fd.get('qty');
        if (qty <= 0) return;
        await sb.patch('inventory', id, { quantity: +currentQty + qty, updated_at: new Date().toISOString() });
        await sb.post('stock_logs', { inventory_id: id, action: 'restock', quantity: qty, note: fd.get('note') || 'Réapprovisionnement' });
        closeModal();
        loadInventory();
    };
};

// ===== Edit item =====
window.editItem = async function(id) {
    const items = await sb.get('inventory', `id=eq.${id}`);
    const item = items[0];
    if (!item) return;

    const catOptions = Object.entries(INV_CATEGORIES).map(([k, v]) =>
        `<option value="${k}" ${k === item.category ? 'selected' : ''}>${v.label}</option>`
    ).join('');

    openModal('Modifier le produit', `
        <form id="editItemForm">
            <div class="form-group"><label>Nom du produit</label><input type="text" name="name" value="${item.name}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Catégorie</label><select name="category">${catOptions}</select></div>
                <div class="form-group"><label>Unité</label><input type="text" name="unit" value="${item.unit}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantité actuelle</label><input type="number" name="quantity" step="0.5" min="0" value="${item.quantity}" required></div>
                <div class="form-group"><label>Seuil minimum</label><input type="number" name="min_stock" step="0.5" min="0" value="${item.min_stock}"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
        </form>`);
    document.getElementById('editItemForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newQty = +fd.get('quantity');
        const oldQty = +item.quantity;
        await sb.patch('inventory', id, {
            name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'),
            quantity: newQty, min_stock: +fd.get('min_stock'),
            updated_at: new Date().toISOString()
        });
        if (newQty !== oldQty) {
            await sb.post('stock_logs', {
                inventory_id: id, action: 'adjust',
                quantity: newQty - oldQty, note: 'Ajustement manuel'
            });
            // Notify immediately if stock just dropped below threshold
            if (newQty <= +fd.get('min_stock') && oldQty > +item.min_stock) {
                const status = newQty === 0 ? '🔴 RUPTURE' : '🟡 Stock bas';
                sendWhatsApp(`⚠️ *ALERTE STOCK — Genesis*\n\n${status} : *${fd.get('name')}*\n→ ${newQty} ${fd.get('unit') || item.unit} (min: ${fd.get('min_stock')})\n\n📦 Pense à réapprovisionner !`);
                localStorage.setItem(`wa_notif_${id}`, Date.now().toString());
            }
        }
        closeModal();
        loadInventory();
    };
};

// ===== Delete item =====
window.delItem = async function(id) {
    if (confirm('Supprimer ce produit de l\'inventaire ?')) {
        await sb.del('inventory', id);
        loadInventory();
    }
};

// ===== Add new item =====
document.getElementById('addItemBtn').addEventListener('click', () => {
    const catOptions = Object.entries(INV_CATEGORIES).map(([k, v]) =>
        `<option value="${k}">${v.label}</option>`
    ).join('');

    openModal('Nouveau produit', `
        <form id="newItemForm">
            <div class="form-group"><label>Nom du produit</label><input type="text" name="name" required placeholder="Ex : Ketchup"></div>
            <div class="form-row">
                <div class="form-group"><label>Catégorie</label><select name="category">${catOptions}</select></div>
                <div class="form-group"><label>Unité</label><input type="text" name="unit" value="unité(s)" placeholder="kg, L, paquet(s)..."></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantité initiale</label><input type="number" name="quantity" step="0.5" min="0" value="0" required></div>
                <div class="form-group"><label>Seuil minimum</label><input type="number" name="min_stock" step="0.5" min="0" value="0"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </div>
        </form>`);
    document.getElementById('newItemForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('inventory', {
            name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'),
            quantity: +fd.get('quantity'), min_stock: +fd.get('min_stock')
        });
        closeModal();
        loadInventory();
    };
});

// ===== Quick restock (select from list) =====
document.getElementById('addStockBtn').addEventListener('click', async () => {
    const items = await sb.get('inventory', 'order=category.asc,name.asc');
    const options = items.map(i => {
        const cat = INV_CATEGORIES[i.category] || { label: i.category };
        return `<option value="${i.id}" data-qty="${i.quantity}" data-unit="${i.unit}">${cat.label} — ${i.name} (${i.quantity} ${i.unit})</option>`;
    }).join('');

    openModal('Réapprovisionnement rapide', `
        <form id="quickStockForm">
            <div class="form-group">
                <label>Produit</label>
                <select name="item_id" id="quickStockSelect">${options}</select>
            </div>
            <div class="form-group">
                <label>Quantité à ajouter</label>
                <input type="number" name="qty" step="0.5" min="0.5" required placeholder="Ex : 10">
            </div>
            <div class="form-group">
                <label>Note (optionnel)</label>
                <input type="text" name="note" placeholder="Ex : Livraison fournisseur">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-success">Ajouter au stock</button>
            </div>
        </form>`);
    document.getElementById('quickStockForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const sel = document.getElementById('quickStockSelect');
        const opt = sel.options[sel.selectedIndex];
        const currentQty = +opt.dataset.qty;
        const qty = +fd.get('qty');
        if (qty <= 0) return;
        const itemId = fd.get('item_id');
        await sb.patch('inventory', itemId, { quantity: currentQty + qty, updated_at: new Date().toISOString() });
        await sb.post('stock_logs', { inventory_id: +itemId, action: 'restock', quantity: qty, note: fd.get('note') || 'Réapprovisionnement' });
        closeModal();
        loadInventory();
    };
});

// ===========================================
//  LISTE DE COURSES
// ===========================================
async function loadCourses() {
    const items = await sb.get('inventory', 'order=category.asc,name.asc');
    const lowStock = items.filter(i => +i.quantity <= +i.min_stock);

    const el = document.getElementById('courses-list');
    if (!lowStock.length) {
        el.innerHTML = '<div class="empty-state">Tous les stocks sont au-dessus du seuil minimum. Rien à acheter pour le moment !</div>';
        return;
    }

    el.innerHTML = lowStock.map(i => {
        const cat = INV_CATEGORIES[i.category] || { label: i.category, color: 'blue' };
        const needed = Math.max(0, +i.min_stock * 2 - +i.quantity);
        return `<div class="course-item">
            <div class="course-info">
                <div class="course-name">${i.name}</div>
                <div class="course-detail"><span class="inv-cat inv-cat-${cat.color}" style="font-size:0.68rem;padding:2px 8px">${cat.label}</span> &middot; Stock : ${i.quantity} ${i.unit} &middot; Seuil : ${i.min_stock} ${i.unit}</div>
            </div>
            <span class="course-badge">${isEmpty(i) ? 'RUPTURE' : 'Stock bas'}</span>
            <button class="btn btn-sm btn-success" onclick="addStock(${i.id}, '${i.name.replace(/'/g, "\\'")}', ${i.quantity}, '${i.unit}')">+ Réappro</button>
        </div>`;
    }).join('');
}

function isEmpty(i) { return +i.quantity === 0; }

document.getElementById('restockAllBtn').addEventListener('click', async () => {
    const items = await sb.get('inventory', 'order=category.asc,name.asc');
    const lowStock = items.filter(i => +i.quantity <= +i.min_stock);

    if (!lowStock.length) { alert('Aucun produit à réapprovisionner.'); return; }

    const list = lowStock.map(i => `${i.name} : ${i.quantity} → ${+i.min_stock * 2} ${i.unit}`).join('\n');
    if (!confirm(`Réapprovisionner ${lowStock.length} produits au double du seuil minimum ?\n\n${list}`)) return;

    for (const i of lowStock) {
        const target = +i.min_stock * 2;
        const toAdd = target - +i.quantity;
        if (toAdd > 0) {
            await sb.patch('inventory', i.id, { quantity: target, updated_at: new Date().toISOString() });
            await sb.post('stock_logs', { inventory_id: i.id, action: 'restock', quantity: toAdd, note: 'Réapprovisionnement groupé' });
        }
    }
    loadCourses();
});

// ===========================================
//  HISTORIQUE
// ===========================================
async function loadHistory() {
    const [logs, items] = await Promise.all([
        sb.get('stock_logs', 'order=created_at.desc&limit=100'),
        sb.get('inventory', 'select=id,name')
    ]);

    const nameMap = {};
    items.forEach(i => nameMap[i.id] = i.name);

    const actionLabels = { restock: 'Réappro', use: 'Utilisation', adjust: 'Ajustement' };

    document.getElementById('logs-table-body').innerHTML = logs.map(l => {
        const sign = l.quantity >= 0 ? '+' : '';
        return `<tr>
            <td>${fmtDateTime(l.created_at)}</td>
            <td><strong>${nameMap[l.inventory_id] || 'Produit supprimé'}</strong></td>
            <td><span class="log-${l.action}">${actionLabels[l.action] || l.action}</span></td>
            <td class="text-right"><strong class="${l.quantity >= 0 ? '' : 'text-red'}">${sign}${l.quantity}</strong></td>
            <td style="color:var(--text-lighter)">${l.note || '—'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty-state">Aucun mouvement enregistré</td></tr>';
}

// ===== INIT =====
navigate(location.hash.replace('#', '') || 'inventaire');
