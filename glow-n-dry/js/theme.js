
(function () {
  const STORAGE_KEY = "glowNDryDarkMode";

  function getDarkMode() {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  // Terapkan tema gelap ke halaman saat dibuka.
  function applyTheme(isDark) {
    document.body.classList.toggle("gnd-dark-mode", isDark);
    document.documentElement.style.colorScheme = isDark
      ? "dark"
      : "light";

    // Sinkronkan toggle jika halaman Pengaturan sedang dibuka.
    const toggle = document.getElementById("darkModeSetting");

    if (toggle) {
      toggle.checked = isDark;
    }
  }

  function initializeTheme() {
    // Muat tema yang tersimpan.
    applyTheme(getDarkMode());

    // Tangani perubahan toggle pada halaman Pengaturan.
    const toggle = document.getElementById("darkModeSetting");

    if (toggle) {
      toggle.addEventListener("change", function () {
        const isDark = toggle.checked;

        try {
          localStorage.setItem(STORAGE_KEY, String(isDark));
          applyTheme(isDark);
        } catch (error) {
          console.error("Pengaturan tema gagal disimpan:", error);
          applyTheme(false);
          toggle.checked = false;
        }
      });
    }

    // Sinkronkan tema jika berubah pada tab browser lain.
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) {
        applyTheme(event.newValue === "true");
      }
    });
  }

  // Aman digunakan meskipun file dimuat setelah halaman siap.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTheme);
  } else {
    initializeTheme();
  }
})();
