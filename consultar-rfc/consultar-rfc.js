(function () {
  "use strict";

  var ROOT_ID = "consultar-rfc-calculator";
  var SITE_NAME = "RFC Generator Mexico";
  var SITE_URL = "https://icalcularrfc.mx";

  var COPY_DATOS = {
    cardTitle: "Consultar RFC",
    cardSubtitle: "Verifique y valide su identificación fiscal",
    resultTitle: "Resultado de consulta",
    submitLabel: "Consultar RFC",
    submitLoadingLabel: "Consultando…",
  };

  var TABS = [
    { id: "datos", label: "Por datos personales", icon: "fa-user" },
    { id: "validar", label: "Validar RFC", icon: "fa-shield-halved" },
    { id: "curp", label: "Por CURP", icon: "fa-magnifying-glass" },
  ];

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

  var RFC_FISICA_RE = /^[A-ZÑ&]{4}\d{6}[0-9A-Z]{3}$/;
  var RFC_MORAL_RE = /^[A-ZÑ&]{3}\d{6}[0-9A-Z]{3}$/;
  var CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;

  function normalizeRfc(value) {
    return value
      .trim()
      .toUpperCase()
      .replace(/Ñ/g, "__ENYE__")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/__ENYE__/g, "Ñ")
      .replace(/[^A-ZÑ&0-9]/g, "");
  }

  function computeDvValidate(rfcBody) {
    var sum = 0;
    for (var i = 0; i < rfcBody.length; i++) {
      sum += (ANEXO_III_MAP[rfcBody[i]] || 0) * (rfcBody.length + 1 - i);
    }
    var residue = sum % 11;
    if (residue === 0) return "0";
    var dv = 11 - residue;
    return dv === 10 ? "A" : String(dv);
  }

  function isValidDateSegment(fecha) {
    if (!/^\d{6}$/.test(fecha)) return false;
    var yy = Number(fecha.slice(0, 2));
    var mm = Number(fecha.slice(2, 4));
    var dd = Number(fecha.slice(4, 6));
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
    var year = yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy;
    var date = new Date(year + "-" + fecha.slice(2, 4) + "-" + fecha.slice(4, 6) + "T00:00:00");
    return !Number.isNaN(date.getTime());
  }

  function validateRfc(input) {
    var errors = [];
    var normalized = normalizeRfc(input);
    if (!normalized) {
      return { valid: false, normalized: "", personType: null, base: "", fecha: "", homoclave: "", dv: "", errors: ["Ingrese un RFC para validar."] };
    }
    var personType = null;
    if (RFC_FISICA_RE.test(normalized)) personType = "fisica";
    else if (RFC_MORAL_RE.test(normalized)) personType = "moral";
    else {
      if (normalized.length < 12) errors.push("El RFC debe tener 12 o 13 caracteres.");
      else if (normalized.length > 13) errors.push("El RFC no puede tener más de 13 caracteres.");
      else errors.push("El formato del RFC no es válido (revise letras, números y longitud).");
      return { valid: false, normalized: normalized, personType: null, base: "", fecha: "", homoclave: "", dv: "", errors: errors };
    }
    var base = personType === "fisica" ? normalized.slice(0, 4) : normalized.slice(0, 3);
    var fecha = normalized.slice(personType === "fisica" ? 4 : 3, personType === "fisica" ? 10 : 9);
    var homoclave = normalized.slice(personType === "fisica" ? 10 : 9, personType === "fisica" ? 12 : 11);
    var dv = normalized.slice(-1);
    var body = normalized.slice(0, -1);
    if (!isValidDateSegment(fecha)) errors.push("El segmento de fecha (AAMMDD) no es válido.");
    var expectedDv = computeDvValidate(body);
    if (dv !== expectedDv) errors.push("El dígito verificador no coincide (esperado: " + expectedDv + ").");
    return { valid: errors.length === 0, normalized: normalized, personType: personType, base: base, fecha: fecha, homoclave: homoclave, dv: dv, errors: errors };
  }

  function normalizeCurp(value) {
    return value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function curpYearToFull(yy) {
    return yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  }

  function parseCurp(input) {
    var normalized = normalizeCurp(input);
    var errors = [];
    if (!normalized) {
      return { valid: false, normalized: "", rfcBase: "", fechaNacimiento: "", sexo: "", entidad: "", errors: ["Ingrese su CURP de 18 caracteres."] };
    }
    if (normalized.length !== 18) errors.push("La CURP debe tener exactamente 18 caracteres.");
    if (!CURP_RE.test(normalized)) errors.push("El formato de la CURP no es válido.");
    if (errors.length) {
      return { valid: false, normalized: normalized, rfcBase: "", fechaNacimiento: "", sexo: "", entidad: "", errors: errors };
    }
    var rfcBase = normalized.slice(0, 10);
    var yy = Number(normalized.slice(4, 6));
    var mm = normalized.slice(6, 8);
    var dd = normalized.slice(8, 10);
    var year = curpYearToFull(yy);
    var fechaNacimiento = year + "-" + mm + "-" + dd;
    var date = new Date(fechaNacimiento + "T00:00:00");
    if (Number.isNaN(date.getTime()) || date > new Date()) {
      errors.push("La fecha de nacimiento en la CURP no es válida.");
    }
    return {
      valid: errors.length === 0,
      normalized: normalized,
      rfcBase: rfcBase,
      fechaNacimiento: fechaNacimiento,
      sexo: normalized[10],
      entidad: normalized.slice(11, 13),
      errors: errors,
    };
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

  function renderShareBlock(result, form, uiState) {
    var shareMsg = buildShareMessage(result);
    var waUrl = "https://wa.me/?text=" + encodeURIComponent(shareMsg);
    return (
      '<div class="rfc-calculator__share">' +
      '<div class="rfc-calculator__share-header">' +
      '<p class="rfc-calculator__share-title">Acciones gratuitas</p>' +
      '<span class="rfc-calculator__share-badge">Sin registro</span>' +
      "</div>" +
      '<div class="rfc-calculator__share-buttons">' +
      '<button type="button" class="rfc-calculator__share-btn" data-share><i class="fa-solid fa-' + (uiState.shared ? "check" : "share-nodes") + '"></i> ' + (uiState.shared ? "Enlace copiado" : "Compartir") + "</button>" +
      '<button type="button" class="rfc-calculator__share-btn" data-pdf' + (uiState.pdfBusy ? " disabled" : "") + "><i class=\"fa-solid fa-download\"></i> " + (uiState.pdfBusy ? "Preparando…" : "Descargar PDF") + "</button>" +
      '<a class="rfc-calculator__share-btn rfc-calculator__share-btn--whatsapp" href="' + waUrl + '" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' +
      "</div>" +
      "</div>"
    );
  }

  function renderBreakdownGrid(items) {
    return (
      '<div class="rfc-calculator__grid">' +
      items.map(function (item) {
        return '<div class="rfc-calculator__grid-item"><p class="rfc-calculator__grid-label">' + esc(item[0]) + '</p><p class="rfc-calculator__grid-value">' + esc(item[1]) + "</p></div>";
      }).join("") +
      "</div>"
    );
  }

  function mount(root) {
    var state = {
      tab: "datos",
      form: { apellidoPaterno: "", apellidoMaterno: "", nombre: "", fechaNacimiento: "" },
      errors: {},
      result: null,
      loading: false,
      shared: false,
      copied: false,
      pdfBusy: false,
      validateInput: "",
      validateResult: null,
      validateLoading: false,
      validateCopied: false,
      curp: "",
      curpNombre: "",
      curpApPat: "",
      curpApMat: "",
      curpInfo: null,
      curpResult: null,
      curpErrors: {},
      curpLoading: false,
      curpCopied: false,
    };

    function render() {
      root.innerHTML =
        '<div class="rfc-calculator rfc-calculator--consultar">' +
        '<header class="rfc-calculator__header">' +
        '<div class="rfc-calculator__header-left">' +
        '<span class="rfc-calculator__header-icon" aria-hidden="true"><i class="fa-solid fa-calculator"></i></span>' +
        '<div><p class="rfc-calculator__header-title">Consultar RFC</p>' +
        '<p class="rfc-calculator__header-subtitle">Datos personales, validación o CURP</p></div>' +
        "</div>" +
        '<span class="rfc-calculator__badge"><i class="fa-solid fa-bolt"></i> Gratis</span>' +
        "</header>" +
        '<div class="rfc-calculator__body">' +
        '<div class="rfc-calculator__tabs" role="tablist">' +
        TABS.map(function (t) {
          return '<button type="button" class="rfc-calculator__tab' + (state.tab === t.id ? " is-active" : "") + '" role="tab" data-tab="' + t.id + '" aria-selected="' + (state.tab === t.id) + '"><i class="fa-solid ' + t.icon + '"></i> ' + esc(t.label) + "</button>";
        }).join("") +
        "</div>" +
        '<div class="rfc-calculator__panel' + (state.tab === "datos" ? " is-active" : "") + '" data-panel="datos">' + renderDatosPanel() + "</div>" +
        '<div class="rfc-calculator__panel' + (state.tab === "validar" ? " is-active" : "") + '" data-panel="validar">' + renderValidarPanel() + "</div>" +
        '<div class="rfc-calculator__panel' + (state.tab === "curp" ? " is-active" : "") + '" data-panel="curp">' + renderCurpPanel() + "</div>" +
        '<p class="rfc-calculator__footer-note">Estimación informativa con algoritmo público del SAT. Para RFC oficial use <a href="https://wwwmat.sat.gob.mx/aplicacion/29073/verifica-si-estas-registrado-en-el-rfc" target="_blank" rel="noopener noreferrer">el portal del SAT</a>.</p>' +
        "</div></div>";
      bindEvents();
    }

    function fieldHtml(key, label, type, placeholder, value, err) {
      return (
        '<label class="rfc-calculator__field">' +
        '<span class="rfc-calculator__label">' + esc(label) + "</span>" +
        '<input class="rfc-calculator__input' + (err ? " is-error" : "") + '" type="' + type + '" name="' + key + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '" />' +
        '<span class="rfc-calculator__error" aria-live="polite">' + esc(err || "") + "</span>" +
        "</label>"
      );
    }

    function renderDatosPanel() {
      if (state.result) {
        var r = state.result;
        return (
          '<div class="rfc-calculator__result rfc-calculator__result--valid">' +
          '<p class="rfc-calculator__result-label">' + esc(COPY_DATOS.resultTitle) + "</p>" +
          '<p class="rfc-calculator__result-rfc">' + esc(r.rfc) + "</p>" +
          renderBreakdownGrid([["Base", r.base], ["Fecha", r.fecha], ["Homoclave", r.homoclave], ["DV", r.dv]]) +
          '<div class="rfc-calculator__result-actions">' +
          '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--primary" data-datos-copy><i class="fa-solid fa-' + (state.copied ? "check" : "copy") + '"></i> ' + (state.copied ? "¡Copiado!" : "Copiar RFC") + "</button>" +
          '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-datos-recalc><i class="fa-solid fa-pen"></i> Nuevo cálculo</button>' +
          "</div>" +
          '<p class="rfc-calculator__share-note">El SAT asigna la homoclave definitiva; valide registros oficiales en sat.gob.mx.</p>' +
          renderShareBlock(r, state.form, state) +
          "</div>"
        );
      }
      return (
        "<form data-datos-form>" +
        fieldHtml("nombre", "Nombre(s)", "text", "Tu(s) nombre(s)", state.form.nombre, state.errors.nombre) +
        fieldHtml("apellidoPaterno", "Primer apellido", "text", "Tu primer apellido", state.form.apellidoPaterno, state.errors.apellidoPaterno) +
        fieldHtml("apellidoMaterno", "Segundo apellido (opcional)", "text", "Tu segundo apellido", state.form.apellidoMaterno, state.errors.apellidoMaterno) +
        fieldHtml("fechaNacimiento", "Fecha de nacimiento", "date", "", state.form.fechaNacimiento, state.errors.fechaNacimiento) +
        '<div class="rfc-calculator__actions">' +
        '<button type="submit" class="rfc-calculator__btn rfc-calculator__btn--primary" ' + (!isFormValid(state.form) || state.loading ? "disabled" : "") + ">" +
        (state.loading ? '<i class="fa-solid fa-spinner fa-spin"></i> ' + esc(COPY_DATOS.submitLoadingLabel) : esc(COPY_DATOS.submitLabel)) +
        "</button>" +
        '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-datos-reset><i class="fa-solid fa-rotate-left"></i> Limpiar</button>' +
        "</div></form>"
      );
    }

    function renderValidarPanel() {
      if (state.validateResult) {
        var vr = state.validateResult;
        return (
          '<div class="rfc-calculator__result ' + (vr.valid ? "rfc-calculator__result--valid" : "rfc-calculator__result--invalid") + '">' +
          '<p class="rfc-calculator__status ' + (vr.valid ? "rfc-calculator__status--ok" : "rfc-calculator__status--error") + '">' +
          (vr.valid ? "RFC con formato válido" : "RFC con errores de formato") +
          "</p>" +
          (vr.normalized ? '<p class="rfc-calculator__result-rfc">' + esc(vr.normalized) + "</p>" : "") +
          (vr.personType ? '<p class="rfc-calculator__hint">Tipo: <strong>' + (vr.personType === "fisica" ? "Persona física" : "Persona moral") + "</strong></p>" : "") +
          (vr.valid ? renderBreakdownGrid([["Base", vr.base], ["Fecha", vr.fecha], ["Homoclave", vr.homoclave], ["DV", vr.dv]]) : "") +
          (vr.errors.length ? '<ul class="rfc-calculator__error-list">' + vr.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
          (vr.valid
            ? '<div class="rfc-calculator__result-actions"><button type="button" class="rfc-calculator__btn rfc-calculator__btn--primary" data-validate-copy><i class="fa-solid fa-' + (state.validateCopied ? "check" : "copy") + '"></i> ' + (state.validateCopied ? "¡Copiado!" : "Copiar RFC") + '</button><button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-validate-recalc><i class="fa-solid fa-pen"></i> Validar otro</button></div>'
            : '<div class="rfc-calculator__result-actions"><button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-validate-recalc><i class="fa-solid fa-pen"></i> Intentar de nuevo</button></div>') +
          "</div>"
        );
      }
      return (
        "<form data-validate-form>" +
        '<label class="rfc-calculator__field">' +
        '<span class="rfc-calculator__label">RFC a validar</span>' +
        '<input class="rfc-calculator__input rfc-calculator__input--mono" name="validateInput" value="' + esc(state.validateInput) + '" placeholder="Ej: GALJ900115I76" maxlength="13" />' +
        "</label>" +
        '<p class="rfc-calculator__hint">Persona física: 13 caracteres. Persona moral: 12 caracteres. No consulta el padrón del SAT.</p>' +
        '<div class="rfc-calculator__actions">' +
        '<button type="submit" class="rfc-calculator__btn rfc-calculator__btn--primary" ' + (!state.validateInput.trim() || state.validateLoading ? "disabled" : "") + ">" +
        (state.validateLoading ? '<i class="fa-solid fa-spinner fa-spin"></i> Validando…' : "Validar RFC") +
        "</button></div></form>"
      );
    }

    function renderCurpPanel() {
      if (state.curpResult) {
        var cr = state.curpResult;
        var ci = state.curpInfo;
        var match = ci && ci.rfcBase === cr.base + cr.fecha;
        return (
          '<div class="rfc-calculator__result rfc-calculator__result--valid">' +
          '<p class="rfc-calculator__result-label">RFC estimado</p>' +
          '<p class="rfc-calculator__result-rfc">' + esc(cr.rfc) + "</p>" +
          '<p class="rfc-calculator__notice' + (match ? " rfc-calculator__notice--ok" : "") + '">' +
          (match
            ? "La base coincide con los primeros 10 caracteres de su CURP."
            : "La base de su CURP (" + esc(ci ? ci.rfcBase : "") + ") no coincide con el nombre ingresado. Verifique la ortografía.") +
          "</p>" +
          renderBreakdownGrid([["Base", cr.base], ["Fecha", cr.fecha], ["Homoclave", cr.homoclave], ["DV", cr.dv]]) +
          '<div class="rfc-calculator__result-actions">' +
          '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--primary" data-curp-copy><i class="fa-solid fa-' + (state.curpCopied ? "check" : "copy") + '"></i> ' + (state.curpCopied ? "¡Copiado!" : "Copiar RFC") + "</button>" +
          '<button type="button" class="rfc-calculator__btn rfc-calculator__btn--secondary" data-curp-recalc><i class="fa-solid fa-pen"></i> Nueva consulta</button>' +
          "</div></div>"
        );
      }
      var curpErrorsHtml = "";
      if (state.curpInfo && !state.curpInfo.valid) {
        curpErrorsHtml = '<ul class="rfc-calculator__error-list">' + state.curpInfo.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>";
      }
      var curpInfoHtml = "";
      if (state.curpInfo && state.curpInfo.valid) {
        curpInfoHtml =
          '<div class="rfc-calculator__curp-info">' +
          "<p>Base RFC desde CURP: <strong class=\"rfc-calculator__grid-value\">" + esc(state.curpInfo.rfcBase) + "</strong></p>" +
          "<p>Fecha detectada: <strong>" + esc(state.curpInfo.fechaNacimiento) + "</strong> · Sexo: <strong>" + (state.curpInfo.sexo === "H" ? "Hombre" : "Mujer") + "</strong></p>" +
          "</div>";
      }
      var curpForm = {
        apellidoPaterno: state.curpApPat,
        apellidoMaterno: state.curpApMat,
        nombre: state.curpNombre,
        fechaNacimiento: state.curpInfo && state.curpInfo.valid ? state.curpInfo.fechaNacimiento : "",
      };
      var canSubmit = state.curpInfo && state.curpInfo.valid && isFormValid(curpForm);
      return (
        "<form data-curp-form>" +
        '<label class="rfc-calculator__field">' +
        '<span class="rfc-calculator__label">CURP (18 caracteres)</span>' +
        '<input class="rfc-calculator__input rfc-calculator__input--mono" name="curp" value="' + esc(state.curp) + '" placeholder="Ej: GARL900115HDFRNN09" maxlength="18" />' +
        curpErrorsHtml +
        "</label>" +
        curpInfoHtml +
        '<p class="rfc-calculator__hint">La homoclave requiere su nombre completo (la CURP no lo almacena). Ingrese los mismos datos de su acta de nacimiento.</p>' +
        fieldHtml("curpNombre", "Nombre(s)", "text", "Tu(s) nombre(s)", state.curpNombre, state.curpErrors.nombre) +
        fieldHtml("curpApPat", "Primer apellido", "text", "Tu primer apellido", state.curpApPat, state.curpErrors.apellidoPaterno) +
        fieldHtml("curpApMat", "Segundo apellido (opcional)", "text", "Tu segundo apellido", state.curpApMat, state.curpErrors.apellidoMaterno) +
        '<div class="rfc-calculator__actions">' +
        '<button type="submit" class="rfc-calculator__btn rfc-calculator__btn--primary" ' + (!canSubmit || state.curpLoading ? "disabled" : "") + ">" +
        (state.curpLoading ? '<i class="fa-solid fa-spinner fa-spin"></i> Consultando…' : "Consultar RFC con CURP") +
        "</button></div></form>"
      );
    }

    function bindEvents() {
      root.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.tab = btn.getAttribute("data-tab");
          render();
        });
      });

      var datosForm = root.querySelector("[data-datos-form]");
      if (datosForm) {
        datosForm.addEventListener("submit", function (e) {
          e.preventDefault();
          state.errors = validateForm(state.form);
          if (Object.keys(state.errors).length) { render(); return; }
          state.loading = true;
          render();
          try { state.result = generateRfc(state.form); } catch (err) { state.errors.form = err.message || "Error"; }
          state.loading = false;
          render();
        });
        datosForm.querySelectorAll("input").forEach(function (input) {
          input.addEventListener("input", function (e) {
            state.form[e.target.name] = e.target.value;
            state.errors[e.target.name] = "";
          });
        });
      }

      var datosReset = root.querySelector("[data-datos-reset]");
      if (datosReset) {
        datosReset.addEventListener("click", function () {
          state.form = { apellidoPaterno: "", apellidoMaterno: "", nombre: "", fechaNacimiento: "" };
          state.errors = {};
          state.result = null;
          render();
        });
      }

      var datosRecalc = root.querySelector("[data-datos-recalc]");
      if (datosRecalc) {
        datosRecalc.addEventListener("click", function () { state.result = null; render(); });
      }

      var datosCopy = root.querySelector("[data-datos-copy]");
      if (datosCopy && state.result) {
        datosCopy.addEventListener("click", function () {
          navigator.clipboard.writeText(state.result.rfc).then(function () {
            state.copied = true; render();
            setTimeout(function () { state.copied = false; render(); }, 1200);
          });
        });
      }

      bindSharePdf("[data-share]", "[data-pdf]", state.result, state.form, state);

      var validateFormEl = root.querySelector("[data-validate-form]");
      if (validateFormEl) {
        validateFormEl.addEventListener("submit", function (e) {
          e.preventDefault();
          state.validateLoading = true;
          render();
          state.validateResult = validateRfc(state.validateInput);
          state.validateLoading = false;
          render();
        });
        var validateInput = validateFormEl.querySelector("[name=validateInput]");
        if (validateInput) {
          validateInput.addEventListener("input", function (e) {
            state.validateInput = e.target.value.toUpperCase();
            e.target.value = state.validateInput;
          });
        }
      }

      var validateRecalc = root.querySelector("[data-validate-recalc]");
      if (validateRecalc) {
        validateRecalc.addEventListener("click", function () {
          state.validateResult = null;
          state.validateInput = "";
          render();
        });
      }

      var validateCopy = root.querySelector("[data-validate-copy]");
      if (validateCopy && state.validateResult && state.validateResult.valid) {
        validateCopy.addEventListener("click", function () {
          navigator.clipboard.writeText(state.validateResult.normalized).then(function () {
            state.validateCopied = true; render();
            setTimeout(function () { state.validateCopied = false; render(); }, 1200);
          });
        });
      }

      var curpFormEl = root.querySelector("[data-curp-form]");
      if (curpFormEl) {
        var curpInput = curpFormEl.querySelector("[name=curp]");
        if (curpInput) {
          curpInput.addEventListener("input", function (e) {
            state.curp = e.target.value.toUpperCase();
            e.target.value = state.curp;
            state.curpInfo = null;
            state.curpResult = null;
          });
          curpInput.addEventListener("blur", function () {
            if (!state.curp.trim()) { state.curpInfo = null; render(); return; }
            state.curpInfo = parseCurp(state.curp);
            render();
          });
        }
        curpFormEl.querySelectorAll("[name=curpNombre],[name=curpApPat],[name=curpApMat]").forEach(function (input) {
          input.addEventListener("input", function (e) {
            if (e.target.name === "curpNombre") state.curpNombre = e.target.value;
            if (e.target.name === "curpApPat") state.curpApPat = e.target.value;
            if (e.target.name === "curpApMat") state.curpApMat = e.target.value;
            state.curpErrors[e.target.name === "curpNombre" ? "nombre" : e.target.name === "curpApPat" ? "apellidoPaterno" : "apellidoMaterno"] = "";
          });
        });
        curpFormEl.addEventListener("submit", function (e) {
          e.preventDefault();
          var parsedCurp = parseCurp(state.curp);
          state.curpInfo = parsedCurp;
          if (!parsedCurp.valid) { render(); return; }
          var form = {
            nombre: state.curpNombre,
            apellidoPaterno: state.curpApPat,
            apellidoMaterno: state.curpApMat,
            fechaNacimiento: parsedCurp.fechaNacimiento,
          };
          state.curpErrors = validateForm(form);
          if (Object.keys(state.curpErrors).length) { render(); return; }
          state.curpLoading = true;
          render();
          state.curpResult = generateRfc(form);
          state.curpLoading = false;
          render();
        });
      }

      var curpRecalc = root.querySelector("[data-curp-recalc]");
      if (curpRecalc) {
        curpRecalc.addEventListener("click", function () {
          state.curpResult = null;
          render();
        });
      }

      var curpCopy = root.querySelector("[data-curp-copy]");
      if (curpCopy && state.curpResult) {
        curpCopy.addEventListener("click", function () {
          navigator.clipboard.writeText(state.curpResult.rfc).then(function () {
            state.curpCopied = true; render();
            setTimeout(function () { state.curpCopied = false; render(); }, 1200);
          });
        });
      }
    }

    function bindSharePdf(shareSel, pdfSel, result, form, uiState) {
      var shareBtn = root.querySelector(shareSel);
      if (shareBtn && result) {
        shareBtn.addEventListener("click", function () {
          var msg = buildShareMessage(result);
          var payload = { title: SITE_NAME + " — RFC " + result.rfc, text: msg, url: getSiteUrl() };
          function done() {
            uiState.shared = true; render();
            setTimeout(function () { uiState.shared = false; render(); }, 1500);
          }
          if (navigator.share) {
            navigator.share(payload).then(done).catch(function () { navigator.clipboard.writeText(msg).then(done); });
          } else {
            navigator.clipboard.writeText(msg).then(done);
          }
        });
      }
      var pdfBtn = root.querySelector(pdfSel);
      if (pdfBtn && result) {
        pdfBtn.addEventListener("click", function () {
          uiState.pdfBusy = true; render();
          try { downloadRfcPdf(form, result); } finally { uiState.pdfBusy = false; render(); }
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
