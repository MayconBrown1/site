(function () {
  "use strict";

  const LIMITS = Object.freeze({ experiences: 8, education: 8, courses: 12 });

  const repeatConfig = {
    experiences: {
      singular: "Experiência",
      fields: [
        ["company", "Empresa", "Ex.: Mercado Central", 120],
        ["role", "Cargo", "Ex.: Operador(a) de caixa", 120],
        ["period", "Período", "Ex.: janeiro/2022 a março/2024", 80],
        ["activities", "Principais atividades", "Conte brevemente o que fazia.", 1000, "textarea"]
      ]
    },
    education: {
      singular: "Formação",
      fields: [
        ["level", "Escolaridade", "Selecione", 120, "select", [
          "Sem escolaridade formal",
          "Ensino Fundamental Incompleto",
          "Ensino Fundamental Completo",
          "Ensino Médio Incompleto",
          "Ensino Médio Completo",
          "Curso Técnico Incompleto",
          "Curso Técnico Completo",
          "Ensino Superior Incompleto",
          "Ensino Superior Completo",
          "Pós-graduação Incompleta",
          "Pós-graduação Completa"
        ]],
        ["institution", "Instituição", "Ex.: Escola Estadual Central", 160],
        ["status", "Situação", "Ex.: Completo ou cursando", 60],
        ["period", "Ano ou período", "Ex.: Concluído em 2023", 80]
      ]
    },
    courses: {
      singular: "Curso",
      fields: [
        ["name", "Nome do curso", "Ex.: Informática básica", 160],
        ["institution", "Instituição", "Ex.: SENAC", 160],
        ["workload", "Carga horária", "Ex.: 40 horas", 40],
        ["year", "Ano", "Ex.: 2024", 20]
      ]
    }
  };

  function uniqueId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value == null ? "" : String(value);
  }

  function getValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value.trim();
  }

  function makeField(type, field, value) {
    const [key, labelText, placeholder, maxLength, control = "input", options = []] = field;
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const label = document.createElement("label");
    const id = `${type}-${key}-${uniqueId()}`;
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement(control);
    input.id = id;
    input.dataset.field = key;
    if (control === "select") {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = placeholder;
      input.append(empty);
      options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        input.append(option);
      });
      if (value && !options.includes(value)) {
        const custom = document.createElement("option");
        custom.value = value;
        custom.textContent = value;
        input.append(custom);
      }
      input.value = value || "";
    } else {
      input.placeholder = placeholder;
      input.maxLength = maxLength;
      input.value = value || "";
    }
    if (control === "textarea") input.rows = 3;
    wrapper.append(label, input);
    return wrapper;
  }

  function renumber(container) {
    const type = container.dataset.repeat;
    const label = repeatConfig[type].singular;
    [...container.children].forEach((item, index) => {
      item.querySelector(".repeat-item-title").textContent = `${label} ${index + 1}`;
      const remove = item.querySelector(".remove");
      remove.hidden = container.children.length === 1;
    });
  }

  function addRepeaterItem(container, type, data = {}) {
    if (!container || !repeatConfig[type]) return false;
    if (container.children.length >= LIMITS[type]) return false;
    const item = document.createElement("div");
    item.className = "repeat-item";
    const header = document.createElement("div");
    header.className = "repeat-item-header";
    const title = document.createElement("h3");
    title.className = "repeat-item-title";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button remove";
    remove.textContent = "Remover";
    remove.addEventListener("click", () => {
      item.remove();
      renumber(container);
      document.dispatchEvent(new CustomEvent("resume:change"));
    });
    header.append(title, remove);
    item.append(header);
    repeatConfig[type].fields.forEach((field) => item.append(makeField(type, field, data[field[0]])));
    container.append(item);
    renumber(container);
    return true;
  }

  function setupRepeaters() {
    document.querySelectorAll("[data-repeat]").forEach((container) => {
      const type = container.dataset.repeat;
      if (!container.children.length) addRepeaterItem(container, type);
    });
    document.querySelectorAll("[data-add-repeat]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.addRepeat;
        const container = document.querySelector(`[data-repeat="${type}"]`);
        if (!addRepeaterItem(container, type)) {
          button.setCustomValidity(`Limite de ${LIMITS[type]} itens atingido.`);
          button.reportValidity();
          setTimeout(() => button.setCustomValidity(""), 1500);
        }
      });
    });
  }

  function collectRepeater(type) {
    const container = document.querySelector(`[data-repeat="${type}"]`);
    if (!container) return [];
    return [...container.querySelectorAll(".repeat-item")]
      .map((item) => {
        const result = {};
        item.querySelectorAll("[data-field]").forEach((input) => { result[input.dataset.field] = input.value.trim(); });
        return result;
      })
      .filter((item) => Object.values(item).some(Boolean));
  }

  function replaceRepeater(type, values) {
    const container = document.querySelector(`[data-repeat="${type}"]`);
    if (!container) return;
    container.replaceChildren();
    const safeValues = Array.isArray(values) && values.length ? values.slice(0, LIMITS[type]) : [{}];
    safeValues.forEach((value) => addRepeaterItem(container, type, value));
  }

  function collectData() {
    return {
      schemaVersion: 1,
      status: "novo",
      personal: {
        name: getValue("name"),
        phone: getValue("phone"),
        email: getValue("email"),
        birthDate: getValue("birthDate"),
        maritalStatus: getValue("maritalStatus")
      },
      address: {
        street: getValue("street"),
        number: getValue("number"),
        neighborhood: getValue("neighborhood"),
        city: getValue("city"),
        state: getValue("state")
      },
      objective: getValue("objective"),
      summary: getValue("summary"),
      firstJob: Boolean(getValue("firstJob")),
      experiences: getValue("firstJob") ? [] : collectRepeater("experiences"),
      education: collectRepeater("education"),
      courses: collectRepeater("courses"),
      skills: getValue("skills"),
      languages: getValue("languages"),
      cnh: getValue("cnh"),
      availability: getValue("availability"),
      consent: true,
      source: "formulario_publico",
      previewId: ""
    };
  }

  function fillData(data) {
    const personal = data.personal || {};
    const address = data.address || {};
    setValue("name", personal.name);
    setValue("phone", personal.phone);
    setValue("email", personal.email);
    setValue("birthDate", personal.birthDate);
    setValue("maritalStatus", personal.maritalStatus);
    setValue("street", address.street);
    setValue("number", address.number);
    setValue("neighborhood", address.neighborhood);
    setValue("city", address.city);
    setValue("state", address.state);
    setValue("objective", data.objective);
    setValue("summary", data.summary);
    setValue("firstJob", data.firstJob);
    setValue("skills", data.skills);
    setValue("languages", data.languages);
    setValue("cnh", data.cnh);
    setValue("availability", data.availability);
    replaceRepeater("experiences", data.experiences);
    replaceRepeater("education", data.education);
    replaceRepeater("courses", data.courses);
    toggleFirstJob();
    document.dispatchEvent(new CustomEvent("resume:change"));
  }

  function toggleFirstJob() {
    const checked = Boolean(getValue("firstJob"));
    const block = document.getElementById("experiencesBlock");
    if (block) block.hidden = checked;
  }

  function nonEmptyParts(parts, separator) { return parts.filter(Boolean).join(separator); }

  function formatAddress(data) {
    const a = data.address || {};
    const first = nonEmptyParts([a.street, a.number], ", ");
    const second = nonEmptyParts([a.neighborhood, a.city, a.state], " - ");
    return nonEmptyParts([first, second], " | ");
  }

  function setText(id, value, fallback = "") {
    const el = document.getElementById(id);
    if (el) el.textContent = value || fallback;
  }

  function renderEntries(containerId, entries, formatter) {
    const container = document.getElementById(containerId);
    const section = container?.closest(".preview-section");
    if (!container || !section) return;
    container.replaceChildren();
    const filtered = Array.isArray(entries) ? entries : [];
    section.hidden = filtered.length === 0;
    filtered.forEach((entry) => {
      const node = document.createElement("div");
      node.className = "preview-entry";
      const formatted = formatter(entry);
      const strong = document.createElement("strong");
      strong.textContent = formatted.title;
      node.append(strong);
      if (formatted.meta) {
        const meta = document.createElement("small");
        meta.textContent = formatted.meta;
        node.append(meta);
      }
      if (formatted.body) {
        const body = document.createElement("p");
        body.textContent = formatted.body;
        node.append(body);
      }
      container.append(node);
    });
  }

  function renderPreview(data, photoUrl) {
    setText("previewName", data.personal?.name, "NOME COMPLETO");
    setText("previewObjective", data.objective, "Objetivo profissional");
    setText("previewContact", nonEmptyParts([data.personal?.phone, data.personal?.email, formatAddress(data)], " | "));
    setText("previewSummary", data.summary);
    setText("previewSkills", data.skills);
    setText("previewLanguages", data.languages);
    setText("previewExtra", nonEmptyParts([
      data.cnh ? `CNH: ${data.cnh}` : "",
      data.availability ? `Disponibilidade: ${data.availability}` : ""
    ], " | "));
    const summarySection = document.getElementById("previewSummary")?.closest(".preview-section");
    if (summarySection) summarySection.hidden = !data.summary;
    const skillsSection = document.getElementById("previewSkills")?.closest(".preview-section");
    if (skillsSection) skillsSection.hidden = !data.skills;
    const languagesSection = document.getElementById("previewLanguages")?.closest(".preview-section");
    if (languagesSection) languagesSection.hidden = !data.languages;
    const extraSection = document.getElementById("previewExtra")?.closest(".preview-section");
    if (extraSection) extraSection.hidden = !(data.cnh || data.availability);
    renderEntries("previewExperiences", data.firstJob ? [{ company: "Primeiro emprego", role: "", period: "", activities: "Em busca da primeira oportunidade profissional." }] : data.experiences, (e) => ({
      title: nonEmptyParts([e.role, e.company], " — ") || "Experiência profissional",
      meta: e.period,
      body: e.activities
    }));
    renderEntries("previewEducation", data.education, (e) => ({
      title: nonEmptyParts([e.level, e.institution], " — ") || "Formação",
      meta: nonEmptyParts([e.status, e.period], " | ")
    }));
    renderEntries("previewCourses", data.courses, (e) => ({
      title: nonEmptyParts([e.name, e.institution], " — ") || "Curso",
      meta: nonEmptyParts([e.workload, e.year], " | ")
    }));
    const photo = document.getElementById("previewPhoto");
    if (photo) {
      photo.hidden = !photoUrl;
      if (photoUrl) photo.src = photoUrl;
    }
  }

  function setupFirstJob() {
    const checkbox = document.getElementById("firstJob");
    if (!checkbox) return;
    checkbox.addEventListener("change", () => {
      toggleFirstJob();
      document.dispatchEvent(new CustomEvent("resume:change"));
    });
    toggleFirstJob();
  }

  function resetDynamicFields() {
    replaceRepeater("experiences", []);
    replaceRepeater("education", []);
    replaceRepeater("courses", []);
    toggleFirstJob();
  }

  window.ResumeForms = Object.freeze({
    LIMITS,
    setupRepeaters,
    setupFirstJob,
    collectData,
    fillData,
    renderPreview,
    resetDynamicFields,
    formatAddress,
    nonEmptyParts
  });
})();
