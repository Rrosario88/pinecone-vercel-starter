export type MessageCopyControllerOptions = {
  onCopied: (index: number | null) => void;
  resetDelayMs?: number;
};

export class MessageCopyController {
  private readonly onCopied: (index: number | null) => void;
  private readonly resetDelayMs: number;

  constructor(options: MessageCopyControllerOptions) {
    this.onCopied = options.onCopied;
    this.resetDelayMs = options.resetDelayMs ?? 2000;
  }

  async copyMessage(content: string, index: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      this.onCopied(index);
      setTimeout(() => this.onCopied(null), this.resetDelayMs);
    } catch {
      // Clipboard API failed - silently ignore
    }
  }
}
