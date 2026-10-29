
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const $ = function (id) {
    return document.getElementById(id);
  };

  const ORDER_STORAGE_KEY = "glowNDryOrders";
  const SELECTED_ORDER_KEY = "glowNDrySelectedOrder";

  // ==========================================
  // MEMBACA DATA PESANAN
  // ==========================================

  function readOrders() {
    try {
      const data = JSON.parse(
        localStorage.getItem(ORDER_STORAGE_KEY) || "[]"
      );

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Gagal membaca data pesanan:", error);
      return [];
    }
  }

  function readSelectedOrder() {
    try {
      return JSON.parse(
        localStorage.getItem(SELECTED_ORDER_KEY) || "null"
      );
    } catch (error) {
      console.warn("Gagal membaca pesanan terpilih:", error);
      return null;
    }
  }

  function getOrderId(order) {
    return String(order?.id || order?.orderId || "");
  }

  function findOrder() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");
    const orders = readOrders();

    // Jika URL memiliki ID, ID tersebut menjadi acuan utama.
    if (requestedId) {
      return orders.find(function (order) {
        return getOrderId(order) === requestedId;
      }) || null;
    }

    // Jika tidak ada ID di URL, gunakan pesanan terpilih.
    const selected = readSelectedOrder();

    if (!selected) return null;

    const selectedId = getOrderId(selected);

    if (selectedId) {
      return orders.find(function (order) {
        return getOrderId(order) === selectedId;
      }) || selected;
    }

    return selected;
  }

  // ==========================================
  // FORMAT DATA
  // ==========================================

  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDateOnly(value) {
    if (!value) return "Belum tersedia";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Belum tersedia";
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent =
        value === undefined || value === null
          ? "-"
          : String(value);
    }
  }

  // ==========================================
  // STATUS PESANAN
  // ==========================================

  function getStatus(order) {
    const status = String(order.status || "Diterima")
      .trim()
      .toLowerCase();

    if (
      status.includes("batal") ||
      status.includes("cancel")
    ) {
      return "Dibatalkan";
    }

    // Periksa sebelum status Selesai.
    if (
      status.includes("siap") ||
      status === "ready"
    ) {
      return "Siap Diambil";
    }

    if (
      status.includes("selesai") ||
      status.includes("sudah diambil") ||
      status.includes("telah diambil") ||
      status === "diambil"
    ) {
      return "Selesai";
    }

    if (
      status.includes("setrika") ||
      status.includes("finishing")
    ) {
      return "Disetrika";
    }

    if (
      status.includes("kering") ||
      status.includes("drying")
    ) {
      return "Dikeringkan";
    }

    if (
      status.includes("cuci") ||
      status.includes("washing") ||
      status.includes("proses")
    ) {
      return "Dicuci";
    }

    return "Diterima";
  }

  // ==========================================
  // ESTIMASI WAKTU SELESAI
  // ==========================================

  function calculateEstimatedDate(order) {
    // Gunakan estimasi yang sudah tersimpan jika valid.
    if (order.estimatedCompletionAt) {
      const savedDate = new Date(order.estimatedCompletionAt);

      if (!Number.isNaN(savedDate.getTime())) {
        return savedDate;
      }
    }

    // Perhitungan untuk pesanan lama.
    const startDate = new Date(
      order.date || order.createdAt || ""
    );

    if (Number.isNaN(startDate.getTime())) {
      return null;
    }

    const service = String(
      order.service || order.serviceName || ""
    ).toLowerCase();

    let days = 3;

    if (service.includes("express")) {
      days = 1;
    } else if (service.includes("cuci setrika")) {
      days = 3;
    } else if (service.includes("cuci kering")) {
      days = 2;
    } else if (service.includes("setrika")) {
      days = 1;
    }

    // Menggunakan hari kalender.
    startDate.setDate(startDate.getDate() + days);

    return startDate;
  }

  function renderEstimate(order, status) {
    const estimateElement = $("detailEstimatedCompletion");
    const noteElement = $("detailEstimateNote");

    if (!estimateElement) return;

    if (status === "Dibatalkan") {
      estimateElement.textContent = "Pesanan dibatalkan";

      if (noteElement) {
        noteElement.textContent =
          "Hubungi toko untuk informasi lebih lanjut.";
      }

      return;
    }

    if (status === "Selesai") {
      estimateElement.textContent = "Pesanan telah selesai";

      if (noteElement) {
        noteElement.textContent =
          "Pesanan ini telah ditandai selesai.";
      }

      return;
    }

    if (status === "Siap Diambil") {
      estimateElement.textContent = "Cucian siap diambil!";

      if (noteElement) {
        noteElement.textContent =
          "Cucian sudah siap. Silakan mengambilnya di toko.";
      }

      return;
    }

    const estimate = calculateEstimatedDate(order);

    estimateElement.textContent = estimate
      ? formatDateOnly(estimate)
      : "Estimasi belum tersedia";

    if (noteElement) {
      noteElement.textContent =
        "Ini adalah perkiraan berdasarkan jenis layanan. " +
        "Waktu selesai sebenarnya dapat berubah.";
    }
  }

  // ==========================================
  // TIMELINE PROSES LAUNDRY
  // ==========================================

  function updateTimeline(status) {
    const timeline = Array.from(
      document.querySelectorAll(".gnd-timeline-item")
    );

    const stepByStatus = {
      "Diterima": 0,
      "Dicuci": 1,
      "Dikeringkan": 2,
      "Disetrika": 3,
      "Siap Diambil": 4,
      "Selesai": 4,
      "Dibatalkan": -1
    };

    const currentStep = stepByStatus[status] ?? 0;

    timeline.forEach(function (item, index) {
      const completed =
        currentStep >= 0 && index < currentStep;

      const active =
        currentStep >= 0 && index === currentStep;

      item.classList.toggle("completed", completed);
      item.classList.toggle("active", active);

      const dot = item.querySelector(".gnd-timeline-dot");

      if (dot) {
        if (
          completed ||
          (status === "Selesai" && index === currentStep)
        ) {
          dot.textContent = "✓";
        } else {
          dot.textContent = String(index + 1);
        }
      }
    });
  }

  // ==========================================
  // INFORMASI PEMBAYARAN
  // ==========================================

  function renderPayment(order) {
    const methodElement = $("detailPaymentMethod");
    const statusElement = $("detailPaymentStatus");
    const badgeElement = $("detailPaymentBadge");
    const noteElement = $("detailPaymentNote");

    const paymentMethod =
      order.paymentMethod || "Belum dipilih";

    const paymentStatus =
      order.paymentStatus || "Belum dibayar";

    if (methodElement) {
      methodElement.textContent = paymentMethod;
    }

    if (statusElement) {
      statusElement.textContent = paymentStatus;
    }

    if (badgeElement) {
      badgeElement.textContent = paymentStatus;

      const normalizedPayment = paymentStatus.toLowerCase();

      const isPaid =
        normalizedPayment.includes("dibayar") &&
        !normalizedPayment.includes("belum");

      badgeElement.classList.toggle("paid", isPaid);
      badgeElement.classList.toggle("unpaid", !isPaid);
    }

    if (!noteElement) return;

    if (paymentMethod === "QRIS") {
      noteElement.textContent =
        "Kamu memilih QRIS. Ikuti instruksi pembayaran dari toko. " +
        "Status pembayaran belum terverifikasi secara otomatis.";
    } else if (paymentMethod === "Bayar di Toko") {
      noteElement.textContent =
        "Silakan membayar langsung di toko. Status pembayaran " +
        "mengikuti data pesanan yang tersimpan.";
    } else {
      noteElement.textContent =
        "Informasi pembayaran mengikuti data pesanan.";
    }
  }

  // ==========================================
  // CATATAN PESANAN
  // ==========================================

  function renderNotes(order) {
    const container = $("detailNotesContainer");
    const notesElement = $("detailNotes");

    if (!container || !notesElement) return;

    const notes = String(order.notes || "").trim();

    if (notes) {
      notesElement.textContent = notes;
      container.hidden = false;
    } else {
      notesElement.textContent = "Tidak ada catatan.";
      container.hidden = true;
    }
  }

  // ==========================================
  // PESAN STATUS
  // ==========================================

  function renderMessage(status) {
    const messages = {
      "Diterima":
        "Pesananmu sudah tercatat dan menunggu proses laundry.",

      "Dicuci":
        "Cucianmu sedang dicuci.",

      "Dikeringkan":
        "Cucianmu sedang dikeringkan.",

      "Disetrika":
        "Cucianmu sedang disetrika dan dirapikan.",

      "Siap Diambil":
        "Cucianmu sudah siap diambil di toko.",

      "Selesai":
        "Pesanan ini telah selesai.",

      "Dibatalkan":
        "Pesanan ini telah dibatalkan."
    };

    setText("detailMessage", messages[status] || "");
  }

  // ==========================================
  // PESANAN TIDAK DITEMUKAN
  // ==========================================

  function renderMissingOrder() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");

    setText("detailStatus", "Pesanan tidak ditemukan");
    setText("detailOrderNumber", requestedId || "-");

    setText("detailDate", "-");
    setText("detailService", "-");
    setText("detailWeight", "-");
    setText("detailPricePerKg", "-");
    setText("detailSubtotal", "-");
    setText("detailTotal", "-");
    setText("detailCustomerName", "-");
    setText("detailCustomerPhone", "-");

    setText(
      "detailMessage",
      "Data pesanan tidak ditemukan. Silakan kembali ke " +
      "halaman Riwayat Pesanan dan pilih pesanan yang tersedia."
    );

    setText(
      "detailEstimatedCompletion",
      "Estimasi belum tersedia"
    );

    setText(
      "detailEstimateNote",
      "Data pesanan belum dapat dimuat."
    );

    setText("detailPaymentMethod", "-");
    setText("detailPaymentStatus", "-");
    setText("detailPaymentBadge", "-");

    setText(
      "detailPaymentNote",
      "Informasi pembayaran belum tersedia."
    );

    const paymentBadge = $("detailPaymentBadge");

    if (paymentBadge) {
      paymentBadge.classList.remove("paid", "unpaid");
    }

    const notesContainer = $("detailNotesContainer");

    if (notesContainer) {
      notesContainer.hidden = true;
    }

    updateTimeline("Dibatalkan");
  }

  // ==========================================
  // MENAMPILKAN DETAIL PESANAN
  // ==========================================

  function renderOrder(order) {
    if (!order) {
      renderMissingOrder();
      return;
    }

    const status = getStatus(order);
    const orderId = getOrderId(order) || "-";

    const weightValue = Number(order.weight);
    const weight =
      Number.isFinite(weightValue) && weightValue > 0
        ? weightValue
        : 1;

    const totalValue = Number(
      order.total ??
      order.price ??
      order.grandTotal ??
      0
    );

    const total = Number.isFinite(totalValue)
      ? totalValue
      : 0;

    let pricePerKg = Number(order.pricePerKg);

    // Untuk data lama yang tidak memiliki harga per kg.
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      pricePerKg = weight > 0 ? total / weight : 0;
    }

    const service =
      order.service ||
      order.serviceName ||
      "-";

    setText("detailStatus", status);
    setText("detailOrderNumber", orderId);
    setText("detailDate", formatDate(order.date || order.createdAt));
    setText("detailService", service);
    setText("detailWeight", weight + " kg");
    setText("detailPricePerKg", rupiah(pricePerKg));
    setText("detailSubtotal", rupiah(total));
    setText("detailTotal", rupiah(total));

    // Mengisi elemen jika tersedia pada HTML.
    setText(
      "detailCustomerName",
      order.customerName || order.fullName || "-"
    );

    setText("detailCustomerPhone", order.phone || "-");

    renderEstimate(order, status);
    renderPayment(order);
    renderNotes(order);
    renderMessage(status);
    updateTimeline(status);
  }

  // ==========================================
  // RENDER DAN SINKRONISASI DATA
  // ==========================================

  function render() {
    renderOrder(findOrder());
  }

  render();

  // Memperbarui tampilan jika pesanan berubah pada tab lain.
  window.addEventListener("storage", function (event) {
    if (
      !event.key ||
      event.key === ORDER_STORAGE_KEY ||
      event.key === SELECTED_ORDER_KEY
    ) {
      render();
    }
  });

  // Membaca data terbaru saat kembali ke halaman.
  window.addEventListener("focus", render);
  window.addEventListener("pageshow", render);
});
