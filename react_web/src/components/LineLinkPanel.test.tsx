import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineLinkPanel } from './LineLinkPanel';

describe('LineLinkPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('連携状態だけを出し、物件テーブルは出さない', () => {
    render(
      <LineLinkPanel
        loading={false}
        linked
        linkedAtLabel="2026/6/16"
        linkCode={null}
        linkError={null}
        linkSubmitting={false}
        unlinkSubmitting={false}
        addFriendUrl="https://lin.ee/example"
        onStartLink={vi.fn()}
        onUnlink={vi.fn()}
      />
    );

    expect(screen.getByText('LINE 通知: 連携済み')).toBeInTheDocument();
    expect(screen.getByText('連携日: 2026/6/16')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '新規登録' })).not.toBeInTheDocument();
  });
});
