document.addEventListener("DOMContentLoaded", function () {
  /*
    Ganti data contoh ini dengan informasi toko yang sebenarnya.
    Format nomor WhatsApp untuk tautan harus menggunakan kode negara
    tanpa tanda +, spasi, atau angka 0 di awal.
  */

  const store = {
    address: "Tambahkan alamat lengkap toko laundry di sini",
    phoneDisplay: "Tambahkan nomor WhatsApp toko",
    whatsappNumber: "",
    email: "Tambahkan email toko",
    weekdayHours: "08.00 – 20.00",
    saturdayHours: "08.00 – 18.00",
    sundayHours: "09.00 – 15.00"
  };

  document.getElementById("storeAddress").textContent = store.address;
  document.getElementById("storePhone").textContent = store.phoneDisplay;
  document.getElementById("storeEmail").textContent = store.email;
  document.getElementById("weekdayHours").textContent = store.weekdayHours;
  document.getElementById("saturdayHours").textContent = store.saturdayHours;
  document.getElementById("sundayHours").textContent = store.sundayHours;

  const contactButton = document.getElementById("storeContactButton");

  if (/^[1-9][0-9]{7,14}$/.test(store.whatsappNumber)) {
    contactButton.href =
      "https://wa.me/" + store.whatsappNumber;
    contactButton.target = "_blank";
    contactButton.rel = "noopener noreferrer";
  } else {
    contactButton.href = "#";
    contactButton.addEventListener("click", function (event) {
      event.preventDefault();
      alert("Nomor WhatsApp toko belum diatur di js/store-info.js.");
    });
  }
});