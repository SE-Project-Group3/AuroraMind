import React from 'react';
import { X } from 'lucide-react';

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 bg-opacity-30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-medium text-gray-900">AI–Powered Goal Breakdown</h2>
                    <p className="text-gray-500 text-sm">Stop feeling overwhelmed - start taking action</p>
                </div>

                <div className="space-y-4">
                    <label className="block text-gray-700 font-medium">What do you want to work on?</label>
                    <textarea
                        className="w-full h-32 p-4 border border-gray-200 rounded-xl bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 placeholder-gray-300 transition-all"
                        placeholder="INPUT"
                    ></textarea>
                </div>

                <div className="flex justify-center my-6">
                    <button className="px-12 py-2 bg-white border border-blue-300 text-blue-500 rounded-full hover:bg-blue-50 transition-colors shadow-sm font-medium">
                        Break it Down
                    </button>
                </div>

                <div className="bg-white space-y-3 text-sm text-gray-700 max-w-lg mx-auto">
                    <ol className="list-decimal space-y-2 pl-4 marker:text-blue-400 marker:font-medium">
                        <li><span className="font-medium">Start with your workspace</span> - open the doc or tool you'll use.</li>
                        <li><span className="font-medium">State your goal simply</span> - one sentence is enough.</li>
                        <li><span className="font-medium">Break it into main pieces</span> - list the core sections.</li>
                        <li><span className="font-medium">Turn each piece into small tasks</span> - something you can do in one session.</li>
                        <li><span className="font-medium">Pick the easiest task and go</span> - small action &gt; perfect plan.</li>
                    </ol>
                </div>

                <div className="text-center mt-8 text-blue-400 text-sm space-y-1">
                    <p>You don't need the perfect plan.</p>
                    <p>Start with what you can do right now - one step is enough to move forward.</p>
                </div>
            </div>
        </div>
    );
};

export default BreakdownModal;