import React, { useState } from 'react';

const suggestions = [
    'I want to learn about Wono products and services',
    'I need technical support',
    'I have an account and billing issue',
];

export default function ChatWidgetPreview() {
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Basic behavior checks for this preview:
    // 1. Clicking the disclaimer link should open the modal.
    // 2. Clicking Close should hide the modal.
    // 3. The component should render without unterminated JSX errors.

    return (
        <div className="font-sans">
            {/* Floating Chat Button */}
            <button
                type="button"
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer"
                onClick={() => setShowChat((prev) => !prev)}
                aria-label={showChat ? 'Close chat' : 'Open chat'}
            >
                <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
            </button>

            {/* Chat Card */}
            {showChat ? (<div className="fixed bottom-24 right-6 z-50 flex h-[580px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            Ask WoNo
                            <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium tracking-wide">
                                built-in
                            </span>
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowChat(false)}
                            className="rounded-md px-2 py-1 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                        >
                            Close
                        </button>
                    </div>

                    <p className="mt-2 text-sm text-blue-100">
                        Get helpful guidance and recommendations from our generative AI assistant.
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
                    <p className="text-sm font-medium text-gray-700">
                        Want help getting started?
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5 mb-4">
                        Tell us a little bit about what you're looking for.
                    </p>

                    <div className="flex flex-col gap-2.5">
                        {suggestions.map((text, index) => (
                            <button
                                key={index}
                                type="button"
                                className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-left text-sm text-gray-800 transition shadow-sm hover:border-blue-400 hover:bg-blue-50/30 active:bg-blue-50"
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-white p-4 text-center">
                    <p className="text-[11px] text-gray-400">
                        By chatting, you agree to our{' '}
                        <button
                            type="button"
                            onClick={() => setShowDisclaimer(true)}
                            className="text-blue-500 underline hover:text-blue-600"
                        >
                            disclaimer
                        </button>
                        .
                    </p>
                </div>
            </div>) : null}

            {/* Disclaimer Modal */}
            {showDisclaimer ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">
                            Disclaimer
                        </h2>

                        <p className="text-sm leading-6 text-gray-600">
                            By chatting, you agree to our Site Terms, Acceptable Use Policy,
                            and Responsible AI Policy. Wono handles your information as
                            described in the Wono Privacy Notice. Inputs you provide and
                            output you generate through this Wono chatbot are licensed to Wono
                            as posted content and submitted material under the Site Terms.
                        </p>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDisclaimer(false)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}