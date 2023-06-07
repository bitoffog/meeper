import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
} from "@floating-ui/dom";

injectAndRetry();

function injectAndRetry() {
  try {
    injectMeeperButton();
  } catch {}

  setTimeout(injectAndRetry, 1_000);
}

function injectMeeperButton() {
  const micNode = document.querySelectorAll("button[data-is-muted]")![0];
  const toolbarNode =
    micNode.parentNode!.parentNode!.parentNode!.parentNode!.parentNode!;

  // Already injected
  if (
    (toolbarNode.firstChild as HTMLButtonElement)?.dataset?.meeper === "true"
  ) {
    return;
  }

  // Preview screen
  if (toolbarNode.childNodes.length < 3) return;

  trackState();
  trackMuted(micNode as HTMLButtonElement);
  initMeeperButton(toolbarNode);
}

const trackState = () => {
  // Listen messages from ContentScript
  window.addEventListener(
    "message",
    (evt) => {
      if (
        evt.source === window &&
        evt.origin === location.origin &&
        evt.data?.target === "meeper" &&
        evt.data?.to === "inpage"
      ) {
        console.info(evt.data);
      }
    },
    false
  );
};

const trackMuted = (micNode: HTMLButtonElement) => {
  const isMuted = () => micNode.dataset?.isMuted === "true";

  let latest = isMuted();

  const checkAndDefer = () => {
    const current = isMuted();

    if (current !== latest) {
      latest = current;

      sendMessage({
        type: "setmic",
        enabled: !current,
      });
    }

    setTimeout(checkAndDefer, 500);
  };

  checkAndDefer();
};

const sendMessage = (msg: Record<string, any>) => {
  window.postMessage(
    {
      target: "meeper",
      to: "content",
      ...msg,
    },
    location.origin
  );
};

