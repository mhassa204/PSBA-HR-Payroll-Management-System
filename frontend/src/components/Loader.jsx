import { Loader2 } from "lucide-react";
import PropTypes from "prop-types";

/**
 * A reusable, elegant loading spinner with optional text
 */
const Loader = ({ size = "medium", text = "Loading...", className = "" }) => {
  let sizeClass = "h-8 w-8"; // default medium
  if (size === "small") sizeClass = "h-5 w-5";
  if (size === "large") sizeClass = "h-12 w-12";

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
      <Loader2
        className={`animate-spin text-blue-600 ${sizeClass} ${className}`}
      />
      {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
    </div>
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  text: PropTypes.string,
  className: PropTypes.string,
};

export default Loader;
