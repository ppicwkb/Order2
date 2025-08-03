// ==========================
// 🧠 Helper Permission Tools
// ==========================

// Map antara teks aksi dan permission-nya
const actionPermissionMap = {
    'Export PDF': 'export',
    'Analytics': 'analytics',
    'Data Summary': 'read'
};

// Cek apakah user punya akses
function hasAccess(permission) {
    const perms = State?.currentUser?.permissions || [];
    return perms.includes(permission) || perms.includes('all');
}

// Filter actions yang boleh ditampilkan
function secureActions() {
    return (typeof actions !== 'undefined' ? actions : []).filter(act => {
        const required = actionPermissionMap[act.text];
        return required && hasAccess(required);
    });
}

// Render tombol actions yang sudah difilter
function renderActions() {
    const menu = document.getElementById('actionMenu');
    if (!menu) return;

    menu.innerHTML = '';

    const allowed = secureActions();

    if (allowed.length === 0) {
        menu.innerHTML = '<p class="text-gray-500">🙅‍♂️ Tidak ada menu yang bisa diakses</p>';
        return;
    }

    allowed.forEach(act => {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${act.icon}"></i> ${act.text}`;
        btn.onclick = act.action;
        btn.className = 'action-btn px-4 py-2 m-2 rounded bg-indigo-600 text-white hover:bg-indigo-700';
        menu.appendChild(btn);
    });
}

// Kunci fungsi export jika tidak punya akses
(function lockExportPDF() {
    if (typeof Export !== 'undefined' && typeof Export.toPDF === 'function') {
        const originalExportPDF = Export.toPDF;
        Export.toPDF = function () {
            if (!hasAccess('export')) {
                alert('❌ Kamu tidak punya akses export PDF.');
                return;
            }
            originalExportPDF();
        };
    }
})();