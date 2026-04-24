
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
