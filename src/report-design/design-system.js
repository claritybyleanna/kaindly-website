import React from 'react';
/* @ds-bundle: {"format":4,"namespace":"KaindlyDesignSystem_773de9","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"a0bbebad01b9","components/core/Badge.jsx":"43f836e47665","components/core/Button.jsx":"97e3f16afc31","components/core/Card.jsx":"026df5af5bef","components/core/IconButton.jsx":"6422146ee6f3","components/core/Tag.jsx":"227c1384c0ec","components/feedback/Dialog.jsx":"89911f84e629","components/feedback/Toast.jsx":"53aac87b4d03","components/feedback/Tooltip.jsx":"c93e75fec426","components/forms/Checkbox.jsx":"e35eddd60d61","components/forms/Input.jsx":"421adb47a0e2","components/forms/Radio.jsx":"7cf9008737d1","components/forms/Select.jsx":"7feff8b91798","components/forms/Switch.jsx":"29c39c0e0abc","components/forms/Textarea.jsx":"607abae00b6e","components/navigation/Tabs.jsx":"63e969487410"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KaindlyDesignSystem_773de9 = window.KaindlyDesignSystem_773de9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Logo — renders the official Kaindly mark from the provided PNG assets.
 * Never redraw the mark; this component only picks the right file + size.
 * Assets live at <root>/assets. `basePath` lets consumers point at where they
 * copied the assets folder (default "/assets").
 */
