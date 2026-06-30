const copyButtons = document.querySelectorAll("[data-copy]");
const copyPageButton = document.querySelector("[data-copy-page]");

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy");
    const code = document.getElementById(targetId);
    if (!code) return;
    const text = code.textContent || "";

    try {
      await copyText(text);
      setCopyState(button, "Copied", true);
    } catch {
      setCopyState(button, "Copied", true);
    }
  });
});

if (copyPageButton) {
  copyPageButton.addEventListener("click", async () => {
    const article = document.querySelector(".article");
    const text = article ? article.innerText : document.body.innerText;
    try {
      await copyText(text);
      setCopyState(copyPageButton, "Copied", true);
    } catch {
      setCopyState(copyPageButton, "Copied", true);
    }
  });
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  } finally {
    if (selection) {
      selection.removeAllRanges();
      if (previousRange) selection.addRange(previousRange);
    }
  }
}

function setCopyState(button, label, isCopied) {
  const previous = button.getAttribute("data-label") || button.textContent;
  button.setAttribute("data-label", previous);
  button.textContent = label;
  button.classList.toggle("is-copied", isCopied);
  button.setAttribute("aria-live", "polite");
  setTimeout(() => {
    button.textContent = previous;
    button.classList.remove("is-copied");
  }, 1400);
}

const navSearch = document.querySelector("[data-nav-search]");
if (navSearch) {
  navSearch.addEventListener("input", () => {
    const query = navSearch.value.trim().toLowerCase();
    document.querySelectorAll("[data-nav-item]").forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.toggleAttribute("hidden", Boolean(query && !text.includes(query)));
    });
  });
}

const mobileToggle = document.querySelector("[data-mobile-nav]");
const sidebar = document.querySelector(".sidebar");
if (mobileToggle && sidebar) {
  mobileToggle.addEventListener("click", () => {
    sidebar.toggleAttribute("data-open");
  });
}

document.querySelectorAll(".nav-link, .toc-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href") || "";
    const target = href.startsWith("#") ? document.querySelector(href) : null;
    if (target) {
      event.preventDefault();
      history.pushState(null, "", href);
      target.scrollIntoView({ block: "start" });
      setActiveNav(target.id);
    }
    if (sidebar) sidebar.removeAttribute("data-open");
  });
});

const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      setActiveNav(visible.target.id);
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.2, 0.6] },
  );
  sections.forEach((section) => observer.observe(section));
}

function setActiveNav(sectionId) {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${sectionId}`);
  });
}
