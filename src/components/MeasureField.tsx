import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { roundTo } from '../engine/units';

/**
 * A measurement as a figure in a line rather than a value in a box (R-14):
 * the number is the control, its unit beside it is the handle you drag to
 * change it, and the arrow keys move it a step at a time — ten steps with
 * shift held.
 *
 * The three ways in are deliberate rather than redundant. Typing is how you
 * set a measurement you already know; the arrows are how you nudge one you
 * are deciding; dragging is how you look for one, because it is the only one
 * of the three that redraws the page continuously while you move.
 *
 * The handle is a span with pointer handlers and so is not reachable by
 * keyboard. That is not a gap left for later: the arrow keys on the figure do
 * the same job, on the same value, with the same step.
 */
interface MeasureFieldProps {
  label: string;
  id: string;
  /** The value as shown, in the unit beside it. '' when it is not finite. */
  value: number | '';
  unit: string;
  /** One press of an arrow key, and one notch of the drag. */
  step: number;
  /** How far the pointer travels for one step. */
  pixelsPerStep?: number;
  min?: number;
  /** Called with the new value, in the unit shown rather than in millimetres. */
  onChange: (value: number) => void;
  /** Where the value comes from, or which other control decides it. */
  marginalia?: string | null;
  /** Underlined the way this app draws a bleed: dashed, like a cut line. */
  dashed?: boolean;
}

/**
 * How precise the step is, so a drag of eight notches of 0.125 does not land
 * on 1.0000000000000002 and print itself.
 */
function decimalsOf(step: number): number {
  const [, decimals = ''] = String(step).split('.');
  return decimals.length;
}

export function MeasureField({
  label,
  id,
  value,
  unit,
  step,
  pixelsPerStep = 3,
  min = 0,
  onChange,
  marginalia,
  dashed = false,
}: MeasureFieldProps) {
  /** Where the drag started, and from what value, for as long as it lasts. */
  const drag = useRef<{ x: number; value: number } | null>(null);

  /**
   * A step taken by the drag or by an arrow, which lands on the step's own
   * grid and never below the minimum. Typing is left alone: rounding what is
   * being typed would fight whoever is halfway through typing it.
   */
  function stepTo(next: number): void {
    onChange(roundTo(Math.max(min, next), decimalsOf(step)));
  }

  function startDrag(event: PointerEvent<HTMLSpanElement>): void {
    if (value === '') return;
    // Capturing means the drag survives the pointer leaving the handle, which
    // it does immediately: the handle is 40px wide and the gesture is not.
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, value };
  }

  function continueDrag(event: PointerEvent<HTMLSpanElement>): void {
    const from = drag.current;
    if (!from) return;
    const notches = Math.round((event.clientX - from.x) / pixelsPerStep);
    stepTo(from.value + notches * step);
  }

  function endDrag(event: PointerEvent<HTMLSpanElement>): void {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    // A bare arrow already moves one step: that is what the number input is
    // for, and reimplementing it would only be a way to disagree with it.
    if (!event.shiftKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();
    if (value === '') return;
    stepTo(value + (event.key === 'ArrowUp' ? 10 : -10) * step);
  }

  return (
    <div className="form-group measure-field">
      <label className="form-label" htmlFor={id}>{label}</label>
      <span className={`measure-value${dashed ? ' dashed' : ''}`}>
        <input
          type="number"
          className="measure-input"
          id={id}
          value={value}
          step={step}
          min={min}
          onChange={event => onChange(parseFloat(event.target.value) || 0)}
          onKeyDown={onKeyDown}
        />
        <span
          className="measure-unit"
          title="Arrastra para ajustar"
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {unit} ⇔
        </span>
      </span>
      {marginalia && <span className="field-marginalia">{marginalia}</span>}
    </div>
  );
}
