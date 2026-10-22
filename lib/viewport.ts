/**
 * Stable viewport height (px) that matches CSS `var(--app-h)`.
 *
 * Phones grow `innerHeight` when the URL bar hides; the scroll stages are sized
 * to the large viewport (`100lvh`) so the axis math must not follow the bar.
 */

let cached = 0;
let probe: HTMLDivElement | null = null;
let listening = false;

function measure() {
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:var(--app-h,100vh);visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);
  }
  cached = probe.offsetHeight || window.innerHeight;
}

export function viewportH(): number {
  if (!listening) {
    listening = true;
    const reset = () => {
      cached = 0;
    };
    window.addEventListener("resize", reset);
    window.addEventListener("orientationchange", reset);
  }
  if (!cached) measure();
  return cached;
}
