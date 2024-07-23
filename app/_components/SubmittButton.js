import { useFormStatus } from "react-dom";

function SubmittButton({ children, pendingLabel }) {
  //NOTE: NEW: this new experimental hook returns info about the form where this component has been used. So that in a parent form!
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="bg-accent-500 px-8 py-4 text-primary-800 font-semibold hover:bg-accent-600 transition-all disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-300"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export default SubmittButton;
