
document.addEventListener("DOMContentLoaded", function () {
  const $ = function (id) {
    return document.getElementById(id);
  };

  let currentOrder = null;

  // ==========================================
  // MEMBACA DATA
  // ==========================================

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      console.warn("Data tidak dapat dibaca:", key);
      return fallback;
    }
  }

  function getOrders() {
    const orders = readStorage("glowNDryOrders", []);
    return Array.isArray(orders) ? orders : [];
  }

  function getCustomerAccount() {
    return (
      readStorage("glowNDryDemoUser", null) ||
      readStorage("glowNDryVerifiedDemo", null) ||
      readStorage("glowNDryAccount", null)
    );
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
    if (!value) return "Tanggal belum tersedia";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Tanggal belum tersedia";
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function normalizePhone(value) {
    let phone = String(value || "").replace(/\D/g, "");

    if (phone.startsWith("62")) {
      phone = "0" + phone.slice(2);
    }

    return phone;
  }

  function getOrderTime(order) {
    const timestamp = new Date(
      order.date || order.createdAt || 0
    ).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  // ==========================================
  // STATUS PESANAN
  // ==========================================

  function getStatus(order) {
    const status = String(
      order.status || "Diterima"
    ).trim().toLowerCase();

    if (
      status.includes("batal") ||
      status.includes("cancel")
    ) {
      return "Dibatalkan";
    }

    // Periksa Siap Diambil sebelum Selesai.
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
      status.includes("washing")
    ) {
      return "Dicuci";
    }

    return "Diterima";
  }

  // ==========================================
  // ESTIMASI PESANAN SELESAI
  // ==========================================

  function getEstimatedCompletionDate(order) {
    // Gunakan tanggal estimasi yang sudah tersimpan.
    if (order.estimatedCompletionAt) {
      const savedDate = new Date(order.estimatedCompletionAt);

      if (!Number.isNaN(savedDate.getTime())) {
        return savedDate;
      }
    }

    // Hitung estimasi untuk pesanan lama.
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
    } else if (service.includes("setrika saja")) {
      days = 1;
    } else if (service.includes("cuci kering")) {
      days = 2;
    } else if (service.includes("cuci setrika")) {
      days = 3;
    }

    // Estimasi menggunakan hari kalender.
    startDate.setDate(startDate.getDate() + days);

    return startDate;
  }

  function getEstimatedCompletionText(order) {
    const status = getStatus(order);

    if (status === "Siap Diambil") {
      return "Cucian sudah siap diambil!";
    }

    const estimatedDate = getEstimatedCompletionDate(order);

    if (!estimatedDate) {
      return "Estimasi selesai belum tersedia.";
    }

    return (
      "Estimasi selesai: " +
      formatDate(estimatedDate)
    );
  }

  // ==========================================
  // PESANAN MILIK PELANGGAN
  // ==========================================

  function getCustomerOrders(orders, account) {
    if (!account) return orders;

    const accountPhone = normalizePhone(
      account.phone || account.phoneNumber || ""
    );

    if (accountPhone) {
      return orders.filter(function (order) {
        const orderPhone = normalizePhone(order.phone);

        return (
          orderPhone !== "" &&
          orderPhone === accountPhone
        );
      });
    }

    const accountName = String(
      account.fullName || account.name || ""
    ).trim().toLowerCase();

    if (accountName) {
      return orders.filter(function (order) {
        const orderName = String(
          order.customerName || order.name || ""
        ).trim().toLowerCase();

        return orderName === accountName;
      });
    }

    return orders;
  }

  function findActiveOrder(orders) {
    return orders
      .filter(function (order) {
        const status = getStatus(order);

        return (
          status !== "Selesai" &&
          status !== "Dibatalkan"
        );
      })
      .sort(function (a, b) {
        return getOrderTime(b) - getOrderTime(a);
      })[0] || null;
  }

  // ==========================================
  // TOMBOL DETAIL
  // ==========================================

  function setButtonContent(button, label) {
    if (!button) return;

    button.replaceChildren();

    const text = document.createElement("span");
    text.className = "gnd-detail-label";
    text.textContent = label;

    const arrow = document.createElement("span");
    arrow.className = "gnd-detail-arrow";
    arrow.textContent = "›";

    button.append(text, arrow);
  }

  // ==========================================
  // PROGRES CUCIAN
  // ==========================================

  function updateProgress(status) {
    const progress = $("laundryProgress");

    if (!progress) return;

    const steps = Array.from(
      progress.querySelectorAll(
        ".gnd-progress-step, .gnd-step"
      )
    );

    const statusStep = {
      "Diterima": 0,
      "Dicuci": 1,
      "Dikeringkan": 2,
      "Disetrika": 3,
      "Siap Diambil": 4,
      "Selesai": 4
    };

    if (!status) {
      progress.setAttribute(
        "aria-label",
        "Belum ada pesanan aktif"
      );

      steps.forEach(function (step, index) {
        step.classList.remove("active", "completed");

        const number = step.querySelector("span");

        if (number) {
          number.textContent = String(index + 1);
        }
      });

      return;
    }

    const currentStep = statusStep[status] ?? 0;

    progress.setAttribute(
      "aria-label",
      "Progres pesanan: " + status
    );

    steps.forEach(function (step, index) {
      const completed = index <= currentStep;
      const active = index === currentStep;

      step.classList.toggle("completed", completed);
      step.classList.toggle("active", active);

      const number = step.querySelector("span");

      if (number) {
        if (
          index < currentStep ||
          (index === currentStep && status === "Selesai")
        ) {
          number.textContent = "✓";
        } else {
          number.textContent = String(index + 1);
        }
      }
    });
  }

  // ==========================================
  // TAMPILAN JIKA BELUM ADA PESANAN
  // ==========================================

  function showNoActiveOrder() {
    if ($("activeOrderNumber")) {
      $("activeOrderNumber").textContent =
        "Belum ada pesanan";
    }

    if ($("activeOrderStatus")) {
      $("activeOrderStatus").textContent =
        "Belum ada";
    }

    const estimateElement = $("activeOrderEstimate");

    if (estimateElement) {
      estimateElement.replaceChildren();

      estimateElement.textContent =
        "Buat pesanan laundry untuk melihat status dan estimasi selesai.";
    }

    const button = $("homeOrderButton");

    if (button) {
      button.href = "price-list.html";
      setButtonContent(button, "Pilih Layanan Laundry");
    }

    updateProgress(null);
  }

  // ==========================================
  // TAMPILAN PESANAN AKTIF
  // ==========================================

  function showActiveOrder(order) {
    const status = getStatus(order);

    const orderId =
      order.id || order.orderId || "Pesanan";

    const service =
      order.service ||
      order.serviceName ||
      "Layanan laundry";

    const weight = Number(order.weight) || 0;

    const totalValue = Number(
      order.total ??
      order.price ??
      order.grandTotal ??
      0
    );

    if ($("activeOrderNumber")) {
      $("activeOrderNumber").textContent = orderId;
    }

    if ($("activeOrderStatus")) {
      $("activeOrderStatus").textContent = status;
    }

    // Tampilkan informasi layanan dan estimasi pada Beranda.
    const estimateElement = $("activeOrderEstimate");

    if (estimateElement) {
      estimateElement.replaceChildren();

      const orderInfo = document.createElement("span");

      orderInfo.textContent =
        service +
        " • " +
        weight +
        " kg • " +
        rupiah(totalValue);

      orderInfo.style.display = "block";
      orderInfo.style.lineHeight = "1.8";

      const completionInfo = document.createElement("span");

      completionInfo.className = "gnd-estimated-completion";
      completionInfo.textContent =
        getEstimatedCompletionText(order);

      completionInfo.style.display = "block";
      completionInfo.style.marginTop = "5px";
      completionInfo.style.fontWeight = "800";
      completionInfo.style.lineHeight = "1.8";

      // Warna estimasi mengikuti tema yang aktif.
      completionInfo.style.color =
        document.body.classList.contains("gnd-dark-mode")
          ? "#9bc9ff"
          : "#2168b8";

      estimateElement.append(
        orderInfo,
        completionInfo
      );
    }

    // Buka detail pesanan dengan ID yang sesuai.
    const button = $("homeOrderButton");

    if (button) {
      const id = order.id || order.orderId || "";

      button.href =
        "order-detail.html?id=" +
        encodeURIComponent(id);

      setButtonContent(
        button,
        "Lihat Detail Pesanan"
      );
    }

    updateProgress(status);
  }

  // ==========================================
  // RENDER BERANDA
  // ==========================================

  function renderHome() {
    const account = getCustomerAccount();

    if ($("homeCustomerName")) {
      const name =
        account &&
        (account.fullName || account.name);

      $("homeCustomerName").textContent =
        name || "Pelanggan";
    }

    const customerOrders = getCustomerOrders(
      getOrders(),
      account
    );

    currentOrder = findActiveOrder(customerOrders);

    if (currentOrder) {
      showActiveOrder(currentOrder);
    } else {
      showNoActiveOrder();
    }
  }

  // ==========================================
  // NOTIFIKASI
  // ==========================================

  const notificationButton = $("notificationButton");

  if (notificationButton) {
    notificationButton.addEventListener(
      "click",
      function () {
        if (currentOrder) {
          const orderId =
            currentOrder.id ||
            currentOrder.orderId ||
            "Pesanan";

          const status = getStatus(currentOrder);

          alert(
            "INFORMASI PESANAN\n\n" +
            "Nomor pesanan: " + orderId + "\n" +
            "Layanan: " +
            (
              currentOrder.service ||
              currentOrder.serviceName ||
              "-"
            ) + "\n" +
            "Status: " + status + "\n" +
            getEstimatedCompletionText(currentOrder) + "\n" +
            "Metode pembayaran: " +
            (currentOrder.paymentMethod || "Belum dipilih")
          );
        } else {
          alert(
            "Belum ada pesanan aktif.\n\n" +
            "Yuk, pilih layanan laundry Glow N Dry!"
          );
        }
      }
    );
  }

  // ==========================================
  // PEMBARUAN DATA OTOMATIS
  // ==========================================

  // Render pertama kali.
  renderHome();

  // Sinkronisasi jika admin mengubah data di tab lain.
  window.addEventListener("storage", function (event) {
    if (
      !event.key ||
      event.key === "glowNDryOrders" ||
      event.key === "glowNDryAccount" ||
      event.key === "glowNDryDemoUser" ||
      event.key === "glowNDryVerifiedDemo"
    ) {
      renderHome();
    }
  });

  // Perbarui saat pengguna kembali ke halaman Beranda.
  window.addEventListener("focus", renderHome);
  window.addEventListener("pageshow", renderHome);

  document.addEventListener(
    "visibilitychange",
    function () {
      if (!document.hidden) {
        renderHome();
      }
    }
  );

  // Periksa perubahan selama halaman tetap terbuka.
  window.setInterval(function () {
    if (!document.hidden) {
      renderHome();
    }
  }, 5000);
});
