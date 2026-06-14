import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoFileInput } from './PhotoFileInput';
import { releasePhotoPreviewUrl } from '../lib/photoFileSelection';

function makeFile(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
}

describe('PhotoFileInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('ファイル選択後に onAdditions が同期的に呼ばれる', () => {
    const onAdditions = vi.fn<(additions: { previewUrl: string }[]) => void>();
    const onError = vi.fn();

    render(
      <PhotoFileInput
        existingCount={1}
        pendingCount={0}
        onAdditions={onAdditions}
        onError={onError}
      />
    );

    const input = screen.getByTestId('photo-file-input') as HTMLInputElement;
    setInputFiles(input, [makeFile('room.jpg', 'image/jpeg')]);

    expect(onError).not.toHaveBeenCalled();
    expect(onAdditions).toHaveBeenCalledTimes(1);
    const additions = onAdditions.mock.calls[0][0];
    expect(additions).toHaveLength(1);
    expect(additions[0].previewUrl.startsWith('blob:')).toBe(true);

    releasePhotoPreviewUrl(additions[0].previewUrl);
  });

  it('PDF 選択時は onError を呼ぶ', () => {
    const onAdditions = vi.fn();
    const onError = vi.fn();

    render(
      <PhotoFileInput
        existingCount={0}
        pendingCount={0}
        onAdditions={onAdditions}
        onError={onError}
      />
    );

    const input = screen.getByTestId('photo-file-input') as HTMLInputElement;
    setInputFiles(input, [makeFile('doc.pdf', 'application/pdf')]);

    expect(onAdditions).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/画像ファイル/));
  });

  it('上限超過時は onError を呼ぶ', () => {
    const onAdditions = vi.fn();
    const onError = vi.fn();

    render(
      <PhotoFileInput
        existingCount={20}
        pendingCount={0}
        onAdditions={onAdditions}
        onError={onError}
      />
    );

    const input = screen.getByTestId('photo-file-input') as HTMLInputElement;
    setInputFiles(input, [makeFile('one.jpg', 'image/jpeg')]);

    expect(onAdditions).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/最大 20 枚/));
  });
});
