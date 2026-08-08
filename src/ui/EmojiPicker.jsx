const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

// Grapheme-cluster splitter, so multi-codepoint emoji (ZWJ family sequences
// like 👨‍👩‍👧, skin-tone modifiers like 👍🏽, flags like 🇨🇦 — two regional
// indicators) are treated as one "character" instead of getting split apart.
// Older Firefox lacks Intl.Segmenter, so fall back to a code-point split
// there — it won't get compound emoji right, but degrades gracefully.
const segmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function lastGrapheme(raw) {
  if (segmenter) {
    const segments = [...segmenter.segment(raw)];
    return segments.at(-1)?.segment ?? "";
  }
  return [...raw].at(-1) ?? "";
}

// Spec §5.5: on every keystroke, if the last character typed is an emoji,
// replace the whole field with just that character; otherwise, if the
// field is non-empty, clear it. Net effect: zero or one emoji, never text.
function nextEmojiValue(raw) {
  if (!raw) return "";
  const last = lastGrapheme(raw);
  return EMOJI_RE.test(last) ? last : "";
}

/**
 * A single-emoji field, backed by a real text input so users can pick from
 * their OS's or mobile keyboard's full native emoji picker (there's no
 * cross-browser way to summon that panel programmatically — focusing a
 * plain input is what lets the user's own shortcut/emoji key work against
 * it) instead of a fixed, curated set.
 */
export default function EmojiPicker({ value, onChange, id }) {
  return (
    <div className="field-with-clear">
      <input
        id={id}
        type="text"
        value={value}
        placeholder="Tap to add emoji — e.g. 🧹"
        autoComplete="off"
        onChange={(e) => onChange(nextEmojiValue(e.target.value))}
      />
      {value && (
        <button
          type="button"
          className="icon-button icon-button-small"
          aria-label="Clear emoji"
          onClick={() => onChange("")}
        >
          ✕
        </button>
      )}
    </div>
  );
}
