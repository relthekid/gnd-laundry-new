
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("adminLoginMessage");

  // Akun demo untuk tampilan lokal saja.
  // Jangan gunakan cara ini untuk aplikasi produksi.
  const DEMO_USERNAME = "admin";
  const DEMO_PASSWORD = "gndadmin123";

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;

    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      sessionStorage.setItem("glowNDryAdminLoggedIn", "true");
      message.textContent = "Login berhasil. Membuka panel admin...";

      setTimeout(function () {
        window.location.href = "admin.html";
      }, 400);
    } else {
      message.textContent = "Username atau password salah.";
    }
  });
});
