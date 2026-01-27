import { MessageCopyController } from './MessageCopyController';

describe('MessageCopyController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global as any).navigator = {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete (global as any).navigator;
  });

  it('copies message content and resets copied index', async () => {
    const onCopied = jest.fn();
    const controller = new MessageCopyController({ onCopied, resetDelayMs: 50 });

    await controller.copyMessage('hello', 2);

    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(onCopied).toHaveBeenCalledWith(2);

    jest.advanceTimersByTime(50);
    expect(onCopied).toHaveBeenLastCalledWith(null);
  });

  it('does not throw when clipboard write fails', async () => {
    const onCopied = jest.fn();
    (navigator as any).clipboard.writeText = jest.fn().mockRejectedValue(new Error('fail'));
    const controller = new MessageCopyController({ onCopied, resetDelayMs: 50 });

    await controller.copyMessage('hello', 1);

    expect(onCopied).not.toHaveBeenCalled();
  });
});