const initMeeperButton = (container: ParentNode) => {
  const button = document.createElement("button");

  button.dataset.meeper = "true";
  button.type = "button";
  button.className = "__meeper_button";
  button.style.backgroundImage = `url('${MEEPER_BASE64}')`;
  button.id = "__meeper_toggle";
  button.setAttribute("aria-describedby", "__meeper_tooltip");

  const tooltip = document.createElement("div");
  tooltip.className = "__meeper_tooltip";
  tooltip.id = "__meeper_tooltip";
  tooltip.role = "tooltip";
  tooltip.textContent = "Hello!";

  const updateTooltip = () => {
    computePosition(button, tooltip, {
      placement: "top-start",
      middleware: [offset(6), flip(), shift({ padding: 5 })],
    }).then(({ x, y }) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  };

  const showTooltip = () => {
    tooltip.style.display = "block";
    updateTooltip();
  };

  const hideTooltip = () => {
    tooltip.style.display = "";
  };

  autoUpdate(button, tooltip, updateTooltip);

  (
    [
      ["mouseenter", showTooltip],
      ["mouseleave", hideTooltip],
      ["focus", showTooltip],
      ["blur", hideTooltip],
    ] as const
  ).forEach(([event, listener]) => {
    button.addEventListener(event, listener);
  });

  document.body.append(tooltip);
  container.prepend(button);
};

const MEEPER_BASE64 = `data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiCiAgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDggNDgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4IDQ4OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CiAgPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KICAgIC5zdDAgewogICAgICBmaWxsOiAjRkFCMjg1OwogICAgfQoKICAgIC5zdDEgewogICAgICBmaWxsOiAjRkZGRkZGOwogICAgfQoKICAgIC5zdDIgewogICAgICBmaWxsOiAjMUQxRDFCOwogICAgfQoKICAgIC5zdDMgewogICAgICBmaWxsOiAjRkQ4MzM5OwogICAgfQogIDwvc3R5bGU+CiAgPGc+CiAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzguNTYsNDIuMjFjLTYuNjItMi40Ni02LjI4LTAuMDYtMTIuMDEsMC42Yy0wLjc0LDAuMDktMS41OCwwLjE0LTIuNTUsMC4xNWMtMC45Ny0wLjAxLTEuODEtMC4wNy0yLjU1LTAuMTUKCQljLTUuNzMtMC42Ni01LjM4LTMuMDUtMTIuMDEtMC42Yy0xMC4wNCwzLjcyLTExLjQ4LTUuMDYtNi42Mi04LjU3QzcsMzAuNjEsNC41OCwyOS4yOCw0LjU4LDI0YzAtNS4yOCwyLjQyLTYuNjEtMS43Ni05LjY0CgkJYy00Ljg2LTMuNTItMy40Mi0xMi4zLDYuNjItOC41OGM2LjYyLDIuNDYsNi4yOCwwLjA2LDEyLjAxLTAuNkMyMi4xOSw1LjEsMjMuMDMsNS4wNSwyNCw1LjA0YzAuOTcsMC4wMSwxLjgxLDAuMDcsMi41NSwwLjE1CgkJYzUuNzMsMC42Niw1LjM4LDMuMDUsMTIuMDEsMC42YzEwLjA0LTMuNzIsMTEuNDgsNS4wNiw2LjYyLDguNThDNDEsMTcuMzksNDMuNDIsMTguNzIsNDMuNDIsMjRjMCw1LjI4LTIuNDIsNi42MSwxLjc2LDkuNjQKCQlDNTAuMDQsMzcuMTYsNDguNiw0NS45NCwzOC41Niw0Mi4yMXoiIC8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjIuMzksMTguMThjMCwyLjA3LTEuNjgsMy43NS0zLjc1LDMuNzVjLTAuOTUsMC0xLjgyLTAuMzUtMi40OC0wLjkzYy0wLjc4LTAuNjktMS4yNy0xLjY5LTEuMjctMi44MgoJCWMwLTEuMTIsMC40OS0yLjEzLDEuMjctMi44MmMwLjY2LTAuNTgsMS41My0wLjk0LDIuNDgtMC45NEMyMC43MSwxNC40MywyMi4zOSwxNi4xMSwyMi4zOSwxOC4xOHoiIC8+CiAgICA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTkuMzIsMTguMThjMCwxLjU3LTEuMjcsMi44My0yLjgzLDIuODNjLTAuMTEsMC0wLjIyLTAuMDEtMC4zMy0wLjAyYy0wLjc4LTAuNjktMS4yNy0xLjY5LTEuMjctMi44MgoJCWMwLTEuMTIsMC40OS0yLjEzLDEuMjctMi44MmMwLjExLTAuMDEsMC4yMi0wLjAyLDAuMzMtMC4wMkMxOC4wNSwxNS4zNSwxOS4zMiwxNi42MiwxOS4zMiwxOC4xOHoiIC8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjguMzgsMTguMThjMCwyLjA3LTEuNjgsMy43NS0zLjc1LDMuNzVjLTAuOTUsMC0xLjgyLTAuMzUtMi40OC0wLjkzYy0wLjc4LTAuNjktMS4yNy0xLjY5LTEuMjctMi44MgoJCWMwLTEuMTIsMC40OS0yLjEzLDEuMjctMi44MmMwLjY2LTAuNTgsMS41My0wLjk0LDIuNDgtMC45NEMyNi43LDE0LjQzLDI4LjM4LDE2LjExLDI4LjM4LDE4LjE4eiIgLz4KICAgIDxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0yNS4zMSwxOC4xOGMwLDEuNTctMS4yNywyLjgzLTIuODMsMi44M2MtMC4xMSwwLTAuMjItMC4wMS0wLjMzLTAuMDJjLTAuNzgtMC42OS0xLjI3LTEuNjktMS4yNy0yLjgyCgkJYzAtMS4xMiwwLjQ5LTIuMTMsMS4yNy0yLjgyYzAuMTEtMC4wMSwwLjIyLTAuMDIsMC4zMy0wLjAyQzI0LjA0LDE1LjM1LDI1LjMxLDE2LjYyLDI1LjMxLDE4LjE4eiIgLz4KICAgIDxnPgogICAgICA8cGF0aCBjbGFzcz0ic3QzIiBkPSJNMTIuNTIsMjguODdjMC4wNiwwLjA2LDAuMTMsMC4xMiwwLjIsMC4xN2MwLjQ3LDAuMzgsMC45NiwwLjc4LDEuNDksMS4xYzAuNjUsMC4zOSwxLjM4LDAuNjcsMi4wNywwLjk1CgkJCWMwLjQ5LDAuMiwxLDAuMzUsMS41MSwwLjQ2YzAuMzEsMC4wNywwLjYyLDAuMTIsMC45MywwLjE2YzAuNzQsMC4xLDEuNDcsMC4yMSwyLjIxLDAuMjVjMC43NywwLjA0LDEuNTMsMC4wMiwyLjI5LTAuMDcKCQkJYzEuMDItMC4xMywyLjA0LTAuMjUsMy4wMi0wLjU1YzAuMjYtMC4wOCwwLjUxLTAuMTcsMC43Ni0wLjI2YzAuNTctMC4yMiwxLjEzLTAuNDYsMS42OC0wLjcyYzAuMzItMC4xNSwwLjYzLTAuMzIsMC45Mi0wLjUxCgkJCWMwLjA5LTAuMDYsMC4xOC0wLjEyLDAuMjYtMC4xOGMwLjAzLTAuMDIsMC4wNi0wLjA0LDAuMDktMC4wNmMwLjMtMC4yMywwLjYyLTAuNDcsMC45Mi0wLjcxYzAuMDEtMC4wMSwwLjAyLTAuMDEsMC4wMi0wLjAyCgkJCWMwLjAxLDAsMC4wMS0wLjAxLDAuMDItMC4wMWMwLjQzLTAuNCwwLjczLTAuODcsMC45MS0xLjQyYzAuMjgtMC41MywwLjQtMS4wOSwwLjM4LTEuN2MwLjAyLTAuNjEtMC4xLTEuMTctMC4zOC0xLjcKCQkJYy0wLjE4LTAuNTUtMC40OC0xLjAyLTAuOTEtMS40MmMtMC4zLTAuMjMtMC42LTAuNDYtMC44OS0wLjY5Yy0wLjY5LTAuNC0xLjQzLTAuNi0yLjIzLTAuNmMtMC4zOSwwLjA1LTAuNzgsMC4xMS0xLjE3LDAuMTYKCQkJYy0wLjc1LDAuMjEtMS40LDAuNTktMS45NSwxLjEzYy0wLjAyLDAuMDEtMC4wMywwLjAzLTAuMDUsMC4wNGMwLjMtMC4yMywwLjYtMC40NiwwLjg5LTAuNjljLTAuNTEsMC4zOS0xLjEsMC42OS0xLjY5LDAuOTQKCQkJYzAuMzUtMC4xNSwwLjctMC4zLDEuMDUtMC40NGMtMC44OCwwLjM3LTEuODEsMC42MS0yLjc1LDAuNzRjMC4zOS0wLjA1LDAuNzgtMC4xMSwxLjE3LTAuMTZjLTEuMTMsMC4xNS0yLjI4LDAuMTQtMy40MS0wLjAxCgkJCWMwLjM5LDAuMDUsMC43OCwwLjExLDEuMTcsMC4xNmMtMC44OC0wLjEyLTEuNzUtMC4zMy0yLjU3LTAuNjhjMC4zNSwwLjE1LDAuNywwLjMsMS4wNSwwLjQ0Yy0wLjUxLTAuMjEtMS0wLjQ4LTEuNDMtMC44MQoJCQljMC4zLDAuMjMsMC42LDAuNDYsMC44OSwwLjY5Yy0wLjA5LTAuMDctMC4xNy0wLjE0LTAuMjUtMC4yMWMtMC40LTAuNDMtMC44Ny0wLjczLTEuNDItMC45MWMtMC41My0wLjI4LTEuMDktMC40LTEuNy0wLjM4CgkJCWMtMC42MS0wLjAyLTEuMTcsMC4xLTEuNywwLjM4Yy0wLjU1LDAuMTgtMS4wMiwwLjQ4LTEuNDIsMC45MWMtMC4yMywwLjMtMC40NiwwLjYtMC42OSwwLjg5Yy0wLjQsMC42OS0wLjYsMS40My0wLjYsMi4yMwoJCQljMC4wNSwwLjM5LDAuMTEsMC43OCwwLjE2LDEuMTdDMTEuNTksMjcuNjcsMTEuOTcsMjguMzIsMTIuNTIsMjguODdMMTIuNTIsMjguODd6IiAvPgogICAgPC9nPgogICAgPGc+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0xNS4xMiwyNi4yN2MwLjI3LDAuMjcsMC42MSwwLjUsMC45NCwwLjY5YzAuODMsMC40OSwxLjc3LDAuODMsMi43MSwxLjA0YzEuNDUsMC4zMiwyLjk5LDAuNCw0LjQ2LDAuMjIKCQkJYzEuMjYtMC4xNiwyLjQ3LTAuNDksMy42MS0xLjAzYzAuMzItMC4xNSwwLjYzLTAuMzIsMC45Mi0wLjUxYzAuMTgtMC4xMiwwLjM4LTAuMjQsMC41NC0wLjM5YzAuMDEsMCwwLjAxLTAuMDEsMC4wMi0wLjAxCgkJCWMwLjE0LTAuMTEsMC4yMi0wLjM1LDAuMjItMC41MmMwLTAuMTgtMC4wOC0wLjQtMC4yMi0wLjUyYy0wLjMyLTAuMjktMC43Mi0wLjI2LTEuMDQsMGMtMC4wMSwwLjAxLTAuMDMsMC4wMi0wLjA0LDAuMDQKCQkJYzAuMjgtMC4yMywwLjA4LTAuMDYsMC4wMS0wLjAxYy0wLjE3LDAuMTItMC4zNSwwLjIzLTAuNTMsMC4zM2MtMC4yOCwwLjE2LTAuNTYsMC4zLTAuODYsMC40M2MtMC4wNSwwLjAyLTAuMDksMC4wNC0wLjE0LDAuMDYKCQkJYy0wLjA4LDAuMDMsMC4yLTAuMDgsMC4wOS0wLjA0Yy0wLjAyLDAuMDEtMC4wNCwwLjAyLTAuMDcsMC4wM2MtMC4xLDAuMDQtMC4yLDAuMDgtMC4zLDAuMTJjLTAuMjEsMC4wOC0wLjQyLDAuMTUtMC42MywwLjIxCgkJCWMtMC41NiwwLjE3LTEuMTMsMC4yOS0xLjcxLDAuMzZjMC4wNy0wLjAxLDAuMTMtMC4wMiwwLjItMC4wM2MtMS4xMywwLjE1LTIuMjgsMC4xNC0zLjQxLTAuMDFjMC4wNywwLjAxLDAuMTMsMC4wMiwwLjIsMC4wMwoJCQljLTAuNTItMC4wNy0xLjA0LTAuMTgtMS41NS0wLjMyYy0wLjIxLTAuMDYtMC40Mi0wLjEzLTAuNjMtMC4yYy0wLjA5LTAuMDMtMC4xOC0wLjA3LTAuMjgtMC4xMWMtMC4wMi0wLjAxLTAuMDUtMC4wMi0wLjA3LTAuMDMKCQkJYy0wLjA5LTAuMDQsMC4xMiwwLjA1LDAuMTEsMC4wNGMtMC4wNS0wLjAxLTAuMTEtMC4wNS0wLjE2LTAuMDdjLTAuMjgtMC4xMy0wLjU1LTAuMjctMC44Mi0wLjQzYy0wLjEtMC4wNi0wLjE5LTAuMTItMC4yOC0wLjE5CgkJCWMtMC4wNC0wLjAzLTAuMDctMC4wNS0wLjExLTAuMDhjLTAuMTEtMC4wOCwwLjE0LDAuMTEsMC4wOSwwLjA3Yy0wLjAyLTAuMDEtMC4wMy0wLjAyLTAuMDUtMC4wNGMtMC4wNi0wLjA1LTAuMTMtMC4xLTAuMTktMC4xNgoJCQljLTAuMjctMC4yOC0wLjc3LTAuMjktMS4wNCwwQzE0Ljg1LDI1LjUzLDE0LjgzLDI1Ljk4LDE1LjEyLDI2LjI3TDE1LjEyLDI2LjI3eiIgLz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=`;
