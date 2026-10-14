interface RendererFrame { url: string }

export function isTrustedIpcSender(
  event: { sender: unknown; senderFrame: RendererFrame | null },
  target: { webContents: { mainFrame: RendererFrame }; expectedURL: string }
): boolean {
  return event.sender === target.webContents
    && event.senderFrame === target.webContents.mainFrame
    && event.senderFrame?.url === target.expectedURL;
}
