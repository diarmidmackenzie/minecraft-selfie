function setUpDrawer(id) {
  const drawer = document.querySelector(id);
  const openButton = drawer.nextElementSibling;
  const closeButton = drawer.querySelector('sl-button[type="primary"]');

  openButton.addEventListener('click', () => drawer.show());
  closeButton.addEventListener('click', () => drawer.hide());
}

function setUpCheckbox(id, target, checked, unchecked) {
  const checkbox = document.querySelector(id);
  const targetEl = document.querySelector(target);
  checkbox.addEventListener('sl-change', () => {
                                               checkbox.checked ?
                                               checked(targetEl) :
                                               unchecked(targetEl)
                                               })
}

function setUpSkinSelector(id, skinid) {
  const button = document.querySelector(id);
  const head = document.querySelector("#head")

  button.addEventListener('click', () => {
                                            head.setAttribute("material-pixellated",
                                                              `src: ${skinid}`);
                                          })
}

setUpDrawer("#skins")
setUpDrawer("#backgrounds")
setUpDrawer("#props")
setUpDrawer("#options")

setUpCheckbox("#video-feed-checkbox",
              "#input-video",
              (target) => (target.removeAttribute("style")),
              (target) => (target.setAttribute("style", "display: none")))
setUpCheckbox("#perf-stats-checkbox",
              "#scene",
              (target) => (target.setAttribute("stats", "")),
              (target) => (target.removeAttribute("stats")))
setUpSkinSelector("#skin-steve", "#steve-skin")
setUpSkinSelector("#skin-alex", "#alex-skin")
setUpSkinSelector("#skin-creeper", "#creeper-skin")
setUpSkinSelector("#skin-dantdm", "#dantdm-skin")
