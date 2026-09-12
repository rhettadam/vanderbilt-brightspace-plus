import { BrightspaceLMSConfig } from '.';
import runApp from '../..';
import { getOptions } from '../../hooks/useOptions';
import {
  colorFromId,
  loadCustomColors,
  setCustomColors,
  StoredCustomColors,
} from '../shared/customColors';

function setStyles() {
  document.documentElement.style.setProperty(
    '--ic-brand-font-color-dark',
    'rgb(32, 33, 34)'
  );
  document.documentElement.style.setProperty(
    '--ic-brand-global-nav-bgd',
    '#002040'
  );
}

function makeColorPicker(
  callback: (color: string) => void,
  defaultColor: string,
  card: HTMLElement
) {
  const wrapper = document.createElement('wrapper');
  const picker = document.createElement('input');
  wrapper.appendChild(picker);
  picker.type = 'color';
  picker.addEventListener('input', (ev: Event) => {
    callback((ev?.target as HTMLInputElement).value);
  });
  wrapper.style.position = 'absolute';
  wrapper.style.width = '40px';
  wrapper.style.height = '40px';
  wrapper.style.left = '0px';
  wrapper.style.top = '0px';
  wrapper.style.zIndex = '1000';
  wrapper.style.borderRadius = '5px';
  wrapper.style.cursor = 'pointer';
  wrapper.style.margin = '10px';
  wrapper.style.border = '1px solid #e3e9f1';

  picker.style.opacity = '0';
  picker.style.width = '40px';
  picker.style.height = '40px';
  picker.style.cursor = 'pointer';

  picker.value = defaultColor;
  wrapper.style.backgroundColor = picker.value;
  card.style.color = picker.value;

  picker.onchange = () => {
    wrapper.style.backgroundColor = picker.value;
    card.style.color = picker.value;
  };

  card.shadowRoot?.querySelector('.d2l-card-container')?.appendChild(wrapper);

  return wrapper;
}

function setColorPicker(root: HTMLElement, colors: StoredCustomColors) {
  const card = root.shadowRoot?.querySelector('d2l-card') as HTMLElement;
  if (!card) return;
  const hrefObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutationRecord) => {
      if (mutationRecord.attributeName === 'href') {
        const href = (mutationRecord.target as HTMLElement).getAttribute(
          'href'
        );
        if (href) {
          const id = href.split('/').pop();
          if (id) {
            const color = id in colors ? colors[id] : colorFromId(id);
            makeColorPicker(
              (color: string) => {
                setCustomColors('brightspace_custom', { [id]: color });
              },
              color,
              card
            );
            hrefObserver.disconnect();
          }
        }
      }
    });
  });
  hrefObserver.observe(card, { attributes: true });
}

async function setColorPickers() {
  const currColors = await loadCustomColors('brightspace_custom');
  let selector = document.querySelector('d2l-my-courses');
  if (!selector || !selector.shadowRoot) return;
  selector = selector.shadowRoot.querySelector('d2l-my-courses-container');
  if (!selector || !selector.shadowRoot) return;

  const observerGrid = new MutationObserver((mutations) => {
    mutations.forEach((mutationRecord) => {
      mutationRecord.addedNodes.forEach((node) => {
        const htmlNode = node as HTMLElement;
        if (
          htmlNode &&
          htmlNode.classList &&
          htmlNode.classList.contains('course-card-grid')
        ) {
          const cards = htmlNode.querySelectorAll('d2l-enrollment-card');
          cards.forEach((card) =>
            setColorPicker(card as HTMLElement, currColors)
          );
        }
      });
    });
  });

  const observerTabs = new MutationObserver((mutations) => {
    mutations.forEach((mutationRecord) => {
      mutationRecord.addedNodes.forEach((node) => {
        if ((node as HTMLElement).tagName === 'D2L-TABS') {
          const htmlNode = node as HTMLElement;
          const content = htmlNode.querySelectorAll('d2l-my-courses-content');
          content.forEach((content) => {
            if (content && content.shadowRoot) {
              const grid = content.shadowRoot.querySelector(
                'd2l-my-courses-card-grid'
              );
              if (grid && grid.shadowRoot) {
                const cards = grid.shadowRoot.querySelectorAll(
                  'd2l-enrollment-card'
                );
                if (!cards.length) {
                  observerGrid.observe(grid.shadowRoot, {
                    childList: true,
                    subtree: true,
                  });
                } else {
                  cards.forEach((card) =>
                    setColorPicker(card as HTMLElement, currColors)
                  );
                }
              }
            }
          });

          observerTabs.disconnect();
        }
      });
    });
  });

  observerTabs.observe(selector.shadowRoot, {
    childList: true,
  });
}

function widgetTitle(el: Element): string {
  const heading = el.querySelector(
    'h2, h3, .d2l-heading, .d2l-widget-header, .d2l-widget-header-title, [class*="widget-header"]'
  );
  return (heading?.textContent || el.textContent || '').trim();
}

/** Find Student/Instructor Announcements (or similar) homepage widgets. */
function findAnnouncementWidgets(): HTMLElement[] {
  const widgets = Array.from(
    document.querySelectorAll(
      '.d2l-widget, .d2l-tile, .homepage-col-4 .d2l-box, [class*="homepage-col"] .d2l-widget'
    )
  ) as HTMLElement[];

  return widgets.filter((w) => {
    if (w.classList.contains('tfc-brightspace-root')) return false;
    const title = widgetTitle(w);
    return /announcement/i.test(title);
  });
}

function isOrgHomepage(): boolean {
  // Org home only — never course homes (/d2l/home/12345) or other tools.
  return /^\/d2l\/home\/?$/i.test(location.pathname);
}

function mountRoot(root: HTMLElement): boolean {
  const announcements = findAnnouncementWidgets();
  if (announcements.length) {
    const target = announcements[0];
    announcements.forEach((w) => {
      w.style.display = 'none';
      w.setAttribute('data-tfc-hidden-announcements', 'true');
    });
    target.parentElement?.insertBefore(root, target);
    return true;
  }

  // Upstream Tasks for Canvas Brightspace placement: rightmost homepage column.
  const firstRow = document.querySelector('.homepage-container .homepage-row');
  const cols = firstRow?.querySelectorAll('[class*="homepage-col-"]');
  if (cols && cols.length) {
    cols[cols.length - 1]?.prepend(root);
    return true;
  }

  // Do NOT fall back to a floating sidebar on other pages.
  return false;
}

function waitForOrgHomepage(callback: () => void) {
  if (!isOrgHomepage()) return;

  if (document.querySelector('.homepage-container')) {
    callback();
    return;
  }

  const observer = new MutationObserver(() => {
    if (!isOrgHomepage()) {
      observer.disconnect();
      return;
    }
    if (document.querySelector('.homepage-container')) {
      observer.disconnect();
      callback();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.setTimeout(() => {
    observer.disconnect();
    if (isOrgHomepage() && document.querySelector('.homepage-container')) {
      callback();
    }
  }, 8000);
}

export default async function BrightspaceEntrypoint() {
  if (!isOrgHomepage()) return;

  waitForOrgHomepage(async () => {
    if (!isOrgHomepage()) return;
    if (document.querySelector('.tfc-brightspace-root')) return;

    const root = document.createElement('div');
    root.style.setProperty('line-height', '1.5');
    root.className = 'd2l-tile d2l-widget tfc-brightspace-root';
    setStyles();
    const mounted = mountRoot(root);
    if (!mounted) {
      root.remove();
      return;
    }
    runApp(root, BrightspaceLMSConfig, await getOptions());
    setColorPickers();
  });
}
