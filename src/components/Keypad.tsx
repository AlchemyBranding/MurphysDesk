'use client';

// A custom keypad rather than the operating system one. The iOS numeric keyboard
// eats half the viewport, inputmode="decimal" behaves differently by locale, and
// controlling the alphabet makes the marking trivial. This is probably the single
// largest determinant of whether she actually uses the thing.

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  unit?: string;
}

export default function Keypad({ value, onChange, onSubmit, disabled, unit }: Props) {
  const push = (ch: string) => onChange(value + ch);
  const back = () => onChange(value.slice(0, -1));
  const clear = () => onChange('');

  const Key = ({
    label,
    onClick,
    className = '',
    aria,
  }: {
    label: string;
    onClick: () => void;
    className?: string;
    aria?: string;
  }) => (
    <button
      type="button"
      className={`key ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={aria ?? label}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="answerbox" aria-live="polite">
        {value ? (
          <>
            <span>{value}</span>
            {unit ? <span className="ph">{unit}</span> : null}
            <span className="caret" />
          </>
        ) : (
          <span className="ph">your answer</span>
        )}
      </div>

      <div className="keypad">
        {['1', '2', '3'].map((d) => (
          <Key key={d} label={d} onClick={() => push(d)} />
        ))}
        <Key label="⌫" aria="delete" onClick={back} className="sub" />

        {['4', '5', '6'].map((d) => (
          <Key key={d} label={d} onClick={() => push(d)} />
        ))}
        <Key label="clear" onClick={clear} className="sub" />

        {['7', '8', '9'].map((d) => (
          <Key key={d} label={d} onClick={() => push(d)} />
        ))}
        <Key label="/" aria="fraction bar" onClick={() => push('/')} />

        <Key label="−" aria="minus" onClick={() => push('-')} className="sub" />
        <Key label="0" onClick={() => push('0')} />
        <Key label="." aria="decimal point" onClick={() => push('.')} />
        <button
          type="button"
          className="key go"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
        >
          Check
        </button>
      </div>
    </div>
  );
}
