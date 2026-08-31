import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from '../../src/popup/TagInput';

describe('TagInput', () => {
  it('TI-01: gõ text rồi Enter thêm tag, input rỗng lại', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByLabelText('Thêm thẻ');
    await userEvent.type(input, 'react{Enter}');

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('TI-02: gõ text rồi dấu phẩy thêm tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react,');

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('TI-03: click nút xoá trên chip xoá tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['react', 'vue']} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Xoá thẻ react'));

    expect(onChange).toHaveBeenCalledWith(['vue']);
  });

  it('TI-04: gõ trùng tag đã có thì không thêm trùng', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['react']} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 'react{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('TI-05: gõ 2 ký tự khớp gợi ý, click gợi ý thêm tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} suggestions={['react', 'redux']} />);

    await userEvent.type(screen.getByLabelText('Thêm thẻ'), 're');
    await userEvent.click(screen.getByRole('option', { name: 'react' }));

    expect(onChange).toHaveBeenCalledWith(['react']);
  });
});
