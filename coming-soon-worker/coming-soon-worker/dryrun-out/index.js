var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var COOKIE_NAME = "kostka_preview";
var COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
function hasValidCookie(request, secret) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  return cookieHeader.split(";").map((part) => part.trim()).includes(`${COOKIE_NAME}=${secret}`);
}
__name(hasValidCookie, "hasValidCookie");
function comingSoonResponse() {
  return new Response(COMING_SOON_HTML, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
__name(comingSoonResponse, "comingSoonResponse");
var index_default = {
  async fetch(request, env) {
    const secret = env.PREVIEW_SECRET;
    if (!secret) {
      return comingSoonResponse();
    }
    const url = new URL(request.url);
    const token = url.searchParams.get("preview");
    if (token === secret) {
      url.searchParams.delete("preview");
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.pathname + url.search,
          "Set-Cookie": `${COOKIE_NAME}=${secret}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
        }
      });
    }
    if (hasValidCookie(request, secret)) {
      return env.ORIGIN.fetch(request);
    }
    return comingSoonResponse();
  }
};
var KOSTKA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 121.78 120.08" width="72" height="72" role="img" aria-label="KOSTKA TCG">
  <circle fill="#00b4d4" cx="99.79" cy="95.16" r="16.75" transform="translate(-28.82 45.43) rotate(-22.5)"/>
  <g fill="#fff">
    <path d="M34.85,65.15c.58-10.97.59-23.81.59-23.81l.93-22.36s.33-10.83-8.99-4.97c-9.31,5.85-16.67,14.18-18.63,22.68-1.97,8.5-1.96,16.48-1.96,16.48l-1.54,33.12c-.04.87.03,1.75.26,2.59.63,2.3,2.54,6.59,8.81,2.48,8.41-5.52,19.95-15.23,20.53-26.21ZM18.52,53.12c.38-1.99,1.01-3.79,1.78-5.08.77-1.3,1.37-1.56,1.59-1.52.02,0,.04.01.05.02.68.29,1.47,2.99.63,7.36-.83,4.34-2.65,6.74-3.36,6.6-.02,0-.03,0-.05-.02-.68-.29-1.47-2.99-.64-7.36Z"/>
    <path d="M51.82,80.12c7.83,1.34,21.11,3.61,30.98,5.29,3.39-5.88,9.73-9.85,16.99-9.85,2.47,0,4.83.46,7,1.3,0-.06,0-.12.01-.19.31-11.41.06-43.23.06-43.23,0,0-.07-12.25-13.16-16.62-.43-.14-.87-.25-1.31-.34l-39.45-8.16s-12.35-2.34-13.26,11.34c-.91,13.67-1.49,44.07-1.49,44.07,0,0,0,14.06,13.62,16.39ZM84.89,28.67c1.51-1.22,3.69-1.4,5.84-.49,1.32.55,2.52,1.48,3.48,2.66,2.61,3.24,2.68,7.54.16,9.57-1.51,1.21-3.69,1.4-5.84.49-1.31-.56-2.52-1.48-3.48-2.67-2.61-3.24-2.69-7.53-.16-9.57ZM84.22,60.7c1.51-1.22,3.69-1.4,5.85-.49,1.31.56,2.52,1.48,3.48,2.67,2.61,3.24,2.68,7.53.16,9.57-1.51,1.22-3.69,1.4-5.84.49-1.32-.56-2.52-1.48-3.48-2.67-2.61-3.24-2.69-7.53-.16-9.57ZM69.18,40.6c1.61-1.3,3.93-1.49,6.23-.52,1.4.59,2.68,1.57,3.7,2.83,1.37,1.7,2.12,3.71,2.13,5.66,0,1.89-.69,3.5-1.97,4.53-1.61,1.29-3.94,1.49-6.23.52-1.4-.59-2.68-1.57-3.7-2.83-2.78-3.45-2.85-8.02-.16-10.19ZM52.98,21.88c1.61-1.29,3.93-1.49,6.23-.52,1.4.59,2.68,1.57,3.7,2.84,1.37,1.7,2.12,3.71,2.13,5.66,0,1.89-.69,3.5-1.97,4.53-1.61,1.3-3.94,1.49-6.23.52-1.4-.59-2.68-1.57-3.7-2.83-2.78-3.45-2.85-8.02-.16-10.19ZM52.49,54.75c1.61-1.3,3.93-1.49,6.23-.52,1.4.59,2.68,1.57,3.7,2.83,2.78,3.44,2.85,8.02.16,10.19-1.61,1.3-3.93,1.49-6.23.53-1.4-.59-2.68-1.57-3.7-2.84-1.37-1.7-2.12-3.71-2.13-5.66,0-1.89.69-3.5,1.97-4.53Z"/>
    <path d="M80.2,95.16c0-2.38.43-4.66,1.21-6.77-5.36-.91-9.72-1.5-9.72-1.5l-20.98-3.27s-17.41-2.43-26.72,5.66c-10.05,8.73-16.81,10.66-6.65,13.41,4.47,1.21,42.53,6.61,42.53,6.61,0,0,11.53.91,21.41-3.93.48-.23.94-.46,1.4-.69-1.57-2.82-2.47-6.06-2.47-9.51ZM40.81,89.89c-.67-.28-.87-.52-.92-.59.26-.45,2.57-1.46,6.97-1.43,2.41.02,4.67.37,6.03.95.67.28.87.51.92.59-.26.45-2.57,1.46-6.97,1.43-2.42-.02-4.67-.37-6.03-.95ZM49.22,97.18c-.67-.28-.87-.52-.92-.59.26-.45,2.57-1.46,6.97-1.43,2.42.02,4.67.37,6.03.95.67.28.87.51.92.59-.25.44-2.56,1.46-6.97,1.43-2.41-.02-4.67-.37-6.03-.94ZM62.8,105.27c-2.42-.02-4.67-.37-6.03-.95-.67-.28-.87-.51-.92-.59.26-.45,2.57-1.46,6.97-1.43,2.42.02,4.67.37,6.03.95.67.28.87.51.92.59-.26.45-2.57,1.46-6.97,1.43Z"/>
  </g>
</svg>`;
var COMING_SOON_HTML = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>KOSTKA TCG \u2013 p\u0159ipravujeme nov\xFD web</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 0%, #3f3f49 0%, #36363f 55%, #2b2b32 100%);
    color: #fff;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 24px;
  }
  main {
    max-width: 480px;
    text-align: center;
  }
  .icon { margin-bottom: 28px; }
  h1 {
    font-size: clamp(1.5rem, 4vw, 2.1rem);
    font-weight: 800;
    letter-spacing: 0.02em;
    margin: 0 0 12px;
  }
  p {
    font-size: 1.05rem;
    line-height: 1.6;
    color: #d6d6db;
    margin: 0 0 28px;
  }
  .contact {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.95rem;
  }
  .contact a {
    color: #00b4d4;
    text-decoration: none;
  }
  .contact a:hover { text-decoration: underline; }
  footer {
    margin-top: 40px;
    font-size: 0.8rem;
    color: #8a8a92;
  }
</style>
</head>
<body>
  <main>
    <div class="icon">${KOSTKA_ICON_SVG}</div>
    <h1>Chyst\xE1me pro v\xE1s nov\xFD web KOSTKA TCG</h1>
    <p>Pracujeme na online rezervac\xEDch turnaj\u016F a lig. Web bude brzy spu\u0161t\u011Bn\xFD \u2013 mezit\xEDm n\xE1s najdete i takto:</p>
    <div class="contact">
      <a href="mailto:info@kostkatcg.cz">info@kostkatcg.cz</a>
      <a href="tel:+420773334488">+420 773 334 488</a>
    </div>
    <footer>KOSTKA TCG &middot; Doln\xED 782/65, Ostrava-Jih-Z\xE1b\u0159eh</footer>
  </main>
</body>
</html>`;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
