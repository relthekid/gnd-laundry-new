
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const list = document.getElementById("historyOrderList");
  const empty = document.getElementById("historyEmpty");
  const totalElement = document.getElementById("historyTotal");
  const filterButtons = document.querySelectorAll(".gnd-history-filter");

  if (!list) return;

  const ORDER_STORAGE_KEY = "glowNDryOrders";
  let currentFilter = "Semua";

  // MEMBACA PESANAN
  function getOrders() {
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

  // MEMBACA AKUN PELANGGAN, SELARAS DENGAN create-order.js
  function getAccount() {
    const keys = [
      "glowNDryAccount",
      "glowNDryDemoUser",
      "glowNDryVerifiedDemo"
    ];

    for (const key of keys) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;

        const account = JSON.parse(saved);

        if (account && typeof account === "object") {
          return account;
        }
      } catch (error) {
        console.warn("Data akun tidak dapat dibaca:", key);
      }
    }

    return null;
  }

  function normalizePhone(value) {
    let phone = String(value || "").replace(/\D/g, "");

    if (phone.startsWith("62")) {
      phone = "0" + phone.slice(2);
    }

    return phone;
  }

  // MENAMPILKAN PESANAN SESUAI AKUN YANG LOGIN
  function getCustomerOrders(orders) {
    const account = getAccount();

    // Mode demo: jika akun tidak ditemukan, gunakan semua pesanan
    // yang tersimpan di browser.
    if (!account) return orders;

    const accountPhone = normalizePhone(
      account.phone || account.phoneNumber || ""
    );

    if (accountPhone) {
      return orders.filter(function (order) {
        const orderPhone = normalizePhone(order.phone);

        return orderPhone !== "" && orderPhone === accountPhone;
      });
    }

    const accountName = String(
      account.fullName || account.name || ""
    ).trim().toLowerCase();

    if (accountName) {
      return orders.filter(function (order) {
        const orderName = String(
          order.customerName || order.fullName || order.name || ""
        ).trim().toLowerCase();

        return orderName === accountName;
      });
    }

    return orders;
  }

  // FORMAT RUPIAH
  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  // FORMAT TANGGAL
  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function getOrderTime(order) {
    const date = new Date(order.date || order.createdAt || "");
    const time = date.getTime();

    return Number.isNaN(time) ? 0 : time;
  }

  // NORMALISASI STATUS PESANAN
  function getStatus(order) {
    const status = String(order.status || "Diterima")
      .trim()
      .toLowerCase();

    if (status.includes("batal") || status.includes("cancel")) {
      return "Dibatalkan";
    }

    // Periksa "Siap Diambil" sebelum "Selesai".
    if (status.includes("siap") || status === "ready") {
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

    if (status.includes("setrika") || status.includes("finishing")) {
      return "Disetrika";
    }

    if (status.includes("kering")) {
      return "Dikeringkan";
    }

    if (
      status.includes("cuci") ||
      status.includes("washing") ||
      status === "diproses"
    ) {
      return "Dicuci";
    }

    return "Diterima";
  }

  function getCategory(status) {
    if (status === "Selesai") return "Selesai";

    if (status === "Dibatalkan") return "Dibatalkan";

    return "Diproses";
  }

  function getStatusClass(status) {
    const classes = {
      "Diterima": "status-received",
      "Dicuci": "status-washing",
      "Dikeringkan": "status-drying",
      "Disetrika": "status-ironing",
      "Siap Diambil": "status-ready",
      "Selesai": "status-completed",
      "Dibatalkan": "status-cancelled"
    };

    return classes[status] || "status-received";
  }

  // ESTIMASI SELESAI
  function calculateEstimatedDate(order) {
    if (order.estimatedCompletionAt) {
      const savedDate = new Date(order.estimatedCompletionAt);

      if (!Number.isNaN(savedDate.getTime())) {
        return savedDate;
      }
    }

    // Untuk pesanan lama yang belum menyimpan estimasi.
    const startDate = new Date(order.date || order.createdAt || "");

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

    startDate.setDate(startDate.getDate() + days);

    return startDate;
  }

  function getEstimatedCompletion(order) {
    const date = calculateEstimatedDate(order);

    return date ? formatDate(date) : "Belum tersedia";
  }

  // MEMBUAT ELEMEN HTML DENGAN AMAN
  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    return element;
  }

  // KARTU RIWAYAT PESANAN
  function createOrderCard(order) {
    const card = createElement("article", "gnd-history-card");

    const orderId = order.id || order.orderId || "Pesanan";
    const service = order.service || order.serviceName || "Layanan laundry";
    const weight = Number(order.weight) || 0;
    const total = Number(
      order.total ?? order.price ?? order.grandTotal ?? 0
    );
    const status = getStatus(order);

    // Header dan status.
    const top = createElement("div", "gnd-history-card-top");
    const idGroup = createElement("div", "gnd-history-id-group");

    const orderIcon = createElement(
      "span",
      "gnd-history-card-icon",
      "▣"
    );

    const idInfo = createElement("div", "gnd-history-id-info");

    idInfo.appendChild(
      createElement("small", "gnd-history-overline", "NOMOR PESANAN")
    );

    idInfo.appendChild(
      createElement("strong", "gnd-history-order-id", orderId)
    );

    idGroup.append(orderIcon, idInfo);

    const badge = createElement("span", "gnd-history-status", status);
    badge.classList.add(getStatusClass(status));

    top.append(idGroup, badge);

    // Layanan dan berat.
    const serviceRow = createElement(
      "div",
      "gnd-history-service-row"
    );

    serviceRow.appendChild(
      createElement("span", "gnd-history-meta-icon", "♧")
    );

    serviceRow.appendChild(
      createElement(
        "p",
        "gnd-history-service",
        service + " • " + weight.toLocaleString("id-ID") + " kg"
      )
    );

    // Tanggal pesanan.
    const dateRow = createElement(
      "div",
      "gnd-history-date-row"
    );

    dateRow.appendChild(
      createElement("span", "gnd-history-meta-icon", "▦")
    );

    dateRow.appendChild(
      createElement(
        "p",
        "gnd-history-date",
        "Tanggal pesanan: " + formatDate(order.date || order.createdAt)
      )
    );

    // Estimasi selesai.
    const estimateRow = createElement(
      "div",
      "gnd-history-estimate-row"
    );

    estimateRow.appendChild(
      createElement("span", "gnd-history-meta-icon", "◷")
    );

    estimateRow.appendChild(
      createElement(
        "p",
        "gnd-history-date",
        "Estimasi selesai: " + getEstimatedCompletion(order)
      )
    );

    // Total harga.
    const totalBox = createElement(
      "div",
      "gnd-history-total-box"
    );

    const totalInfo = createElement(
      "div",
      "gnd-history-total-info"
    );

    totalInfo.appendChild(
      createElement("small", "", "Total pesanan")
    );

    totalInfo.appendChild(
      createElement("strong", "gnd-history-total", rupiah(total))
    );

    totalBox.appendChild(totalInfo);

    // Metode dan status pembayaran.
    const paymentBox = createElement(
      "div",
      "gnd-history-payment"
    );

    paymentBox.appendChild(
      createElement("span", "gnd-history-payment-icon", "▣")
    );

    const paymentInfo = createElement(
      "div",
      "gnd-history-payment-info"
    );

    paymentInfo.appendChild(
      createElement("small", "", "Metode pembayaran")
    );

    paymentInfo.appendChild(
      createElement(
        "strong",
        "",
        order.paymentMethod || "Belum dipilih"
      )
    );

    paymentBox.appendChild(paymentInfo);

    const paymentStatus = String(
      order.paymentStatus || "Belum dibayar"
    );

    const paymentBadge = createElement(
      "span",
      "gnd-history-payment-status",
      paymentStatus
    );

    const normalizedPayment = paymentStatus.toLowerCase();

    if (
      normalizedPayment.includes("dibayar") &&
      !normalizedPayment.includes("belum")
    ) {
      paymentBadge.classList.add("payment-paid");
    } else {
      paymentBadge.classList.add("payment-unpaid");
    }

    paymentBox.appendChild(paymentBadge);

    // Tombol menuju detail sesuai ID pesanan.
    const detail = createElement("a", "gnd-history-detail", "");

    detail.href =
      "order-detail.html?id=" + encodeURIComponent(orderId);

    detail.appendChild(
      createElement("span", "", "Lihat Detail Pesanan")
    );

    detail.appendChild(
      createElement("span", "gnd-history-detail-arrow", "›")
    );

    card.append(
      top,
      serviceRow,
      dateRow,
      estimateRow,
      totalBox,
      paymentBox,
      detail
    );

    return card;
  }

  // KEADAAN KOSONG
  function updateEmptyState(filteredCount, totalCount) {
    if (!empty) return;

    empty.hidden = filteredCount > 0;

    const title = empty.querySelector("h2");
    const description = empty.querySelector("p");
    const icon = empty.querySelector(".gnd-empty-icon");
    const button = empty.querySelector(".gnd-empty-button");

    if (totalCount === 0) {
      if (icon) icon.textContent = "🧺";
      if (title) title.textContent = "Belum Ada Pesanan";

      if (description) {
        description.textContent =
          "Pesanan laundry kamu akan muncul di sini. " +
          "Yuk, pilih layanan yang sesuai kebutuhanmu!";
      }

      if (button) {
        button.hidden = false;
        button.href = "price-list.html";
        button.textContent = "Lihat Daftar Harga";
      }
    } else if (filteredCount === 0) {
      if (icon) icon.textContent = "🔎";
      if (title) title.textContent = "Pesanan Tidak Ditemukan";

      if (description) {
        description.textContent =
          currentFilter === "Diproses"
            ? "Tidak ada pesanan yang sedang diproses."
            : currentFilter === "Selesai"
              ? "Belum ada pesanan yang selesai."
              : "Tidak ada pesanan yang sesuai dengan filter.";
      }

      if (button) {
        button.hidden = true;
      }
    }
  }

  // RENDER RIWAYAT
  function render() {
    const orders = getCustomerOrders(getOrders()).slice().sort(
      function (a, b) {
        return getOrderTime(b) - getOrderTime(a);
      }
    );

    if (totalElement) {
      totalElement.textContent = String(orders.length);
    }

    const filtered = orders.filter(function (order) {
      const category = getCategory(getStatus(order));

      return currentFilter === "Semua" || category === currentFilter;
    });

    list.replaceChildren();

    filtered.forEach(function (order) {
      list.appendChild(createOrderCard(order));
    });

    updateEmptyState(filtered.length, orders.length);
  }

  // FILTER SEMUA, DIPROSES, DAN SELESAI
  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const requestedFilter =
        button.dataset.filter || button.textContent.trim();

      const validFilters = ["Semua", "Diproses", "Selesai"];

      if (!validFilters.includes(requestedFilter)) {
        return;
      }

      currentFilter = requestedFilter;

      filterButtons.forEach(function (item) {
        const selected = item === button;

        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });

      render();
    });
  });

  // SINKRONISASI DARI TAB BROWSER LAIN
  window.addEventListener("storage", function (event) {
    if (
      !event.key ||
      event.key === ORDER_STORAGE_KEY ||
      event.key === "glowNDryAccount" ||
      event.key === "glowNDryDemoUser" ||
      event.key === "glowNDryVerifiedDemo"
    ) {
      render();
    }
  });

  window.addEventListener("focus", render);
  window.addEventListener("pageshow", render);

  // TAMPILKAN FILTER AKTIF SECARA AWAL
  filterButtons.forEach(function (button) {
    const selected = (button.dataset.filter || "") === currentFilter;

    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  render();
});
