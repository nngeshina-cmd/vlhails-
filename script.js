"use strict";

/**
 * VL.NAILS — интерактивность сайта
 * Здесь находятся: загрузочный экран, меню, анимации появления,
 * полноэкранная галерея, свайпы и кнопка «Наверх».
 */

const doc = document;
const body = doc.body;
const html = doc.documentElement;

// Экран загрузки: минимальная длительность нужна, чтобы блик успел пройти по логотипу.
const loader = doc.getElementById("siteLoader");
const loaderStartedAt = performance.now();

window.addEventListener("load", () => {
    const minimumDuration = 1250;
    const elapsed = performance.now() - loaderStartedAt;
    window.setTimeout(() => {
        loader?.classList.add("is-hidden");
        html.classList.remove("is-loading");
    }, Math.max(0, minimumDuration - elapsed));
}, { once: true });

// Фиксированное меню и кнопка «Наверх».
const header = doc.getElementById("siteHeader");
const backToTop = doc.getElementById("backToTop");

const updateScrollUI = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 24);
    backToTop?.classList.toggle("is-visible", y > 650);
};

updateScrollUI();
window.addEventListener("scroll", updateScrollUI, { passive: true });
backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// Мобильное меню.
const menuToggle = doc.getElementById("menuToggle");
const mobileMenu = doc.getElementById("mobileMenu");

const setMenuState = (open) => {
    menuToggle?.classList.toggle("is-active", open);
    mobileMenu?.classList.toggle("is-open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    menuToggle?.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileMenu?.setAttribute("aria-hidden", String(!open));
    body.classList.toggle("menu-open", open);
};

menuToggle?.addEventListener("click", () => {
    setMenuState(!mobileMenu?.classList.contains("is-open"));
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
});

// Появление блоков при прокрутке.
const revealItems = doc.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    revealItems.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
        revealObserver.observe(item);
    });
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Галерея. Для добавления новых работ достаточно добавить кнопку .gallery__item в HTML.
const galleryItems = [...doc.querySelectorAll(".gallery__item")];
const lightbox = doc.getElementById("lightbox");
const lightboxImage = doc.getElementById("lightboxImage");
const lightboxCaption = doc.getElementById("lightboxCaption");
const lightboxCounter = doc.getElementById("lightboxCounter");
const lightboxClose = doc.getElementById("lightboxClose");
const lightboxPrev = doc.getElementById("lightboxPrev");
const lightboxNext = doc.getElementById("lightboxNext");
let activeIndex = 0;
let lastFocusedElement = null;
let touchStartX = 0;
let touchStartY = 0;

const preloadNeighbour = (index) => {
    const item = galleryItems[(index + galleryItems.length) % galleryItems.length];
    if (!item) return;
    const preloaded = new Image();
    preloaded.src = item.dataset.full;
};

const showImage = (index) => {
    if (!galleryItems.length || !lightboxImage) return;
    activeIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[activeIndex];
    const thumb = item.querySelector("img");

    lightboxImage.classList.remove("is-ready");
    lightboxImage.alt = thumb?.alt || "Работа VL.NAILS";
    lightboxCaption.textContent = thumb?.alt || "";
    lightboxCounter.textContent = `${activeIndex + 1} / ${galleryItems.length}`;

    const source = item.dataset.full;
    const nextImage = new Image();
    nextImage.onload = () => {
        lightboxImage.src = source;
        requestAnimationFrame(() => lightboxImage.classList.add("is-ready"));
        preloadNeighbour(activeIndex + 1);
        preloadNeighbour(activeIndex - 1);
    };
    nextImage.src = source;
};

const openLightbox = (index) => {
    lastFocusedElement = doc.activeElement;
    showImage(index);
    lightbox?.classList.add("is-open");
    lightbox?.setAttribute("aria-hidden", "false");
    body.classList.add("lightbox-open");
    window.setTimeout(() => lightboxClose?.focus(), 80);
};

const closeLightbox = () => {
    lightbox?.classList.remove("is-open");
    lightbox?.setAttribute("aria-hidden", "true");
    body.classList.remove("lightbox-open");
    lightboxImage?.classList.remove("is-ready");
    lastFocusedElement?.focus?.();
};

const previousImage = () => showImage(activeIndex - 1);
const nextImage = () => showImage(activeIndex + 1);

galleryItems.forEach((item, index) => item.addEventListener("click", () => openLightbox(index)));
lightboxClose?.addEventListener("click", closeLightbox);
lightboxPrev?.addEventListener("click", previousImage);
lightboxNext?.addEventListener("click", nextImage);

// Закрытие при клике по тёмному фону, но не по изображению и кнопкам.
lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
});

// Свайпы на телефоне.
lightbox?.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

lightbox?.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    dx > 0 ? previousImage() : nextImage();
}, { passive: true });

// Клавиатурное управление и закрытие меню по Escape.
doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (lightbox?.classList.contains("is-open")) closeLightbox();
        if (mobileMenu?.classList.contains("is-open")) setMenuState(false);
    }

    if (!lightbox?.classList.contains("is-open")) return;
    if (event.key === "ArrowLeft") previousImage();
    if (event.key === "ArrowRight") nextImage();

    // Простой focus trap для диалога.
    if (event.key === "Tab") {
        const focusable = [lightboxClose, lightboxPrev, lightboxNext].filter((el) => el && getComputedStyle(el).display !== "none");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && doc.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && doc.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

// Закрываем мобильное меню при переходе на десктопную ширину.
window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024 && mobileMenu?.classList.contains("is-open")) {
        setMenuState(false);
    }
}, { passive: true });

// Текущий год в футере.
const year = doc.getElementById("currentYear");
if (year) year.textContent = String(new Date().getFullYear());
