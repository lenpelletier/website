/* -------------------------------------------------------------
   Code viewer
   - Any link with class="code-view" opens its image in an overlay
     on top of the page instead of navigating away.
   - Click anywhere or press Esc to close.
   - Load with: <script src="js/codeview.js" defer></script>
   ------------------------------------------------------------- */
(function () {
  "use strict";

  var overlay = document.createElement("div");
  overlay.style.cssText =
    "display:none; position:fixed; inset:0; z-index:1000; overflow:auto;" +
    "padding:40px 16px; text-align:center; cursor:zoom-out;" +
    "background:rgba(0,0,0,0.8);";

  var img = document.createElement("img");
  img.style.cssText =
    "max-width:100%; height:auto; border-radius:6px;" +
    "box-shadow:0 8px 30px rgba(0,0,0,0.6);";
  // Images are rendered at 2x, so show them at half size for crisp text.
  img.onload = function () { img.style.width = img.naturalWidth / 1.5 + "px"; };

  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function open(link) {
    img.style.width = "";
    img.src = link.href;
    img.alt = link.textContent;
    overlay.style.display = "block";
    overlay.scrollTop = 0;
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.style.display = "none";
    img.removeAttribute("src");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest("a.code-view");
    // Let ctrl/cmd/middle-click still open the image in a new tab.
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    open(link);
  });

  overlay.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