function Logo({
  variant = "primary",
  // primary | secondary | icon | tagline
  color = "violet",
  // violet | white | charcoal | honeydew
  height,
  basePath = "/assets",
  style,
  ...rest
}) {
  const file = {
    primary: {
      dir: "logos",
      stem: "kaindly-primary",
      colors: ["violet", "white", "charcoal", "honeydew"]
    },
    secondary: {
      dir: "logos",
      stem: "kaindly-secondary",
      colors: ["violet", "white", "charcoal", "honeydew"]
    },
    tagline: {
      dir: "logos",
      stem: "kaindly-tagline",
      colors: ["violet", "white"]
    },
    icon: {
      dir: "icons",
      stem: "kaindly-icon",
      colors: ["violet", "white", "charcoal", "honeydew"]
    }
  }[variant];
  const useColor = file.colors.includes(color) ? color : file.colors[0];
  const defaultH = {
    primary: 96,
    secondary: 40,
    tagline: 120,
    icon: 44
  }[variant];
  const h = height ?? defaultH;
  return /*#__PURE__*/React.createElement("img", _extends({
    src: `${basePath}/${file.dir}/${file.stem}-${useColor}.png`,
    alt: "Kaindly",
    style: {
      height: h,
      width: "auto",
      display: "block",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status/label pill. Semantic tones map to the palette
 * (success=green/honeydew, info=periwinkle). `accent` is the orange one-shot.
 */
function Badge({
  tone = "neutral",
  style,
  children,
  ...rest
}) {
  const tones = {
    neutral: {
      background: "var(--surface-muted)",
      color: "var(--text-muted)"
    },
    brand: {
      background: "var(--surface-lavender)",
      color: "var(--brand)"
    },
    success: {
      background: "var(--success-surface)",
      color: "var(--green)"
    },
    info: {
      background: "var(--info-surface)",
      color: "var(--violet)"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--text-on-accent)"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: "0.72rem",
      letterSpacing: "0.03em",
      padding: "3px 9px",
      borderRadius: "var(--radius, 5px)",
      lineHeight: 1.4,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Kaindly Button. Primary anchors in violet; use the `accent` variant for the
 * single high-intent moment per layout (orange). 5px brand radius throughout.
 */
function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button",
  style,
  children,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 14px",
      fontSize: "0.85rem"
    },
    md: {
      padding: "11px 20px",
      fontSize: "var(--text-button, 0.95rem)"
    },
    lg: {
      padding: "15px 28px",
      fontSize: "1.05rem"
    }
  };
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid var(--brand)"
    },
    secondary: {
      background: "var(--surface-lavender)",
      color: "var(--brand)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--brand)",
      border: "1px solid var(--border-brand)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      border: "1px solid var(--accent)"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1,
    borderRadius: "var(--radius, 5px)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    width: fullWidth ? "100%" : "auto",
    transition: "background var(--dur,200ms) var(--ease-standard), transform var(--dur-fast,120ms) var(--ease-standard), box-shadow var(--dur,200ms) var(--ease-standard)",
    ...sizes[size],
    ...variants[variant],
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    style: base,
    onMouseDown: e => !disabled && (e.currentTarget.style.transform = "scale(0.98)"),
    onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — white surface, 1px grey border, 5px brand radius, optional soft shadow.
 * `tone` swaps the surface to a quiet lavender/honeydew emphasis without leaving
 * the palette.
 */
function Card({
  tone = "default",
  elevated = false,
  padded = true,
  style,
  children,
  ...rest
}) {
  const tones = {
    default: {
      background: "var(--surface-card)",
      border: "1px solid var(--border)"
    },
    lavender: {
      background: "var(--surface-lavender)",
      border: "1px solid transparent"
    },
    honeydew: {
      background: "var(--surface-accent)",
      border: "1px solid transparent"
    },
    brand: {
      background: "var(--surface-brand)",
      color: "var(--text-on-brand)",
      border: "1px solid var(--surface-brand)"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius, 5px)",
      padding: padded ? "var(--space-6, 24px)" : 0,
      boxShadow: elevated ? "var(--shadow-md)" : "none",
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square, icon-only button. Pass a Lucide (or any) icon element
 * as children. Matches Button's variants and 5px radius.
 */
function IconButton({
  variant = "ghost",
  size = "md",
  disabled = false,
  "aria-label": ariaLabel,
  style,
  children,
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 40,
    lg: 48
  };
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid var(--brand)"
    },
    secondary: {
      background: "var(--surface-lavender)",
      color: "var(--brand)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--brand)",
      border: "1px solid var(--border-brand)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      border: "1px solid var(--accent)"
    }
  };
  const d = dims[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: d,
      height: d,
      borderRadius: "var(--radius, 5px)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--dur,200ms) var(--ease-standard), transform var(--dur-fast,120ms)",
      ...variants[variant],
      ...style
    },
    onMouseDown: e => !disabled && (e.currentTarget.style.transform = "scale(0.94)"),
    onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — removable / selectable chip. Larger tap target than Badge, optional
 * dismiss button. Uses the 5px brand radius.
 */
function Tag({
  selected = false,
  onRemove,
  style,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "var(--font-body)",
      fontWeight: 500,
      fontSize: "0.85rem",
      padding: "6px 12px",
      borderRadius: "var(--radius, 5px)",
      border: selected ? "1px solid var(--brand)" : "1px solid var(--border)",
      background: selected ? "var(--surface-lavender)" : "var(--surface-card)",
      color: selected ? "var(--brand)" : "var(--text-body)",
      cursor: rest.onClick ? "pointer" : "default",
      transition: "all var(--dur,200ms) var(--ease-standard)",
      ...style
    }
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      border: "none",
      background: "none",
      cursor: "pointer",
      padding: 0,
      lineHeight: 0,
      color: "inherit",
      opacity: 0.6,
      fontSize: "1rem"
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Dialog — centered modal over a scrim. Controlled via `open`/`onClose`. */
function Dialog({
  open,
  onClose,
  title,
  footer,
  width = 460,
  children,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(36,36,36,0.4)",
      backdropFilter: "blur(2px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md, 8px)",
      boxShadow: "var(--shadow-lg)",
      width: "100%",
      maxWidth: width,
      padding: "var(--space-6, 24px)",
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      marginBottom: "12px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-heading)",
      fontWeight: 700,
      fontSize: "1.35rem",
      color: "var(--text-heading)",
      letterSpacing: "-0.02em",
      lineHeight: 1.1
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close",
    onClick: onClose,
    style: {
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "1.3rem",
      lineHeight: 1,
      color: "var(--text-muted)"
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-body)",
      fontFamily: "var(--font-body)",
      fontSize: "0.95rem",
      lineHeight: 1.5
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "var(--space-6, 24px)"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/** Toast — transient notification. Render one; control via `open`. `tone` maps to palette. */
function Toast({
  open = true,
  tone = "brand",
  title,
  message,
  onClose,
  style
}) {
  if (!open) return null;
  const tones = {
    brand: {
      accent: "var(--brand)",
      surface: "var(--surface-card)"
    },
    success: {
      accent: "var(--green)",
      surface: "var(--surface-card)"
    },
    accent: {
      accent: "var(--accent)",
      surface: "var(--surface-card)"
    }
  };
  const t = tones[tone] || tones.brand;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      background: t.surface,
      borderRadius: "var(--radius, 5px)",
      border: "1px solid var(--border)",
      borderLeft: `4px solid ${t.accent}`,
      boxShadow: "var(--shadow-md)",
      padding: "13px 16px",
      minWidth: 260,
      maxWidth: 380,
      fontFamily: "var(--font-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: "0.9rem",
      color: "var(--text-body)",
      marginBottom: message ? 2 : 0
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "0.85rem",
      color: "var(--text-muted)",
      lineHeight: 1.4
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "1.1rem",
      lineHeight: 1,
      color: "var(--text-muted)"
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Tooltip — CSS hover tooltip. Wraps its children; `label` shows on hover/focus. */
function Tooltip({
  label,
  placement = "top",
  children,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos[placement],
      zIndex: 50,
      background: "var(--charcoal)",
      color: "var(--white)",
      fontFamily: "var(--font-body)",
      fontSize: "0.78rem",
      fontWeight: 500,
      padding: "6px 10px",
      borderRadius: "var(--radius, 5px)",
      whiteSpace: "nowrap",
      boxShadow: "var(--shadow-md)",
      pointerEvents: "none"
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Checkbox — brand-violet check, 5px radius box, with label. */
function Checkbox({
  label,
  checked,
  disabled = false,
  id,
  onChange,
  style,
  ...rest
}) {
  const cid = id || `k-cb-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "9px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "0.92rem",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flexShrink: 0,
      borderRadius: "var(--radius-sm, 3px)",
      border: `1.5px solid ${checked ? "var(--brand)" : "var(--border-strong)"}`,
      background: checked ? "var(--brand)" : "var(--surface-card)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all var(--dur,200ms) var(--ease-standard)"
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2l2.2 2.2 4.8-4.8",
    stroke: "var(--text-on-brand)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("input", _extends({
    id: cid,
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with label, optional hint/error. 5px radius, periwinkle
 * focus ring.
 */
function Input({
  label,
  hint,
  error,
  id,
  style,
  ...rest
}) {
  const inputId = id || `k-input-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: "0.85rem",
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.95rem",
      color: "var(--text-body)",
      padding: "10px 13px",
      borderRadius: "var(--radius, 5px)",
      border: `1px solid ${error ? "var(--orange)" : "var(--border)"}`,
      background: "var(--surface-card)",
      outline: "none",
      transition: "border-color var(--dur,200ms), box-shadow var(--dur,200ms)",
      ...style
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = "var(--focus-ring)";
      e.currentTarget.style.boxShadow = "var(--shadow-focus)";
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = error ? "var(--orange)" : "var(--border)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.78rem",
      color: error ? "var(--orange)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Radio — single-select circle, brand-violet when active, with label. */
function Radio({
  label,
  checked,
  disabled = false,
  name,
  value,
  id,
  onChange,
  style,
  ...rest
}) {
  const rid = id || `k-rb-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: rid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "9px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "0.92rem",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flexShrink: 0,
      borderRadius: "50%",
      border: `1.5px solid ${checked ? "var(--brand)" : "var(--border-strong)"}`,
      background: "var(--surface-card)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all var(--dur,200ms) var(--ease-standard)"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: "var(--brand)"
    }
  })), /*#__PURE__*/React.createElement("input", _extends({
    id: rid,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Select — native dropdown styled to match Input. Pass options as [{value,label}] or children. */
function Select({
  label,
  hint,
  error,
  id,
  options,
  style,
  children,
  ...rest
}) {
  const sid = id || `k-sel-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: sid,
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: "0.85rem",
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: sid,
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "100%",
      fontFamily: "var(--font-body)",
      fontSize: "0.95rem",
      color: "var(--text-body)",
      padding: "10px 36px 10px 13px",
      borderRadius: "var(--radius, 5px)",
      border: `1px solid ${error ? "var(--orange)" : "var(--border)"}`,
      background: "var(--surface-card)",
      outline: "none",
      cursor: "pointer",
      ...style
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = "var(--focus-ring)";
      e.currentTarget.style.boxShadow = "var(--shadow-focus)";
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = error ? "var(--orange)" : "var(--border)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, rest), options ? options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)) : children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--text-muted)",
      fontSize: "0.7rem"
    }
  }, "\u25BC")), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.78rem",
      color: error ? "var(--orange)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Switch — toggle. Track turns violet when on. */
function Switch({
  checked = false,
  disabled = false,
  label,
  onChange,
  id,
  style,
  ...rest
}) {
  const sid = id || `k-sw-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: sid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "0.92rem",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 23,
      flexShrink: 0,
      borderRadius: "var(--radius-pill, 999px)",
      background: checked ? "var(--brand)" : "var(--grey)",
      position: "relative",
      transition: "background var(--dur,200ms) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 20 : 3,
      width: 17,
      height: 17,
      borderRadius: "50%",
      background: "var(--white)",
      boxShadow: "var(--shadow-xs)",
      transition: "left var(--dur,200ms) var(--ease-out)"
    }
  })), /*#__PURE__*/React.createElement("input", _extends({
    id: sid,
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Textarea — multiline input matching Input's styling. */
function Textarea({
  label,
  hint,
  error,
  id,
  rows = 4,
  style,
  ...rest
}) {
  const tid = id || `k-ta-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: tid,
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: "0.85rem",
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: tid,
    rows: rows,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.95rem",
      color: "var(--text-body)",
      padding: "10px 13px",
      borderRadius: "var(--radius, 5px)",
      border: `1px solid ${error ? "var(--orange)" : "var(--border)"}`,
      background: "var(--surface-card)",
      outline: "none",
      resize: "vertical",
      lineHeight: 1.4,
      transition: "border-color var(--dur,200ms), box-shadow var(--dur,200ms)",
      ...style
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = "var(--focus-ring)";
      e.currentTarget.style.boxShadow = "var(--shadow-focus)";
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = error ? "var(--orange)" : "var(--border)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.78rem",
      color: error ? "var(--orange)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Tabs — underline tab bar. Controlled via value/onChange; items=[{value,label}]. */
function Tabs({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: "4px",
      borderBottom: "1px solid var(--border)",
      ...style
    }
  }, rest), items.map(it => {
    const active = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(it.value),
      style: {
        appearance: "none",
        background: "none",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontWeight: active ? 600 : 500,
        fontSize: "0.95rem",
        color: active ? "var(--brand)" : "var(--text-muted)",
        padding: "10px 14px",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--brand)" : "transparent"}`,
        marginBottom: "-1px",
        transition: "color var(--dur,200ms), border-color var(--dur,200ms)"
      }
    }, it.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
