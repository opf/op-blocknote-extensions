const css = `
  [data-content-type="heading"] {
    scroll-margin-top: 1rem;
  }

  .op-bn-heading-link {
    display: inline-flex;
    margin-inline-start: 0.4em;
    padding: 2px;
    border: 0;
    border-radius: 4px;
    background: none;
    color: var(--bn-colors-side-menu);
    vertical-align: middle;
    cursor: pointer;
    opacity: 0;
  }

  .op-bn-heading-link:hover {
    color: var(--bn-colors-editor-text);
  }

  /* Touch browsers keep :hover on the last tapped element. */
  @media (hover: hover) {
    [data-content-type="heading"]:hover .op-bn-heading-link {
      opacity: 1;
    }
  }

  @media (hover: none) {
    .op-bn-heading-link {
      opacity: 0.6;
    }
  }

  /* The copy feedback stays visible after the pointer leaves. */
  .op-bn-heading-link:not([data-state="copy"]) {
    opacity: 1;
  }
`;

let sheet:CSSStyleSheet | undefined;

export function adoptHeadingLinkStyles(root:Document | ShadowRoot) {
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
  }
  if (!root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  }
}
