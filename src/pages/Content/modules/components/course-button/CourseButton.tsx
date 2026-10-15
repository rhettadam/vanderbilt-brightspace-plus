import React from 'react';
import styled from 'styled-components';

interface StyledButtonProps {
  menuVisible: boolean;
  last: boolean;
  color: string;
}

const StyledButton = styled.div<StyledButtonProps>`
  border-bottom: 1px solid rgba(199, 205, 209, 0.5);
  font-weight: bold;
  font-size: 14px;
  line-height: 1.4;
  position: relative;
  padding: 8px;
  background-color: inherit;
  opacity: 100%;
  z-index: 20;
  &:hover {
    cursor: pointer;
    background: rgba(150, 150, 150, 0.2);
  }
  display: ${(props) => (props.menuVisible ? 'flex' : 'none')};
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: ${(props) => props.color};
  ${(props) =>
    props.last
      ? `
    border-radius: 0px 0px 4px 4px;
    border-bottom: none;
  `
      : ''}
`;

const CourseName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ColorSwatch = styled.label<{ color: string }>`
  position: relative;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  background-color: ${(props) => props.color};
  cursor: pointer;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);

  input[type='color'] {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    cursor: pointer;
  }
`;

export interface CourseButtonProps {
  name: string;
  color: string;
  id: string;
  last: boolean;
  setCourse: (id: string) => void;
  menuVisible: boolean;
  setMenuVisible: (menuVisible: boolean) => void;
  onColorChange?: (id: string, color: string) => void;
}

/*
  Individual options in course name dropdown
*/
export default function CourseButton({
  name,
  color = 'black',
  id = '',
  last = false,
  setCourse,
  menuVisible,
  setMenuVisible,
  onColorChange,
}: CourseButtonProps): JSX.Element {
  function handleClick() {
    setCourse(id);
    setMenuVisible(false);
  }

  function handleColorClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (id && onColorChange) onColorChange(id, e.target.value);
  }

  const canEditColor = Boolean(id && onColorChange);

  return (
    <StyledButton
      color={color}
      last={last}
      menuVisible={menuVisible}
      onClick={handleClick}
    >
      <CourseName>{name}</CourseName>
      {canEditColor ? (
        <ColorSwatch
          color={color}
          onClick={handleColorClick}
          title="Change course color"
        >
          <input
            aria-label={`Change color for ${name}`}
            onChange={handleColorChange}
            onClick={handleColorClick}
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#4989F4'}
          />
        </ColorSwatch>
      ) : null}
    </StyledButton>
  );
}
