export function sanitizeBsalesAccessReturnTo(value = "") {
  return /^\/bsales\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/u.test(value)
    ? value
    : "/bsales/";
}

function initializeBsalesAccess() {
  const form = document.querySelector("[data-bsales-access-form]");
  const password = document.querySelector("#sales-program-password");
  const error = document.querySelector("[data-access-error]");
  if (!form || !password || !error) return;

  const params = new URLSearchParams(window.location.search);
  form.elements.returnTo.value = sanitizeBsalesAccessReturnTo(
    params.get("returnTo") || "/bsales/",
  );
  if (params.get("error") === "1") {
    error.hidden = false;
    error.id = "access-error";
    password.setAttribute("aria-invalid", "true");
    password.setAttribute("aria-describedby", "access-error");
    password.focus();
  }
}

if (typeof document !== "undefined") initializeBsalesAccess();
