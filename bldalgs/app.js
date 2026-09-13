const SUPABASE_URL = 'https://xrkgsfgqlbbauvpnkzha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhya2dzZmdxbGJiYXV2cG5remhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Mzc1MTgsImV4cCI6MjA1OTUxMzUxOH0.1YfQV8RKGOFcrnPesQmOETSWXmzorheHlltDjz2QB1o';

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isAdmin = false;
let algData = {};
let currentTab = 'Corners';

const tabsTables = {
    "Corners": "viw_alg_3c",
    "Edges": "viw_alg_3e",
    "Wings": "viw_alg_3w",
    "LTCT": "viw_alg_ltct",
};

// Schema config for each tab: underlying alg table, piece tables, FK columns, labels
const algSchema = {
    "Corners": {
        algTable: "tbl_alg_3c",
        fkColumns: ["c1", "c2", "c3"],
        pieceTables: ["tbl_piece_corner", "tbl_piece_corner", "tbl_piece_corner"],
        labels: ["Buffer", "Piece 2", "Piece 3"],
    },
    "Edges": {
        algTable: "tbl_alg_3e",
        fkColumns: ["e1", "e2", "e3"],
        pieceTables: ["tbl_piece_edge", "tbl_piece_edge", "tbl_piece_edge"],
        labels: ["Buffer", "Piece 2", "Piece 3"],
    },
    "Wings": {
        algTable: "tbl_alg_3w",
        fkColumns: ["w1", "w2", "w3"],
        pieceTables: ["tbl_piece_wing", "tbl_piece_wing", "tbl_piece_wing"],
        labels: ["Buffer", "Piece 2", "Piece 3"],
    },
    "LTCT": {
        algTable: "tbl_alg_2c2et1c",
        fkColumns: ["c2", "tc1"],
        pieceTables: ["tbl_piece_corner", "tbl_piece_corner"],
        labels: ["Parity Target", "Twist"],
        fixedFields: { c1: 3, e1: 2, e2: 3 },
    },
};

let pieceCache = {};

async function fetchPieces(tableName) {
    if (pieceCache[tableName]) return pieceCache[tableName];
    const { data, error } = await supa.from(tableName).select('id, name').order('name');
    if (error) {
        console.error('Error fetching pieces:', error);
        return [];
    }
    pieceCache[tableName] = data;
    return data;
}

// ---------- Auth ----------

async function signIn(email, password) {
    const { error } = await supa.auth.signInWithPassword({ email, password });
    return error;
}

async function signOut() {
    await supa.auth.signOut();
    isAdmin = false;
    document.body.classList.remove('admin');
    const tab = currentTab;
    if (algData[tab]) {
        renderTab(tab, algData[tab]);
    }
}

async function initAuth() {
    const { data: { session } } = await supa.auth.getSession();
    if (session) {
        isAdmin = true;
        document.body.classList.add('admin');
    }

    supa.auth.onAuthStateChange((_event, session) => {
        if (session) {
            isAdmin = true;
            document.body.classList.add('admin');
        } else {
            isAdmin = false;
            document.body.classList.remove('admin');
        }
    });
}

// ---------- Data ----------

