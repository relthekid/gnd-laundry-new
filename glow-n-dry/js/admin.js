
(function () {
  "use strict";

  const ORDER_STORAGE_KEY = "glowNDryOrders";
  const SELECTED_ORDER_KEY = "glowNDrySelectedOrder";
  const ADMIN_SESSION_KEY = "glowNDryAdminLoggedIn";

  const STATUS_OPTIONS = [
    "Diterima",
    "Dicuci",
    "Dikeringkan",
    "Disetrika",
    "Siap Diambil",
    "Selesai",
    "Dibatalkan"
  ];

  function initializeAdmin() {
    // Pastikan halaman ini memang memiliki elemen dashboard admin.
    const orderList = document.getElementById("adminOrderList");
    const manualOrderForm = document.getElementById("adminManualOrderForm");

    if (!orderList || !manualOrderForm) return;

    const totalOrdersElement = document.getElementById("adminTotalOrders");
    const processingOrdersElement = document.getElementById("adminProcessingOrders");
    const completedOrdersElement = document.getElementById("adminCompletedOrders");
    const revenueElement = document.getElementById("adminRevenue");
    const totalWeightElement = document.getElementById("adminTotalWeight");

    const searchInput = document.getElementById("adminSearch");
    const filterSelect = document.getElementById("adminFilter");
    const emptyMessage = document.getElementById("adminEmpty");
    const adminMessage = document.getElementById("adminMessage");
    const logoutButton = document.getElementById("adminLogoutButton");

    const manualName = document.getElementById("manualCustomerName");
    const manualPhone = document.getElementById("manualCustomerPhone");
    const manualService = document.getElementById("manualService");
    const manualWeight = document.getElementById("manualWeight");
    const manualStatus = document.getElementById("manualStatus");
    const manualTotal = document.getElementById("manualOrderTotal");
    const manualNotes = document.getElementById("manualNotes");
    const manualMessage = document.getElementById("adminManualOrderMessage");

    function getOrders() {
      try {
        const saved = JSON.parse(
          localStorage.getItem(ORDER_STORAGE_KEY) || "[]"
        );

        return Array.isArray(saved) ? saved : [];
      } catch (error) {
        console.error("Gagal membaca pesanan:", error);
        showMessage("Data pesanan tidak dapat dibaca dari browser.");
        return [];
      }
    }

    function saveOrders(orders) {
      try {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
        return true;
      } catch (error) {
        console.error("Gagal menyimpan pesanan:", error);
        showMessage(
          "Pesanan gagal disimpan. Periksa penyimpanan browser."
        );
        return false;
      }
    }

    function showMessage(message) {
      if (adminMessage) {
        adminMessage.textContent = message;
      }
    }

    function showManualMessage(message) {
      if (manualMessage) {
        manualMessage.textContent = message;
      }
    }

    function formatRupiah(amount) {
      return (Number(amount) || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      });
    }

    function formatDate(value) {
      if (!value) return "Tanggal tidak tersedia";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function normalizeStatus(status) {
      const value = String(status || "Diterima")
        .trim()
        .toLowerCase();

      const statusMap = {
        "diterima": "Diterima",
        "dicuci": "Dicuci",
        "diproses": "Dicuci",
        "dikeringkan": "Dikeringkan",
        "disetrika": "Disetrika",
        "siap diambil": "Siap Diambil",
        "selesai": "Selesai",
        "diambil": "Selesai",
        "dibatalkan": "Dibatalkan",
        "batal": "Dibatalkan"
      };

      return statusMap[value] || "Diterima";
    }

    function isCompleted(order) {
      return normalizeStatus(order.status) === "Selesai";
    }

    function isCancelled(order) {
      return normalizeStatus(order.status) === "Dibatalkan";
    }

    function isProcessing(order) {
      return !isCompleted(order) && !isCancelled(order);
    }

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

    function updateStatistics(orders) {
      if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length;
      }

      if (processingOrdersElement) {
        processingOrdersElement.textContent =
          orders.filter(isProcessing).length;
      }

      if (completedOrdersElement) {
        completedOrdersElement.textContent =
          orders.filter(isCompleted).length;
      }

      // Pendapatan dihitung dari pesanan berstatus Selesai.
      const revenue = orders
        .filter(isCompleted)
        .reduce(function (sum, order) {
          return sum + (Number(order.total) || 0);
        }, 0);

      // Berat cucian mengecualikan pesanan yang dibatalkan.
      const totalWeight = orders
        .filter(function (order) {
          return !isCancelled(order);
        })
        .reduce(function (sum, order) {
          return sum + (Number(order.weight) || 0);
        }, 0);

      if (revenueElement) {
        revenueElement.textContent = formatRupiah(revenue);
      }

      if (totalWeightElement) {
        totalWeightElement.textContent =
          totalWeight.toLocaleString("id-ID", {
            maximumFractionDigits: 2
          }) + " kg";
      }
    }

    function updateSelectedOrder(updatedOrder) {
      try {
        const selected = JSON.parse(
          localStorage.getItem(SELECTED_ORDER_KEY) || "null"
        );

        if (
          selected &&
          String(selected.id) === String(updatedOrder.id)
        ) {
          localStorage.setItem(
            SELECTED_ORDER_KEY,
            JSON.stringify(updatedOrder)
          );
        }
      } catch (error) {
        console.warn("Data pesanan pilihan gagal diperbarui:", error);
      }
    }

    function updateStatus(orderId, newStatus) {
      const orders = getOrders();

      const index = orders.findIndex(function (order) {
        return String(order.id) === String(orderId);
      });

      if (index === -1) {
        showMessage("Pesanan tidak ditemukan. Muat ulang halaman.");
        renderOrders();
        return;
      }

      const oldStatus = normalizeStatus(orders[index].status);

      if (oldStatus === newStatus) return;

      orders[index].status = newStatus;

      if (!saveOrders(orders)) {
        renderOrders();
        return;
      }

      updateSelectedOrder(orders[index]);

      showMessage(
        "Status pesanan " +
          (orders[index].id || "") +
          " berhasil diubah menjadi " +
          newStatus +
          "."
      );

      renderOrders();
    }

    function createStatusSelect(order) {
      const select = createElement("select", "gnd-admin-status-select");
      select.setAttribute("aria-label", "Ubah status pesanan");

      STATUS_OPTIONS.forEach(function (status) {
        const option = createElement("option", "", status);
        option.value = status;
        option.selected = normalizeStatus(order.status) === status;
        select.appendChild(option);
      });

      select.addEventListener("change", function () {
        updateStatus(order.id, select.value);
      });

      return select;
    }

    function createActionButton(label, className, action) {
      const button = createElement("button", className, label);
      button.type = "button";
      button.addEventListener("click", action);
      return button;
    }

    function createOrderRow(order) {
      const row = document.createElement("tr");

      // ID dan tanggal pesanan.
      const idCell = document.createElement("td");
      idCell.appendChild(
        createElement("strong", "", order.id || "Tanpa ID")
      );
      idCell.appendChild(
        createElement("div", "", formatDate(order.date))
      );

      // Nama dan nomor telepon.
      const customerCell = document.createElement("td");
      customerCell.appendChild(
        createElement(
          "strong",
          "",
          order.customerName || order.fullName || "-"
        )
      );
      customerCell.appendChild(
        createElement("div", "", order.phone || "-")
      );

      const serviceCell = createElement(
        "td",
        "",
        order.service || "-"
      );

      const weightCell = createElement(
        "td",
        "",
        (Number(order.weight) || 0).toLocaleString("id-ID") + " kg"
      );

      const totalCell = createElement(
        "td",
        "",
        formatRupiah(order.total)
      );

      const statusCell = document.createElement("td");
      statusCell.appendChild(createStatusSelect(order));

      const actionsCell = document.createElement("td");
      actionsCell.appendChild(
        createActionButton("✏️ Edit", "gnd-admin-edit-button", function () {
          editOrder(order.id);
        })
      );
      actionsCell.appendChild(
        createActionButton("🗑️ Hapus", "gnd-admin-delete-button", function () {
          deleteOrder(order.id);
        })
      );

      row.append(
        idCell,
        customerCell,
        serviceCell,
        weightCell,
        totalCell,
        statusCell,
        actionsCell
      );

      return row;
    }

    function renderOrders() {
      const orders = getOrders();
      updateStatistics(orders);

      const keyword = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

      const selectedStatus = filterSelect
        ? filterSelect.value
        : "";

      const filteredOrders = orders.filter(function (order) {
        const searchableText = [
          order.id,
          order.customerName,
          order.fullName,
          order.phone,
          order.service,
          order.notes
        ]
          .map(function (value) {
            return String(value || "").toLowerCase();
          })
          .join(" ");

        const matchesSearch = searchableText.includes(keyword);

        const matchesStatus =
          !selectedStatus ||
          selectedStatus === "Semua" ||
          normalizeStatus(order.status) === selectedStatus;

        return matchesSearch && matchesStatus;
      });

      orderList.replaceChildren();

      filteredOrders.forEach(function (order) {
        orderList.appendChild(createOrderRow(order));
      });

      if (emptyMessage) {
        emptyMessage.hidden = filteredOrders.length > 0;

        const title = emptyMessage.querySelector("strong");
        const description = emptyMessage.querySelector("p");

        if (title && description) {
          if (orders.length === 0) {
            title.textContent = "Belum ada pesanan";
            description.textContent =
              "Pesanan pelanggan akan muncul di bagian ini.";
          } else {
            title.textContent = "Pesanan tidak ditemukan";
            description.textContent =
              "Coba ubah kata kunci pencarian atau filter status.";
          }
        }
      }
    }

    function normalizePhone(phone) {
      return String(phone || "").replace(/[\s()-]/g, "");
    }

    function isValidPhone(phone) {
      return /^(?:\+?62|0)[0-9]{8,13}$/.test(normalizePhone(phone));
    }

    function editOrder(orderId) {
      const orders = getOrders();

      const order = orders.find(function (item) {
        return String(item.id) === String(orderId);
      });

      if (!order) {
        showMessage("Pesanan tidak ditemukan.");
        return;
      }

      const newName = prompt(
        "Nama pelanggan:",
        order.customerName || order.fullName || ""
      );

      if (newName === null) return;

      if (newName.trim().length < 2) {
        alert("Nama pelanggan minimal 2 karakter.");
        return;
      }

      const newPhoneInput = prompt(
        "Nomor WhatsApp:",
        order.phone || ""
      );

      if (newPhoneInput === null) return;

      const newPhone = normalizePhone(newPhoneInput);

      if (!isValidPhone(newPhone)) {
        alert("Nomor WhatsApp tidak valid. Periksa kembali nomornya.");
        return;
      }

      const newWeightText = prompt(
        "Berat cucian dalam kg:",
        String(order.weight || 1)
      );

      if (newWeightText === null) return;

      const newWeight = Number(newWeightText);

      if (
        !Number.isFinite(newWeight) ||
        newWeight < 0.1 ||
        newWeight > 100
      ) {
        alert("Berat harus antara 0,1 sampai 100 kg.");
        return;
      }

      const newTotalText = prompt(
        "Total harga pesanan (Rp):",
        String(Number(order.total) || 0)
      );

      if (newTotalText === null) return;

      const newTotal = Number(newTotalText);

      if (!Number.isFinite(newTotal) || newTotal < 0) {
        alert("Total harga tidak valid.");
        return;
      }

      const newNotes = prompt(
        "Catatan pesanan:",
        order.notes || ""
      );

      if (newNotes === null) return;

      order.customerName = newName.trim();
      order.fullName = newName.trim();
      order.phone = newPhone;
      order.weight = newWeight;
      order.total = newTotal;
      order.notes = newNotes.trim();

      // Jangan menghitung ulang harga dari pricePerKg yang mungkin
      // tidak tersedia pada pesanan lama atau pesanan manual.

      if (!saveOrders(orders)) return;

      updateSelectedOrder(order);
      showMessage("Data pesanan berhasil diperbarui.");
      renderOrders();
    }

    function deleteOrder(orderId) {
      const confirmed = confirm(
        "Yakin ingin menghapus pesanan " +
          orderId +
          "?\nData yang dihapus tidak dapat dipulihkan."
      );

      if (!confirmed) return;

      const orders = getOrders();

      const remainingOrders = orders.filter(function (order) {
        return String(order.id) !== String(orderId);
      });

      if (remainingOrders.length === orders.length) {
        showMessage("Pesanan tidak ditemukan.");
        return;
      }

      if (!saveOrders(remainingOrders)) return;

      try {
        const selected = JSON.parse(
          localStorage.getItem(SELECTED_ORDER_KEY) || "null"
        );

        if (selected && String(selected.id) === String(orderId)) {
          localStorage.removeItem(SELECTED_ORDER_KEY);
        }
      } catch (error) {
        console.warn("Data pilihan pesanan gagal diperiksa:", error);
      }

      showMessage("Pesanan " + orderId + " berhasil dihapus.");
      renderOrders();
    }

    // PENCARIAN DAN FILTER
    if (searchInput) {
      searchInput.addEventListener("input", renderOrders);
    }

    if (filterSelect) {
      filterSelect.addEventListener("change", renderOrders);
    }

    // TAMBAH PESANAN MANUAL
    manualOrderForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const customerName = manualName.value.trim();
      const phone = normalizePhone(manualPhone.value);
      const service = manualService.value;
      const weight = Number(manualWeight.value);
      const total = Number(manualTotal.value);
      const status = normalizeStatus(manualStatus.value);
      const notes = manualNotes.value.trim();

      if (customerName.length < 2) {
        showManualMessage("Nama pelanggan minimal 2 karakter.");
        manualName.focus();
        return;
      }

      if (!isValidPhone(phone)) {
        showManualMessage(
          "Nomor WhatsApp tidak valid. Contoh: 081234567890."
        );
        manualPhone.focus();
        return;
      }

      if (!service) {
        showManualMessage("Silakan pilih jenis layanan.");
        manualService.focus();
        return;
      }

      if (
        !Number.isFinite(weight) ||
        weight < 0.1 ||
        weight > 100
      ) {
        showManualMessage("Berat cucian harus antara 0,1 sampai 100 kg.");
        manualWeight.focus();
        return;
      }

      if (!Number.isFinite(total) || total < 0) {
        showManualMessage("Masukkan total harga yang valid.");
        manualTotal.focus();
        return;
      }

      const orders = getOrders();
      const now = new Date();

      const order = {
        id: "GND-" + now.getTime(),
        customerName: customerName,
        fullName: customerName,
        phone: phone,
        service: service,
        weight: weight,
        total: total,
        status: status,
        date: now.toISOString(),
        notes: notes,
        paymentMethod: "Bayar di Toko",
        paymentStatus: "Belum dibayar"
      };

      orders.unshift(order);

      if (!saveOrders(orders)) {
        showManualMessage("Pesanan gagal disimpan. Silakan coba kembali.");
        return;
      }

      try {
        localStorage.setItem(
          SELECTED_ORDER_KEY,
          JSON.stringify(order)
        );
      } catch (error) {
        console.warn("Data pesanan tersimpan, tetapi pilihan gagal diperbarui.");
      }

      manualOrderForm.reset();

      showManualMessage(
        "Pesanan " + order.id + " berhasil ditambahkan."
      );
      showMessage("Pesanan manual berhasil disimpan.");
      renderOrders();

      if (searchInput) searchInput.value = "";
      if (filterSelect) filterSelect.value = "";
      renderOrders();

      const messageTarget = manualMessage || manualOrderForm;
      messageTarget.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });

    // LOGOUT: hanya satu handler agar tidak terjadi proses keluar ganda.
    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        const confirmed = confirm(
          "Yakin ingin keluar dari panel admin?"
        );

        if (!confirmed) return;

        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.replace("admin-login.html");
      });
    }

    // Sinkronisasi saat data berubah dari tab browser lain.
    window.addEventListener("storage", function (event) {
      if (
        event.key === ORDER_STORAGE_KEY ||
        event.key === SELECTED_ORDER_KEY
      ) {
        renderOrders();
      }
    });

    renderOrders();
  }

  // File dashboard dimuat secara dinamis, jadi dukung kedua kondisi
  // agar inisialisasi tidak terlewat setelah DOMContentLoaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAdmin, {
      once: true
    });
  } else {
    initializeAdmin();
  }
})();
