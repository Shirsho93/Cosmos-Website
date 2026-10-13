/** Tiny DOM builder. Text always goes through textContent, so API data can't inject markup. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value
    else if (key === 'text') node.textContent = value
    else if (key === 'style') Object.assign(node.style, value)
    else if (key.startsWith('--')) node.style.setProperty(key, value)
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value)
    else node.setAttribute(key, value)
  }
  node.append(...children.filter((c) => c != null))
  return node
}