async function fetchData(tableName, tabId) {
    try {
        const { data, error } = await supa
            .from(tableName)
            .select('*')
            .not('alg', 'is', null);

        if (error) throw error;

        if (data && data.length > 0) {
            algData[tabId] = data;
            renderTab(tabId, data);
        } else {
            document.getElementById(tabId).innerHTML = '<p>No data found.</p>';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById(tabId).innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// ---------- Rendering ----------

function renderTab(tabId, data) {
    const tabContent = document.getElementById(tabId);
    tabContent.innerHTML = '';

    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search-input';
    searchInput.placeholder = 'Filter...';
    searchInput.oninput = () => filterEntries(tabId);
    searchBar.appendChild(searchInput);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear';
    clearBtn.textContent = '\u00d7';
    clearBtn.onclick = () => {
        searchInput.value = '';
        filterEntries(tabId);
    };
    searchBar.appendChild(clearBtn);

    if (isAdmin) {
        const addBtn = document.createElement('button');
        addBtn.className = 'add-btn';
        addBtn.textContent = '+ Add algorithm';
        addBtn.onclick = () => openAddModal(tabId);
        searchBar.appendChild(addBtn);
    }

    tabContent.appendChild(searchBar);

    switch (tabId) {
        case 'Corners':
        case 'Edges':
        case 'Wings':
            render3PieceTab(tabContent, data, tabId);
            break;
        case 'LTCT':
            renderLTCTTab(tabContent, data, tabId);
            break;
    }
}

function render3PieceTab(tabContent, data, tabId) {
    const grouped = {};
    data.forEach(({ id, p1, p2, p3, alg }) => {
        if (!grouped[p1]) grouped[p1] = {};
        if (!grouped[p1][p2]) grouped[p1][p2] = [];
        grouped[p1][p2].push({ id, p3, alg });
    });

    for (const p1 in grouped) {
        const p1Div = document.createElement('div');
        const p1Summary = document.createElement('h3');
        p1Summary.textContent = `Buffer: ${p1}`;
        p1Div.appendChild(p1Summary);

        for (const p2 in grouped[p1]) {
            const p2Details = document.createElement('details');
            const p2Summary = document.createElement('summary');
            p2Summary.textContent = p2;
            p2Details.appendChild(p2Summary);

            grouped[p1][p2].forEach(({ id, p3, alg }) => {
                p2Details.appendChild(buildEntry(`${p2}-${p3}`, alg, algSchema[tabId].algTable, id, tabId));
            });

            p1Div.appendChild(p2Details);
        }

        tabContent.appendChild(p1Div);
    }
}

function renderLTCTTab(tabContent, data, tabId) {
    const grouped = {};
    data.forEach(({ id, parity_target, twist, alg }) => {
        if (!grouped[parity_target]) grouped[parity_target] = [];
        grouped[parity_target].push({ id, twist, alg });
    });

    for (const p1 in grouped) {
        const p1Details = document.createElement('details');
        const p1Summary = document.createElement('summary');
        p1Summary.textContent = p1;
        p1Details.appendChild(p1Summary);

        grouped[p1].forEach(({ id, twist, alg }) => {
            p1Details.appendChild(buildEntry(twist, alg, algSchema[tabId].algTable, id, tabId));
        });

        tabContent.appendChild(p1Details);
    }
}

function buildEntry(label, alg, tableName, id, tabId) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    entryDiv.dataset.id = id;
    entryDiv.dataset.table = tableName;
    entryDiv.dataset.tab = tabId;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label + ':';
    entryDiv.appendChild(labelSpan);

    const algSpan = document.createElement('span');
    algSpan.textContent = alg;
    entryDiv.appendChild(algSpan);

    if (isAdmin) {
        entryDiv.appendChild(makeEditBtn());
        entryDiv.appendChild(makeDelBtn());
    }

    return entryDiv;
}

// ---------- Search / Filter ----------

function filterEntries(tabId) {
    const tabContent = document.getElementById(tabId);
    const searchInput = tabContent.querySelector('#search-input');
    const query = searchInput.value.toLowerCase().trim();
    const entries = tabContent.querySelectorAll('.entry');

    entries.forEach(entry => {
        const text = entry.textContent.toLowerCase();
        entry.style.display = (!query || text.includes(query)) ? '' : 'none';
    });

    // Show/hide parent sections based on whether they have visible entries
    const allDetails = tabContent.querySelectorAll('details');
    allDetails.forEach(details => {
        const hasVisible = details.querySelector('.entry:not([style*="display: none"])');
        details.style.display = (!query || hasVisible) ? '' : 'none';
        if (query && hasVisible) details.open = true;
    });

    // For 3-piece tabs: show/hide buffer h3 groups
    const bufferGroups = tabContent.querySelectorAll(':scope > div > h3');
    bufferGroups.forEach(h3 => {
        const parent = h3.parentElement;
        const hasVisible = parent.querySelector('.entry:not([style*="display: none"])');
        parent.style.display = (!query || hasVisible) ? '' : 'none';
    });
}

function makeEditBtn() {
    const btn = document.createElement('button');
    btn.className = 'edit-btn';
    btn.textContent = 'edit';
    btn.onclick = startEdit;
    return btn;
}

function makeDelBtn() {
    const btn = document.createElement('button');
    btn.className = 'del-btn';
    btn.textContent = 'del';
    btn.onclick = deleteAlg;
    return btn;
}

// ---------- Edit ----------

function startEdit(e) {
    const entry = e.target.closest('.entry');
    const algSpan = entry.querySelector('span:nth-child(2)');
    const oldAlg = algSpan.textContent;
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'entry-edit-input';
    editInput.value = oldAlg;

    algSpan.replaceWith(editInput);
    e.target.remove();

    const delBtn = entry.querySelector('.del-btn');
    if (delBtn) delBtn.remove();

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'save';
    saveBtn.onclick = saveEdit;

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'cancel';
    cancelBtn.onclick = () => cancelEdit(entry, oldAlg);

    entry.appendChild(saveBtn);
    entry.appendChild(cancelBtn);
    editInput.focus();
}

function cancelEdit(entry, oldAlg) {
    const input = entry.querySelector('.entry-edit-input');
    const labelSpan = document.createElement('span');
    labelSpan.textContent = entry.querySelector('span').textContent;

    const algSpan = document.createElement('span');
    algSpan.textContent = oldAlg;

    entry.innerHTML = '';
    entry.appendChild(labelSpan);
    entry.appendChild(algSpan);
    entry.appendChild(makeEditBtn());
    entry.appendChild(makeDelBtn());
}

async function saveEdit(e) {
    const entry = e.target.closest('.entry');
    const id = entry.dataset.id;
    const tableName = entry.dataset.table;
    const tabId = entry.dataset.tab;
    const input = entry.querySelector('.entry-edit-input');
    const newAlg = input.value.trim();

    if (!newAlg) return;
    console.log("Saving to table", tableName, "id", id, "alg", newAlg);
    const { error } = await supa.from(tableName).update({ alg: newAlg }).eq('id', id);
    if (error) {
        alert('Error saving: ' + error.message);
        return;
    }

    // Update local data
    const row = algData[tabId].find(r => r.id == id);
    if (row) row.alg = newAlg;

    renderTab(tabId, algData[tabId]);
}

async function deleteAlg(e) {
    const entry = e.target.closest('.entry');
    const id = entry.dataset.id;
    const tableName = entry.dataset.table;
    const tabId = entry.dataset.tab;

    if (!confirm('Delete this algorithm?')) return;

    const { error } = await supa.from(tableName).delete().eq('id', id);
    if (error) {
        alert('Error deleting: ' + error.message);
        return;
    }

    algData[tabId] = algData[tabId].filter(r => r.id != id);
    renderTab(tabId, algData[tabId]);
}

// ---------- Add ----------

async function openAddModal(tabId) {
    currentTab = tabId;
    const overlay = document.getElementById('add-overlay');
    const fields = document.getElementById('add-fields');
    const title = document.getElementById('add-modal-title');
    const algInput = document.getElementById('add-alg');
    const errorDiv = document.getElementById('add-error');

    fields.innerHTML = '';
    errorDiv.textContent = '';
    algInput.value = '';

    const schema = algSchema[tabId];
    title.textContent = `Add ${tabId} Algorithm`;

    if (schema.fixedFields) {
        for (const [col, val] of Object.entries(schema.fixedFields)) {
            const fixedDiv = document.createElement('div');
            fixedDiv.className = 'add-field-fixed';
            fixedDiv.innerHTML = `<span class="add-fixed-label">${col}:</span> <span class="add-fixed-value">fixed (${val})</span>`;
            fields.appendChild(fixedDiv);
        }
    }

    for (let i = 0; i < schema.fkColumns.length; i++) {
        const pieces = await fetchPieces(schema.pieceTables[i]);

        const label = document.createElement('label');
        label.textContent = schema.labels[i];
        label.className = 'add-field-label';

        const select = document.createElement('select');
        select.id = `add-p${i}`;
        select.required = true;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = `Select ${schema.labels[i].toLowerCase()}...`;
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        pieces.forEach(({ id, name }) => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            opt.dataset.id = id;
            select.appendChild(opt);
        });

        label.appendChild(select);
        fields.appendChild(label);
    }

    overlay.classList.add('open');
}

function closeAddModal() {
    document.getElementById('add-overlay').classList.remove('open');
}

async function handleAdd(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('add-error');
    errorDiv.textContent = '';

    const schema = algSchema[currentTab];
    const alg = document.getElementById('add-alg').value.trim();

    const newRow = { alg };

    if (schema.fixedFields) {
        Object.assign(newRow, schema.fixedFields);
    }

    for (let i = 0; i < schema.fkColumns.length; i++) {
        const select = document.getElementById(`add-p${i}`);
        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption || !selectedOption.dataset.id) {
            errorDiv.textContent = `Please select ${schema.labels[i].toLowerCase()}`;
            return;
        }
        newRow[schema.fkColumns[i]] = parseInt(selectedOption.dataset.id);
    }

    const { error } = await supa.from(schema.algTable).insert(newRow);
    if (error) {
        errorDiv.textContent = error.message;
        return;
    }

    closeAddModal();

    // Re-fetch to get the view data with joined names
    const viewName = tabsTables[currentTab];
    const { data, error: fetchError } = await supa
        .from(viewName)
        .select('*')
        .not('alg', 'is', null);

    if (!fetchError && data) {
        algData[currentTab] = data;
        renderTab(currentTab, data);
    }
}

// ---------- Login modal ----------

function openLogin() {
    document.getElementById('login-overlay').classList.add('open');
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-form').reset();
}

function closeLogin() {
    document.getElementById('login-overlay').classList.remove('open');
}

async function handleLogin(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    errorDiv.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const error = await signIn(email, password);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';

    if (error) {
        errorDiv.textContent = error.message;
        return;
    }

    closeLogin();

    // Re-render current tab with edit controls
    if (algData[currentTab]) {
        renderTab(currentTab, algData[currentTab]);
    }
}

// ---------- Init ----------

window.onload = async () => {
    await initAuth();
    const hash = window.location.hash.substring(1);
    const tab = hash in tabsTables ? hash : 'Corners';
    showTab(tab);
};

function showTab(tabId) {
    currentTab = tabId;

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    activeTab.style.display = 'block';

    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    activeButton.classList.add('active');

    if (algData[tabId]) {
        renderTab(tabId, algData[tabId]);
    } else {
        fetchData(tabsTables[tabId], tabId);
    }
}
