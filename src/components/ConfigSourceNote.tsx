interface ConfigSourceNoteProps {
  /** Config file path shown in monospace, e.g. "config/sustratos.json". Omit for a custom, user-entered value with no backing file. */
  file?: string;
  /** The catalog's `source` field, or a short note for a custom entry. Never shortened or hidden: it may be a real production note. */
  text: string;
}

/**
 * Two-line origin note shared by every panel that shows where a catalog
 * value comes from: the file in monospace, then the source text below,
 * without a "Fuente:" prefix that the position already makes redundant.
 */
export function ConfigSourceNote({ file, text }: ConfigSourceNoteProps) {
  return (
    <p className="config-source-note">
      {file && (
        <>
          <span className="config-source-file">{file}</span>
          <br />
        </>
      )}
      {text}
    </p>
  );
}
