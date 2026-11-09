/**
 * auth.js - Modul autentikasi & manajemen peran (Role Selector) untuk WebGIS Surabaya.
 *
 * Aturan Hak Akses:
 *  - Peran 'anggota' (2. Anggota) bisa langsung dipilih tanpa login.
 *  - Peran 'admin' (1. Admin) WAJIB melalui halaman login.html terlebih dahulu.
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
        if (role === 'admin') {
            // Hanya izinkan peran admin jika sudah melewati login
            if (!isLoggedIn()) {
                return 'require_login';
            }
            sessionStorage.setItem(ROLE_KEY, 'admin');
            return 'admin';
        }
        // Jika beralih ke anggota, hapus sesi login admin agar kalau mau ke admin lagi harus login ulang
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.setItem(ROLE_KEY, 'anggota');
        return 'anggota';
    }

    function getRole() {
        if (isLoggedIn() && sessionStorage.getItem(ROLE_KEY) === 'admin') {
            return 'admin';
        }
        return sessionStorage.getItem(ROLE_KEY) === 'anggota' ? 'anggota' : null;
    }

    function hasSelectedRole() {
        return !!getRole();
    }

    function getRoleBadgeText() {
        if (getRole() === 'admin') {
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
        return !!getUser();
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
