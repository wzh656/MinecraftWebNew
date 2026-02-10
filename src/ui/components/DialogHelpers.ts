import type { UICallbacks } from "../types";

export function showDeleteConfirm(
  uiLayer: HTMLElement,
  worldName: string,
  callbacks: UICallbacks,
): void {
  const dialog = document.createElement("div");
  dialog.className = "mc-dialog-overlay";

  const content = document.createElement("div");
  content.className = "mc-dialog";

  const title = document.createElement("div");
  title.className = "mc-dialog-title";
  title.textContent = "删除世界";

  const message = document.createElement("div");
  message.className = "mc-font";
  message.style.color = "white";
  message.style.textAlign = "center";
  message.style.margin = "16px 0";
  message.textContent = `确定要删除世界 "${worldName}" 吗？\n此操作无法撤销。`;
  message.style.whiteSpace = "pre-line";

  const buttonRow = document.createElement("div");
  buttonRow.className = "mc-dialog-buttons";

  const confirmBtn = createDialogButton(
    "删除",
    () => {
      callbacks.onWorldDelete?.(worldName);
      dialog.remove();
    },
    "mc-button-small mc-button-danger",
  );

  const cancelBtn = createDialogButton(
    "取消",
    () => {
      dialog.remove();
    },
    "mc-button-small",
  );

  buttonRow.appendChild(confirmBtn);
  buttonRow.appendChild(cancelBtn);

  content.appendChild(title);
  content.appendChild(message);
  content.appendChild(buttonRow);
  dialog.appendChild(content);
  uiLayer.appendChild(dialog);
}

export function showEditWorldDialog(
  uiLayer: HTMLElement,
  worldName: string,
  onConfirm: (newName: string) => void,
): void {
  const dialog = document.createElement("div");
  dialog.className = "mc-dialog-overlay";

  const content = document.createElement("div");
  content.className = "mc-dialog";
  content.style.width = "400px";

  const title = document.createElement("div");
  title.className = "mc-dialog-title";
  title.textContent = "重命名世界";

  const label = document.createElement("div");
  label.className = "mc-label";
  label.textContent = "新世界名称:";
  label.style.marginTop = "16px";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "mc-input";
  input.style.width = "100%";
  input.style.marginTop = "4px";
  input.value = worldName;
  input.placeholder = "输入新的世界名称";

  const buttonRow = document.createElement("div");
  buttonRow.className = "mc-dialog-buttons";
  buttonRow.style.marginTop = "24px";

  const confirmBtn = createDialogButton(
    "确认",
    () => {
      const newName = input.value.trim();
      if (newName && newName !== worldName) {
        onConfirm(newName);
      }
      dialog.remove();
    },
    "mc-button-small",
  );

  const cancelBtn = createDialogButton(
    "取消",
    () => {
      dialog.remove();
    },
    "mc-button-small",
  );

  buttonRow.appendChild(confirmBtn);
  buttonRow.appendChild(cancelBtn);

  content.appendChild(title);
  content.appendChild(label);
  content.appendChild(input);
  content.appendChild(buttonRow);
  dialog.appendChild(content);
  uiLayer.appendChild(dialog);

  input.focus();
  input.select();
}

function createDialogButton(
  text: string,
  onClick: () => void,
  className: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = `mc-button ${className}`;
  btn.addEventListener("click", onClick);
  return btn;
}
