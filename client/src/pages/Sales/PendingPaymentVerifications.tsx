import React, { useEffect, useState } from 'react';
import {
    getPendingPaymentVerifications,
    confirmTenantCreditRequestPayment,
} from '../../services/tenant-companies';

interface CreditRequest {
    id: string;
    tenantCompanyId: string;
    requestedCredits: number;
    approvedCredits: number;
    totalAmount: number;
    paymentTransactionId: string;
    paymentProofFileUrl: string;
    paymentSubmittedAt: string;
}

const PendingPaymentVerifications: React.FC = () => {
    const [requests, setRequests] = useState<CreditRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState<string | null>(null);

    const fetchPendingPayments = async () => {
        try {
            const res = await getPendingPaymentVerifications();
            setRequests(res.data?.data || []);
        } catch (error) {
            console.error('Error fetching pending payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async (tenantCompanyId: string, requestId: string) => {
        setConfirming(requestId);
        try {
            await confirmTenantCreditRequestPayment(
                tenantCompanyId,
                requestId,
                { financeNote: 'Payment verified successfully.' }
            );
            alert('Payment confirmed successfully!');
            fetchPendingPayments(); // Refresh list
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to confirm payment');
        } finally {
            setConfirming(null);
        }
    };


    useEffect(() => {
        fetchPendingPayments();
    }, []);

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-pmedium mb-6">Pending Payment Verifications</h2>

            {requests.length === 0 ? (
                <p className="text-gray-500">No pending payments to verify.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left">Tenant Company</th>
                                <th className="px-4 py-3 text-left">Requested</th>
                                <th className="px-4 py-3 text-left">Approved</th>
                                <th className="px-4 py-3 text-left">Amount</th>
                                <th className="px-4 py-3 text-left">Transaction ID</th>
                                <th className="px-4 py-3 text-left">Proof</th>
                                <th className="px-4 py-3 text-left">Submitted</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3">{req.tenantCompanyId}</td>
                                    <td className="px-4 py-3">{req.requestedCredits}</td>
                                    <td className="px-4 py-3">{req.approvedCredits}</td>
                                    <td className="px-4 py-3">₹{req.totalAmount}</td>
                                    <td className="px-4 py-3">{req.paymentTransactionId}</td>
                                    <td className="px-4 py-3">
                                        {req.paymentProofFileUrl ? (
                                            <a
                                                href={req.paymentProofFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                View Proof
                                            </a>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {new Date(req.paymentSubmittedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => confirmPayment(req.tenantCompanyId, req.id)}
                                            disabled={confirming === req.id}
                                            className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {confirming === req.id ? 'Confirming...' : 'Confirm Payment'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PendingPaymentVerifications;