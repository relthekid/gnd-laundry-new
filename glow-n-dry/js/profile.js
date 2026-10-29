document.addEventListener("DOMContentLoaded", function () {
  const $ = (id) => document.getElementById(id);

  const modal = $("profileModal");
  const form = $("profileForm");
  const nameInput = $("editProfileName");
  const phoneInput = $("editProfilePhone");
  const message = $("profileMessage");

  function getStoredData(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function getUser() {
    return getStoredData("glowNDryAccount")
      || getStoredData("glowNDryDemoUser")
      || getStoredData("glowNDryVerifiedDemo")
      || {};
  }

  function renderProfile() {
    const user = getUser();
    const name = user.fullName || user.name || "Pelanggan Glow N Dry";
    const phone = user.phone || "Nomor WhatsApp belum tersedia";

    $("profileName").textContent = name;
    $("profilePhone").textContent = phone;
    $("profileInfoName").textContent = name;
    $("profileInfoPhone").textContent = phone;

    $("profileAvatar").textContent =
      name.trim().charAt(0).toUpperCase() || "P";
  }

  function openModal() {
    const user = getUser();

    nameInput.value = user.fullName || user.name || "";
    phoneInput.value = user.phone || "";
    message.textContent = "";
    modal.hidden = false;
    nameInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  $("editProfileButton").addEventListener("click", openModal);
  $("cancelProfileEdit").addEventListener("click", closeModal);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (fullName.length < 2) {
      message.textContent = "Nama lengkap minimal 2 karakter.";
      return;
    }

    if (!/^(?:\+62|62|0)[0-9]{8,13}$/.test(phone)) {
      message.textContent = "Masukkan nomor WhatsApp yang valid.";
      return;
    }

    const existingAccount = getStoredData("glowNDryAccount") || {};

    const updatedUser = {
      ...existingAccount,
      fullName: fullName,
      phone: phone
    };

    try {
      localStorage.setItem(
        "glowNDryAccount",
        JSON.stringify(updatedUser)
      );

      const session = getStoredData("glowNDryDemoUser");
      if (session) {
        localStorage.setItem(
          "glowNDryDemoUser",
          JSON.stringify({ fullName, phone })
        );
      }

      const verified = getStoredData("glowNDryVerifiedDemo");
      if (verified) {
        localStorage.setItem(
          "glowNDryVerifiedDemo",
          JSON.stringify({ fullName, phone })
        );
      }

      renderProfile();
      closeModal();
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      message.textContent =
        "Profil gagal disimpan. Silakan coba lagi.";
    }
  });

  $("logoutButton").addEventListener("click", function () {
    const confirmed = confirm("Yakin ingin keluar dari akun Glow N Dry?");

    if (!confirmed) return;

    localStorage.removeItem("glowNDryDemoUser");
    localStorage.removeItem("glowNDryVerifiedDemo");

    window.location.href = "login.html";
  });

  renderProfile();
});