/**
 * login.js - Logika halaman login admin WebGIS Surabaya.
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('login-error');
    const toggleBtn = document.getElementById('btn-toggle-password');

    // Jika sudah login, langsung kembali ke peta
    if (Auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    toggleBtn.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        toggleBtn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        usernameInput.classList.remove('is-invalid');
        passwordInput.classList.remove('is-invalid');

        const result = Auth.login(usernameInput.value, passwordInput.value);

        if (!result.success) {
            errorBox.textContent = result.message;
            errorBox.classList.remove('hidden');
            if (usernameInput.value.trim() === '' || result.message.startsWith('Login gagal')) {
                usernameInput.classList.add('is-invalid');
            }
            if (passwordInput.value === '' || result.message.startsWith('Login gagal')) {
                passwordInput.classList.add('is-invalid');
            }
            passwordInput.value = '';
            return;
        }

        errorBox.classList.add('hidden');
        window.location.href = 'index.html?login=success';
    });
});
