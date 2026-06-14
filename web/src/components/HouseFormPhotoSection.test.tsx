import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HouseFormPhotoSection } from './HouseFormPhotoSection';
import type { HousePhoto } from '../types';

function existingPhoto(id: string): HousePhoto {
  return { id, url: `https://example.com/${id}.jpg`, order: 0, label: null, createdAt: null };
}

function makeFile(name = 'room.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    writable: true,
    value: files,
  });
  fireEvent.change(input);
}

describe('HouseFormPhotoSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('登録済み1枚 + ファイル選択 → 「新規」バッジと追加予定メッセージが出る', async () => {
    function Harness() {
      const [pending, setPending] = useState<{ file: File; previewUrl: string }[]>([]);
      return (
        <HouseFormPhotoSection
          existingPhotos={[existingPhoto('p1')]}
          pendingPhotos={pending}
          onPendingChange={setPending}
          onRemoveExisting={vi.fn()}
          onRemovePending={vi.fn()}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByText(/登録済み 1 枚/)).toBeInTheDocument();
    expect(screen.queryByText('新規')).not.toBeInTheDocument();

    selectFiles(screen.getByTestId('photo-file-input') as HTMLInputElement, [makeFile()]);

    await waitFor(() => {
      expect(screen.getByText('新規')).toBeInTheDocument();
    });
    expect(screen.getByText(/枚があります。「保存」を押してください。/)).toBeInTheDocument();
  });

  it('ボタンクリックで hidden input が開ける（type=button で form submit しない）', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');

    render(
      <HouseFormPhotoSection
        existingPhotos={[]}
        pendingPhotos={[]}
        onPendingChange={vi.fn()}
        onRemoveExisting={vi.fn()}
        onRemovePending={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '写真ファイルを選ぶ' }));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
