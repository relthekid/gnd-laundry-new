
/* =================================
   GLOW N DRY - LOGIN
================================= */

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");
const forgotPassword = document.getElementById("forgotPassword");

// Tampilkan atau sembunyikan password
if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";
        togglePassword.textContent = isHidden ? "◎" : "◉";

        togglePassword.setAttribute(
            "aria-label",
            isHidden ? "Sembunyikan password" : "Tampilkan password"
        );
    });
}

// Tampilkan pesan login
function showLoginMessage(message) {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.classList.add("show");
}


/* PROSES LOGIN GLOW N DRY */

if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const phone = document.getElementById("phone").value.trim();
        const password = passwordInput.value;

        if (!/^(?:\+62|62|0)[0-9]{8,13}$/.test(phone)) {
            showLoginMessage("Periksa kembali nomor WhatsApp kamu.");
            return;
        }

        if (password.length < 6) {
            showLoginMessage("Password minimal 6 karakter.");
            return;
        }

        try {
            const savedAccount = JSON.parse(
                localStorage.getItem("glowNDryAccount") || "null"
            );

            // Login akun yang dibuat melalui proses registrasi
            if (savedAccount) {
                if (
                    savedAccount.phone !== phone ||
                    savedAccount.password !== password
                ) {
                    showLoginMessage(
                        "Nomor WhatsApp atau password tidak sesuai."
                    );
                    return;
                }

                localStorage.setItem(
                    "glowNDryDemoUser",
                    JSON.stringify({
                        fullName: savedAccount.fullName,
                        phone: savedAccount.phone
                    })
                );

                showLoginMessage("Login berhasil! Membuka beranda...");

                setTimeout(function () {
                    window.location.href = "home.html";
                }, 800);

                return;
            }

            // Akun demo lama yang belum mendaftar
            showLoginMessage(
                "Akun belum terdaftar. Silakan buat akun terlebih dahulu."
            );
        } catch (error) {
            showLoginMessage(
                "Terjadi kesalahan saat membaca data akun."
            );
        }
    });
}

// Lupa password sementara
if (forgotPassword) {
    forgotPassword.addEventListener("click", function (event) {
        event.preventDefault();

        alert(
            "Fitur lupa password akan kita buat pada tahap berikutnya."
        );
    });
}


/* =================================
   GLOW N DRY - REGISTER
================================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("registerPhone").value.trim();
        const message = document.getElementById("registerMessage");

        function showRegisterMessage(text) {
            if (!message) return;

            message.textContent = text;
            message.classList.add("show");
        }

        if (fullName.length < 2) {
            showRegisterMessage("Nama lengkap minimal 2 karakter.");
            return;
        }

        if (!/^(?:\+62|62|0)[0-9]{8,13}$/.test(phone)) {
            showRegisterMessage(
                "Nomor WhatsApp tidak valid. Periksa kembali nomor kamu."
            );
            return;
        }

        try {
            const pendingRegistration = {
                fullName: fullName,
                phone: phone,
                createdAt: new Date().toISOString()
            };

            localStorage.setItem(
                "glowNDryPendingRegistration",
                JSON.stringify(pendingRegistration)
            );

            window.location.href = "otp.html";
        } catch (error) {
            showRegisterMessage(
                "Data gagal disimpan. Silakan coba kembali."
            );
        }
    });
}


/* =================================
   GLOW N DRY - OTP VERIFICATION
================================= */

const otpForm = document.getElementById("otpForm");

