/**
 * Unit тесты для use-route-map-sync.ts
 * 
 * Тестирует синхронизацию карты с сегментами маршрута.
 * 
 * @module routes/features/route-map/__tests__/hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useRouteMapSync } from '../../hooks/use-route-map-sync';

describe('useRouteMapSync', () => {
  const mockOnSegmentHighlight = jest.fn();
  const mockOnSegmentScroll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null highlighted segment', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
        onSegmentHighlight: mockOnSegmentHighlight,
        onSegmentScroll: mockOnSegmentScroll,
      })
    );

    expect(result.current.highlightedSegmentIndex).toBeNull();
  });

  it('should highlight segment when highlightSegment is called', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
        onSegmentHighlight: mockOnSegmentHighlight,
        onSegmentScroll: mockOnSegmentScroll,
      })
    );

    act(() => {
      result.current.highlightSegment(1);
    });

    expect(result.current.highlightedSegmentIndex).toBe(1);
    expect(mockOnSegmentHighlight).toHaveBeenCalledWith(1);
  });

  it('should not highlight segment with invalid index', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
        onSegmentHighlight: mockOnSegmentHighlight,
        onSegmentScroll: mockOnSegmentScroll,
      })
    );

    act(() => {
      result.current.highlightSegment(-1);
    });

    expect(result.current.highlightedSegmentIndex).toBeNull();
    expect(mockOnSegmentHighlight).not.toHaveBeenCalled();

    act(() => {
      result.current.highlightSegment(10);
    });

    expect(result.current.highlightedSegmentIndex).toBeNull();
    expect(mockOnSegmentHighlight).not.toHaveBeenCalled();
  });

  it('should clear highlight when clearHighlight is called', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
        onSegmentHighlight: mockOnSegmentHighlight,
        onSegmentScroll: mockOnSegmentScroll,
      })
    );

    act(() => {
      result.current.highlightSegment(1);
    });

    expect(result.current.highlightedSegmentIndex).toBe(1);

    act(() => {
      result.current.clearHighlight();
    });

    expect(result.current.highlightedSegmentIndex).toBeNull();
  });

  it('should handle map segment click', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
        onSegmentHighlight: mockOnSegmentHighlight,
        onSegmentScroll: mockOnSegmentScroll,
      })
    );

    act(() => {
      result.current.handleMapSegmentClick('segment-1', 1);
    });

    expect(result.current.highlightedSegmentIndex).toBe(1);
    expect(mockOnSegmentHighlight).toHaveBeenCalledWith(1);
    expect(mockOnSegmentScroll).toHaveBeenCalledWith(1);
  });

  it('should work without callbacks', () => {
    const { result } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
      })
    );

    act(() => {
      result.current.highlightSegment(1);
    });

    expect(result.current.highlightedSegmentIndex).toBe(1);

    act(() => {
      result.current.handleMapSegmentClick('segment-2', 2);
    });

    expect(result.current.highlightedSegmentIndex).toBe(2);
  });

  it('should memoize functions', () => {
    const { result, rerender } = renderHook(() =>
      useRouteMapSync({
        segmentCount: 3,
      })
    );

    const firstHighlightSegment = result.current.highlightSegment;
    const firstClearHighlight = result.current.clearHighlight;
    const firstHandleMapSegmentClick = result.current.handleMapSegmentClick;

    rerender();

    expect(result.current.highlightSegment).toBe(firstHighlightSegment);
    expect(result.current.clearHighlight).toBe(firstClearHighlight);
    expect(result.current.handleMapSegmentClick).toBe(firstHandleMapSegmentClick);
  });
});


