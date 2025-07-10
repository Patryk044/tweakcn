export function applyStyleToElement(
  element: HTMLElement,
  key: string,
  value: string
) {
  const currentStyle = element.getAttribute("style") || "";
  // Remove the existing variable definitions with the same name
  const cleanedStyle = currentStyle.replace(
    new RegExp(`--${key}:\\s*[^;]+;?`, "g"), 
    ""
  ).replace(
    new RegExp(`--color-${key}:\\s*[^;]+;?`, "g"), 
    ""
  ).replace(
    new RegExp(`--theme-${key}:\\s*[^;]+;?`, "g"), 
    ""
  ).trim();

  element.setAttribute(
    "style",
    `${cleanedStyle}--${key}: ${value}; --color-${key}: ${value}; --theme-${key}: ${value};`
  );
}
