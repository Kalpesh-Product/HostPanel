import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotFlow, ChatbotAnswer, ChatbotFlowItem, DYNAMIC_PLAN_SUMMARY, getPlanSummary } from '../utils/chatbotflow';
import type { PlanType } from '../utils/inviteOnboarding';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

type ChatMessage = {
    id: number;
    role: 'assistant' | 'user';
    content: string;
};

// After this many follow-up rounds in one flow without landing on a
// resolved answer, proactively surface Customer Support alongside the
// question instead of only offering it on a tagged terminal answer.
const ROUNDS_BEFORE_PROACTIVE_SUPPORT = 2;

export default function ChatWidgetPreview() {
    const navigate = useNavigate();
    const location = useLocation();
    const axiosPrivate = useAxiosPrivate();
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
    const [currentStepId, setCurrentStepId] = useState<string | null>(null);
    const [showSupportOption, setShowSupportOption] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('basic');
    const [roundCount, setRoundCount] = useState(0);

    useEffect(() => {
        let active = true;
        axiosPrivate
            .get('/api/workspaces/module-access-map')
            .then((res) => {
                if (!active) return;
                const plan = res?.data?.data?.selectedPlan as PlanType | undefined;
                if (plan === 'basic' || plan === 'professional' || plan === 'custom') {
                    setSelectedPlan(plan);
                }
            })
            .catch(() => {
                // Keep the Basic-tier default flows if the plan can't be resolved.
            });
        return () => {
            active = false;
        };
    }, [axiosPrivate]);

    // Page-scoped flows (pageRoutes set) only show up while the host is on
    // one of those pages, and are pinned above the general/unscoped flows.
    const isOnMatchingPage = (item: ChatbotFlowItem) =>
        !item.pageRoutes || item.pageRoutes.some((route) => location.pathname.startsWith(route));

    const visibleFlows = chatbotFlow
        .filter((item) => item.plans.includes(selectedPlan) && isOnMatchingPage(item))
        .sort((a, b) => Number(Boolean(b.pageRoutes)) - Number(Boolean(a.pageRoutes)));

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const activeFlow = chatbotFlow.find((item) => item.id === activeFlowId) ?? null;
    const currentFollowUpStep = activeFlow?.followUpSteps.find(step => step.id === currentStepId) ?? null;

    const buildMessage = (
        role: 'assistant' | 'user',
        content: string,
        offset = 0
    ): ChatMessage => ({
        id: Date.now() + offset,
        role,
        content,
    });

    const addAssistantMessage = (content: string, delay = 1000) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, buildMessage('assistant', content)]);
            setIsTyping(false);
        }, delay);
    };

    const startChatFromQuestion = (flowId: string, question: string) => {
        const selectedFlow = chatbotFlow.find((item) => item.id === flowId);
        if (!selectedFlow) return;

        setActiveFlowId(flowId);
        setShowSupportOption(false);
        setRoundCount(0);

        setMessages([buildMessage('user', question)]);
        
        setIsTyping(true);
        setTimeout(() => {
            const firstStep = selectedFlow.followUpSteps.find(s => s.id === selectedFlow.firstStepId);
            setMessages(prev => [
                ...prev, 
                buildMessage('assistant', selectedFlow.initialResponse, 1),
                buildMessage('assistant', firstStep?.question ?? "How can I help with that?", 2)
            ]);
            setCurrentStepId(selectedFlow.firstStepId);
            setIsTyping(false);
        }, 800);
    };

    const handleOptionClick = (answer: ChatbotAnswer) => {
        if (!activeFlow) return;

        // 1. Add User's Choice
        setMessages(prev => [...prev, buildMessage('user', answer.text)]);

        setIsTyping(true);
        
        setTimeout(() => {
            const nextMessages: ChatMessage[] = [];

            // 2. Add Acknowledgment if provided (resolving the dynamic plan
            // summary marker to the caller's actual plan first)
            if (answer.response) {
                const responseText = answer.response === DYNAMIC_PLAN_SUMMARY
                    ? getPlanSummary(selectedPlan)
                    : answer.response;
                nextMessages.push(buildMessage('assistant', responseText, 1));
            }

            // 3. Determine Next Step
            if (answer.isTerminal) {
                if (answer.action === 'support') {
                    setShowSupportOption(true);
                }
                setCurrentStepId(null);
            } else if (answer.nextStepId) {
                const nextStep = activeFlow.followUpSteps.find(s => s.id === answer.nextStepId);
                if (nextStep) {
                    nextMessages.push(buildMessage('assistant', nextStep.question, 2));
                    setCurrentStepId(answer.nextStepId);
                    // Problem is persisting across multiple rounds — offer
                    // Customer Support alongside the next question rather
                    // than waiting for an explicit support-tagged answer.
                    setRoundCount(prev => {
                        const next = prev + 1;
                        if (next >= ROUNDS_BEFORE_PROACTIVE_SUPPORT) {
                            setShowSupportOption(true);
                        }
                        return next;
                    });
                } else {
                    nextMessages.push(buildMessage('assistant', "I'm not sure what the next step is, but I can connect you to support.", 2));
                    setShowSupportOption(true);
                    setCurrentStepId(null);
                }
            } else {
                nextMessages.push(buildMessage('assistant', "I hope that helps! Is there anything else?", 2));
                setCurrentStepId(null);
            }

            setMessages(prev => [...prev, ...nextMessages]);
            setIsTyping(false);
        }, 1000);
    };

    const handleAnswerNotHere = () => {
        setMessages((prev) => [...prev, buildMessage('user', "My answer isn't here")]);
        addAssistantMessage("No problem! Since none of these options fit your situation, it's best if we get a human to look at this.");
        setShowSupportOption(true);
        setCurrentStepId(null);
    };

    const resetChat = () => {
        setMessages([]);
        setActiveFlowId(null);
        setCurrentStepId(null);
        setShowSupportOption(false);
        setIsTyping(false);
        setRoundCount(0);
    };

    const handleContactSupport = () => {
        setShowChat(false);
        navigate('/company-settings/customer-support');
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
                                <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium tracking-wide">AI Flow</span>
                            </h3>
                            <button type="button" onClick={() => setShowChat(false)} className="rounded-md px-2 py-1 text-sm text-white/90 hover:bg-white/10 hover:text-white">
                                Close
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-blue-100">Interactive guidance from our assistant.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50 p-5 scrollbar-hide">
                        {messages.length === 0 ? (
                            <>
                                <p className="text-sm font-medium text-gray-700">Want help getting started?</p> 
                                <p className="mt-0.5 mb-4 text-xs text-gray-500">Tell us a little bit about what you&apos;re looking for.</p>
                                <div className="flex flex-col gap-2.5">
                                    {visibleFlows.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => startChatFromQuestion(item.id, item.generalQuestion)}
                                            className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-left text-sm text-gray-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30 active:bg-blue-50 cursor-pointer"
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
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm border border-gray-100'
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white text-gray-400 shadow-sm border border-gray-100 flex gap-1">
                                        <span className="animate-bounce">.</span>
                                        <span className="animate-bounce [animation-delay:0.2s]">.</span>
                                        <span className="animate-bounce [animation-delay:0.4s]">.</span>
                                    </div>
                                )}

                                {activeFlow && currentFollowUpStep && !isTyping ? (
                                    <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentFollowUpStep.answers.map((answer, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleOptionClick(answer)}
                                                    className="rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-gray-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer"
                                                >
                                                    {answer.text}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAnswerNotHere}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                                        >
                                            My answer isn't here
                                        </button>
                                    </div>
                                ) : null}

                                {showSupportOption && !isTyping ? (
                                    <button
                                        type="button"
                                        onClick={handleContactSupport}
                                        className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 shadow-lg cursor-pointer animate-in zoom-in-95 duration-300"
                                    >
                                        Contact Customer Support
                                    </button>
                                ) : null}

                                <div ref={messagesEndRef} />
                                
                                <button
                                    type="button"
                                    onClick={resetChat}
                                    className="mt-2 text-left text-xs text-blue-600 underline hover:text-blue-800 cursor-pointer"
                                >
                                    Start over
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 bg-white p-4 text-center">
                        <p className="text-[11px] text-gray-400">
                            By chatting, you agree to our{' '}
                            <button type="button" onClick={() => setShowDisclaimer(true)} className="text-blue-500 underline hover:text-blue-600 cursor-pointer">
                                disclaimer
                            </button>
                            .
                        </p>
                    </div>
                </div>
            ) : null}

            {showDisclaimer ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">        
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">Disclaimer</h2>
                        <p className="text-sm leading-6 text-gray-600">
                            By chatting, you agree to our Site Terms, Acceptable Use Policy, and Responsible AI Policy. Wono handles your information as described in the Wono Privacy Notice. Inputs you provide and output you generate through this Wono chatbot are licensed to Wono as posted content and submitted material under the Site Terms.
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setShowDisclaimer(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
