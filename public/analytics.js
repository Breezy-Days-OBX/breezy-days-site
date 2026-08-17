const bootstrap = document.currentScript;
const ga4Id = bootstrap?.dataset.ga4Id?.trim();
const clarityId = bootstrap?.dataset.clarityId?.trim();

if (ga4Id) {
  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
  document.head.append(gtagScript);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ga4Id, { send_page_view: true });
}

if (clarityId) {
  window.clarity =
    window.clarity ||
    function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
  const clarityScript = document.createElement("script");
  clarityScript.async = true;
  clarityScript.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
  document.head.append(clarityScript);
}