if (otpForm) {
    const otpInput = document.getElementById("otpCode");
    const otpMessage = document.getElementById("otpMessage");
    const otpPhone = document.getElementById("otpPhone");

    let registration = null;

    try {
        registration = JSON.parse(
            localStorage.getItem("glowNDryPendingRegistration")
        );
    } catch (error) {
        registration = null;
    }

    if (otpPhone) {
        if (registration && registration.phone) {
            otpPhone.textContent = registration.phone;
        } else {
            otpPhone.textContent = "Nomor belum tersedia";
        }
    }

    // Hanya izinkan angka, maksimal 6 digit
    if (otpInput) {
        otpInput.addEventListener("input", function () {
            otpInput.value = otpInput.value
                .replace(/\D/g, "")
                .slice(0, 6);
        });
    }

    otpForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const code = otpInput.value.trim();

        otpMessage.classList.add("show");

        if (!registration || !registration.phone) {
            otpMessage.textContent =
                "Data pendaftaran tidak ditemukan. Silakan daftar kembali.";
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            otpMessage.textContent =
                "Masukkan kode OTP yang terdiri dari 6 digit.";
            return;
        }

        if (code !== "123456") {
            otpMessage.textContent =
                "Kode demo salah. Coba masukkan 123456.";
            return;
        }

        try {
            localStorage.setItem(
                "glowNDryVerifiedDemo",
                JSON.stringify({
                    fullName: registration.fullName,
                    phone: registration.phone
                })
            );

            otpMessage.textContent =
                "Verifikasi berhasil! Membuka beranda...";

            setTimeout(function () {
                window.location.href = "create-password.html";
            }, 1000);

        } catch (error) {
            otpMessage.textContent =
                "Data tidak bisa disimpan di browser. Silakan coba lagi.";
        }
    });
}


/* =================================
   GLOW N DRY - CREATE PASSWORD
================================= */

const createPasswordForm = document.getElementById("createPasswordForm");

if (createPasswordForm) {
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordMessage = document.getElementById("createPasswordMessage");

    // Tombol tampil/sembunyikan password
    document.querySelectorAll("[data-password]").forEach(function (button) {
        button.addEventListener("click", function () {
            const input = document.getElementById(button.dataset.password);

            if (!input) return;

            const hidden = input.type === "password";
            input.type = hidden ? "text" : "password";
            button.textContent = hidden ? "◎" : "◉";
            button.setAttribute(
                "aria-label",
                hidden ? "Sembunyikan password" : "Tampilkan password"
            );
        });
    });

    createPasswordForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const password = newPassword.value;
        const confirmation = confirmPassword.value;

        passwordMessage.classList.add("show");

        if (password.length < 6) {
            passwordMessage.textContent =
                "Password minimal 6 karakter.";
            return;
        }

        if (password !== confirmation) {
            passwordMessage.textContent =
                "Konfirmasi password tidak sama.";
            return;
        }

        let registration;

        try {
            registration = JSON.parse(
                localStorage.getItem("glowNDryPendingRegistration")
            );

            if (!registration || !registration.phone) {
                passwordMessage.textContent =
                    "Data pendaftaran tidak ditemukan. Silakan daftar kembali.";
                return;
            }

            localStorage.setItem(
                "glowNDryAccount",
                JSON.stringify({
                    fullName: registration.fullName,
                    phone: registration.phone,
                    password: password
                })
            );

            localStorage.setItem(
                "glowNDryVerifiedDemo",
                JSON.stringify({
                    fullName: registration.fullName,
                    phone: registration.phone
                })
            );

            passwordMessage.textContent =
                "Password berhasil dibuat! Mengalihkan ke Login...";

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            passwordMessage.textContent =
                "Gagal menyimpan data. Silakan coba kembali.";
        }
    });
}


/* =================================
   GLOW N DRY - OTP COUNTDOWN
================================= */

const otpTimer = document.getElementById("otpTimer");
const resendOtpButton = document.getElementById("resendOtp");

if (otpTimer && resendOtpButton) {
    let remaining = 45;
    let timerInterval;

    function updateOtpTimer() {
        const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
        const seconds = String(remaining % 60).padStart(2, "0");

        otpTimer.textContent = remaining > 0
            ? `Kirim ulang kode (${minutes}:${seconds})`
            : "Kamu bisa meminta kode baru.";

        resendOtpButton.disabled = remaining > 0;

        if (remaining <= 0 && timerInterval) {
            clearInterval(timerInterval);
        }
    }

    updateOtpTimer();

    timerInterval = setInterval(function () {
        if (remaining > 0) {
            remaining--;
            updateOtpTimer();
        }
    }, 1000);

    resendOtpButton.addEventListener("click", function () {
        // Demo: tidak mengirim WhatsApp sungguhan.
        remaining = 45;
        updateOtpTimer();

        timerInterval = setInterval(function () {
            if (remaining > 0) {
                remaining--;
                updateOtpTimer();
            } else {
                clearInterval(timerInterval);
            }
        }, 1000);

        alert("Ini masih demo. Kode OTP tetap 123456.");
    });
}
