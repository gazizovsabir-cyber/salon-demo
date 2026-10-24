(function () {
  "use strict";

  var config = window.SITE_CONFIG || {};
  var presets = window.SITE_PRESETS || {};
  var demo = !!config.demoMode;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  // Текст с переносами строк "\n" → <br> без innerHTML.
  function setText(node, value) {
    node.textContent = "";
    String(value).split("\n").forEach(function (line, i) {
      if (i) node.appendChild(document.createElement("br"));
      node.appendChild(document.createTextNode(line));
    });
  }

  /* ---------- Тип бизнеса ---------- */

  function resolveType() {
    var fromUrl = demo ? new URLSearchParams(location.search).get("type") : null;
    if (fromUrl && presets[fromUrl]) return fromUrl;
    return presets[config.businessType] ? config.businessType : "universal";
  }

  var type = resolveType();
  var preset = presets[type] || {};
  var brand = config.brand || {};
  var hero = config.hero || {};
  var about = config.about || {};
  var contacts = config.contacts || {};
  var formConfig = config.form || {};
  var sections = config.sections || {};

  var content = {
    "brand.name": brand.name || "Название студии",
    "hero.label": hero.label || preset.label || "",
    "hero.title": hero.title || preset.title || "",
    "hero.subtitle": hero.subtitle || preset.subtitle || "",
    "about.title": about.title || "",
    "about.text": about.text || "",
  };

  var services = (Array.isArray(config.services) ? config.services : preset.services || [])
    .filter(function (s) { return s && s.enabled !== false; });

  /* ---------- Тексты, цвета, изображения ---------- */

  function applyContent() {
    $$("[data-c]").forEach(function (node) {
      var value = content[node.getAttribute("data-c")];
      if (value) setText(node, value);
    });

    if (config.accent) document.documentElement.style.setProperty("--accent", config.accent);

    if (brand.logo) {
      var logoLink = $("[data-brand-logo]");
      logoLink.textContent = "";
      var img = el("img");
      img.src = brand.logo;
      img.alt = content["brand.name"];
      logoLink.appendChild(img);
    }

    var images = { "hero.image": hero.image, "about.image": about.image };
    $$("[data-img]").forEach(function (img) {
      var data = images[img.getAttribute("data-img")];
      if (data && data.src) {
        img.src = data.src;
        img.alt = data.alt || "";
      }
    });

    // Отдельная вертикальная версия фото для телефонов; без неё телефон берёт основное фото.
    $$("[data-img-mobile]").forEach(function (source) {
      var data = images[source.getAttribute("data-img-mobile")];
      if (data && data.srcMobile) source.srcset = data.srcMobile;
      else source.remove();
    });

    // Подпись «фото для примера» — только в демо-режиме и только у стоковых фото.
    $$("[data-credit]").forEach(function (link) {
      var data = images[link.getAttribute("data-credit")];
      if (demo && data && data.credit) {
        link.textContent = "Фото для примера · " + data.credit.replace(/^Фото:\s*/, "");
        link.href = data.creditUrl || "#";
      } else {
        link.remove();
      }
    });

    document.title = content["brand.name"] + " — " + (preset.name || "студия красоты").toLowerCase();
    var desc = $('meta[name="description"]');
    if (desc && content["hero.subtitle"]) desc.setAttribute("content", content["hero.subtitle"]);

    $$("[data-privacy-link]").forEach(function (a) { a.href = formConfig.privacyUrl || "privacy.html"; });
    $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ---------- Разделы ---------- */

  function applySections() {
    Object.keys(sections).forEach(function (key) {
      if (sections[key] !== false) return;
      $$('[data-section="' + key + '"]').forEach(function (n) { n.remove(); });
      $$('[data-section-link="' + key + '"]').forEach(function (n) { n.remove(); });
    });
    if (sections.booking === false) {
      // Без формы кнопки записи ведут в контакты (или исчезают, если и их нет).
      $$("[data-book]").forEach(function (a) {
        if (sections.contacts !== false) a.href = "#contacts";
        else a.remove();
      });
    }
  }

  /* ---------- Подгонка крупного названия под ширину ---------- */

  function prepareWordmarks() {
    $$("[data-fit]").forEach(function (node) {
      var words = node.textContent.trim().split(/\s+/);
      node.textContent = "";
      words.forEach(function (w, i) {
        if (i) node.appendChild(document.createTextNode(" "));
        node.appendChild(el("span", "w", w));
      });
    });
  }

  function fitWordmarks() {
    $$("[data-fit]").forEach(function (node) {
      var style = getComputedStyle(node);
      var available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      var words = $$(".w", node);
      // Узко — каждое слово на своей строке, широко — всё в одну строку.
      var stacked = available < 760;
      node.classList.toggle("is-stacked", stacked);
      words.forEach(function (w) { w.style.display = stacked ? "block" : "inline"; });

      node.style.fontSize = "100px";
      var widest = 0;
      if (stacked) {
        words.forEach(function (w) {
          w.style.display = "inline-block";
          widest = Math.max(widest, w.getBoundingClientRect().width);
          w.style.display = "block";
        });
      } else {
        var probe = el("span", null, node.textContent);
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
        node.appendChild(probe);
        widest = probe.getBoundingClientRect().width;
        probe.remove();
      }
      if (widest > 0) node.style.fontSize = Math.floor(100 * available / widest * 0.995) + "px";
    });
  }

  /* ---------- Услуги ---------- */

  function placeholder(text, ratio) {
    var ph = el("div", "ph");
    var circle = el("span", "ph__icon");
    circle.appendChild(icon("image"));
    ph.appendChild(circle);
    ph.appendChild(el("span", "ph__text", text || "Место для фотографии"));
    if (ratio) ph.appendChild(el("span", "ph__ratio", ratio));
    return ph;
  }

  function renderServices() {
    var track = $("[data-services]");
    if (track) {
      services.forEach(function (s) {
        var li = el("li", "service-card reveal");
        var media = el("div", "service-card__media");
        if (s.image) {
          var img = el("img");
          img.src = s.image;
          img.alt = s.imageAlt || s.title;
          img.loading = "lazy";
          media.appendChild(img);
        } else {
          media.appendChild(placeholder("Место для фото"));
        }
        if (s.tag) media.appendChild(el("span", "service-card__tag", s.tag));
        li.appendChild(media);

        var body = el("div", "service-card__body");
        body.appendChild(el("h3", "service-card__title", s.title));
        if (s.text) body.appendChild(el("p", "service-card__text", s.text));
        if (s.price) body.appendChild(el("p", "service-card__price", s.price));
        li.appendChild(body);

        var cta = el("a", "service-card__foot");
        cta.href = sections.booking === false ? "#contacts" : "#booking";
        cta.setAttribute("data-book-service", s.title);
        cta.appendChild(el("span", null, "Записаться"));
        cta.appendChild(icon("arrow"));
        li.appendChild(cta);

        track.appendChild(li);
      });
      setupCarousel(track);
    }

    var tags = $("[data-hero-tags]");
    if (tags) services.slice(0, 3).forEach(function (s) { tags.appendChild(el("li", null, s.title)); });

    $$("[data-service-select]").forEach(function (select) {
      services.forEach(function (s) {
        var opt = el("option", null, s.title);
        opt.value = s.title;
        select.appendChild(opt);
      });
      var other = el("option", null, "Пока не знаю, нужна консультация");
      other.value = "Консультация";
      select.appendChild(other);
    });
  }

  function setupCarousel(track) {
    var nav = $("[data-carousel-nav]");
    var prev = $("[data-carousel-prev]");
    var next = $("[data-carousel-next]");
    if (!nav) return;

    function step() {
      var card = track.firstElementChild;
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : 300;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      nav.hidden = max < 8;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > max - 8;
    }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Преимущества ---------- */

  function renderAdvantages() {
    var list = $("[data-advantages]");
    if (!list) return;
    var items = config.advantages || [];
    if (!items.length) { list.remove(); return; }
    items.forEach(function (a) {
      var li = el("li", "feature");
      var ic = el("span", "feature__icon");
      ic.appendChild(icon(a.icon || "detail"));
      li.appendChild(ic);
      li.appendChild(el("h3", "feature__title", a.title));
      if (a.text) li.appendChild(el("p", "feature__text", a.text));
      list.appendChild(li);
    });
  }

  /* ---------- Галерея ---------- */

  var shapeRatio = { feature: "Крупное фото", tall: "Вертикальное фото", wide: "Горизонтальное фото", square: "Небольшое фото" };

  function renderGallery() {
    var grid = $("[data-gallery]");
    if (!grid) return;
    var captions = preset.gallery || [];
    (config.gallery || []).forEach(function (item, i) {
      var shape = shapeRatio[item.shape] ? item.shape : "square";
      var caption = item.caption || captions[i] || "";
      var li = el("li", "g-item g-item--" + shape + " reveal");

      if (item.src) {
        li.classList.add("g-item--photo");
        var btn = el("button", "g-item__btn");
        btn.type = "button";
        btn.setAttribute("aria-label", "Открыть фото" + (caption ? ": " + caption : ""));
        var img = el("img");
        img.src = item.src;
        img.alt = item.alt || caption;
        img.loading = "lazy";
        btn.appendChild(img);
        btn.addEventListener("click", function () { openLightbox(item.src, img.alt); });
        li.appendChild(btn);
      } else {
        li.appendChild(placeholder("Место для фотографии", shapeRatio[shape]));
      }
      if (caption) li.appendChild(el("span", "g-item__caption", caption));
      grid.appendChild(li);
    });
  }

  var lightbox = $("[data-lightbox]");
  function openLightbox(src, alt) {
    if (!lightbox || typeof lightbox.showModal !== "function") { window.open(src, "_blank", "noopener"); return; }
    var frame = $("[data-lightbox-frame]", lightbox);
    frame.textContent = "";
    var img = el("img");
    img.src = src;
    img.alt = alt || "";
    frame.appendChild(img);
    lightbox.showModal();
  }
  if (lightbox) {
    $("[data-lightbox-close]", lightbox).addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
  }

  /* ---------- Контакты ---------- */

  function phoneLink() {
    return contacts.phone ? "tel:" + contacts.phone.replace(/[^\d+]/g, "") : "";
  }
  function messengerLinks() {
    var list = [];
    if (contacts.telegram) list.push({ label: "Telegram", href: "https://t.me/" + contacts.telegram.replace(/^@/, ""), icon: "chat" });
    if (contacts.whatsapp) list.push({ label: "WhatsApp", href: "https://wa.me/" + contacts.whatsapp.replace(/\D/g, ""), icon: "chat" });
    if (contacts.vk) list.push({ label: "ВКонтакте", href: contacts.vk, icon: "chat" });
    return list;
  }
  function routeUrl() {
    if (contacts.routeUrl) return contacts.routeUrl;
    return contacts.address ? "https://yandex.ru/maps/?text=" + encodeURIComponent(contacts.address) : "";
  }

  function demoNote() { return el("span", "demo-note", "демо"); }

  function contactRow(list, iconName, label, valueNode, isDemo) {
    var wrap = el("div", "contact-row" + (isDemo ? " contact-row--demo" : ""));
    wrap.appendChild(icon(iconName));
    var dt = el("dt", null, label);
    if (isDemo) dt.appendChild(demoNote());
    wrap.appendChild(dt);
    var dd = el("dd");
    dd.appendChild(valueNode);
    wrap.appendChild(dd);
    list.appendChild(wrap);
  }

  function renderContacts() {
    var list = $("[data-contact-list]");
    var messengers = messengerLinks();
    var phone = phoneLink();
    var phoneText = contacts.phoneDisplay || contacts.phone;

    if (list) {
      if (contacts.address) contactRow(list, "pin", "Адрес", document.createTextNode(contacts.address));
      else if (demo) contactRow(list, "pin", "Адрес", document.createTextNode("Здесь будет адрес студии"), true);

      if (phone) {
        var a = el("a", null, phoneText);
        a.href = phone;
        contactRow(list, "phone", "Телефон", a);
      } else if (demo) contactRow(list, "phone", "Телефон", document.createTextNode("Здесь будет телефон для записи"), true);

      if (contacts.hours && contacts.hours.length) {
        var hours = el("span", "hours");
        contacts.hours.forEach(function (h) {
          hours.appendChild(el("span", null, h[0]));
          hours.appendChild(el("span", null, h[1]));
        });
        contactRow(list, "clock", "Режим работы", hours);
      } else if (demo) contactRow(list, "clock", "Режим работы", document.createTextNode("Здесь будут часы работы"), true);

      if (messengers.length) {
        var links = el("span");
        messengers.forEach(function (m, i) {
          if (i) links.appendChild(document.createTextNode(" · "));
          var ml = el("a", null, m.label);
          ml.href = m.href;
          ml.target = "_blank";
          ml.rel = "noopener";
          links.appendChild(ml);
        });
        contactRow(list, "chat", "Мессенджеры", links);
      } else if (demo) contactRow(list, "chat", "Мессенджеры", document.createTextNode("Здесь будут ссылки на мессенджеры"), true);

      if (!list.children.length) list.remove();
    }

    var actions = $("[data-contact-actions]");
    if (actions) {
      var route = routeUrl();
      var contactHref = messengers.length ? messengers[0].href : phone;
      if (route || demo) actions.appendChild(actionBtn("Построить маршрут", route, "btn--dark", true));
      if (contactHref || demo) actions.appendChild(actionBtn("Связаться", contactHref, "btn--outline", false));
      if (demo && (!route || !contactHref)) {
        var note = el("p", "section-lead");
        note.style.width = "100%";
        note.style.fontSize = "0.8125rem";
        note.textContent = "Кнопки заработают, когда в config.js будут указаны адрес и контакты.";
        actions.appendChild(note);
      }
    }

    var map = $("[data-map]");
    if (map) {
      if (contacts.mapEmbed) {
        var frame = el("iframe");
        frame.src = contacts.mapEmbed;
        frame.title = "Карта: как нас найти";
        frame.loading = "lazy";
        map.appendChild(frame);
      } else if (demo) {
        map.appendChild(placeholder("Место для карты"));
      } else {
        map.remove();
      }
    }

    var footer = $("[data-footer-contacts]");
    if (footer) {
      if (contacts.address) footer.appendChild(el("span", null, contacts.address));
      if (phone) { var fp = el("a", null, phoneText); fp.href = phone; footer.appendChild(fp); }
      if (contacts.email) { var fe = el("a", null, contacts.email); fe.href = "mailto:" + contacts.email; footer.appendChild(fe); }
      messengers.forEach(function (m) {
        var fm = el("a", null, m.label);
        fm.href = m.href; fm.target = "_blank"; fm.rel = "noopener";
        footer.appendChild(fm);
      });
    }

    var alt = $("[data-booking-alt]");
    if (alt) {
      var altLinks = messengers.slice();
      if (phone) altLinks.unshift({ label: "Позвонить", href: phone, icon: "phone" });
      if (altLinks.length) {
        alt.appendChild(el("p", "booking__alt-title", "Или напишите нам напрямую"));
        var row = el("div", "booking__alt-links");
        altLinks.forEach(function (l) {
          var link = el("a", "alt-link");
          link.href = l.href;
          if (l.href.indexOf("http") === 0) { link.target = "_blank"; link.rel = "noopener"; }
          link.appendChild(icon(l.icon));
          link.appendChild(document.createTextNode(l.label));
          row.appendChild(link);
        });
        alt.appendChild(row);
      } else {
        alt.remove();
      }
    }
  }

  function actionBtn(label, href, variant, external) {
    var a = el("a", "btn " + variant);
    a.textContent = label;
    if (href) {
      a.href = href;
      if (external || href.indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener"; }
    } else {
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("role", "link");
    }
    return a;
  }

  /* ---------- Меню и шапка ---------- */

  function setupHeader() {
    var header = $("[data-header]");
    var toggle = $("[data-menu-toggle]");
    var menu = $("[data-menu]");

    function setMenu(open) {
      toggle.setAttribute("aria-expanded", String(open));
      $(".visually-hidden", toggle).textContent = open ? "Закрыть меню" : "Открыть меню";
      $("use", toggle).setAttribute("href", open ? "#i-close" : "#i-menu");
      // Меню начинается сразу под шапкой, где бы она ни была (над ней может быть демо-полоса).
      if (open) menu.style.setProperty("--menu-top", $(".site-header__inner", header).getBoundingClientRect().bottom + "px");
      menu.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (mq) { if (mq.matches) setMenu(false); });

    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Появление при прокрутке ---------- */

  function setupReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach(function (n) { n.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Форма записи ---------- */

  var form = $("[data-booking-form]");

  function goToForm(values) {
    var target = document.getElementById("booking");
    if (!form || !target) return;
    Object.keys(values || {}).forEach(function (name) {
      var field = form.elements[name];
      if (field && values[name]) {
        field.value = values[name];
        field.classList.toggle("has-value", !!field.value);
        clearError(field);
      }
    });
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 600);
  }

  function setupBookingLinks() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest("[data-book-service]");
      if (!link || !form) return;
      e.preventDefault();
      goToForm({ service: link.getAttribute("data-book-service") });
    });

    var qb = $("[data-quickbook]");
    if (qb) {
      if (!form) { qb.remove(); return; }
      qb.addEventListener("submit", function (e) {
        e.preventDefault();
        goToForm({ service: qb.elements.service.value, date: qb.elements.date.value, time: qb.elements.time.value });
      });
    }
  }

  function setupDates() {
    var d = new Date();
    var today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    $$("[data-min-today]").forEach(function (input) {
      input.min = today;
      var sync = function () { input.classList.toggle("has-value", !!input.value); };
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
    });
  }

  var messages = {
    name: "Укажите, как к вам обращаться.",
    phone: "Укажите телефон, чтобы мы могли связаться с вами.",
    phoneFormat: "Проверьте номер: в нём должно быть от 10 до 15 цифр, например +7 900 000-00-00.",
    service: "Выберите услугу или вариант «Пока не знаю».",
    consent: "Без согласия на обработку данных мы не можем принять заявку.",
  };

  function fieldWrap(field) { return field.closest(".field"); }

  function showError(field, text) {
    var wrap = fieldWrap(field);
    var err = $(".field__error", wrap);
    wrap.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    if (err) err.textContent = text;
  }

  function clearError(field) {
    var wrap = fieldWrap(field);
    if (!wrap || !wrap.classList.contains("is-invalid")) return;
    wrap.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    var err = $(".field__error", wrap);
    if (err) err.textContent = "";
  }

  function validate() {
    var f = form.elements;
    var firstInvalid = null;
    var mark = function (field, text) { showError(field, text); firstInvalid = firstInvalid || field; };
    [f.name, f.phone, f.service, f.consent].forEach(clearError);

    if (!f.name.value.trim()) mark(f.name, messages.name);

    var digits = f.phone.value.replace(/\D/g, "");
    if (!digits) mark(f.phone, messages.phone);
    else if (digits.length < 10 || digits.length > 15 || /[^\d\s()+\-]/.test(f.phone.value)) mark(f.phone, messages.phoneFormat);

    if (!f.service.value) mark(f.service, messages.service);
    if (!f.consent.checked) mark(f.consent, messages.consent);

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function status(kind, title, lines) {
    var box = $("[data-form-status]");
    box.className = "form__status" + (kind ? " form__status--" + kind : "");
    box.textContent = "";
    if (!title) return;
    box.appendChild(el("strong", null, title));
    (lines || []).forEach(function (line) {
      if (typeof line === "string") box.appendChild(el("p", null, line));
      else box.appendChild(line);
    });
  }

  function notConnectedMessage() {
    if (demo) {
      var p = el("p");
      p.appendChild(document.createTextNode("Это демо-шаблон: заявка проверена, но никуда не отправлена. Чтобы форма заработала, укажите адрес обработчика в "));
      p.appendChild(el("code", null, "config.js → form.endpoint"));
      p.appendChild(document.createTextNode(". Инструкция — в README.md."));
      return ["Отправка заявок пока не подключена", [p]];
    }
    var lines = ["Онлайн-заявки временно не принимаются. Пожалуйста, свяжитесь с нами по телефону или в мессенджере."];
    if (contacts.phone) {
      var call = el("p");
      var a = el("a", null, contacts.phoneDisplay || contacts.phone);
      a.href = phoneLink();
      call.appendChild(document.createTextNode("Телефон: "));
      call.appendChild(a);
      lines.push(call);
    }
    return ["Заявка не отправлена", lines];
  }

  function setupForm() {
    if (!form) return;
    var submit = $("[data-submit]", form);
    var submitText = $("[data-submit-text]", form);
    var sending = false;

    form.addEventListener("input", function (e) { clearError(e.target); });
    form.addEventListener("change", function (e) { clearError(e.target); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      status(null);
      if (!validate()) return;

      // Заполненное скрытое поле = бот. Делаем вид, что всё хорошо, и ничего не отправляем.
      if (form.elements.website.value) { form.reset(); return; }

      var endpoint = (formConfig.endpoint || "").trim();
      if (!endpoint) {
        var msg = notConnectedMessage();
        status("error", msg[0], msg[1]);
        return;
      }

      var f = form.elements;
      var payload = {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        contactMethod: f.contactMethod.value,
        service: f.service.value,
        date: f.date.value,
        time: f.time.value,
        comment: f.comment.value.trim(),
        consent: true,
        page: location.href,
      };

      sending = true;
      submit.disabled = true;
      submit.classList.add("is-loading");
      submitText.textContent = "Отправляем…";

      var controller = "AbortController" in window ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          $$(".has-value", form).forEach(function (n) { n.classList.remove("has-value"); });
          status("success", "Заявка отправлена", ["Спасибо! Мы свяжемся с вами в ближайшее время, чтобы уточнить детали."]);
        })
        .catch(function (err) {
          var reason = "Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз.";
          if (err && err.name === "AbortError") reason = "Сервер слишком долго не отвечает. Попробуйте ещё раз.";
          else if (err && /^HTTP/.test(err.message)) reason = "Сервер не принял заявку. Попробуйте ещё раз чуть позже.";
          var lines = [reason];
          if (contacts.phone) lines.push("Или позвоните нам: " + (contacts.phoneDisplay || contacts.phone));
          status("error", "Заявка не отправлена", lines);
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          sending = false;
          submit.disabled = false;
          submit.classList.remove("is-loading");
          submitText.textContent = "Отправить заявку";
        });
    });
  }

  /* ---------- Демо-панель ---------- */

  function setupDemoBar() {
    var bar = $("[data-demo-bar]");
    if (!bar) return;
    if (!demo) { bar.remove(); return; }
    var select = $("[data-type-switch]", bar);
    Object.keys(presets).forEach(function (key) {
      var opt = el("option", null, presets[key].name);
      opt.value = key;
      if (key === type) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      var url = new URL(location.href);
      url.searchParams.set("type", select.value);
      url.hash = "";
      location.href = url.toString();
    });
    bar.hidden = false;
    document.documentElement.classList.add("is-demo");
  }

  /* ---------- Запуск ---------- */

  applyContent();
  applySections();
  prepareWordmarks();
  renderServices();
  renderAdvantages();
  renderGallery();
  renderContacts();
  setupHeader();
  setupBookingLinks();
  setupDates();
  setupForm();
  setupDemoBar();
  setupReveal();

  fitWordmarks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmarks);
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitWordmarks, 120);
  });
})();
