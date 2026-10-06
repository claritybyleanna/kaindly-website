function initializeBleadAccess() {
  const form = document.querySelector("[data-blead-access-form]");
  const password = document.querySelector("#program-password");
  const error = document.querySelector("[data-access-error]");
  if (!form || !password || !error) return;

  const params = new URLSearchParams(window.location.search);
  const requestedReturn = params.get("returnTo") || "/Blead/";
  const returnTo = /^\/Blead\/(?:#[a-z0-9-]+)?$/i.test(requestedReturn) ? requestedReturn : "/Blead/";
  form.elements.returnTo.value = returnTo;
  const requestedHash = params.get("returnHash") || window.location.hash;
  form.elements.returnHash.value = /^#week-[0-9]{2}$/.test(requestedHash) ? requestedHash : "";

  if (params.get("error") === "1") {
    error.hidden = false;
    password.setAttribute("aria-invalid", "true");
    password.setAttribute("aria-describedby", "access-error");
    error.id = "access-error";
    password.focus();
  }
}

if (typeof document !== "undefined") initializeBleadAccess();
