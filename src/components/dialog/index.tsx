interface DialogPropTypes {
  children: React.ReactNode;
  ref: React.Ref<HTMLDialogElement | null>;
  handleCloseModal: () => void;
}

export function DialogModal({ children, ref, handleCloseModal }: DialogPropTypes) {
  return (
    <dialog ref={ref} className="backdrop-blur-3xl backdrop:bg-black backdrop:opacity-40">
      <div
        className="p-6 bg-white rounded-lg shadow-lg max-w-2xl w-full mx-auto"
        style={{
          transform: "translateY(0)",
        }}
      >
        <div className="flex justify-end">
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
        <div className="mt-4 text-left">{children}</div>
      </div>
    </dialog>
  );
}
