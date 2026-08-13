import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { ignoreEpipe, isEpipe } from '../src/cli/epipe.js';
import { Reporter } from '../src/cli/reporter.js';

function epipeError(): NodeJS.ErrnoException {
  return Object.assign(new Error('write EPIPE'), { code: 'EPIPE', errno: -32, syscall: 'write' });
}

/**
 * A genuine pipe whose reader is gone — the real thing, not a stub: a child
 * process that closes its read end and then stays alive, so writing to it
 * produces an actual EPIPE from the OS, exactly as `| head -3` does to us.
 *
 * (The child has to outlive the close. Were it to exit instead, Node would
 * destroy our end of the pipe and quietly drop the writes, which is not the
 * failure being tested.)
 */
async function pipeWithNoReader(): Promise<{
  stream: NodeJS.WriteStream;
  epipes: () => number;
  close: () => void;
}> {
  const child = spawn(
    process.execPath,
    [
      '-e',
      'require("fs").closeSync(0); process.stdout.write("ready"); setTimeout(() => {}, 30_000)',
    ],
    { stdio: ['pipe', 'pipe', 'ignore'] },
  );
  const stream = child.stdin as unknown as NodeJS.WriteStream;

  // Attached before the reader goes away, exactly as the CLI attaches before
  // its first byte of output — an EPIPE arriving in between would otherwise be
  // the unhandled crash this whole module exists to prevent.
  let count = 0;
  ignoreEpipe(stream, () => {
    count += 1;
  });

  await once(child.stdout, 'data'); // fd 0 is closed by the time this resolves
  return { stream, epipes: () => count, close: () => child.kill() };
}

describe('isEpipe', () => {
  it('recognizes the closed-pipe error and nothing else', () => {
    expect(isEpipe(epipeError())).toBe(true);
    expect(isEpipe(new Error('write EPIPE'))).toBe(false);
    expect(isEpipe(Object.assign(new Error('nope'), { code: 'ENOSPC' }))).toBe(false);
    expect(isEpipe(undefined)).toBe(false);
    expect(isEpipe('EPIPE')).toBe(false);
  });
});

describe('ignoreEpipe', () => {
  it('a Reporter writing into a closed pipe neither throws nor crashes', async () => {
    const { stream, epipes, close } = await pipeWithNoReader();
    const reporter = new Reporter(stream);

    // Every write path, since the crash was never specific to one command.
    expect(() => {
      reporter.intro('9.9.9');
      reporter.list([{ id: 'stripe', category: 'payments', name: 'Stripe' }]);
      reporter.checks([
        { id: 'node', name: 'node', ok: true, detail: 'v20', severity: 'required' },
      ]);
      reporter.doctorSummary(true);
      reporter.plain('done');
    }).not.toThrow();

    // The error arrives on a later tick — a synchronous `not.toThrow` alone
    // would pass even with no handler installed at all.
    await once(stream, 'error');
    expect(epipes()).toBeGreaterThan(0);
    close();
  });

  it('rethrows a stream error that is not EPIPE, so real failures stay loud', () => {
    const stream = new PassThrough();
    ignoreEpipe(stream, () => {
      throw new Error('should not have been treated as EPIPE');
    });

    expect(() =>
      stream.emit('error', Object.assign(new Error('disk full'), { code: 'ENOSPC' })),
    ).toThrow('disk full');
  });

  it('no-ops on the bare stream object tests inject into Reporter', () => {
    const fake = { write: () => true } as unknown as NodeJS.WriteStream;
    expect(() => ignoreEpipe(fake)).not.toThrow();
    expect(() => new Reporter(fake).plain('still works')).not.toThrow();
  });
});

describe('Reporter.write', () => {
  it('swallows an EPIPE thrown synchronously by its stream', () => {
    const stream = {
      write: () => {
        throw epipeError();
      },
    } as unknown as NodeJS.WriteStream;

    expect(() => new Reporter(stream).plain('truncated')).not.toThrow();
    expect(() => new Reporter(stream).intro('9.9.9')).not.toThrow();
  });

  it('rethrows any other write failure', () => {
    const stream = {
      write: () => {
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      },
    } as unknown as NodeJS.WriteStream;

    expect(() => new Reporter(stream).plain('x')).toThrow('disk full');
  });
});
