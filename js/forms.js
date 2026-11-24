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
  // Desativa o botão enquanto espera o servidor (evita cliques duplos)
  function busy(form, on, text) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = text; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
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
      busy(login, true, "Entrando…");
      try {
        await Auth.login(login.email.value, login.password.value);
        location.href = "lab.html";
      } catch (err) { busy(login, false); showAlert("loginAlert", "danger", err.message); }
    });

    /* ----- Esqueci minha senha ----- */
    const forgot = document.getElementById("forgotPassword");
    if (forgot) forgot.addEventListener("click", async function () {
      const email = document.getElementById("loginEmail");
      if (!email.value || !email.checkValidity()) {
        showAlert("loginAlert", "warning", "Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.");
        email.focus(); return;
      }
      try {
        await Auth.resetPassword(email.value);
        showAlert("loginAlert", "success", "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também o spam.");
      } catch (err) { showAlert("loginAlert", "danger", err.message); }
    });

    /* ----- Situação do login (já conectado / serviço indisponível) ----- */
    const status = document.getElementById("authStatus");
    if (status) Auth.onChange(function (user) {
      if (user) {
        status.className = "alert alert-success";
        status.innerHTML = "";
        status.append("Você já está conectado como " + user.email + ". ");
        const a = document.createElement("a"); a.href = "lab.html"; a.textContent = "Ir para o Lab"; status.append(a);
        status.hidden = false;
      } else if (Auth.error()) {
        status.className = "alert alert-warning";
        status.textContent = Auth.error();
        status.hidden = false;
      } else status.hidden = true;
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
        busy(reg, true, "Criando conta…");
        try {
          await Auth.register(reg.name.value, reg.email.value, reg.password.value);
          location.href = "lab.html";
        } catch (err) { busy(reg, false); showAlert("registerAlert", "danger", err.message); }
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
