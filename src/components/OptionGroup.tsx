import type { CSSProperties, ReactNode } from 'react';

/**
 * The shared vocabulary of the drawn controls (R-13): a labelled field, and
 * the options inside it drawn to scale instead of listed in a dropdown.
 *
 * Two deliberate departures from the design canvas:
 *
 * The canvas marks up each group as a `radiogroup` with `role="radio"`
 * options. A radiogroup promises one tab stop and arrow-key movement between
 * the options, and building that is accessibility work, which is frozen until
 * Chris says otherwise. Promising it in the markup without implementing it is
 * worse than not claiming it, so these groups keep the pattern the app already
 * uses for its segmented controls: a plain group, and each option a button
 * that says whether it is the chosen one with `aria-pressed`.
 *
 * An option that cannot be chosen is really disabled, and says why beside
 * itself. The alternative the app has today is to let it be chosen and then
 * report an error, which spends the user's click to tell them something the
 * tool already knew.
 */
interface OptionFieldProps {
  /** The field's own name, which labels the group: "Orientación". */
  label: string;
  /** Stable prefix for the ids this field needs. */
  id: string;
  /**
   * The note at the right margin of the label row, in the margin rather than
   * under the value: where the value comes from ("de fábrica", "tuyo"), or
   * which other control decides it ("fijado por 2:3", "paso 16"). Null when
   * there is nothing to say, so the row does not reserve room for a note that
   * never comes.
   */
  marginalia?: string | null;
  /** The way into the catalog these options come from, when there is one. */
  options?: { label: string; onOpen: () => void };
  /** How many options share a row, when they are laid out as a grid. */
  columns?: number;
  /**
   * 'grid' is a row of cards; 'scale' is a row of notches standing on an axis,
   * for a field whose options are one quantity at different sizes.
   */
  layout?: 'grid' | 'scale';
  /**
   * True when the options are catalog entries rather than choices written in
   * the code. `e2e/inventory.spec.ts` reads this class to keep the shipped
   * catalog's own names out of its expected-control map, the same way it
   * already does with the rows of the catalog panel.
   */
  fromCatalog?: boolean;
  /** Shown under the control, as an error, when the field itself is wrong. */
  error?: string | null;
  /** Anything else that belongs under the control, such as a source note. */
  note?: ReactNode;
  children: ReactNode;
}

export function OptionField({
  label,
  id,
  marginalia,
  options,
  columns = 3,
  layout = 'grid',
  fromCatalog = false,
  error,
  note,
  children,
}: OptionFieldProps) {
  const labelId = `${id}-label`;

  return (
    <div className="form-group option-field">
      <div className="form-label-row">
        <span className="form-label" id={labelId}>{label}</span>
        {marginalia && <span className="field-marginalia">{marginalia}</span>}
        {options && (
          <button
            type="button"
            className="step-options"
            aria-label={options.label}
            aria-haspopup="dialog"
            onClick={options.onOpen}
          >
            ···
          </button>
        )}
      </div>
      <div
        className={[
          'option-group',
          layout === 'scale' ? 'option-group-scale' : '',
          fromCatalog ? 'option-group-catalog' : '',
        ].filter(Boolean).join(' ')}
        role="group"
        aria-labelledby={labelId}
        style={{ '--option-columns': columns } as CSSProperties}
      >
        {children}
      </div>
      {error && <p className="calculation-error" role="alert">{error}</p>}
      {note}
    </div>
  );
}

interface OptionCardProps {
  /** What the option is called, and what a screen reader announces first. */
  name: string;
  /** One line about it, from the catalog when the catalog says something. */
  detail?: string | null;
  /**
   * The drawing of what choosing this does. Hidden from assistive technology,
   * because it says the same thing as the name beside it, and drawn with
   * `currentColor` so it inverts with the card when the card is chosen.
   * Omitted where an option has nothing to draw: a paper is a name and what
   * it is for, and a swatch of flat colour would say nothing about it.
   */
  figure?: ReactNode;
  selected: boolean;
  /**
   * Why this option cannot be chosen. Its presence disables the card and
   * prints the reason on it; null leaves the card choosable.
   */
  disabledReason?: string | null;
  onSelect: () => void;
  id?: string;
  /** Figure beside the text instead of above it, for a wide list. */
  row?: boolean;
  /** Overrides the announced name where the visible text is not enough. */
  ariaLabel?: string;
  /** Shown instead of nothing in the title attribute, e.g. a description. */
  title?: string;
  /**
   * 'card' is the bordered card; 'notch' is one mark of a scale, which carries
   * the same state but wears none of the card's chrome, because the marks have
   * to be read against each other rather than one at a time.
   */
  variant?: 'card' | 'notch';
}

export function OptionCard({
  name,
  detail,
  figure,
  selected,
  disabledReason,
  onSelect,
  id,
  row = false,
  ariaLabel,
  title,
  variant = 'card',
}: OptionCardProps) {
  const className = [
    'option-card',
    row ? 'option-card-row' : '',
    variant === 'notch' ? 'option-card-notch' : '',
    selected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      id={id}
      className={className}
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={title}
      disabled={Boolean(disabledReason)}
      onClick={onSelect}
    >
      {figure !== undefined && <span className="option-figure" aria-hidden="true">{figure}</span>}
      <span className="option-text">
        <span className="option-name">{name}</span>
        {detail && <span className="option-detail">{detail}</span>}
        {disabledReason && <span className="option-reason">{disabledReason}</span>}
      </span>
    </button>
  );
}
