document.addEventListener("DOMContentLoaded", function () {
  const notificationSetting = document.getElementById("notificationSetting");
  const darkModeSetting = document.getElementById("darkModeSetting");
  const message = document.getElementById("settingsMessage");

  function loadSettings() {
    notificationSetting.checked =
      localStorage.getItem("glowNDryNotifications") !== "false";

    darkModeSetting.checked =
      localStorage.getItem("glowNDryDarkMode") === "true";

    applyDarkMode();
  }

  function applyDarkMode() {
    document.body.classList.toggle(
      "gnd-dark-mode",
      darkModeSetting.checked
    );
  }

  notificationSetting.addEventListener("change", function () {
    localStorage.setItem(
      "glowNDryNotifications",
      String(notificationSetting.checked)
    );

    message.textContent = notificationSetting.checked
      ? "Preferensi notifikasi diaktifkan."
      : "Preferensi notifikasi dinonaktifkan.";
  });

  darkModeSetting.addEventListener("change", function () {
    localStorage.setItem(
      "glowNDryDarkMode",
      String(darkModeSetting.checked)
    );

    applyDarkMode();

    message.textContent = darkModeSetting.checked
      ? "Mode gelap diaktifkan."
      : "Mode terang diaktifkan.";
  });

  loadSettings();
});