export function insightMatches(categoryList, selectedCategory) {
  if (selectedCategory === "all") return true;
  return categoryList.split(/\s+/).filter(Boolean).includes(selectedCategory);
}

function initializeSite() {
  const root = document.documentElement;
  root.classList.add("js");

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  if (menuToggle && menu) {
    const setMenuOpen = (isOpen) => {
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menu.dataset.open = String(isOpen);
      document.body.classList.toggle("menu-open", isOpen);
    };

    menuToggle.addEventListener("click", () => {
      setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });
  }

  const filterButtons = document.querySelectorAll("[data-filter]");
  const insightCards = document.querySelectorAll("[data-insight-card]");
  const filterStatus = document.querySelector("[data-filter-status]");

  if (filterButtons.length && insightCards.length) {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedCategory = button.dataset.filter;
        let visibleCount = 0;

        filterButtons.forEach((candidate) => {
          candidate.setAttribute("aria-pressed", String(candidate === button));
        });

        insightCards.forEach((card) => {
          const isVisible = insightMatches(card.dataset.category || "", selectedCategory);
          card.hidden = !isVisible;
          if (isVisible) visibleCount += 1;
        });

        if (filterStatus) {
          filterStatus.textContent = `${visibleCount} insight${visibleCount === 1 ? "" : "s"} shown`;
        }
      });
    });
  }

  const revealItems = document.querySelectorAll("[data-reveal]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if ("IntersectionObserver" in window && !reducedMotion) {
    root.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
}

if (typeof document !== "undefined") initializeSite();
