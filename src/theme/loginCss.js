// ═════════════════════════════════════════════════════════
//  Bb Atelier — Login page (Tier 2)
//
//  The login page (body.bb-login) is styled by ultra.css and an inline
//  institution stylesheet with literal colours: a #272727 panel (which Tier 3
//  reads as a dark emphasis fill and turns into the accent), #666 provider
//  buttons, white text and logo artwork, and a purple (#a234b5) spinner shown
//  while a sign-in redirects. These rules give the page the theme's own
//  surfaces, ink and accent.
//
//  Hooks (stable ids from the login template; no hashed classes):
//    • body.bb-login — page panel
//    • #loginRedirectProviderList, #externalloginlink — sign-in buttons
//    • .login-form — external login form (labels, inputs, submit)
//    • .login-logo img — institution logo (white artwork)
//    • #loader, .loader-outer, .loader-inner — sign-in spinner
//  !important: Tier 3 mirror rules would otherwise win the cascade.
// ═════════════════════════════════════════════════════════

const LOGIN = 'body.bb-login';
const BUTTONS = `${LOGIN} #loginRedirectProviderList li a, ${LOGIN} #externalloginlink`;

export function buildLoginCss() {
  return `
/* Login panel: the page background, not the accent. */
${LOGIN} {
  background-color: var(--page-bg) !important;
  color: var(--page-text-1) !important;
}
/* Logo artwork is white; darken it on a light page. */
${LOGIN} .login-logo img {
  filter: var(--page-logo-filter);
}

/* Sign-in buttons: a raised container surface with page ink and hairline. */
${LOGIN} #loginRedirectProviderList {
  background-color: transparent !important;
  box-shadow: none !important;
}
${BUTTONS} {
  background-color: var(--page-bg-lighter) !important;
  color: var(--page-text-1) !important;
  border: 1px solid var(--page-border) !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  transition: background-color 150ms ease, border-color 150ms ease;
}
${LOGIN} #loginRedirectProviderList li + li a {
  margin-top: 6px;
}
${LOGIN} #loginRedirectProviderList li a:is(:hover, :focus-visible),
${LOGIN} #externalloginlink:is(:hover, :focus-visible) {
  background-color: var(--page-bg-hover) !important;
  border-color: var(--accent-on-page) !important;
  color: var(--page-text-1) !important;
}
/* Provider icons are white line art; follow the logo. */
${LOGIN} .defaultProviderIcon,
${LOGIN} #externalloginlink div {
  filter: var(--page-logo-filter);
}

/* External login form. */
${LOGIN} .login-form ul label,
${LOGIN} .login-form ul label.float-above,
${LOGIN} .stay-signed-in input[type="checkbox"] + label,
${LOGIN} .login-form-footer,
${LOGIN} .login-form-footer a {
  color: var(--page-text-1) !important;
}
${LOGIN} .login-form ul input:is([type="text"], [type="password"]) {
  color: var(--page-text-1) !important;
  border-bottom-color: var(--page-border) !important;
}
${LOGIN} .login-form ul input:is([type="text"], [type="password"]):focus {
  border-bottom-color: var(--accent-on-page) !important;
}
${LOGIN} input:-webkit-autofill {
  box-shadow: 0 0 0 3.125rem var(--page-bg) inset !important;
  -webkit-text-fill-color: var(--page-text-1) !important;
}
${LOGIN} .login-form .button {
  color: var(--page-text-1) !important;
  box-shadow: inset 0 0 0 2px var(--page-text-1) !important;
}
${LOGIN} .login-form .button:is(:hover, :focus) {
  background-color: var(--page-text-1) !important;
  color: var(--page-bg) !important;
}
${LOGIN} .login-form .button:active {
  background-color: var(--accent-surface) !important;
  box-shadow: inset 0 0 0 2px var(--accent-surface) !important;
  color: #ffffff !important;
}
${LOGIN} #copyright,
${LOGIN} #gatewayButtons a,
${LOGIN} #ultraCourseCatalogLink a {
  color: var(--page-text-2) !important;
}

/* SSO sign-out page (/auth-saml/logout, also body.bb-login): white copy,
   purple-framed buttons and a light Cancel button in the confirm dialog. */
${LOGIN} #warning_message_logo img {
  filter: var(--page-logo-filter);
}
${LOGIN} #single_logout_warning_div .warning_content {
  color: var(--page-text-1) !important;
}
${LOGIN} .warning_message_button {
  background: none !important;
  border: 0 !important;
  padding: 0 !important;
}
${LOGIN} #single_logout_warning_div :is(.end_sso_session, .keep_sso_session) {
  display: block;
  padding: 10px;
  border-radius: 6px;
  text-decoration: none !important;
  box-shadow: none !important;
  transition: background-color 150ms ease, border-color 150ms ease;
}
${LOGIN} #single_logout_warning_div .end_sso_session {
  background-color: var(--accent-surface) !important;
  border: 1px solid var(--accent-surface) !important;
  color: #ffffff !important;
}
${LOGIN} #single_logout_warning_div .end_sso_session:is(:hover, :focus-visible) {
  background-color: color-mix(in srgb, var(--accent-surface), black 12%) !important;
}
${LOGIN} #single_logout_warning_div .keep_sso_session,
${LOGIN} .lb-wrapper .button-2 {
  background-color: var(--page-bg-lighter) !important;
  border: 1px solid var(--page-border) !important;
  color: var(--page-text-1) !important;
}
${LOGIN} #single_logout_warning_div .keep_sso_session:is(:hover, :focus-visible),
${LOGIN} .lb-wrapper .button-2:is(:hover, :focus-visible) {
  background-color: var(--page-bg-hover) !important;
}
${LOGIN} .lb-wrapper :is(.button-1, .button-2) {
  border-radius: 6px !important;
}
${LOGIN} .lb-wrapper .button-1 {
  background-color: var(--accent-surface) !important;
  border: 1px solid var(--accent-surface) !important;
  box-shadow: none !important;
  color: #ffffff !important;
}
${LOGIN} .lb-wrapper .alignPanelLightbox {
  color: var(--page-text-1) !important;
}

/* Sign-in spinner: the accent arc on a faint accent track. */
#loader {
  border-color: var(--accent-on-page) !important;
  border-top-color: color-mix(in srgb, var(--accent-on-page) 20%, transparent) !important;
}
.loader-outer,
.loader-inner {
  border-color: var(--page-border) !important;
}
`;
}
