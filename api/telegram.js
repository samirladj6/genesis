// ===== Config =====
const SB_URL = 'https://kjqbrdrxehmdgnojphlp.supabase.co';
const SB_KEY = 'sb_publishable_a0hRv6l85rV8wBKPz5N29Q_c1gHoXwA';
const TG_TOKEN = '8447602999:AAGesaY1Syus7rVSdNzP2GE9oMcbV8Hbk9I';
const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// ===== Supabase helpers =====
async function sbGet(table, opts = '') {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${opts}`, { headers: SB_HEADERS });
    return r.json();
}
async function sbPatch(table, id, data) {
    await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH', headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
    });
}
async function sbPost(table, data) {
    await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: 'POST', headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
    });
}

// ===== Telegram helper =====
async function sendTG(chatId, text) {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
}

// ===== Matching produit =====
function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function matchProduct(input, products) {
    const norm = normalize(input);
    if (!norm) return null;

    // 1. Exact match
    let match = products.find(p => normalize(p.name) === norm);
    if (match) return match;

    // 2. Product name starts with input or input starts with product name
    match = products.find(p => normalize(p.name).startsWith(norm) || norm.startsWith(normalize(p.name)));
    if (match) return match;

    // 3. Contains match
    match = products.find(p => normalize(p.name).includes(norm) || norm.includes(normalize(p.name)));
    if (match) return match;

    // 4. Any significant word matches
    const words = norm.split(/\s+/).filter(w => w.length > 2);
    match = products.find(p => {
        const pNorm = normalize(p.name);
        return words.some(w => pNorm.includes(w));
    });
    return match || null;
}

// ===== Parse message =====
function parseInventoryMessage(text) {
    // Split by lines or commas
    const parts = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const updates = [];

    for (const part of parts) {
        // "tenders 10" or "tenders: 10" or "tenders = 10"
        const m1 = part.match(/^(.+?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*$/);
        // "10 tenders"
        const m2 = part.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);

        if (m1) {
            updates.push({ name: m1[1].trim(), quantity: parseFloat(m1[2].replace(',', '.')) });
        } else if (m2) {
            updates.push({ name: m2[2].trim(), quantity: parseFloat(m2[1].replace(',', '.')) });
        }
    }
    return updates;
}

// ===== Handler principal =====
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const { message } = req.body || {};
    if (!message || !message.text) return res.status(200).send('OK');

    const chatId = message.chat.id;
    const text = message.text.trim();

    try {
        // /start ou /aide
        if (text === '/start' || text === '/aide') {
            await sendTG(chatId,
                `🍔 *Genesis — Bot Stock*\n\n` +
                `Envoie-moi ton inventaire du soir et je mets tout à jour !\n\n` +
                `*Comment faire :*\n` +
                `Envoie un message avec chaque produit et sa quantité :\n\n` +
                `\`tenders 10\`\n\`viande 3\`\n\`huile 2\`\n\`cheddar 5\`\n\n` +
                `Je mets à jour le stock et je te dis ce qu'il faut acheter 🛒\n\n` +
                `*Commandes :*\n` +
                `/stock — Voir tout l'inventaire\n` +
                `/courses — Voir la liste de courses\n` +
                `/aide — Afficher cette aide`
            );
            return res.status(200).send('OK');
        }

        // /stock
        if (text === '/stock') {
            const items = await sbGet('inventory', 'order=category.asc,name.asc');
            let msg = '📦 *Inventaire Genesis*\n';
            let currentCat = '';
            for (const i of items) {
                if (i.category !== currentCat) {
                    currentCat = i.category;
                    msg += `\n*── ${i.category} ──*\n`;
                }
                const icon = +i.quantity === 0 ? '🔴' : +i.quantity <= +i.min_stock ? '🟡' : '✅';
                msg += `${icon} ${i.name}: *${i.quantity}* ${i.unit}\n`;
            }
            await sendTG(chatId, msg);
            return res.status(200).send('OK');
        }

        // /courses
        if (text === '/courses') {
            const items = await sbGet('inventory', 'order=category.asc,name.asc');
            const low = items.filter(i => +i.quantity <= +i.min_stock);

            if (!low.length) {
                await sendTG(chatId, '✅ *Tout est bon !* Rien à acheter pour le moment.');
                return res.status(200).send('OK');
            }

            let msg = `🛒 *Liste de courses* (${low.length} produit${low.length > 1 ? 's' : ''})\n\n`;
            for (const i of low) {
                const icon = +i.quantity === 0 ? '🔴 RUPTURE' : '🟡 Stock bas';
                const needed = Math.max(1, Math.ceil(+i.min_stock * 2 - +i.quantity));
                msg += `${icon}\n*${i.name}* : ${i.quantity} ${i.unit} (min: ${i.min_stock})\n→ Acheter *~${needed} ${i.unit}*\n\n`;
            }
            await sendTG(chatId, msg);
            return res.status(200).send('OK');
        }

        // ===== Mise à jour d'inventaire =====
        const updates = parseInventoryMessage(text);

        if (!updates.length) {
            await sendTG(chatId,
                `❓ J'ai pas compris. Envoie ton stock comme ça :\n\n` +
                `\`tenders 10\`\n\`viande 3\`\n\`huile 2\`\n\n` +
                `Ou tape /aide pour voir les commandes.`
            );
            return res.status(200).send('OK');
        }

        const products = await sbGet('inventory', 'order=name.asc');
        const matched = [];
        const notFound = [];

        for (const u of updates) {
            const product = matchProduct(u.name, products);
            if (product) {
                const oldQty = +product.quantity;
                await sbPatch('inventory', product.id, {
                    quantity: u.quantity,
                    updated_at: new Date().toISOString()
                });
                await sbPost('stock_logs', {
                    inventory_id: product.id,
                    action: 'adjust',
                    quantity: u.quantity - oldQty,
                    note: 'Mise à jour via Telegram'
                });
                matched.push({ name: product.name, oldQty, newQty: u.quantity, unit: product.unit, min_stock: product.min_stock });
            } else {
                notFound.push(u.name);
            }
        }

        // Build response
        let msg = '';
        if (matched.length) {
            msg += `✅ *${matched.length} produit(s) mis à jour :*\n\n`;
            for (const r of matched) {
                const icon = r.newQty === 0 ? '🔴' : r.newQty <= +r.min_stock ? '🟡' : '✅';
                msg += `${icon} ${r.name}: ${r.oldQty} → *${r.newQty}* ${r.unit}\n`;
            }
        }
        if (notFound.length) {
            msg += `\n❌ *Non trouvé(s) :* ${notFound.join(', ')}\n`;
            msg += `_Vérifie le nom ou tape /stock pour voir la liste._`;
        }

        // Shopping list
        const allItems = await sbGet('inventory', 'order=category.asc,name.asc');
        const low = allItems.filter(i => +i.quantity <= +i.min_stock);
        if (low.length) {
            msg += `\n\n🛒 *À acheter (${low.length}) :*\n`;
            for (const i of low) {
                const needed = Math.max(1, Math.ceil(+i.min_stock * 2 - +i.quantity));
                msg += `→ *${i.name}* : reste ${i.quantity}, acheter ~${needed} ${i.unit}\n`;
            }
        } else {
            msg += `\n\n✅ *Tous les stocks sont OK !*`;
        }

        await sendTG(chatId, msg);
    } catch (err) {
        await sendTG(chatId, `⚠️ Erreur : ${err.message}`);
    }

    return res.status(200).send('OK');
}
