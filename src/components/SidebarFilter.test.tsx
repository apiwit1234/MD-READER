import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarFilter } from './SidebarFilter';

describe('SidebarFilter', () => {
  it('renders an input with placeholder', () => {
    render(<SidebarFilter value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/filter files/i)).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();
    const TestWrapper = () => {
      const [value, setValue] = React.useState('');
      const handleChange = (newValue: string) => {
        onChangeMock(newValue);
        setValue(newValue);
      };
      return <SidebarFilter value={value} onChange={handleChange} />;
    };
    render(<TestWrapper />);
    const input = screen.getByPlaceholderText(/filter files/i);
    await user.type(input, 'docker');
    expect(onChangeMock).toHaveBeenLastCalledWith('docker');
  });

  it('shows clear button only when value is non-empty', () => {
    const { rerender } = render(<SidebarFilter value="" onChange={() => {}} />);
    expect(screen.queryByLabelText(/clear/i)).toBeNull();
    rerender(<SidebarFilter value="x" onChange={() => {}} />);
    expect(screen.getByLabelText(/clear/i)).toBeInTheDocument();
  });

  it('clears the value when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SidebarFilter value="docker" onChange={onChange} />);
    await user.click(screen.getByLabelText(/clear/i));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
