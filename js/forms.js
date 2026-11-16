/* =========================================================
   InputLab — validação dos formulários (login, cadastro, contato)
   Usa a validação nativa do HTML5 + estilos do Bootstrap,
   com mensagens em português e foco no primeiro campo inválido.
   ========================================================= */
(function () {
  "use strict";
  const Auth = window.InputLabAuth;

  function validate(form) {
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      const first = form.querySelector(":invalid");
      if (first) first.focus();
      return false;
    }
    return true;
  }
  function showAlert(id, type, msg) {
    const box = document.getElementById(id);
    if (!box) return;
    box.className = "alert alert-" + type + " mt-3";
    box.textContent = msg;
    box.hidden = false;
    box.focus();
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* ----- Login ----- */
    const login = document.getElementById("loginForm");
    if (login) login.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!validate(login)) return;
      try {
        await Auth.login(login.email.value, login.password.value);
        location.href = "lab.html";
      } catch (err) { showAlert("loginAlert", "danger", err.message); }
    });

    /* ----- Cadastro ----- */
    const reg = document.getElementById("registerForm");
    if (reg) {
      reg.confirm.addEventListener("input", function () {
        reg.confirm.setCustomValidity(reg.confirm.value === reg.password.value ? "" : "As senhas não conferem");
      });
      reg.addEventListener("submit", async function (e) {
        e.preventDefault();
        reg.confirm.setCustomValidity(reg.confirm.value === reg.password.value ? "" : "As senhas não conferem");
        if (!validate(reg)) return;
        try {
          await Auth.register(reg.name.value, reg.email.value, reg.password.value);
          location.href = "lab.html";
        } catch (err) { showAlert("registerAlert", "danger", err.message); }
      });
    }

    /* Mostrar/ocultar senha */
    document.querySelectorAll("[data-toggle-password]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const input = document.getElementById(btn.getAttribute("data-toggle-password"));
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", String(show));
        btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
        btn.querySelector("i").className = show ? "bi bi-eye-slash" : "bi bi-eye";
      });
    });

    /* ----- Contato ----- */
    const contact = document.getElementById("contactForm");
    if (contact) {
      const msg = contact.message, counter = document.getElementById("msgCounter");
      msg.addEventListener("input", function () { counter.textContent = msg.value.length + "/500"; });
      contact.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate(contact)) return;
        // Sem back-end: a mensagem é apenas simulada (ver README — trabalho futuro: Formspree/EmailJS)
        showAlert("contactAlert", "success", "Obrigado, " + contact.name.value.split(" ")[0] + "! Sua mensagem foi registrada. Responderemos em até 2 dias úteis.");
        contact.reset(); contact.classList.remove("was-validated"); counter.textContent = "0/500";
      });
    }
  });
})();
