
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const orderButtons = document.querySelectorAll(".gnd-order-button");

  orderButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      const service = String(button.dataset.service || "").trim();
      const price = Number(button.dataset.price);

      // Pastikan data layanan tersedia.
      if (!service) {
        event.preventDefault();
        alert("Jenis layanan belum tersedia. Silakan pilih layanan lain.");
        return;
      }

      // Pastikan harga layanan valid.
      if (!Number.isFinite(price) || price <= 0) {
        event.preventDefault();
        alert("Harga layanan belum tersedia. Silakan periksa daftar harga.");
        return;
      }

      // Susun URL menuju formulir pesanan.
      const params = new URLSearchParams();
      params.set("service", service);
      params.set("price", String(price));

      window.location.href =
        "create-order.html?" + params.toString();
    });
  });
});
