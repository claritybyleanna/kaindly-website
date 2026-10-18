export function sanitizeOwrAccessReturnTo(value = "") {
  return /^\/OWR\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/iu.test(value)
    ? value
    : "/OWR/";
}

function initializeOwrAccess() {
  const form = document.querySelector("[data-owr-access-form]");
  const password = document.querySelector("#owr-program-password");
  const error = document.querySelector("[data-access-error]");
  if (!form || !password || !error) return;

  const params = new URLSearchParams(window.location.search);
  form.elements.returnTo.value = sanitizeOwrAccessReturnTo(
    params.get("returnTo") || "/OWR/",
  );
  if (params.get("error") === "1") {
    error.hidden = false;
    error.id = "access-error";
    password.setAttribute("aria-invalid", "true");
    password.setAttribute("aria-describedby", "access-error");
    password.focus();
  }
}

if (typeof document !== "undefined") initializeOwrAccess();
