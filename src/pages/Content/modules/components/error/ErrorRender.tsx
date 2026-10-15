import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import styled from 'styled-components';

const ErrorWrapper = styled.div`
  padding: 10px 0px;
`;

const ErrorDiv = styled.div`
  color: #ef4444;
  padding: 10px;
`;

export default function ErrorRender({
  error,
}: Partial<FallbackProps>): JSX.Element {
  return (
    <ErrorWrapper id="tfc-fail-load">
      <strong>Vandy Tasks failed to load.</strong>
      <br />
      Reload the page. If it keeps happening, this error may help:
      <ErrorDiv>{error?.message}</ErrorDiv>
    </ErrorWrapper>
  );
}
