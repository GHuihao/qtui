// @ts-check

// Script run within the webview itself.
(function () {
  // Get a reference to the VS Code webview api.
  // We use this API to post messages back to our extension.

  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const addButtonContainer = document.querySelector(".add-button");
  if (!addButtonContainer) {
    throw new Error("Could not find add button container");
  }
  const btn = addButtonContainer.querySelector("button");
  if (!btn) {
    throw new Error("Could not find add button");
  }
  btn.addEventListener("click", () => {
    vscode.postMessage({
      type: "open",
    });
  });

  const pathinput = document.querySelector("#pathinput");
  const fileInput = document.querySelector("#fileinput");
  const updateCfg = (e) => {
    vscode.postMessage({
      type: "updateCfg",
      data: e.target.value,
    });
  };
  if (!pathinput || !(pathinput instanceof HTMLInputElement)) {
    throw new Error("Could not find input");
  }
  if (!fileInput) {
    throw new Error("Could not find input");
  }
  pathinput.addEventListener("change", updateCfg);
  fileInput.addEventListener("change", updateCfg);

  const errorContainer = document.createElement("div");
  document.body.appendChild(errorContainer);
  errorContainer.className = "error";
  errorContainer.style.display = "none";
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "updateDesignerPath":
        pathinput.value = message.data;
        break;
    }
  });
  vscode.postMessage({
    type: "getDesignerPath",
  });
})();
