
/**
 * LEARNER'S NOTE:
 * HighlightedName.tsx is a simple component that displays a user's name
 * with a styled background (gradient pill) for visual emphasis.
 *
 * KEY CONCEPTS:
 * - Conditional rendering: Returns null if name prop is empty/falsy
 * - Inline styling: Uses Tailwind gradient classes (from-yellow-100 to-yellow-200)
 * - Rounded pill design: px-2 py-0.5 rounded-full creates the pill shape
 * - Shadow: shadow-sm adds subtle depth to the highlight
 */
interface Props {
  name?: string;
}

const HighlightedName = ({ name }: Props) => {
  if (!name) return null;
  return (
    <span className="inline-block ml-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 font-semibold shadow-sm">
      {name}
    </span>
  );
};

export default HighlightedName;
