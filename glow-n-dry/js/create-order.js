
document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("createOrderForm");
  if (!form) return;

  const serviceInput = document.getElementById("orderService");
  const weightInput = document.getElementById("orderWeight");
  const nameInput = document.getElementById("orderCustomerName");
  const phoneInput = document.getElementById("orderCustomerPhone");
  const notesInput = document.getElementById("orderNotes");

  const priceDisplay = document.getElementById("orderPricePerKg");
  const weightDisplay = document.getElementById("orderWeightSummary");
  const totalDisplay = document.getElementById("orderGrandTotal");
  const message = document.getElementById("createOrderMessage");

  const paymentOptions = document.querySelectorAll(
    'input[name="paymentMethod"]'
  );

  const paymentMethodInfo = document.getElementById("paymentMethodInfo");
  const submitButton = form.querySelector('button[type="submit"]');

  const ORDER_STORAGE_KEY = "glowNDryOrders";
  const SELECTED_ORDER_KEY = "glowNDrySelectedOrder";

  let isSubmitting = false;

  // FORMAT RUPIAH
  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  // MEMBACA DATA AKUN PELANGGAN
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

  // NORMALISASI NOMOR TELEPON
  function normalizePhone(value) {
    return String(value || "").replace(/[\s()-]/g, "");
  }

  function isValidPhone(value) {
    const phone = normalizePhone(value);
    return /^(?:\+?62|0)[0-9]{8,13}$/.test(phone);
  }

  // MENGAMBIL HARGA RESMI DARI PILIHAN LAYANAN
  function getPrice() {
    if (!serviceInput || !serviceInput.value) {
      return 0;
    }

    const selectedOption =
      serviceInput.options[serviceInput.selectedIndex];

    if (!selectedOption) {
      return 0;
    }

    const price = Number(selectedOption.dataset.price);

    return Number.isFinite(price) && price > 0 ? price : 0;
  }

  // ESTIMASI SELESAI
  function getEstimatedCompletionAt(startDate, service) {
    const serviceName = String(service || "").toLowerCase();

    let days = 3;

    if (serviceName.includes("express")) {
      days = 1;
    } else if (serviceName.includes("cuci setrika")) {
      days = 3;
    } else if (serviceName.includes("cuci kering")) {
      days = 2;
    } else if (serviceName.includes("setrika")) {
      days = 1;
    }

    const estimatedDate = new Date(startDate);
    estimatedDate.setDate(estimatedDate.getDate() + days);

    return estimatedDate.toISOString();
  }

  // MEMPERBARUI RINGKASAN HARGA
  function updateTotal() {
    const price = getPrice();
    const weight = Number(weightInput.value) || 0;
    const total = price * weight;

    if (priceDisplay) {
      priceDisplay.textContent = rupiah(price);
    }

    if (weightDisplay) {
      weightDisplay.textContent =
        weight.toLocaleString("id-ID") + " kg";
    }

    if (totalDisplay) {
      totalDisplay.textContent = rupiah(total);
    }

    return total;
  }

  // INFORMASI METODE PEMBAYARAN
  function updatePaymentInfo(method) {
    if (!paymentMethodInfo || !method) return;

    paymentMethodInfo.classList.add("visible");

    if (method === "QRIS") {
      paymentMethodInfo.textContent =
        "Kamu memilih QRIS. Ikuti instruksi pembayaran dari toko. " +
        "Kode QR dan verifikasi pembayaran otomatis belum tersedia.";
    } else if (method === "Bayar di Toko") {
      paymentMethodInfo.textContent =
        "Kamu memilih Bayar di Toko. Silakan lakukan pembayaran " +
        "langsung di toko saat menyerahkan atau mengambil cucian.";
    }
  }

  paymentOptions.forEach(function (option) {
    option.addEventListener("change", function () {
      updatePaymentInfo(this.value);
    });
  });

  // MENGAMBIL LAYANAN DARI HALAMAN DAFTAR HARGA
  const params = new URLSearchParams(window.location.search);
  const requestedService = params.get("service");
  const requestedPrice = Number(params.get("price"));

  if (requestedService && serviceInput) {
    const option = Array.from(serviceInput.options).find(
      function (item) {
        return item.value === requestedService;
      }
    );

    if (option) {
      serviceInput.value = requestedService;

      // Harga dari URL hanya digunakan untuk memeriksa kecocokan.
      // Harga sebenarnya tetap diambil dari data-price pada HTML.
      if (
        requestedPrice > 0 &&
        Number(option.dataset.price) !== requestedPrice
      ) {
        console.warn(
          "Harga dari URL berbeda dengan harga layanan di formulir."
        );
      }
    }
  }

  // MENGISI DATA PELANGGAN DARI AKUN
  const account = getAccount();

  if (account) {
    if (nameInput && !nameInput.value.trim()) {
      nameInput.value =
        account.fullName ||
        account.name ||
        "";
    }

    if (phoneInput && !phoneInput.value.trim()) {
      phoneInput.value =
        account.phone ||
        account.phoneNumber ||
        "";
    }
  }

  // EVENT PERUBAHAN LAYANAN DAN BERAT
  if (serviceInput) {
    serviceInput.addEventListener("change", updateTotal);
  }

  if (weightInput) {
    weightInput.addEventListener("input", updateTotal);
  }

  updateTotal();

  // Menampilkan informasi jika metode pembayaran sudah dipilih.
  const initialPayment = document.querySelector(
    'input[name="paymentMethod"]:checked'
  );

  if (initialPayment) {
    updatePaymentInfo(initialPayment.value);
  }

  function showError(text, inputElement) {
    if (message) {
      message.textContent = text;
    }

    if (inputElement) {
      inputElement.focus();
    }
  }

  // MEMBUAT PESANAN
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (isSubmitting) return;

    if (message) {
      message.textContent = "";
    }

    const customerName = nameInput.value.trim();
    const phone = normalizePhone(phoneInput.value);
    const service = serviceInput.value;
    const weight = Number(weightInput.value);
    const pricePerKg = getPrice();
    const notes = notesInput.value.trim();

    const selectedPayment = document.querySelector(
      'input[name="paymentMethod"]:checked'
    );

    // Validasi nama.
    if (customerName.length < 2) {
      showError("Nama lengkap minimal 2 karakter.", nameInput);
      return;
    }

    // Validasi nomor WhatsApp.
    if (!isValidPhone(phone)) {
      showError(
        "Nomor WhatsApp tidak valid. Gunakan format 08... atau +62...",
        phoneInput
      );
      return;
    }

    // Validasi layanan.
    if (!service || pricePerKg <= 0) {
      showError(
        "Silakan pilih jenis layanan dengan harga yang valid.",
        serviceInput
      );
      return;
    }

    // Validasi berat: 1–100 kg dengan kelipatan 0,5 kg.
    if (
      !Number.isFinite(weight) ||
      weight < 1 ||
      weight > 100 ||
      Math.abs(weight * 2 - Math.round(weight * 2)) > 1e-8
    ) {
      showError(
        "Berat cucian harus 1–100 kg dengan kelipatan 0,5 kg.",
        weightInput
      );
      return;
    }

    // Validasi pembayaran.
    if (!selectedPayment) {
      if (message) {
        message.textContent =
          "Silakan pilih QRIS atau Bayar di Toko.";
      }

      const paymentSection = document.querySelector(
        ".gnd-payment-section"
      );

      if (paymentSection) {
        paymentSection.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      return;
    }

    const paymentMethod = selectedPayment.value;

    if (
      paymentMethod !== "QRIS" &&
      paymentMethod !== "Bayar di Toko"
    ) {
      showError("Metode pembayaran tidak valid.");
      return;
    }

    const total = pricePerKg * weight;

    if (!Number.isFinite(total) || total <= 0) {
      showError("Total harga pesanan tidak valid.");
      return;
    }

    const now = new Date();

    // DATA PESANAN YANG DIGUNAKAN BERSAMA OLEH ADMIN,
    // RIWAYAT PELANGGAN, DAN HALAMAN DETAIL.
    const order = {
      id: "GND-" + now.getTime(),
      service: service,
      pricePerKg: pricePerKg,
      weight: weight,
      total: total,
      status: "Diterima",
      date: now.toISOString(),
      estimatedCompletionAt: getEstimatedCompletionAt(now, service),
      customerName: customerName,
      fullName: customerName,
      phone: phone,
      notes: notes,
      paymentMethod: paymentMethod,
      paymentStatus: "Belum dibayar"
    };

    // Simpan kedua item dengan penanganan kegagalan.
    let previousOrders = null;
    let previousSelectedOrder = null;

    try {
      previousOrders = localStorage.getItem(ORDER_STORAGE_KEY);
      previousSelectedOrder = localStorage.getItem(SELECTED_ORDER_KEY);

      const storedOrders = previousOrders
        ? JSON.parse(previousOrders)
        : [];

      if (!Array.isArray(storedOrders)) {
        throw new Error("Format data pesanan tidak valid.");
      }

      storedOrders.unshift(order);

      isSubmitting = true;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan Pesanan...";
      }

      localStorage.setItem(
        ORDER_STORAGE_KEY,
        JSON.stringify(storedOrders)
      );

      localStorage.setItem(
        SELECTED_ORDER_KEY,
        JSON.stringify(order)
      );

      if (message) {
        message.textContent =
          "Pesanan berhasil dibuat! Membuka detail pesanan...";
      }

      window.setTimeout(function () {
        window.location.href =
          "order-detail.html?id=" + encodeURIComponent(order.id);
      }, 500);

    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error);

      // Usahakan memulihkan data sebelumnya jika penyimpanan gagal.
      try {
        if (previousOrders === null) {
          localStorage.removeItem(ORDER_STORAGE_KEY);
        } else {
          localStorage.setItem(ORDER_STORAGE_KEY, previousOrders);
        }

        if (previousSelectedOrder === null) {
          localStorage.removeItem(SELECTED_ORDER_KEY);
        } else {
          localStorage.setItem(
            SELECTED_ORDER_KEY,
            previousSelectedOrder
          );
        }
      } catch (restoreError) {
        console.error("Pemulihan data sebelumnya gagal:", restoreError);
      }

      isSubmitting = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML =
          "<span>Buat Pesanan</span><span aria-hidden=\"true\">→</span>";
      }

      if (message) {
        message.textContent =
          "Pesanan gagal disimpan. Periksa penyimpanan browser dan coba lagi.";
      }
    }
  });
});
