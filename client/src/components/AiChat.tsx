import React, { useState } from 'react';
import { chatbotFlow } from '../utils/chatbotflow';

type ChatMessage = {
    id: number;
    role: 'assistant' | 'user';
    content: string;
};

export default function ChatWidgetPreview() {
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
    const [showSupportOption, setShowSupportOption] = useState(false);
    const [followUpIndex, setFollowUpIndex] = useState(0);

    const mainSuggestionQuestions = chatbotFlow.slice(0, 4);
    const activeFlow = chatbotFlow.find((item) => item.id === activeFlowId) ?? null;
    const currentFollowUpStep = activeFlow?.followUpSteps[followUpIndex] ?? null;

    const buildMessage = (
        role: 'assistant' | 'user',
        content: string,
        offset = 0
    ): ChatMessage => ({
        id: Date.now() + offset,
        role,
        content,
    });

    const startChatFromQuestion = (flowId: string, question: string) => {
        const selectedFlow = chatbotFlow.find((item) => item.id === flowId);
        setActiveFlowId(flowId);
        setFollowUpIndex(0);
        setShowSupportOption(false);

        setMessages([
            buildMessage('user', question),
            buildMessage('assistant', 'I can help with that.', 1),
            buildMessage(
                'assistant',
                selectedFlow?.followUpSteps[0]?.question ?? 'Let me ask one quick question so I can guide you properly.',
                2
            ),
        ]);
    };

    // Handles clicking one of the generated options (e.g., "Yes", "No")
    const handleOptionClick = (optionText: string) => {
        if (!activeFlow) return;

        const nextIndex = followUpIndex + 1;
        const nextStep = activeFlow.followUpSteps[nextIndex] ?? null;
        const shouldShowSupport = !nextStep;

        setMessages((prev) => {
            const nextMessages = [
                ...prev,
                buildMessage('user', optionText, 1),
                buildMessage('assistant', 'Thanks. Let me ask the next question.', 2),
            ];

            if (shouldShowSupport) {
                nextMessages.push(
                    buildMessage(
                        'assistant',
                        'Thanks. It looks like this may need direct help. You can contact customer support below.',
                        3
                    )
                );
            } else if (nextStep) {
                nextMessages.push(buildMessage('assistant', nextStep.question, 3));
            }

            return nextMessages;
        });

        setFollowUpIndex(nextIndex);
        setShowSupportOption(!nextStep);
    };

    // Handles clicking "My answer isn't here"
    const handleAnswerNotHere = () => {
        setMessages((prev) => [
            ...prev,
            buildMessage('user', "My answer isn't here", 1),
            buildMessage(
                'assistant',
                'No problem! Since none of these options fit your situation, it\'s best if we get a human to look at this. You can contact customer support below.',
                2
            ),
        ]);
        setShowSupportOption(true); // Immediately show the support button
    };

    const resetChat = () => {
        setMessages([]);
        setActiveFlowId(null);
        setShowSupportOption(false);
        setFollowUpIndex(0);
    };

    return (
        <div className="font-sans">
            <button
                type="button"
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:bg-blue-700 active:scale-95 cursor-pointer"
                onClick={() => setShowChat((prev) => !prev)}
                aria-label={showChat ? 'Close chat' : 'Open chat'}
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </button>

            {showChat ? (
                <div className="fixed bottom-24 right-6 z-50 flex h-[580px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                                Ask WoNo
                                <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium tracking-wide">built-in</span>
                            </h3>
                            <button type="button" onClick={() => setShowChat(false)} className="rounded-md px-2 py-1 text-sm text-white/90 hover:bg-white/10 hover:text-white">
                                Close
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-blue-100">Get helpful guidance and recommendations from our generative AI assistant.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
                        {messages.length === 0 ? (
                            <>
                                <p className="text-sm font-medium text-gray-700">Want help getting started?</p>
                                <p className="mt-0.5 mb-4 text-xs text-gray-500">Tell us a little bit about what you&apos;re looking for.</p>
                                <div className="flex flex-col gap-2.5">
                                    {mainSuggestionQuestions.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => startChatFromQuestion(item.id, item.generalQuestion)}
                                            className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-left text-sm text-gray-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30 active:bg-blue-50"
                                        >
                                            {item.generalQuestion}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-white text-gray-700 shadow-sm'
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                ))}

                                {/* NEW: Multiple Choice Options Layout */}
                                {activeFlow && currentFollowUpStep && !showSupportOption ? (
                                    <div className="mt-2 flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentFollowUpStep.answers.map((answer) => (
                                                <button
                                                    key={answer}
                                                    type="button"
                                                    onClick={() => handleOptionClick(answer)}
                                                    className="rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-gray-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30"
                                                >
                                                    {answer}
                                                </button>
                                            ))}
                                        </div>

                                        {/* The escape hatch button */}
                                        <button
                                            type="button"
                                            onClick={handleAnswerNotHere}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            My answer isn't here
                                        </button>
                                    </div>
                                ) : null}

                                {showSupportOption ? (
                                    <button
                                        type="button"
                                        className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Contact Customer Support
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={resetChat}
                                    className="mt-2 text-left text-xs text-blue-600 underline"
                                >
                                    Start over
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 bg-white p-4 text-center">
                        <p className="text-[11px] text-gray-400">
                            By chatting, you agree to our{' '}
                            <button type="button" onClick={() => setShowDisclaimer(true)} className="text-blue-500 underline hover:text-blue-600">
                                disclaimer
                            </button>
                            .
                        </p>
                    </div>
                </div>
            ) : null}

            {showDisclaimer ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">Disclaimer</h2>
                        <p className="text-sm leading-6 text-gray-600">
                            By chatting, you agree to our Site Terms, Acceptable Use Policy, and Responsible AI Policy. Wono handles your information as described in the Wono Privacy Notice. Inputs you provide and output you generate through this Wono chatbot are licensed to Wono as posted content and submitted material under the Site Terms.
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setShowDisclaimer(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
