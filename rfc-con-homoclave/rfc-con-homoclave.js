(function () {
  "use strict";

  var ROOT_ID = "rfc-con-homoclave-calculator";
  var SITE_NAME = "RFC Generator Mexico";
  var SITE_URL = "https://icalcularrfc.mx";

  var COPY = {
    cardTitle: "RFC con Homoclave",
    cardSubtitle: "Homoclave y dígito verificador incluidos",
    resultTitle: "RFC con homoclave",
    submitLabel: "Calcular RFC con homoclave",
    submitLoadingLabel: "Calculando…",
  };

  var PARTICLES = new Set([
    "DE", "LA", "LAS", "LOS", "Y", "DEL", "MC", "MAC", "VON", "VAN", "MI", "SAN", "SANTA",
  ]);
  var COMMON_FIRST_NAMES = new Set(["JOSE", "MA", "MARIA", "MA.", "J", "J."]);
  var INCONVENIENT_WORDS = new Set(
    "BUEI,BUEY,CACA,CACO,CAGA,CAGO,CAKA,CAKO,COGE,COGI,COJA,COJE,COJI,COJO,COLA,CULO,FALO,FETO,GETA,GUEI,GUEY,JETA,JOTO,KACA,KACO,KAGA,KAGO,KAKA,KAKO,KOGE,KOJO,KULO,LILO,LOCA,LOCO,LOKA,LOKO,MAME,MAMO,MEAR,MEAS,MEON,MIAR,MION,MOCO,MOKO,MULA,MULO,NACA,NACO,PEDA,PEDO,PENE,PIPI,PITO,POPO,PUTA,PUTO,QULO,RATA,ROBA,ROBE,ROBO,RUIN,SENO,TETA,VACA,VAGA,VAGO,VAKA,VUEI,VUEY,WUEI,WUEY".split(",")
  );
  var HOMO_ALPHABET = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
  var VOWELS = new Set(["A", "E", "I", "O", "U"]);

  var ANEXO_I_MAP = {
    " ": "00", "&": "10",
    A: "11", B: "12", C: "13", D: "14", E: "15", F: "16", G: "17", H: "18", I: "19",
    J: "21", K: "22", L: "23", M: "24", N: "25", O: "26", P: "27", Q: "28", R: "29",
    S: "32", T: "33", U: "34", V: "35", W: "36", X: "37", Y: "38", Z: "39", "Ñ": "40",
  };
  for (var d = 0; d <= 9; d++) ANEXO_I_MAP[String(d)] = "0" + d;

  var ANEXO_III_MAP = {
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 18, J: 19,
    K: 20, L: 21, M: 22, N: 23, "&": 24, O: 25, P: 26, Q: 27, R: 28, S: 29,
    T: 30, U: 31, V: 32, W: 33, X: 34, Y: 35, Z: 36, " ": 37, "Ñ": 38,
  };

  function getSiteUrl() {
    return (typeof window !== "undefined" && window.location.origin) || SITE_URL;
  }

  function cleanString(value) {
    return value
      .trim()
      .toUpperCase()
      .replace(/Ñ/g, "__ENYE__")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/__ENYE__/g, "Ñ")
      .replace(/\s+/g, " ");
  }

  function removeParticles(value) {
    return cleanString(value)
      .split(" ")
      .filter(Boolean)
      .filter(function (t) { return !PARTICLES.has(t); })
      .join(" ")
      .trim();
  }

  function safeName(value) {
    return removeParticles(value || "");
  }

  function firstSurnameWord(value) {
    var tokens = cleanString(value).split(" ").filter(Boolean);
    return tokens[0] || "";
  }

  function twoLetters(value, fallback) {
    fallback = fallback || "X";
    return (value[0] || fallback) + (value[1] || fallback);
  }

  function firstLetter(value, fallback) {
    fallback = fallback || "X";
    return value[0] || fallback;
  }

  function internalVowel(value) {
    for (var i = 1; i < value.length; i++) {
      if (VOWELS.has(value[i])) return value[i];
    }
    return "X";
  }

  function effectiveGivenName(nombre) {
    var tokens = safeName(nombre).split(" ").filter(Boolean);
    if (!tokens.length) return "";
    if (tokens.length >= 2 && COMMON_FIRST_NAMES.has(tokens[0])) return tokens[1];
    return tokens[0];
  }

  function formatDate(dateInput) {
    var date = new Date(dateInput + "T00:00:00");
    if (Number.isNaN(date.getTime())) throw new Error("Invalid birth date.");
    if (date > new Date()) throw new Error("Birth date cannot be in the future.");
    var y = String(date.getFullYear()).slice(-2);
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return y + m + day;
  }

  function mapForHomoclave(fullName) {
    var allowed = cleanString(fullName).replace(/[^A-Z0-9Ñ& ]/g, "");
    var digits = allowed.split("").map(function (c) { return ANEXO_I_MAP[c] || "00"; }).join("");
    return "0" + digits;
  }

  function computeHomoclave(fullName) {
    var digitChain = mapForHomoclave(fullName);
    var sum = 0;
    for (var i = 0; i < digitChain.length - 1; i++) {
      sum += Number(digitChain[i] + digitChain[i + 1]) * Number(digitChain[i + 1]);
    }
    var residue = sum % 1000;
    return (HOMO_ALPHABET[Math.floor(residue / 34)] || "1") + (HOMO_ALPHABET[residue % 34] || "1");
  }

  function computeDv(rfc12) {
    var sum = 0;
    for (var j = 0; j < rfc12.length; j++) {
      sum += (ANEXO_III_MAP[rfc12[j]] || 0) * (13 - j);
    }
    var residue = sum % 11;
    if (residue === 0) return "0";
    var dv = 11 - residue;
    return dv === 10 ? "A" : String(dv);
  }

  function buildBase(apellidoPaterno, apellidoMaterno, nombre) {
    var patWord = firstSurnameWord(apellidoPaterno);
    var matWord = firstSurnameWord(apellidoMaterno);
    var given = effectiveGivenName(nombre);
    if (!patWord || !given) throw new Error("El apellido paterno y el nombre son obligatorios.");
    var base;
    if (!matWord) {
      base = twoLetters(patWord) + twoLetters(given);
    } else if (patWord.length <= 2) {
      base = firstLetter(patWord) + firstLetter(matWord) + firstLetter(given) + (given[1] || "X");
    } else {
      base = firstLetter(patWord) + internalVowel(patWord) + firstLetter(matWord) + firstLetter(given);
    }
    if (INCONVENIENT_WORDS.has(base)) base = base.slice(0, 3) + "X";
    return base;
  }

  function generateRfc(input) {
    var apellidoPaterno = safeName(input.apellidoPaterno);
    var apellidoMaterno = safeName(input.apellidoMaterno || "");
    var nombre = safeName(input.nombre);
    var fecha = formatDate(input.fechaNacimiento);
    var base = buildBase(input.apellidoPaterno, input.apellidoMaterno || "", input.nombre);
    var homoclave = computeHomoclave((apellidoPaterno + " " + apellidoMaterno + " " + nombre).trim());
    var rfc12 = base + fecha + homoclave;
    var dv = computeDv(rfc12);
    return { rfc: rfc12 + dv, base: base, fecha: fecha, homoclave: homoclave, dv: dv };
  }

  function validateForm(form) {
    var errors = {};
    if (!form.apellidoPaterno.trim()) errors.apellidoPaterno = "El primer apellido es obligatorio.";
    if (!form.nombre.trim()) errors.nombre = "Ingrese su(s) nombre(s).";
    if (!form.fechaNacimiento) {
      errors.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
    } else {
      var date = new Date(form.fechaNacimiento + "T00:00:00");
      if (Number.isNaN(date.getTime()) || date > new Date()) {
        errors.fechaNacimiento = "La fecha de nacimiento debe ser válida y no puede ser futura.";
      }
    }
    return errors;
  }

  function isFormValid(form) {
    return Object.keys(validateForm(form)).length === 0;
  }

  function buildShareMessage(result) {
    return "Mi RFC estimado es " + result.rfc + " (algoritmo público del SAT). Generado gratis en " + SITE_NAME + ": " + getSiteUrl();
  }

  function resolveJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    return null;
  }

  function downloadRfcPdf(form, result) {
    var JsPDF = resolveJsPDF();
    if (!JsPDF) return false;
    var doc = new JsPDF({ unit: "pt", format: "a4" });
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var margin = 48;
    var contentW = pageW - margin * 2;
    var emerald = [5, 150, 105];
    var slate = [17, 24, 39];
    var muted = [107, 114, 128];

    doc.setFillColor.apply(doc, emerald);
    doc.rect(0, 0, pageW, 72, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(SITE_NAME, margin, 44);

    var y = 104;
    doc.setTextColor.apply(doc, slate);
    doc.setFontSize(20);
    doc.text("Reporte de RFC estimado", margin, y);
    y += 24;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor.apply(doc, muted);
    doc.text("Generado el " + new Date().toLocaleDateString("es-MX", { dateStyle: "long" }), margin, y);

    y += 28;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, contentW, 112, "FD");
    var labelX = margin + 20;
    var innerY = y + 26;
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, muted);
    doc.text("APELLIDO PATERNO", labelX, innerY);
    doc.text("APELLIDO MATERNO", labelX + 220, innerY);
    innerY += 14;
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, slate);
    doc.setFont("helvetica", "bold");
    doc.text((form.apellidoPaterno || "—").toUpperCase(), labelX, innerY);
    doc.text((form.apellidoMaterno || "—").toUpperCase(), labelX + 220, innerY);
    innerY += 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, muted);
    doc.text("NOMBRE(S)", labelX, innerY);
    doc.text("FECHA DE NACIMIENTO", labelX + 220, innerY);
    innerY += 14;
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, slate);
    doc.setFont("helvetica", "bold");
    doc.text(form.nombre.toUpperCase(), labelX, innerY);
    doc.text(form.fechaNacimiento, labelX + 220, innerY);

    y += 132;
    doc.setFillColor.apply(doc, emerald);
    doc.rect(margin, y, contentW, 88, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RFC ESTIMADO (ALGORITMO PUBLICO DEL SAT)", margin + 24, y + 30);
    doc.setFontSize(28);
    doc.setFont("courier", "bold");
    doc.text(result.rfc, margin + 24, y + 64);

    y += 108;
    var breakdown = [
      ["Base (4 letras)", result.base],
      ["Fecha (AAMMDD)", result.fecha],
      ["Homoclave", result.homoclave],
      ["Digito verificador", result.dv],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    breakdown.forEach(function (row) {
      doc.setTextColor.apply(doc, muted);
      doc.text(row[0], margin, y);
      doc.setTextColor.apply(doc, slate);
      doc.setFont("courier", "bold");
      doc.text(row[1], margin + 200, y);
      doc.setFont("helvetica", "normal");
      y += 20;
    });

    y += 20;
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, muted);
    var disclaimer =
      "Documento informativo basado en la logica publica del SAT. No es emitido por el SAT ni sustituye el registro oficial.";
    doc.text(doc.splitTextToSize(disclaimer, contentW), margin, y);

    var footerTop = pageH - 56;
    doc.setFillColor(249, 250, 251);
    doc.rect(0, footerTop, pageW, 56, "F");
    doc.setDrawColor(229, 231, 235);
    doc.line(0, footerTop, pageW, footerTop);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, slate);
    doc.text(SITE_NAME, margin, footerTop + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text(SITE_URL, margin, footerTop + 38);

    doc.save("RFC-" + result.rfc + "-" + Date.now() + ".pdf");
    return true;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mount(root) {
    var state = {
      form: { apellidoPaterno: "", apellidoMaterno: "", nombre: "", fechaNacimiento: "" },
      errors: {},
      result: null,
      loading: false,
      shared: false,
      copied: false,
      pdfBusy: false,
    };

    function render() {
      var showResult = Boolean(state.result);
      var headerTitle = showResult ? COPY.resultTitle : COPY.cardTitle;
      var headerSub = showResult ? "" : '<p class="rfc-calculator__header-subtitle">' + esc(COPY.cardSubtitle) + "</p>";

      root.innerHTML =
        '<div class="rfc-calculator">' +
        '<header class="rfc-calculator__header">' +
        '<div class="rfc-calculator__header-left">' +
        '<span class="rfc-calculator__header-icon" aria-hidden="true"><i class="fa-solid fa-calculator"></i></span>' +
        '<div><p class="rfc-calculator__header-title">' + esc(headerTitle) + "</p>" + headerSub + "</div>" +
        "</div>" +
        '<span class="rfc-calculator__badge"><i class="fa-solid fa-bolt"></i> Gratis</span>' +
        "</header>" +
        '<div class="rfc-calculator__body">' +
        '<div class="rfc-calculator__view' + (showResult ? "" : " is-active") + '" data-view="form">' +
        renderForm() +
        "</div>" +
        '<div class="rfc-calculator__view' + (showResult ? " is-active" : "") + ' rfc-calculator__result" data-view="result">' +
        (showResult ? renderResult() : "") +
        "</div>" +
        "</div></div>";

      bindEvents();
    }

    function fieldHtml(key, label, type, placeholder) {
      var err = state.errors[key] || "";
      return (
        '<label class="rfc-calculator__field">' +
        '<span class="rfc-calculator__label">' + esc(label) + "</span>" +
        '<input class="rfc-calculator__input' + (err ? " is-error" : "") + '" type="' + type + '" name="' + key + '" value="' + esc(state.form[key]) + '" placeholder="' + esc(placeholder || "") + '" />' +
        '<span class="rfc-calculator__error" aria-live="polite">' + esc(err) + "</span>" +
        "</label>"
      );
    }

    function renderForm() {
      return (
        "<form data-form>" +
        fieldHtml("nombre", "Nombre(s)", "text", "Tu(s) nombre(s)") +
        fieldHtml("apellidoPaterno", "Primer apellido", "text", "Tu primer apellido") +
        fieldHtml("apellidoMaterno", "Segundo apellido (opcional)", "text", "Tu segundo apellido") +
        fieldHtml("fechaNacimiento", "Fecha de nacimiento", "date", "") +
        '<div class="rfc-calculator__actions">' +
        '<button type="submit" class="rfc-calculator__btn rfc-calculator__btn--primary" ' + (!isFormValid(state.form) || state.loading ? "disabled" : "") + ">" +
        (state.loading ? '<i class="fa-solid fa-spinner fa-spin"></i> ' + esc(COPY.submitLoadingLabel) : esc(COPY.submitLabel)) +
        "</button>" +
        '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-reset><i class="fa-solid fa-rotate-left"></i> Limpiar</button>' +
        "</div></form>"
      );
    }

    function renderResult() {
      var r = state.result;
      if (!r) return "";
      var shareMsg = buildShareMessage(r);
      var waUrl = "https://wa.me/?text=" + encodeURIComponent(shareMsg);
      return (
        '<p class="rfc-calculator__result-label">' + esc(COPY.resultTitle) + "</p>" +
        '<p class="rfc-calculator__result-rfc">' + esc(r.rfc) + "</p>" +
        '<div class="rfc-calculator__grid">' +
        [["Base", r.base], ["Fecha", r.fecha], ["Homoclave", r.homoclave], ["DV", r.dv]]
          .map(function (item) {
            return '<div class="rfc-calculator__grid-item"><p class="rfc-calculator__grid-label">' + esc(item[0]) + '</p><p class="rfc-calculator__grid-value">' + esc(item[1]) + "</p></div>";
          })
          .join("") +
        "</div>" +
        '<div class="rfc-calculator__result-actions">' +
        '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--primary" data-copy><i class="fa-solid fa-' + (state.copied ? "check" : "copy") + '"></i> ' + (state.copied ? "¡Copiado!" : "Copiar RFC") + "</button>" +
        '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-recalc><i class="fa-solid fa-pen"></i> Nuevo cálculo</button>' +
        "</div>" +
        '<p class="rfc-calculator__share-note">El SAT asigna la homoclave definitiva; valide registros oficiales en sat.gob.mx.</p>' +
        '<div class="rfc-calculator__share">' +
        '<div class="rfc-calculator__share-header">' +
        '<p class="rfc-calculator__share-title">Acciones gratuitas</p>' +
        '<span class="rfc-calculator__share-badge">Sin registro</span>' +
        "</div>" +
        '<div class="rfc-calculator__share-buttons">' +
        '<button type="button" class="rfc-calculator__share-btn" data-share><i class="fa-solid fa-' + (state.shared ? "check" : "share-nodes") + '"></i> ' + (state.shared ? "Enlace copiado" : "Compartir") + "</button>" +
        '<button type="button" class="rfc-calculator__share-btn" data-pdf' + (state.pdfBusy ? " disabled" : "") + "><i class=\"fa-solid fa-download\"></i> " + (state.pdfBusy ? "Preparando…" : "Descargar PDF") + "</button>" +
        '<a class="rfc-calculator__share-btn rfc-calculator__share-btn--whatsapp" href="' + waUrl + '" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' +
        "</div>" +
        "</div>"
      );
    }

    function bindEvents() {
      var formEl = root.querySelector("[data-form]");
      if (formEl) {
        formEl.addEventListener("submit", function (e) {
          e.preventDefault();
          state.errors = validateForm(state.form);
          if (Object.keys(state.errors).length) {
            render();
            return;
          }
          state.loading = true;
          render();
          try {
            state.result = generateRfc(state.form);
          } catch (err) {
            state.errors.form = err.message || "Error al calcular.";
          }
          state.loading = false;
          render();
        });
        formEl.querySelectorAll("input").forEach(function (input) {
          input.addEventListener("input", function (e) {
            state.form[e.target.name] = e.target.value;
            state.errors[e.target.name] = "";
            var submit = formEl.querySelector('[type="submit"]');
            if (submit) submit.disabled = !isFormValid(state.form) || state.loading;
          });
        });
      }

      var resetBtn = root.querySelector("[data-reset]");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          state.form = { apellidoPaterno: "", apellidoMaterno: "", nombre: "", fechaNacimiento: "" };
          state.errors = {};
          state.result = null;
          render();
        });
      }

      var recalc = root.querySelector("[data-recalc]");
      if (recalc) {
        recalc.addEventListener("click", function () {
          state.result = null;
          render();
        });
      }

      var copyBtn = root.querySelector("[data-copy]");
      if (copyBtn && state.result) {
        copyBtn.addEventListener("click", function () {
          navigator.clipboard.writeText(state.result.rfc).then(function () {
            state.copied = true;
            render();
            setTimeout(function () { state.copied = false; render(); }, 1200);
          });
        });
      }

      var shareBtn = root.querySelector("[data-share]");
      if (shareBtn && state.result) {
        shareBtn.addEventListener("click", function () {
          var msg = buildShareMessage(state.result);
          var payload = { title: SITE_NAME + " — RFC " + state.result.rfc, text: msg, url: getSiteUrl() };
          if (navigator.share) {
            navigator.share(payload).then(function () {
              state.shared = true;
              render();
              setTimeout(function () { state.shared = false; render(); }, 1500);
            }).catch(function () {
              navigator.clipboard.writeText(msg).then(toggleShared);
            });
          } else {
            navigator.clipboard.writeText(msg).then(toggleShared);
          }
          function toggleShared() {
            state.shared = true;
            render();
            setTimeout(function () { state.shared = false; render(); }, 1500);
          }
        });
      }

      var pdfBtn = root.querySelector("[data-pdf]");
      if (pdfBtn && state.result) {
        pdfBtn.addEventListener("click", function () {
          state.pdfBusy = true;
          render();
          try {
            downloadRfcPdf(state.form, state.result);
          } finally {
            state.pdfBusy = false;
            render();
          }
        });
      }
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById(ROOT_ID);
    if (root) mount(root);
  });
})();
