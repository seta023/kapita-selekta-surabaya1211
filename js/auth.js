/**
 * auth.js - Modul autentikasi & manajemen peran (Role Selector) untuk WebGIS Surabaya.
 *
 * Mendukung:
 *  - Pilihan peran melalui Modal Role Selector:
 *      - 'admin'   -> Badge "Halo, 1. Admin"
 *      - 'anggota' -> Badge "Halo, 2. Anggota"
 *  - Login Admin melalui halaman login.html (tetap berfungsi untuk pengujian Katalon)
 */
const Auth = (function () {
    const DEMO_ACCOUNT = {
        username: 'admin',
        password: 'Surabaya123'
    };

    const SESSION_KEY = 'webgis_surabaya_user';
    const ROLE_KEY = 'webgis_surabaya_role';

    /**
     * Validasi input login (halaman login.html).
     * @returns {{success: boolean, message: string}}
     */
    function login(username, password) {
        const user = (username || '').trim();
        const pass = password || '';

        if (user === '' && pass === '') {
            return { success: false, message: 'Username dan password wajib diisi!' };
        }
        if (user === '') {
            return { success: false, message: 'Username wajib diisi!' };
        }
        if (pass === '') {
            return { success: false, message: 'Password wajib diisi!' };
        }
        if (user !== DEMO_ACCOUNT.username || pass !== DEMO_ACCOUNT.password) {
            return { success: false, message: 'Login gagal! Username atau password salah.' };
        }

        sessionStorage.setItem(SESSION_KEY, user);
        sessionStorage.setItem(ROLE_KEY, 'admin');
        return { success: true, message: 'Login berhasil! Selamat datang, 1. Admin.' };
    }

    function setRole(role) {
        const normalized = role === 'admin' ? 'admin' : 'anggota';
        sessionStorage.setItem(ROLE_KEY, normalized);
        if (normalized === 'admin') {
            sessionStorage.setItem(SESSION_KEY, '1. Admin');
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
        return normalized;
    }

    function getRole() {
        return sessionStorage.getItem(ROLE_KEY);
    }

    function hasSelectedRole() {
        return !!sessionStorage.getItem(ROLE_KEY);
    }

    function getRoleBadgeText() {
        const role = getRole();
        if (role === 'admin' || isLoggedIn()) {
            return 'Halo, 1. Admin';
        }
        return 'Halo, 2. Anggota';
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.setItem(ROLE_KEY, 'anggota');
    }

    function clearAll() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(ROLE_KEY);
    }

    function getUser() {
        return sessionStorage.getItem(SESSION_KEY);
    }

    function isLoggedIn() {
        return getRole() === 'admin' || !!getUser();
    }

    return {
        login,
        logout,
        clearAll,
        getUser,
        isLoggedIn,
        setRole,
        getRole,
        hasSelectedRole,
        getRoleBadgeText
    };
})();
