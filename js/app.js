/**
 * app.js - Logika utama WebGIS Surabaya
 *
 * Fitur:
 *  1. Peta interaktif fasilitas Darurat & Keuangan (Leaflet + MarkerCluster)
 *  2. Basemap Dark Mode bebas watermark "API KEY REQUIRED" + OpenStreetMap
 *  3. Halaman Mulai (Start Screen) -> Modal Role Selector (1. Admin / 2. Anggota)
 *  4. Pembatasan Hak Akses (Role-Based Access Control):
 *     - 1. Admin   : Badge "Halo, 1. Admin", tombol "+ Tambah Fasilitas", dan "Form Kelola Admin"
 *     - 2. Anggota : Badge "Halo, 2. Anggota", sembunyikan fitur tambah fasilitas & kelola admin
 *  5. Pencarian fasilitas & Tambah fasilitas (dengan validasi positif & negatif)
 */
document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // 0. Konstanta & helper
    // =========================================================
    const STORAGE_KEY = 'webgis_surabaya_fasilitas_baru';
    const ADMIN_CONFIG_KEY = 'webgis_surabaya_admin_config';
    const MAX_RESULTS = 50;
    const TYPE_LABEL = {
        emergency: 'Fasilitas Darurat & Keamanan',
        financial: 'Fasilitas Keuangan'
    };
    const AMENITY_LABEL = {
        police: 'Kantor Polisi',
        hospital: 'Rumah Sakit',
        fire_station: 'Pemadam Kebakaran',
        clinic: 'Klinik',
        veterinary: 'Klinik Hewan',
        bank: 'Bank',
        atm: 'ATM'
    };

    const $ = (id) => document.getElementById(id);

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    let toastTimer = null;
    function showToast(message, type = 'success', duration = 8000) {
        const toast = $('toast');
        toast.textContent = message;
        toast.className = 'toast toast-' + type;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
    }

    function showMessage(el, message, type) {
        el.textContent = message;
        el.className = 'message ' + (type === 'error' ? 'msg-error' : 'msg-success');
    }

    function hideMessage(el) {
        el.textContent = '';
        el.className = 'message hidden';
    }

    function hideLoader() {
        const loader = $('loader');
        loader.style.pointerEvents = 'none';
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }

    function showLoaderError(message) {
        $('loader').innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:#ef4444; margin-bottom:20px;"></i>
            <div id="loader-error" style="color: white; font-family:'Outfit', sans-serif;">${escapeHtml(message)}</div>
        `;
    }

    if (typeof L === 'undefined') {
        showLoaderError('Library peta (Leaflet) gagal dimuat. Periksa koneksi internet Anda lalu muat ulang halaman.');
        return;
    }

    // =========================================================
    // 1. Initialize Map
    // =========================================================
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([-7.250445, 112.768845], 12);

    // 2. Map Controls
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.attribution({
        position: 'bottomleft',
        prefix: 'Created with <i class="fa-solid fa-heart" style="color: #ef4444;"></i> using Leaflet | &copy; OpenStreetMap'
    }).addTo(map);

    // 3. Basemaps (Tanpa watermark "API KEY REQUIRED")
    // Dark Mode Basemap (bebas watermark API KEY REQUIRED, tajam & cepat)
    const darkMatter = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'dark-basemap-tiles',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Dark Theme'
    });

    // OpenStreetMap Standard (Terang)
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Aktifkan Dark Mode secara default (bebas watermark)
    darkMatter.addTo(map);

    // 4. Custom Icons
    const createDotIcon = (color, size = 16) => L.divIcon({
        className: 'custom-dot-icon',
        html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
    const ICONS = {
        emergency: createDotIcon('#ef4444'),
        financial: createDotIcon('#10b981')
    };

    // 5. Marker Clusters
    function createCluster(type, color) {
        return L.markerClusterGroup({
            iconCreateFunction: (cluster) => L.divIcon({
                html: `<div class="cluster-${type}">${cluster.getChildCount()}</div>`,
                className: 'empty',
                iconSize: [40, 40]
            }),
            maxClusterRadius: 50,
            polygonOptions: { fillColor: color, color: color, weight: 2, opacity: 1, fillOpacity: 0.2 }
        });
    }
    const clusters = {
        emergency: createCluster('emergency', '#ef4444'),
        financial: createCluster('financial', '#10b981')
    };

    // 6. Utility: Determine Feature Type
    function getFeatureType(feature) {
        const props = feature.properties || {};
        let isEmergency = false;
        let isFinancial = false;

        if (props.emergency && props.emergency !== 'no') isEmergency = true;

        const emergencyAmenities = ['police', 'hospital', 'fire_station', 'clinic', 'veterinary'];
        if (emergencyAmenities.includes(props.amenity) || emergencyAmenities.includes(props.building)) {
            isEmergency = true;
        }

        const financialAmenities = ['bank', 'atm'];
        if (financialAmenities.includes(props.amenity) || financialAmenities.includes(props.building)) {
            isFinancial = true;
        }

        if (!isEmergency && !isFinancial && props.name) {
            const nameLower = props.name.toLowerCase();
            if (nameLower.includes('bank') || nameLower.includes('atm') || nameLower.includes('bpr')) {
                isFinancial = true;
            } else if (nameLower.includes('polsek') || nameLower.includes('polisi') || nameLower.includes('rs') || nameLower.includes('klinik')) {
                isEmergency = true;
            }
        }

        return isEmergency ? 'emergency' : 'financial';
    }

    // 7. Utility: Generate Custom Popup
    function createPopupContent(properties, type) {
        const title = properties.name || 'Fasilitas Tidak Bernama';
        const themeClass = type === 'emergency' ? 'emergency-theme' : 'financial-theme';
        const iconClass = type === 'emergency' ? 'fa-solid fa-truck-medical' : 'fa-solid fa-building-columns';

        let html = `
            <div class="${themeClass}">
                <div class="popup-header">
                    <div class="popup-icon-wrapper"><i class="${iconClass}"></i></div>
                    <div>
                        <h3 class="popup-title">${escapeHtml(title)}</h3>
                        <div class="popup-subtitle">${TYPE_LABEL[type]}</div>
                    </div>
                </div>
                <div class="popup-body">
        `;

        for (const [key, value] of Object.entries(properties)) {
            if (value !== null && value !== undefined && value !== '' && key !== 'osm_id' && key !== 'osm_type') {
                html += `
                    <div class="popup-row">
                        <span class="popup-key">${escapeHtml(key.replace(/_/g, ' '))}</span>
                        <span class="popup-value">${escapeHtml(value)}</span>
                    </div>
                `;
            }
        }

        html += `</div></div>`;
        return html;
    }

    // =========================================================
    // 8. Load data fasilitas + indeks pencarian
    // =========================================================
    const searchIndex = [];

    function registerLayer(layer, name, label, type) {
        searchIndex.push({
            name,
            label,
            type,
            layer,
            cluster: clusters[type],
            searchText: (name + ' ' + label).toLowerCase()
        });
    }

    function loadFacilities(data) {
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => L.marker(latlng, { icon: ICONS[getFeatureType(feature)] }),
            style: (feature) => {
                const color = getFeatureType(feature) === 'emergency' ? '#ef4444' : '#10b981';
                return { color, weight: 2, fillColor: color, fillOpacity: 0.4 };
            },
            onEachFeature: (feature, layer) => {
                const type = getFeatureType(feature);
                const props = feature.properties || {};
                layer.bindPopup(createPopupContent(props, type));
                clusters[type].addLayer(layer);

                const label = AMENITY_LABEL[props.amenity] || TYPE_LABEL[type];
                const name = props.name || (label + ' (tanpa nama)');
                registerLayer(layer, name, label, type);
            }
        });
    }

    const boundaryGeometry = window.SURABAYA_BOUNDARY || null;
    let boundaryLayer = null;
    if (boundaryGeometry) {
        boundaryLayer = L.geoJSON(boundaryGeometry, {
            interactive: false,
            style: { color: '#38bdf8', weight: 2.5, dashArray: '6 6', fill: false }
        }).addTo(map);
    }

    function finishSetup() {
        map.addLayer(clusters.emergency);
        map.addLayer(clusters.financial);

        getSavedFacilities().forEach((f) => addUserFacilityToMap(f));

        const bounds = boundaryLayer ? boundaryLayer.getBounds()
            : L.featureGroup([clusters.emergency, clusters.financial]).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });

        // Layer Control
        const baseMaps = {
            'Dark Mode (Tanpa Watermark)': darkMatter,
            'OpenStreetMap (Terang)': osm
        };
        const overlayMaps = {
            "<span style='color:#ef4444; font-weight:600;'><i class='fa-solid fa-truck-medical' style='width:20px'></i> Darurat &amp; Keamanan</span>": clusters.emergency,
            "<span style='color:#10b981; font-weight:600;'><i class='fa-solid fa-building-columns' style='width:20px'></i> Finansial &amp; Bank</span>": clusters.financial
        };
        if (boundaryLayer) {
            overlayMaps["<span style='color:#0284c7; font-weight:600;'><i class='fa-solid fa-draw-polygon' style='width:20px'></i> Batas Kota Surabaya</span>"] = boundaryLayer;
        }
        L.control.layers(baseMaps, overlayMaps, { position: 'topright', collapsed: false }).addTo(map);

        hideLoader();
        initStartAndRoleFlow();
    }

    if (window.SURABAYA_GEOJSON) {
        loadFacilities(window.SURABAYA_GEOJSON);
        finishSetup();
    } else {
        fetch('data/kapita_selekta_surabaya1211.geojson')
            .then((response) => {
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                return response.json();
            })
            .then((data) => {
                loadFacilities(data);
                finishSetup();
            })
            .catch((error) => {
                console.error('Error loading data:', error);
                showLoaderError("Gagal memuat data fasilitas. Pastikan file 'data/fasilitas_surabaya.js' tersedia.");
            });
    }

    // 11. Legend Control
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend-control glass-panel');
        div.innerHTML = `
            <div class="legend-title"><i class="fa-solid fa-list"></i> Keterangan</div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ef4444;"></div>
                <span>Fasilitas Darurat &amp; Keamanan (RS, Polisi, dll)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #10b981;"></div>
                <span>Fasilitas Finansial (Bank, ATM)</span>
            </div>
            <div class="legend-item">
                <div class="legend-line"></div>
                <span>Batas Kota Surabaya</span>
            </div>
        `;
        return div;
    };
    legend.addTo(map);

    // =========================================================
    // 12. HALAMAN MULAI & MODAL ROLE SELECTOR + HAK AKSES
    // =========================================================
    function updateAuthUI() {
        const isAdmin = Auth.getRole() === 'admin' && Auth.isLoggedIn();
        const badgeText = isAdmin ? 'Halo, 1. Admin' : 'Halo, 2. Anggota';

        $('user-greeting').textContent = badgeText;
        $('user-greeting').classList.remove('hidden');

        // Jika Admin: tampilkan tombol "+ Tambah Fasilitas" dan "Form Kelola Admin"
        // Jika Anggota: sembunyikan fitur tambah fasilitas & form kelola admin
        $('btn-tambah').classList.toggle('hidden', !isAdmin);
        $('btn-kelola-admin').classList.toggle('hidden', !isAdmin);
        $('admin-panel').classList.toggle('hidden', !isAdmin);

        // Tombol Login Admin & Logout
        $('btn-nav-login').classList.toggle('hidden', isAdmin);
        $('btn-logout').classList.toggle('hidden', !isAdmin);
    }

    function applyRoleSelection(role) {
        if (role === 'admin') {
            // Jika belum login, arahkan terlebih dahulu ke halaman login.html
            if (!Auth.isLoggedIn()) {
                // Tandai sesi sementara sebagai anggota supaya jika klik "Kembali ke peta" tidak terjebak di start screen
                sessionStorage.setItem('webgis_surabaya_role', 'anggota');
                window.location.href = 'login.html';
                return;
            }
            Auth.setRole('admin');
            $('start-screen').classList.add('hidden');
            $('modal-role').classList.add('hidden');
            updateAuthUI();
            showToast('Peran aktif: Halo, 1. Admin (Akses Penuh)', 'success');
            return;
        }

        Auth.setRole('anggota');
        $('start-screen').classList.add('hidden');
        $('modal-role').classList.add('hidden');
        updateAuthUI();
        closeModal();
        showToast('Peran aktif: Halo, 2. Anggota (Mode Lihat & Cari)', 'info');
    }

    function initStartAndRoleFlow() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('login') === 'success' && Auth.isLoggedIn()) {
            Auth.setRole('admin');
            $('start-screen').classList.add('hidden');
            $('modal-role').classList.add('hidden');
            updateAuthUI();
            showToast('Login berhasil! Selamat datang, 1. Admin.', 'success');
            history.replaceState(null, '', window.location.pathname);
            return;
        }

        // Saat pertama kali membuka web (belum memilih role di sesi ini),
        // tampilkan Halaman Mulai lalu lanjut ke Modal Role Selector
        if (!Auth.hasSelectedRole()) {
            $('start-screen').classList.remove('hidden');
        } else {
            updateAuthUI();
        }
    }

    // Klik "Mulai Eksplorasi" pada Halaman Mulai -> buka Modal Role Selector
    $('btn-mulai').addEventListener('click', () => {
        $('start-screen').classList.add('hidden');
        $('modal-role').classList.remove('hidden');
    });

    // Klik Option 1: Admin
    $('btn-role-admin').addEventListener('click', () => {
        applyRoleSelection('admin');
    });

    // Klik Option 2: Anggota
    $('btn-role-anggota').addEventListener('click', () => {
        applyRoleSelection('anggota');
    });

    // Tombol "Ganti Peran" di Navbar -> buka kembali Modal Role Selector
    $('btn-ganti-peran').addEventListener('click', () => {
        $('modal-role').classList.remove('hidden');
    });

    // Tombol Logout (kembali ke peran 2. Anggota)
    $('btn-logout').addEventListener('click', () => {
        Auth.logout();
        updateAuthUI();
        closeModal();
        showToast('Anda berhasil logout. Peran beralih ke 2. Anggota.', 'info');
    });

    // =========================================================
    // 13. FORM KELOLA ADMIN (Khusus 1. Admin)
    // =========================================================
    function loadAdminConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY));
            if (saved) {
                $('admin-input-nama').value = saved.nama || '';
                $('admin-input-kode').value = saved.kode || '';
                $('admin-select-status').value = saved.status || 'Aktif - Normal';
            }
        } catch (e) {
            // ignore
        }
    }
    loadAdminConfig();

    $('btn-kelola-admin').addEventListener('click', () => {
        const panel = $('admin-panel');
        panel.classList.remove('hidden');
        panel.classList.remove('collapsed');
        $('admin-input-nama').focus();
    });

    $('btn-toggle-admin-panel').addEventListener('click', () => {
        const panel = $('admin-panel');
        panel.classList.toggle('collapsed');
        $('btn-toggle-admin-panel').innerHTML = panel.classList.contains('collapsed')
            ? '<i class="fa-solid fa-chevron-down"></i>'
            : '<i class="fa-solid fa-chevron-up"></i>';
    });

    $('form-kelola-admin').addEventListener('submit', (e) => {
        e.preventDefault();
        const namaInput = $('admin-input-nama');
        const kodeInput = $('admin-input-kode');
        const statusSelect = $('admin-select-status');
        const msgBox = $('admin-form-message');

        namaInput.classList.remove('is-invalid');
        kodeInput.classList.remove('is-invalid');

        const nama = namaInput.value.trim();
        const kode = kodeInput.value.trim();
        const status = statusSelect.value;

        if (nama === '') {
            namaInput.classList.add('is-invalid');
            showMessage(msgBox, 'Nama penanggung jawab wajib diisi!', 'error');
            return;
        }
        if (kode === '') {
            kodeInput.classList.add('is-invalid');
            showMessage(msgBox, 'Kode otorisasi admin wajib diisi!', 'error');
            return;
        }
        if (kode.length < 4) {
            kodeInput.classList.add('is-invalid');
            showMessage(msgBox, 'Kode otorisasi minimal 4 karakter!', 'error');
            return;
        }

        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify({ nama, kode, status }));
        showMessage(msgBox, `Pengaturan admin "${nama}" (${status}) berhasil disimpan!`, 'success');
        showToast('Pengaturan Form Kelola Admin berhasil diperbarui!', 'success');
    });

    $('btn-hapus-data-baru').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        showMessage($('admin-form-message'), 'Data fasilitas tambahan berhasil di-reset. Muat ulang halaman untuk melihat data awal.', 'success');
        showToast('Data fasilitas tambahan di-reset.', 'info');
    });

    // =========================================================
    // 14. FITUR PENCARIAN FASILITAS
    // =========================================================
    const VALID_KEYWORD = /^[A-Za-z0-9\s.\-&'()]+$/;

    function validateKeyword(keyword) {
        if (keyword === '') return 'Kata kunci pencarian wajib diisi!';
        if (keyword.length < 3) return 'Kata kunci minimal 3 karakter!';
        if (!VALID_KEYWORD.test(keyword)) return 'Kata kunci mengandung karakter tidak valid! Gunakan huruf, angka, atau spasi.';
        return null;
    }

    function focusOnLayer(entry) {
        const { layer, cluster } = entry;
        if (!map.hasLayer(cluster)) map.addLayer(cluster);

        if (typeof layer.getLatLng === 'function') {
            cluster.zoomToShowLayer(layer, () => layer.openPopup());
        } else {
            map.fitBounds(layer.getBounds(), { maxZoom: 18 });
            layer.openPopup(layer.getBounds().getCenter());
        }
    }

    function renderResults(results) {
        const list = $('search-results');
        list.innerHTML = '';
        results.slice(0, MAX_RESULTS).forEach((entry, index) => {
            const li = document.createElement('li');
            li.id = 'result-' + index;
            li.className = 'search-result-item';
            li.innerHTML = `
                <span class="result-dot ${entry.type}"></span>
                <div>
                    <div class="result-name">${escapeHtml(entry.name)}</div>
                    <div class="result-type">${escapeHtml(entry.label)}</div>
                </div>
            `;
            li.addEventListener('click', () => focusOnLayer(entry));
            list.appendChild(li);
        });
    }

    function doSearch() {
        const input = $('search-input');
        const message = $('search-message');
        const keyword = input.value.trim();
        const category = $('search-category').value;

        $('search-results').innerHTML = '';
        input.classList.remove('is-invalid');

        const error = validateKeyword(keyword);
        if (error) {
            input.classList.add('is-invalid');
            showMessage(message, error, 'error');
            return;
        }

        const kw = keyword.toLowerCase();
        const results = searchIndex
            .filter((e) => (category === 'all' || e.type === category) && e.searchText.includes(kw))
            .sort((a, b) => {
                const aStarts = a.name.toLowerCase().startsWith(kw) ? 0 : 1;
                const bStarts = b.name.toLowerCase().startsWith(kw) ? 0 : 1;
                return aStarts - bStarts || a.name.localeCompare(b.name);
            });

        if (results.length === 0) {
            showMessage(message, `Fasilitas "${keyword}" tidak ditemukan.`, 'error');
            return;
        }

        let text = `Ditemukan ${results.length} fasilitas untuk kata kunci "${keyword}".`;
        if (results.length > MAX_RESULTS) text += ` Menampilkan ${MAX_RESULTS} hasil teratas.`;
        showMessage(message, text, 'success');
        renderResults(results);
    }

    $('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        doSearch();
    });

    $('btn-reset').addEventListener('click', () => {
        $('search-input').value = '';
        $('search-category').value = 'all';
        $('search-input').classList.remove('is-invalid');
        $('search-results').innerHTML = '';
        hideMessage($('search-message'));
        map.closePopup();
    });

    $('btn-toggle-search').addEventListener('click', () => {
        const panel = $('search-panel');
        panel.classList.toggle('collapsed');
        $('btn-toggle-search').innerHTML = panel.classList.contains('collapsed')
            ? '<i class="fa-solid fa-chevron-down"></i>'
            : '<i class="fa-solid fa-chevron-up"></i>';
    });

    // =========================================================
    // 15. FITUR TAMBAH FASILITAS (Khusus 1. Admin)
    // =========================================================
    function getSavedFacilities() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveFacility(facility) {
        const list = getSavedFacilities();
        list.push(facility);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function addUserFacilityToMap(f) {
        const marker = L.marker([f.lat, f.lng], { icon: ICONS[f.kategori] });
        const props = {
            name: f.nama,
            kategori: f.kategori === 'emergency' ? 'Darurat & Keamanan' : 'Finansial & Bank',
            latitude: f.lat,
            longitude: f.lng,
            keterangan: f.keterangan,
            ditambahkan_oleh: '1. Admin (' + f.tanggal + ')'
        };
        marker.bindPopup(createPopupContent(props, f.kategori));
        clusters[f.kategori].addLayer(marker);
        const entry = {
            name: f.nama,
            label: 'Tambahan Admin',
            type: f.kategori,
            layer: marker,
            cluster: clusters[f.kategori],
            searchText: (f.nama + ' tambahan admin').toLowerCase()
        };
        searchIndex.push(entry);
        return entry;
    }

    function pointInRing(lng, lat, ring) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function isInsideSurabaya(lat, lng) {
        if (!boundaryGeometry) return true;
        const polygons = boundaryGeometry.type === 'MultiPolygon'
            ? boundaryGeometry.coordinates
            : [boundaryGeometry.coordinates];
        return polygons.some((rings) =>
            pointInRing(lng, lat, rings[0]) &&
            !rings.slice(1).some((hole) => pointInRing(lng, lat, hole))
        );
    }

    const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
    const FIELDS = ['input-nama', 'input-kategori', 'input-lat', 'input-lng'];

    function validateFacilityForm() {
        const nama = $('input-nama').value.trim();
        const kategori = $('input-kategori').value;
        const latRaw = $('input-lat').value.trim().replace(',', '.');
        const lngRaw = $('input-lng').value.trim().replace(',', '.');
        const keterangan = $('input-keterangan').value.trim();

        if (nama === '') return { valid: false, field: 'input-nama', message: 'Nama fasilitas wajib diisi!' };
        if (nama.length < 3) return { valid: false, field: 'input-nama', message: 'Nama fasilitas minimal 3 karakter!' };
        if (kategori === '') return { valid: false, field: 'input-kategori', message: 'Kategori fasilitas wajib dipilih!' };
        if (latRaw === '' || lngRaw === '') {
            return { valid: false, field: ['input-lat', 'input-lng'], message: 'Latitude dan longitude wajib diisi!' };
        }
        if (!NUMBER_PATTERN.test(latRaw) || !NUMBER_PATTERN.test(lngRaw)) {
            return { valid: false, field: ['input-lat', 'input-lng'], message: 'Latitude dan longitude harus berupa angka!' };
        }

        const lat = parseFloat(latRaw);
        const lng = parseFloat(lngRaw);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return { valid: false, field: ['input-lat', 'input-lng'], message: 'Koordinat tidak valid! Latitude harus -90 s/d 90 dan longitude -180 s/d 180.' };
        }
        if (!isInsideSurabaya(lat, lng)) {
            return { valid: false, field: ['input-lat', 'input-lng'], message: 'Koordinat berada di luar wilayah Kota Surabaya!' };
        }

        return { valid: true, data: { nama, kategori, lat, lng, keterangan } };
    }

    function clearFieldErrors() {
        FIELDS.forEach((id) => $(id).classList.remove('is-invalid'));
    }

    function openModal() {
        if (!Auth.isLoggedIn()) {
            showToast('Silakan pilih peran 1. Admin terlebih dahulu!', 'error');
            return;
        }
        $('modal-tambah').classList.remove('hidden');
        $('input-nama').focus();
    }

    function closeModal() {
        $('modal-tambah').classList.add('hidden');
    }

    function resetForm() {
        $('form-tambah').reset();
        clearFieldErrors();
        hideMessage($('form-message'));
    }

    $('btn-tambah').addEventListener('click', () => {
        resetForm();
        openModal();
    });
    $('btn-batal').addEventListener('click', closeModal);
    $('btn-close-modal').addEventListener('click', closeModal);

    $('form-tambah').addEventListener('submit', (e) => {
        e.preventDefault();
        clearFieldErrors();

        if (!Auth.isLoggedIn()) {
            showMessage($('form-message'), 'Sesi berakhir. Silakan pilih peran 1. Admin kembali!', 'error');
            return;
        }

        const result = validateFacilityForm();
        if (!result.valid) {
            [].concat(result.field).forEach((id) => $(id).classList.add('is-invalid'));
            showMessage($('form-message'), result.message, 'error');
            return;
        }

        const facility = Object.assign({}, result.data, {
            tanggal: new Date().toLocaleString('id-ID')
        });
        saveFacility(facility);
        const entry = addUserFacilityToMap(facility);

        closeModal();
        resetForm();
        showToast(`Fasilitas "${facility.nama}" berhasil ditambahkan!`, 'success');
        focusOnLayer(entry);
    });

    // Mode ambil koordinat dari peta
    let picking = false;
    function stopPicking(reopen) {
        picking = false;
        map.getContainer().classList.remove('picking');
        $('pick-banner').classList.add('hidden');
        if (reopen) openModal();
    }

    $('btn-pick').addEventListener('click', () => {
        picking = true;
        closeModal();
        map.getContainer().classList.add('picking');
        $('pick-banner').classList.remove('hidden');
    });
    $('btn-cancel-pick').addEventListener('click', () => stopPicking(true));

    map.on('click', (e) => {
        if (!picking) return;
        $('input-lat').value = e.latlng.lat.toFixed(6);
        $('input-lng').value = e.latlng.lng.toFixed(6);
        stopPicking(true);
    });
});
