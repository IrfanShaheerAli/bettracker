type JoinModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function JoinModal({
    isOpen,
    onClose,
}: JoinModalProps) {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">

            <div className="relative w-full max-w-md rounded-2xl bg-[#0E231B] p-8">

                <h2 className="mb-6 text-3xl font-bold text-white">
                    Join Match
                </h2>

                <div className="space-y-5">

                    <input
                        type="text"
                        placeholder="Full Name"
                        className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-white outline-none"
                    />

                    <input
                        type="text"
                        placeholder="Phone Number"
                        className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-white outline-none"
                    />

                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-white outline-none"
                    />

                    <button className="mt-4 w-full rounded-lg bg-green-500 py-3 font-semibold text-black">
                        Join Match
                    </button>

                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 text-2xl text-white"
                    >
                        ✕
                    </button>

                </div>

            </div>

        </div>
    );
}